import re
from datetime import datetime
from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import create_access_token
from passlib.hash import bcrypt

from ..auth_helpers import auth_required, make_token_claims
from ..extensions import db
from ..models import User, VitalityLog, gen_user_id
from ..vitality_service import Cost

bp = Blueprint("auth", __name__)

PHONE_RE = re.compile(r"^1[3-9]\d{9}$")
USER_ID_RE = re.compile(r"^\d{6,7}$")


def _ok(data=None, **extra):
    payload = {"status": "success"}
    if data is not None:
        payload["data"] = data
    payload.update(extra)
    return jsonify(payload)


def _err(msg, code=400):
    return jsonify({"status": "error", "message": msg}), code


def _issue_token(user: User) -> str:
    return create_access_token(identity=str(user.id),
                               additional_claims=make_token_claims(user))


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
        vitality_balance=Cost.INITIAL_GRANT,
    )
    db.session.add(user)
    db.session.flush()
    db.session.add(VitalityLog(
        user_id=user.id, delta=Cost.INITIAL_GRANT,
        type="initial", note="新用户欢迎礼", balance_after=user.vitality_balance,
    ))
    db.session.commit()

    return _ok({"user": user.to_dict(), "token": _issue_token(user)})


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

    return _ok({"user": user.to_dict(), "token": _issue_token(user)})


@bp.get("/me")
@auth_required
def me():
    return _ok(g.current_user.to_dict())


@bp.post("/change-password")
@auth_required
def change_password():
    user = g.current_user
    data = request.get_json(silent=True) or {}
    old_pwd = data.get("old_password") or ""
    new_pwd = data.get("new_password") or ""
    if not bcrypt.verify(old_pwd, user.password_hash):
        return _err("原密码错误", 401)
    if len(new_pwd) < 6:
        return _err("新密码至少 6 位")
    user.password_hash = bcrypt.hash(new_pwd)
    user.invalidate_tokens()  # 改密后所有端立刻失效
    db.session.commit()
    # 当前请求的 token 也已失效，但本次响应里直接签发新 token，前端覆盖即可
    return _ok({"token": _issue_token(user), "user": user.to_dict()})


@bp.patch("/profile")
@auth_required
def update_profile():
    user = g.current_user
    data = request.get_json(silent=True) or {}
    if "nickname" in data:
        user.nickname = (data.get("nickname") or "").strip() or None
    db.session.commit()
    return _ok(user.to_dict())


@bp.post("/delete-account")
@auth_required
def delete_account():
    """注销账号 — 前端显示永久删除，后端实际处理为禁用 + 释放手机号 + token 失效。
    需要密码二次确认，避免被误操作 / 抢账号。
    """
    user = g.current_user
    data = request.get_json(silent=True) or {}
    password = data.get("password") or ""
    if not bcrypt.verify(password, user.password_hash):
        return _err("密码错误", 401)

    # 1. 禁用 + token 失效
    user.status = "disabled"
    user.invalidate_tokens()
    # 2. 释放手机号 — 在末尾打上 _del_<id>_<时间戳> 后缀，让该手机号可以重新注册
    suffix = f"_del_{user.id}_{int(datetime.utcnow().timestamp())}"
    if not user.phone.endswith(suffix):
        user.phone = f"{user.phone}{suffix}"[:32]  # 字段长度上限
    # 3. 昵称打上注销标记，避免管理员后台误以为是正常用户
    user.nickname = (user.nickname or "用户") + "(已注销)"
    db.session.commit()
    return _ok()
