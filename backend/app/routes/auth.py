import re
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from passlib.hash import bcrypt

from ..extensions import db
from ..models import User, gen_user_id

bp = Blueprint("auth", __name__)

PHONE_RE = re.compile(r"^1[3-9]\d{9}$")  # 中国大陆手机号
USER_ID_RE = re.compile(r"^\d{6,7}$")


def _ok(data=None, **extra):
    payload = {"status": "success"}
    if data is not None:
        payload["data"] = data
    payload.update(extra)
    return jsonify(payload)


def _err(msg, code=400):
    return jsonify({"status": "error", "message": msg}), code


@bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    phone = (data.get("phone") or "").strip()
    password = data.get("password") or ""
    nickname = (data.get("nickname") or "").strip() or None

    if not PHONE_RE.match(phone):
        return _err("请输入有效的 11 位手机号")
    if len(password) < 6:
        return _err("密码至少 6 位")

    if User.query.filter_by(phone=phone).first():
        return _err("该手机号已注册", 409)

    user = User(
        id=gen_user_id(),
        phone=phone,
        password_hash=bcrypt.hash(password),
        nickname=nickname,
    )
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return _ok({"user": user.to_dict(), "token": token})


@bp.post("/login")
def login():
    """支持手机号或 user_id 登录。"""
    data = request.get_json(silent=True) or {}
    identifier = (data.get("identifier") or "").strip()
    password = data.get("password") or ""

    if not identifier or not password:
        return _err("请输入账号与密码")

    user = None
    if PHONE_RE.match(identifier):
        user = User.query.filter_by(phone=identifier).first()
    elif USER_ID_RE.match(identifier):
        user = User.query.filter_by(id=int(identifier)).first()
    else:
        return _err("账号格式错误（应为手机号或 6 位用户ID）")

    if not user or not bcrypt.verify(password, user.password_hash):
        return _err("账号或密码错误", 401)
    if user.status == "disabled":
        return _err("账号已被禁用，请联系管理员", 403)

    user.last_login_at = datetime.utcnow()
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return _ok({"user": user.to_dict(), "token": token})


@bp.get("/me")
@jwt_required()
def me():
    uid = int(get_jwt_identity())
    user = User.query.get(uid)
    if not user:
        return _err("用户不存在", 404)
    return _ok(user.to_dict())


@bp.post("/change-password")
@jwt_required()
def change_password():
    uid = int(get_jwt_identity())
    user = User.query.get(uid)
    if not user:
        return _err("用户不存在", 404)
    data = request.get_json(silent=True) or {}
    old_pwd = data.get("old_password") or ""
    new_pwd = data.get("new_password") or ""
    if not bcrypt.verify(old_pwd, user.password_hash):
        return _err("原密码错误", 401)
    if len(new_pwd) < 6:
        return _err("新密码至少 6 位")
    user.password_hash = bcrypt.hash(new_pwd)
    db.session.commit()
    return _ok()


@bp.patch("/profile")
@jwt_required()
def update_profile():
    uid = int(get_jwt_identity())
    user = User.query.get(uid)
    if not user:
        return _err("用户不存在", 404)
    data = request.get_json(silent=True) or {}
    if "nickname" in data:
        user.nickname = (data.get("nickname") or "").strip() or None
    db.session.commit()
    return _ok(user.to_dict())
