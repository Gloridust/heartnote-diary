"""内存级限流 / 防暴力破解。

设计思路：
  - 滑动窗口计数（过期自动失效，无需后台清理任务）
  - 失败计数 + 锁定期（连续失败 N 次后冷却 M 分钟）
  - thread-safe（用 Lock 保护字典）
  - 进程级存储 — 单进程部署够用；多进程/多机要换 Redis（接口已抽象）

为什么不用 Flask-Limiter？
  - 它默认依赖外部存储（Redis/memcached），单 Flask 进程开发体验差
  - 我们的需求很集中（5 个端点），自实现 ~80 行 + 完全可控

风险：
  - gunicorn 多 worker 时每个 worker 一份内存计数，恶意攻击者可绕过
  - 部署到生产时建议：① 单 worker 配高并发；② 或者迁到 Redis 后端
"""
from __future__ import annotations
import time
from collections import deque
from functools import wraps
from threading import Lock
from typing import Callable
from flask import request, jsonify, g


# ============ 滑动窗口计数器 ============
class SlidingWindow:
    """每个 (scope, key) 维护一个时间戳队列，超过 window 的自动剔除。"""
    def __init__(self):
        self._data: dict[tuple[str, str], deque[float]] = {}
        self._lock = Lock()

    def hit(self, scope: str, key: str, window: int) -> int:
        """记录一次访问并返回当前窗口内的计数（含本次）。"""
        now = time.time()
        cutoff = now - window
        k = (scope, key)
        with self._lock:
            q = self._data.get(k)
            if q is None:
                q = deque()
                self._data[k] = q
            while q and q[0] < cutoff:
                q.popleft()
            q.append(now)
            return len(q)

    def count(self, scope: str, key: str, window: int) -> int:
        now = time.time()
        cutoff = now - window
        k = (scope, key)
        with self._lock:
            q = self._data.get(k)
            if not q:
                return 0
            while q and q[0] < cutoff:
                q.popleft()
            return len(q)


# ============ 失败计数器 + 锁定 ============
class FailureLocker:
    """记录某 key 的失败次数；超阈值则锁定一段时间。"""
    def __init__(self):
        # key -> (failure_count, first_failure_at, locked_until)
        self._data: dict[str, tuple[int, float, float]] = {}
        self._lock = Lock()

    def is_locked(self, key: str) -> tuple[bool, int]:
        """返回 (是否锁定, 剩余秒数)"""
        now = time.time()
        with self._lock:
            entry = self._data.get(key)
            if not entry: return False, 0
            _, _, locked_until = entry
            if locked_until > now:
                return True, int(locked_until - now)
            return False, 0

    def record_failure(self, key: str, max_attempts: int,
                       window: int, lockout: int) -> tuple[int, bool, int]:
        """记录一次失败。
        返回 (当前窗口失败次数, 是否触发锁定, 锁定剩余秒数)"""
        now = time.time()
        with self._lock:
            count, first_at, locked_until = self._data.get(key, (0, now, 0))
            # 已锁定期间继续失败 — 直接返回剩余时间
            if locked_until > now:
                return count, True, int(locked_until - now)
            # 窗口过期 — 重置计数
            if now - first_at > window:
                count = 0
                first_at = now
            count += 1
            triggered = False
            if count >= max_attempts:
                locked_until = now + lockout
                triggered = True
            self._data[key] = (count, first_at, locked_until)
            return count, triggered, int(locked_until - now) if triggered else 0

    def clear(self, key: str):
        """成功后调用 — 清除该 key 的失败记录。"""
        with self._lock:
            self._data.pop(key, None)


# 单例
_window = SlidingWindow()
_locker = FailureLocker()


# ============ 公开 API ============

def get_client_ip() -> str:
    """优先取真实客户端 IP（X-Forwarded-For），否则 remote_addr。"""
    fwd = request.headers.get("X-Forwarded-For", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.remote_addr or "unknown"


def rate_limit(scope: str, max_attempts: int, window: int,
               key_fn: Callable[[], str] | None = None):
    """通用速率限制装饰器（不分成功失败，纯次数）。
    超限返回 429。"""
    def deco(fn):
        @wraps(fn)
        def wrapper(*a, **kw):
            key = key_fn() if key_fn else get_client_ip()
            n = _window.hit(scope, key, window)
            if n > max_attempts:
                return jsonify({
                    "status": "error",
                    "code": "rate_limited",
                    "message": "操作太频繁，请稍后再试",
                }), 429
            return fn(*a, **kw)
        return wrapper
    return deco


def check_lock(scope: str, key: str) -> tuple[bool, int]:
    """检查 (scope, key) 是否被失败锁定。"""
    return _locker.is_locked(f"{scope}:{key}")


def record_failure(scope: str, key: str, max_attempts: int,
                   window: int, lockout: int) -> tuple[int, bool, int]:
    """记一次失败。返回 (当前失败数, 是否本次触发锁定, 剩余秒)"""
    return _locker.record_failure(f"{scope}:{key}", max_attempts, window, lockout)


def clear_failures(scope: str, key: str):
    _locker.clear(f"{scope}:{key}")


# ============ 配置中心 ============

class Limits:
    # 用户登录：单个账号 15 分钟 5 次失败 → 锁 15 分钟
    LOGIN_PER_ACCOUNT = dict(max_attempts=5, window=15 * 60, lockout=15 * 60)
    # 用户登录：单个 IP 15 分钟 30 次（攻击者用很多账号轮番试）
    LOGIN_PER_IP = dict(max_attempts=30, window=15 * 60)

    # 注册：单个 IP 1 小时 5 次（防机器人批量注册）
    REGISTER_PER_IP = dict(max_attempts=5, window=60 * 60)

    # 改密：单个用户 15 分钟 5 次 → 锁 15 分钟
    CHANGE_PWD = dict(max_attempts=5, window=15 * 60, lockout=15 * 60)

    # 注销：单个用户 1 小时 3 次失败 → 锁 1 小时
    DELETE_ACCOUNT = dict(max_attempts=3, window=60 * 60, lockout=60 * 60)

    # 兑换码：单个用户 1 分钟 10 次（防穷举）
    REDEEM_PER_USER = dict(max_attempts=10, window=60)
    # 兑换码：单个 IP 5 分钟 30 次
    REDEEM_PER_IP = dict(max_attempts=30, window=5 * 60)

    # 管理员登录：1 小时 5 次失败 → 锁 1 小时
    ADMIN_LOGIN = dict(max_attempts=5, window=60 * 60, lockout=60 * 60)

    # IAP verify：单个用户 1 分钟 30 次
    IAP_VERIFY = dict(max_attempts=30, window=60)
