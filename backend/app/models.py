from datetime import datetime
import random
import string
from .extensions import db


def gen_user_id() -> int:
    """生成 6 位随机 user_id，确保不重复。"""
    for _ in range(20):
        uid = random.randint(100000, 999999)
        if not User.query.filter_by(id=uid).first():
            return uid
    while True:
        uid = random.randint(1000000, 9999999)
        if not User.query.filter_by(id=uid).first():
            return uid


def gen_redeem_code(length: int = 16) -> str:
    """生成兑换码：易读字符（去除 0/O/1/I），显示时用 `-` 每 4 位分隔。"""
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    while True:
        code = "".join(random.choices(chars, k=length))
        if not RedeemCode.query.filter_by(code=code).first():
            return code


def gen_batch_id(length: int = 8) -> str:
    """生成批次 ID — 同一次批量生成的所有兑换码共享。"""
    chars = "abcdefghijklmnopqrstuvwxyz0123456789"
    return "".join(random.choices(chars, k=length))


def format_code(code: str) -> str:
    """把 16 位连续码转成 ABCD-EFGH-IJKL-MNOP 格式用于显示。"""
    return "-".join(code[i:i+4] for i in range(0, len(code), 4))


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    phone = db.Column(db.String(32), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    nickname = db.Column(db.String(64), nullable=True)
    status = db.Column(db.String(16), nullable=False, default="active")
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    last_login_at = db.Column(db.DateTime, nullable=True)

    # 改密 / 重置 / 禁用 → +1，所有旧 token 立失效
    token_version = db.Column(db.Integer, nullable=False, default=1)
    # 活力余额（缓存值；真实值以 vitality_log 累加为准，但每次都查日志慢，用余额字段）
    vitality_balance = db.Column(db.Integer, nullable=False, default=100)

    diaries = db.relationship("Diary", backref="user", lazy=True, cascade="all, delete-orphan")
    vitality_logs = db.relationship("VitalityLog", backref="user", lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "phone": self.phone,
            "nickname": self.nickname or f"用户{self.id}",
            "status": self.status,
            "vitality": self.vitality_balance,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_login_at": self.last_login_at.isoformat() if self.last_login_at else None,
            "diary_count": len(self.diaries),
        }

    def invalidate_tokens(self):
        """所有端立刻退出登录。"""
        self.token_version = (self.token_version or 0) + 1


class Diary(db.Model):
    __tablename__ = "diaries"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text, nullable=False)
    date = db.Column(db.DateTime, nullable=False, index=True)
    score = db.Column(db.Integer, nullable=True)
    tag = db.Column(db.String(32), nullable=True)
    location_json = db.Column(db.Text, nullable=True)
    weather_json = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow,
                           onupdate=datetime.utcnow, nullable=False)

    def to_dict(self):
        import json
        return {
            "diary_id": self.id,
            "title": self.title,
            "content": self.content,
            "date": self.date.isoformat() if self.date else None,
            "score": self.score,
            "tag": self.tag,
            "location": json.loads(self.location_json) if self.location_json else None,
            "weather": json.loads(self.weather_json) if self.weather_json else None,
        }


class Admin(db.Model):
    __tablename__ = "admins"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class VitalityLog(db.Model):
    """活力值流水。delta 正=增加，负=消耗。"""
    __tablename__ = "vitality_logs"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    delta = db.Column(db.Integer, nullable=False)
    # type: chat | diary | redeem | iap | admin_grant | admin_revoke | initial
    type = db.Column(db.String(32), nullable=False)
    note = db.Column(db.String(255), nullable=True)
    balance_after = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)


class RedeemCode(db.Model):
    __tablename__ = "redeem_codes"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    code = db.Column(db.String(32), unique=True, nullable=False, index=True)
    batch_id = db.Column(db.String(16), nullable=True, index=True)
    vitality = db.Column(db.Integer, nullable=False)
    used_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    used_at = db.Column(db.DateTime, nullable=True)
    expires_at = db.Column(db.DateTime, nullable=True)
    note = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    @property
    def is_used(self):
        return self.used_by is not None

    @property
    def is_expired(self):
        return self.expires_at is not None and datetime.utcnow() > self.expires_at

    @property
    def display_code(self):
        from .models import format_code
        return format_code(self.code)


class AppSetting(db.Model):
    """简单 key-value 设置表，用于云控开关。"""
    __tablename__ = "app_settings"
    key = db.Column(db.String(64), primary_key=True)
    value = db.Column(db.Text, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow,
                           onupdate=datetime.utcnow, nullable=False)

    @classmethod
    def get(cls, key: str, default=None):
        item = cls.query.get(key)
        if not item:
            return default
        return item.value

    @classmethod
    def get_bool(cls, key: str, default: bool = False) -> bool:
        v = cls.get(key)
        if v is None:
            return default
        return v.lower() in ("1", "true", "yes", "on")

    @classmethod
    def set(cls, key: str, value: str):
        item = cls.query.get(key)
        if item:
            item.value = value
        else:
            item = cls(key=key, value=value)
            db.session.add(item)
        db.session.commit()
