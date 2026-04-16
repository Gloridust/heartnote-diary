from datetime import datetime, timedelta
from functools import wraps
from flask import Blueprint, request, render_template, redirect, url_for, session, flash
from passlib.hash import bcrypt

from ..extensions import db
from ..models import User, Admin, Diary, RedeemCode, AppSetting, VitalityLog, gen_user_id, gen_redeem_code
from ..routes.settings import PUBLIC_KEYS
from ..vitality_service import grant, revoke

bp = Blueprint("admin", __name__, template_folder="../templates")


def admin_required(fn):
    @wraps(fn)
    def wrapper(*a, **kw):
        if not session.get("admin_id"):
            return redirect(url_for("admin.login"))
        return fn(*a, **kw)
    return wrapper


# ===== 登录登出 =====

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


# ===== 用户管理 =====

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
        "unused_codes": RedeemCode.query.filter_by(used_by=None).count(),
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
    user.invalidate_tokens()
    db.session.commit()
    flash(f"已禁用 {uid}（所有端立即下线）", "success")
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
    user.invalidate_tokens()
    db.session.commit()
    flash(f"{uid} 的密码已重置为 {new_pwd}（所有端立即下线）", "success")
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


# ===== 活力值管理 =====

@bp.post("/users/<int:uid>/vitality")
@admin_required
def adjust_vitality(uid):
    user = User.query.get_or_404(uid)
    try:
        amount = int(request.form.get("amount") or "0")
    except ValueError:
        amount = 0
    op = request.form.get("op") or "grant"
    note = (request.form.get("note") or "管理员操作").strip()
    if amount <= 0:
        flash("请输入大于 0 的数量", "error")
        return redirect(url_for("admin.dashboard"))
    if op == "grant":
        grant(user, amount, type_="admin_grant", note=note)
        flash(f"已为 {uid} 发放 {amount} 活力（当前 {user.vitality_balance}）", "success")
    else:
        revoke(user, amount, note=note)
        flash(f"已扣除 {uid} {amount} 活力（当前 {user.vitality_balance}）", "success")
    return redirect(url_for("admin.dashboard"))


@bp.get("/users/<int:uid>/vitality-log")
@admin_required
def user_vitality_log(uid):
    user = User.query.get_or_404(uid)
    logs = (VitalityLog.query.filter_by(user_id=uid)
            .order_by(VitalityLog.created_at.desc()).limit(200).all())
    return render_template("admin/vitality_log.html", user=user, logs=logs)


# ===== 兑换码管理 =====

@bp.get("/codes")
@admin_required
def codes_list():
    status_filter = request.args.get("status", "all")
    q = RedeemCode.query
    if status_filter == "unused":
        q = q.filter(RedeemCode.used_by.is_(None))
    elif status_filter == "used":
        q = q.filter(RedeemCode.used_by.isnot(None))
    codes = q.order_by(RedeemCode.created_at.desc()).limit(500).all()
    return render_template("admin/codes.html", codes=codes,
                           status_filter=status_filter,
                           admin_name=session.get("admin_name"))


@bp.post("/codes/generate")
@admin_required
def codes_generate():
    try:
        count = max(1, min(int(request.form.get("count") or "1"), 200))
        vitality = max(1, int(request.form.get("vitality") or "100"))
    except ValueError:
        flash("数量/面额必须为整数", "error")
        return redirect(url_for("admin.codes_list"))
    expires_days = request.form.get("expires_days") or ""
    expires_at = None
    if expires_days.strip().isdigit() and int(expires_days) > 0:
        expires_at = datetime.utcnow() + timedelta(days=int(expires_days))
    note = (request.form.get("note") or "").strip() or None

    created = []
    for _ in range(count):
        c = RedeemCode(code=gen_redeem_code(), vitality=vitality,
                       expires_at=expires_at, note=note)
        db.session.add(c)
        created.append(c.code)
    db.session.commit()
    flash(f"已生成 {count} 个兑换码（每个 {vitality} ⚡）：{', '.join(created[:5])}{'…' if count > 5 else ''}", "success")
    return redirect(url_for("admin.codes_list"))


@bp.post("/codes/<int:cid>/delete")
@admin_required
def codes_delete(cid):
    c = RedeemCode.query.get_or_404(cid)
    if c.is_used:
        flash("已使用的兑换码不能删除", "error")
        return redirect(url_for("admin.codes_list"))
    db.session.delete(c)
    db.session.commit()
    flash(f"已删除兑换码 {c.code}", "success")
    return redirect(url_for("admin.codes_list"))


# ===== 云控开关 =====

@bp.get("/settings")
@admin_required
def settings_page():
    current = {k: AppSetting.get_bool(k, default) for k, default in PUBLIC_KEYS.items()}
    return render_template("admin/settings.html",
                           settings=current, keys=PUBLIC_KEYS,
                           admin_name=session.get("admin_name"))


@bp.post("/settings/toggle")
@admin_required
def settings_toggle():
    key = request.form.get("key") or ""
    if key not in PUBLIC_KEYS:
        flash("无效配置项", "error")
        return redirect(url_for("admin.settings_page"))
    current = AppSetting.get_bool(key, PUBLIC_KEYS[key])
    AppSetting.set(key, "false" if current else "true")
    flash(f"{key} 已切换为 {'关闭' if current else '开启'}", "success")
    return redirect(url_for("admin.settings_page"))
