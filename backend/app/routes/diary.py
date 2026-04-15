import json
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..extensions import db
from ..models import Diary, User

bp = Blueprint("diary", __name__)


def _ok(**kw):
    return jsonify({"status": "success", **kw})


def _err(msg, code=400):
    return jsonify({"status": "error", "message": msg}), code


def _parse_date(s: str) -> datetime:
    try:
        if "T" in s:
            # ISO 格式
            return datetime.fromisoformat(s.replace("Z", "+00:00"))
        return datetime.strptime(s, "%Y-%m-%d %H:%M:%S")
    except Exception:
        return datetime.utcnow()


@bp.get("")
@jwt_required()
def list_diaries():
    uid = int(get_jwt_identity())
    entries = Diary.query.filter_by(user_id=uid).order_by(Diary.date.desc()).all()
    return _ok(user_id=uid, total=len(entries), data=[e.to_dict() for e in entries])


@bp.post("")
@jwt_required()
def save_diary():
    uid = int(get_jwt_identity())
    user = User.query.get(uid)
    if not user:
        return _err("用户不存在", 404)

    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    content = (data.get("content") or "").strip()
    date_str = data.get("date")
    if not title or not content or not date_str:
        return _err("title/content/date 为必填")

    diary_id = data.get("diary_id")
    diary = Diary.query.get(diary_id) if diary_id else None
    if diary and diary.user_id != uid:
        return _err("无权修改此日记", 403)

    if not diary:
        diary = Diary(user_id=uid)
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
@jwt_required()
def delete_diary(diary_id: int):
    uid = int(get_jwt_identity())
    diary = Diary.query.get(diary_id)
    if not diary:
        return _err("日记不存在", 404)
    if diary.user_id != uid:
        return _err("无权删除此日记", 403)
    db.session.delete(diary)
    db.session.commit()
    return _ok(message="删除成功")
