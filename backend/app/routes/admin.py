from datetime import datetime, timedelta
from functools import wraps
from flask import Blueprint, request, render_template, redirect, url_for, session, flash
from passlib.hash import bcrypt

from ..extensions import db
from ..models import (User, Admin, Diary, RedeemCode, AppSetting, VitalityLog,
                      gen_user_id, gen_redeem_code, gen_batch_id)
from ..rate_limit import Limits, check_lock, record_failure, clear_failures, get_client_ip
from ..routes.settings import PUBLIC_KEYS
from ..routes.legal import DEFAULT_PRIVACY
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
    # 双 key 锁定：账号 + IP（任一触发即锁）
    key_acc = username or "unknown"
    key_ip = get_client_ip()
    for scope, key in [("admin_login_acc", key_acc), ("admin_login_ip", key_ip)]:
        locked, remain = check_lock(scope, key)
        if locked:
            flash(f"操作过于频繁，请 {remain // 60 + 1} 分钟后再试", "error")
            return redirect(url_for("admin.login"))

    admin = Admin.query.filter_by(username=username).first()
    if not admin or not bcrypt.verify(password, admin.password_hash):
        for scope, key in [("admin_login_acc", key_acc), ("admin_login_ip", key_ip)]:
            n, locked, remain = record_failure(scope, key, **Limits.ADMIN_LOGIN)
            if locked:
                flash(f"失败次数过多，已锁定 {remain // 60 + 1} 分钟", "error")
                return redirect(url_for("admin.login"))
        flash("账号或密码错误", "error")
        return redirect(url_for("admin.login"))
    # 成功 — 清两个 key 的计数
    clear_failures("admin_login_acc", key_acc)
    clear_failures("admin_login_ip", key_ip)
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
    batch_filter = (request.args.get("batch") or "").strip()
    q = RedeemCode.query
    if status_filter == "unused":
        q = q.filter(RedeemCode.used_by.is_(None))
    elif status_filter == "used":
        q = q.filter(RedeemCode.used_by.isnot(None))
    if batch_filter:
        q = q.filter(RedeemCode.batch_id == batch_filter)
    codes = q.order_by(RedeemCode.created_at.desc()).limit(500).all()

    # 入口开关当前状态（默认关）
    redeem_entry_enabled = AppSetting.get_bool("redeem_code_enabled", False)

    # 提取使用人手机号末四位（脱敏展示）
    user_map = {}
    user_ids = [c.used_by for c in codes if c.used_by]
    if user_ids:
        for u in User.query.filter(User.id.in_(user_ids)).all():
            user_map[u.id] = u

    return render_template("admin/codes.html", codes=codes,
                           status_filter=status_filter,
                           batch_filter=batch_filter,
                           redeem_entry_enabled=redeem_entry_enabled,
                           user_map=user_map,
                           admin_name=session.get("admin_name"))


@bp.post("/codes/toggle-entry")
@admin_required
def codes_toggle_entry():
    """快速切换"兑换码入口"云控开关，效果同 /admin/settings 里的对应项。"""
    current = AppSetting.get_bool("redeem_code_enabled", False)
    AppSetting.set("redeem_code_enabled", "false" if current else "true")
    flash(f"兑换码入口已{'关闭' if current else '开启'}", "success")
    return redirect(url_for("admin.codes_list"))


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

    # 同一次生成的所有码共享 batch_id
    batch_id = gen_batch_id()
    for _ in range(count):
        db.session.add(RedeemCode(
            code=gen_redeem_code(), batch_id=batch_id,
            vitality=vitality, expires_at=expires_at, note=note,
        ))
    db.session.commit()
    flash(f"已生成 {count} 个兑换码（每个 {vitality} 活力，批次 {batch_id}）", "success")
    return redirect(url_for("admin.codes_list", batch=batch_id))


@bp.post("/codes/<int:cid>/delete")
@admin_required
def codes_delete(cid):
    c = RedeemCode.query.get_or_404(cid)
    if c.is_used:
        flash("已使用的兑换码不能删除", "error")
        return redirect(url_for("admin.codes_list"))
    db.session.delete(c)
    db.session.commit()
    flash("已删除该兑换码", "success")
    return redirect(url_for("admin.codes_list"))


@bp.post("/codes/batch/<batch_id>/delete-unused")
@admin_required
def codes_batch_delete_unused(batch_id):
    """删除该批次中所有未使用的码（已使用的保留以维护历史记录）。"""
    deleted = RedeemCode.query.filter_by(batch_id=batch_id, used_by=None).delete()
    db.session.commit()
    flash(f"已删除批次 {batch_id} 中 {deleted} 个未使用的码", "success")
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


# ===== 隐私政策编辑 =====

@bp.get("/legal")
@admin_required
def legal_page():
    content = AppSetting.get("legal_privacy") or DEFAULT_PRIVACY
    updated = AppSetting.get("legal_privacy_updated_at")
    return render_template("admin/legal.html",
                           content=content, updated=updated,
                           admin_name=session.get("admin_name"))


@bp.post("/legal")
@admin_required
def legal_save():
    content = request.form.get("content") or ""
    if not content.strip():
        flash("内容不能为空", "error")
        return redirect(url_for("admin.legal_page"))
    AppSetting.set("legal_privacy", content)
    AppSetting.set("legal_privacy_updated_at", datetime.utcnow().strftime("%Y-%m-%d"))
    flash("隐私政策已更新", "success")
    return redirect(url_for("admin.legal_page"))


@bp.post("/legal/reset")
@admin_required
def legal_reset():
    AppSetting.set("legal_privacy", DEFAULT_PRIVACY)
    AppSetting.set("legal_privacy_updated_at", datetime.utcnow().strftime("%Y-%m-%d"))
    flash("已重置为默认模板", "success")
    return redirect(url_for("admin.legal_page"))
