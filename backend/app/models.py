from datetime import datetime
import random
from .extensions import db


def gen_user_id() -> int:
    """生成 6 位随机 user_id，确保不重复。"""
    for _ in range(20):
        uid = random.randint(100000, 999999)
        if not User.query.filter_by(id=uid).first():
            return uid
    # 极端情况下扩到 7 位
    while True:
        uid = random.randint(1000000, 9999999)
        if not User.query.filter_by(id=uid).first():
            return uid


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)  # 6 位 user_id，同时也是登录凭据
    phone = db.Column(db.String(32), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    nickname = db.Column(db.String(64), nullable=True)
    status = db.Column(db.String(16), nullable=False, default="active")  # active | disabled
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    last_login_at = db.Column(db.DateTime, nullable=True)

    diaries = db.relationship("Diary", backref="user", lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "phone": self.phone,
            "nickname": self.nickname or f"用户{self.id}",
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_login_at": self.last_login_at.isoformat() if self.last_login_at else None,
            "diary_count": len(self.diaries),
        }


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
    # 扩展字段（位置/天气）— JSON 序列化后存 TEXT，跨 MySQL/SQLite 通吃
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
