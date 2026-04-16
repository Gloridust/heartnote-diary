"""自定义鉴权装饰器：JWT + token_version 校验 + 用户状态检查。"""
from functools import wraps
from flask import jsonify, g
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from .models import User


def auth_required(fn):
    """所有需要登录的 API 用这个，不要直接用 @jwt_required()。
    会同时校验：token 解析成功 + 用户存在 + 未禁用 + token_version 一致。
    通过后把 user 对象挂到 g.current_user。"""
    @jwt_required()
    @wraps(fn)
    def wrapper(*a, **kw):
        try:
            uid = int(get_jwt_identity())
        except Exception:
            return _401("登录态无效")
        user = User.query.get(uid)
        if not user:
            return _401("账号不存在")
        if user.status == "disabled":
            return _403("账号已被禁用")
        claims = get_jwt()
        if claims.get("v", 0) != user.token_version:
            return _401("登录已过期，请重新登录")
        g.current_user = user
        return fn(*a, **kw)
    return wrapper


def _401(msg):
    return jsonify({"status": "error", "code": "auth_invalid", "message": msg}), 401


def _403(msg):
    return jsonify({"status": "error", "code": "forbidden", "message": msg}), 403


def make_token_claims(user: User) -> dict:
    """登录/注册时塞进 JWT 的额外 claims。"""
    return {"v": user.token_version}
