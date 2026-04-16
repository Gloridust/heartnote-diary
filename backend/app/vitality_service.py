"""活力值核心业务：扣费 / 充值 / 流水写入。统一入口，避免散落各路由。"""
from .extensions import db
from .models import User, VitalityLog


class InsufficientVitality(Exception):
    def __init__(self, need: int, balance: int):
        super().__init__(f"活力不足：需要 {need}，当前 {balance}")
        self.need = need
        self.balance = balance


def consume(user: User, cost: int, type_: str, note: str | None = None) -> User:
    """扣费。不足则抛 InsufficientVitality。返回更新后的 user。"""
    if cost <= 0:
        return user
    if user.vitality_balance < cost:
        raise InsufficientVitality(cost, user.vitality_balance)
    user.vitality_balance -= cost
    db.session.add(VitalityLog(
        user_id=user.id, delta=-cost, type=type_, note=note,
        balance_after=user.vitality_balance,
    ))
    db.session.commit()
    return user


def grant(user: User, amount: int, type_: str, note: str | None = None) -> User:
    """加值（兑换码、IAP、admin 发放、初始赠送）。"""
    if amount <= 0:
        return user
    user.vitality_balance += amount
    db.session.add(VitalityLog(
        user_id=user.id, delta=amount, type=type_, note=note,
        balance_after=user.vitality_balance,
    ))
    db.session.commit()
    return user


def revoke(user: User, amount: int, note: str | None = None) -> User:
    """admin 强制扣除（允许扣到 0，不会变负）。"""
    if amount <= 0:
        return user
    actual = min(amount, user.vitality_balance)
    user.vitality_balance -= actual
    db.session.add(VitalityLog(
        user_id=user.id, delta=-actual, type="admin_revoke", note=note,
        balance_after=user.vitality_balance,
    ))
    db.session.commit()
    return user


# ===== 计费规则集中管理 =====
class Cost:
    CHAT_TURN = 1     # 普通聊天每轮
    CHAT_END = 5      # 总结生成日记（替代 1，不叠加）

    INITIAL_GRANT = 100
