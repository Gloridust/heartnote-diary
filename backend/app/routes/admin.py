from functools import wraps
from flask import Blueprint, request, render_template, redirect, url_for, session, flash, jsonify
from passlib.hash import bcrypt

from ..extensions import db
from ..models import User, Admin, Diary, gen_user_id

bp = Blueprint("admin", __name__, template_folder="../templates")


def admin_required(fn):
    @wraps(fn)
    def wrapper(*a, **kw):
        if not session.get("admin_id"):
            return redirect(url_for("admin.login"))
        return fn(*a, **kw)
    return wrapper


@bp.get("/login")
def login():
    if session.get("admin_id"):
        return redirect(url_for("admin.dashboard"))
    return render_template("admin/login.html")


@bp.post("/login")
def login_post():
    username = (request.form.get("username") or "").strip()
    password = request.form.get("password") or ""
    admin = Admin.query.filter_by(username=username).first()
    if not admin or not bcrypt.verify(password, admin.password_hash):
        flash("账号或密码错误", "error")
        return redirect(url_for("admin.login"))
    session["admin_id"] = admin.id
    session["admin_name"] = admin.username
    return redirect(url_for("admin.dashboard"))


@bp.get("/logout")
def logout():
    session.clear()
    return redirect(url_for("admin.login"))


@bp.get("/")
@admin_required
def dashboard():
    q = (request.args.get("q") or "").strip()
    query = User.query
    if q:
        if q.isdigit():
            query = query.filter((User.id == int(q)) | (User.phone.like(f"%{q}%")))
        else:
            query = query.filter(User.phone.like(f"%{q}%"))
    users = query.order_by(User.created_at.desc()).limit(500).all()
    stats = {
        "total_users": User.query.count(),
        "active_users": User.query.filter_by(status="active").count(),
        "disabled_users": User.query.filter_by(status="disabled").count(),
        "total_diaries": Diary.query.count(),
    }
    return render_template("admin/dashboard.html",
                           users=users, stats=stats, q=q,
                           admin_name=session.get("admin_name"))


@bp.post("/users/create")
@admin_required
def create_user():
    phone = (request.form.get("phone") or "").strip()
    password = request.form.get("password") or "123456"
    nickname = (request.form.get("nickname") or "").strip() or None
    if not phone:
        flash("手机号必填", "error")
        return redirect(url_for("admin.dashboard"))
    if User.query.filter_by(phone=phone).first():
        flash("该手机号已存在", "error")
        return redirect(url_for("admin.dashboard"))
    user = User(id=gen_user_id(), phone=phone,
                password_hash=bcrypt.hash(password), nickname=nickname)
    db.session.add(user)
    db.session.commit()
    flash(f"已创建用户 {user.id} / {phone}（初始密码 {password}）", "success")
    return redirect(url_for("admin.dashboard"))


@bp.post("/users/<int:uid>/disable")
@admin_required
def disable_user(uid):
    user = User.query.get_or_404(uid)
    user.status = "disabled"
    db.session.commit()
    flash(f"已禁用 {uid}", "success")
    return redirect(url_for("admin.dashboard"))


@bp.post("/users/<int:uid>/enable")
@admin_required
def enable_user(uid):
    user = User.query.get_or_404(uid)
    user.status = "active"
    db.session.commit()
    flash(f"已启用 {uid}", "success")
    return redirect(url_for("admin.dashboard"))


@bp.post("/users/<int:uid>/reset-password")
@admin_required
def reset_password(uid):
    user = User.query.get_or_404(uid)
    new_pwd = (request.form.get("new_password") or "").strip() or "123456"
    user.password_hash = bcrypt.hash(new_pwd)
    db.session.commit()
    flash(f"{uid} 的密码已重置为 {new_pwd}", "success")
    return redirect(url_for("admin.dashboard"))


@bp.post("/users/<int:uid>/delete")
@admin_required
def delete_user(uid):
    user = User.query.get_or_404(uid)
    db.session.delete(user)
    db.session.commit()
    flash(f"已删除 {uid}", "success")
    return redirect(url_for("admin.dashboard"))


@bp.get("/users/<int:uid>/diaries")
@admin_required
def user_diaries(uid):
    user = User.query.get_or_404(uid)
    diaries = Diary.query.filter_by(user_id=uid).order_by(Diary.date.desc()).all()
    return render_template("admin/diaries.html", user=user, diaries=diaries)
