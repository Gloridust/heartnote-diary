import uuid
import base64
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
import requests

bp = Blueprint("speech", __name__)

RECOGNIZE_URL = "https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash"


@bp.post("/recognize")
@jwt_required()
def recognize():
    cfg = current_app.config
    if not cfg.get("BYTEDANCE_APP_KEY") or not cfg.get("BYTEDANCE_ACCESS_TOKEN"):
        return jsonify({"success": False, "error": "服务端未配置字节语音识别密钥"}), 500

    data = request.get_json(silent=True) or {}
    audio = data.get("audio_base64") or data.get("audioData") or ""
    if not audio:
        return jsonify({"success": False, "error": "audio_base64 必填"}), 400
    if audio.startswith("data:"):
        audio = audio.split(",", 1)[1]

    # 粗略校验 base64
    try:
        base64.b64decode(audio[:64] + "=" * (-len(audio[:64]) % 4))
    except Exception:
        return jsonify({"success": False, "error": "音频 base64 无效"}), 400

    headers = {
        "X-Api-App-Key": cfg["BYTEDANCE_APP_KEY"],
        "X-Api-Access-Key": cfg["BYTEDANCE_ACCESS_TOKEN"],
        "X-Api-Resource-Id": "volc.bigasr.auc_turbo",
        "X-Api-Request-Id": str(uuid.uuid4()),
        "X-Api-Sequence": "-1",
        "Content-Type": "application/json",
    }
    body = {
        "user": {"uid": cfg["BYTEDANCE_APP_KEY"] or "memoirai_user"},
        "audio": {"data": audio},
        "request": {
            "model_name": "bigmodel",
            "enable_itn": True,
            "enable_punc": True,
            "enable_ddc": True,
        },
    }
    try:
        r = requests.post(RECOGNIZE_URL, headers=headers, json=body, timeout=60)
        status_code = r.headers.get("X-Api-Status-Code")
        if status_code != "20000000":
            msg = r.headers.get("X-Api-Message") or "识别失败"
            return jsonify({"success": False, "error": msg}), 502
        j = r.json()
        text = (j.get("result") or {}).get("text") or ""
        if not text:
            utters = (j.get("result") or {}).get("utterances") or []
            text = " ".join(u.get("text", "") for u in utters if u.get("text"))
        return jsonify({"success": True, "text": text.strip() or "未识别到内容"})
    except Exception as e:
        current_app.logger.exception("STT 调用失败")
        return jsonify({"success": False, "error": f"STT 调用失败: {e}"}), 502
