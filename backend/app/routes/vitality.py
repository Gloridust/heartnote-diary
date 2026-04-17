from datetime import datetime
from flask import Blueprint, request, jsonify, g
from sqlalchemy import func, case

from ..auth_helpers import auth_required
from ..extensions import db
from ..models import VitalityLog, RedeemCode
from ..rate_limit import Limits, rate_limit, get_client_ip
from ..vitality_service import grant

bp = Blueprint("vitality", __name__)


def _ok(**kw):
    return jsonify({"status": "success", **kw})


def _err(msg, code=400, **kw):
    return jsonify({"status": "error", "message": msg, **kw}), code


@bp.get("/balance")
@auth_required
def balance():
    return _ok(balance=g.current_user.vitality_balance)


@bp.get("/history")
@auth_required
def history():
    """按天聚合的流水。
    返回最近 90 天，每天一条 {day, gained, spent, records}。
    """
    uid = g.current_user.id
    # SQLite/MySQL 都支持 DATE() 函数
    day = func.date(VitalityLog.created_at)
    rows = (
        db.session.query(
            day.label("day"),
            func.sum(case((VitalityLog.delta > 0, VitalityLog.delta), else_=0)).label("gained"),
            func.sum(case((VitalityLog.delta < 0, -VitalityLog.delta), else_=0)).label("spent"),
            func.count(VitalityLog.id).label("records"),
        )
        .filter(VitalityLog.user_id == uid)
        .group_by(day)
        .order_by(day.desc())
        .limit(90)
        .all()
    )
    data = [{
        "day": str(r.day),
        "gained": int(r.gained or 0),
        "spent": int(r.spent or 0),
        "records": int(r.records or 0),
    } for r in rows]
    return _ok(data=data)


@bp.post("/redeem")
@auth_required
@rate_limit("redeem_user", **Limits.REDEEM_PER_USER, key_fn=lambda: str(g.current_user.id))
@rate_limit("redeem_ip", **Limits.REDEEM_PER_IP)
def redeem():
    """用户兑换码兑换。双层限流防止穷举。"""
    user = g.current_user
    data = request.get_json(silent=True) or {}
    raw = (data.get("code") or "").strip().upper().replace("-", "")
    if not raw:
        return _err("请输入兑换码")

    code = RedeemCode.query.filter_by(code=raw).first()
    if not code:
        return _err("兑换码无效", 404)
    if code.is_used:
        return _err("兑换码已被使用", 410)
    if code.is_expired:
        return _err("兑换码已过期", 410)

    code.used_by = user.id
    code.used_at = datetime.utcnow()
    grant(user, code.vitality, type_="redeem", note=f"兑换码 {code.code}")
    # grant 内部已 commit
    return _ok(vitality=user.vitality_balance, gained=code.vitality)
