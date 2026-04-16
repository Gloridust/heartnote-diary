import json
from datetime import datetime
from flask import Blueprint, request, jsonify, g

from ..auth_helpers import auth_required
from ..extensions import db
from ..models import Diary

bp = Blueprint("diary", __name__)


def _ok(**kw):
    return jsonify({"status": "success", **kw})


def _err(msg, code=400):
    return jsonify({"status": "error", "message": msg}), code


def _parse_date(s: str) -> datetime:
    try:
        if "T" in s:
            return datetime.fromisoformat(s.replace("Z", "+00:00"))
        return datetime.strptime(s, "%Y-%m-%d %H:%M:%S")
    except Exception:
        return datetime.utcnow()


@bp.get("")
@auth_required
def list_diaries():
    uid = g.current_user.id
    entries = Diary.query.filter_by(user_id=uid).order_by(Diary.date.desc()).all()
    return _ok(user_id=uid, total=len(entries), data=[e.to_dict() for e in entries])


@bp.post("")
@auth_required
def save_diary():
    user = g.current_user
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    content = (data.get("content") or "").strip()
    date_str = data.get("date")
    if not title or not content or not date_str:
        return _err("title/content/date 为必填")

    diary_id = data.get("diary_id")
    diary = Diary.query.get(diary_id) if diary_id else None
    if diary and diary.user_id != user.id:
        return _err("无权修改此日记", 403)

    if not diary:
        diary = Diary(user_id=user.id)
        db.session.add(diary)

    diary.title = title
    diary.content = content
    diary.date = _parse_date(date_str)
    diary.score = data.get("score")
    diary.tag = data.get("tag")
    diary.location_json = json.dumps(data["location"], ensure_ascii=False) if data.get("location") else None
    diary.weather_json = json.dumps(data["weather"], ensure_ascii=False) if data.get("weather") else None

    db.session.commit()
    action = "更新" if diary_id else "创建"
    return _ok(message=f"日记{action}成功", diary_id=diary.id, action=action)


@bp.delete("/<int:diary_id>")
@auth_required
def delete_diary(diary_id: int):
    user = g.current_user
    diary = Diary.query.get(diary_id)
    if not diary:
        return _err("日记不存在", 404)
    if diary.user_id != user.id:
        return _err("无权删除此日记", 403)
    db.session.delete(diary)
    db.session.commit()
    return _ok(message="删除成功")
