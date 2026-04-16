"""LLM 对话代理 + 活力扣费。"""
import json
import re
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app, g
import requests

from ..auth_helpers import auth_required
from ..vitality_service import consume, InsufficientVitality, Cost

bp = Blueprint("chat", __name__)

ARK_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions"

ALLOWED_TAGS = {
    "work", "personal", "travel", "relationships", "health",
    "goals", "reflection", "gratitude", "dreams", "memories",
}


def _system_prompt(weather: str | None, location: str | None) -> str:
    now = datetime.now()
    weekday_map = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"]
    weekday = weekday_map[now.weekday()]
    time_ctx = f"今天是 {now.strftime('%Y-%m-%d')} {weekday} {now.strftime('%H:%M')}"
    env_bits = []
    if weather: env_bits.append(f"当前天气：{weather}")
    if location: env_bits.append(f"当前位置：{location}")
    env = ("\n\n# 环境信息\n" + "，".join(env_bits) + "。") if env_bits else ""

    return f"""# 角色
你是"声迹 MemoirAI"App 中的日记助手"小语"，是一位温柔、循循善诱的对话式日记引导者。你的语气像朋友，不急不躁，回复简短自然（通常一到两句），一次只问一个问题。禁止编造用户未提及的内容。

# 输出协议
必须输出合法 JSON（不加 markdown、不加代码块围栏），两种模式二选一：

模式 A — 继续对话：
{{"mode":"continue","message":"<你的回复，1-2 句>"}}

模式 B — 用户示意结束 / 信息足够时，生成日记：
{{"mode":"end","title":"<≤10字的标题>","message":"<完整日记，至少 500 字>","score":<1-10 的整数>,"tag":"<下列之一>"}}

tag 只能取：work | personal | travel | relationships | health | goals | reflection | gratitude | dreams | memories。

# 行为规则
- 用户的情绪放在首位，适当时机偶尔加入一句安慰/鼓励的话，但不要浪费太多时间。
- 生成日记时以第一人称，内容必须严格基于对话记录，不得虚构。
- 回复只能是纯 JSON，不能包含任何 markdown 标记或代码块围栏。
- JSON 中的字符串值不能包含换行符、制表符等控制字符。

# 时间背景
{time_ctx}{env}
"""


def _extract_json(raw: str) -> dict | None:
    if not raw:
        return None
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.I | re.S).strip()
    try:
        return json.loads(raw)
    except Exception:
        pass
    m = re.search(r"\{.*\}", raw, flags=re.S)
    if m:
        try:
            return json.loads(m.group(0))
        except Exception:
            return None
    return None


def _normalize(parsed: dict) -> dict:
    mode = parsed.get("mode")
    if mode not in ("continue", "end"):
        return {"mode": "continue", "message": parsed.get("message") or "嗯嗯，再多说一点？"}

    if mode == "continue":
        msg = (parsed.get("message") or "").strip() or "嗯，我在听呢。"
        return {"mode": "continue", "message": msg}

    title = (parsed.get("title") or "今日日记").strip()[:20]
    msg = (parsed.get("message") or "").strip()
    try:
        score = int(parsed.get("score", 5))
    except Exception:
        score = 5
    score = max(1, min(10, score))
    tag = parsed.get("tag") or "personal"
    if tag not in ALLOWED_TAGS:
        tag = "personal"
    return {"mode": "end", "title": title, "message": msg, "score": score, "tag": tag}


@bp.post("")
@auth_required
def chat():
    cfg = current_app.config
    if not cfg.get("ARK_API_KEY"):
        return jsonify({"success": False, "error": "服务端未配置 ARK_API_KEY"}), 500

    user = g.current_user
    # 前置最低门槛：余额至少够 1 ⚡（continue），不够直接拒绝
    if user.vitality_balance < Cost.CHAT_TURN:
        return jsonify({
            "success": False, "error": "活力不足，请充值后继续",
            "code": "vitality_insufficient", "balance": user.vitality_balance,
        }), 402

    data = request.get_json(silent=True) or {}
    messages = data.get("messages") or []
    if not isinstance(messages, list) or not messages:
        return jsonify({"success": False, "error": "messages 必填"}), 400

    sys_msg = {"role": "system", "content": _system_prompt(
        data.get("weather"), data.get("location"))}

    payload = {
        "model": cfg["DOUBAO_MODEL"],
        "messages": [sys_msg, *messages],
        "stream": False,
        "max_tokens": 2000,
        "temperature": 0.8,
        "response_format": {"type": "json_object"},
    }
    try:
        r = requests.post(
            ARK_URL, timeout=60,
            headers={"Authorization": f"Bearer {cfg['ARK_API_KEY']}",
                     "Content-Type": "application/json"},
            json=payload,
        )
        r.raise_for_status()
        body = r.json()
        raw = body["choices"][0]["message"]["content"]
    except Exception as e:
        current_app.logger.exception("LLM 调用失败")
        return jsonify({"success": False, "error": f"LLM 调用失败: {e}"}), 502

    parsed = _extract_json(raw) or {"mode": "continue", "message": raw[:200]}
    normalized = _normalize(parsed)

    # ===== LLM 调用成功 → 按 mode 扣费 =====
    cost = Cost.CHAT_END if normalized["mode"] == "end" else Cost.CHAT_TURN
    try:
        consume(user, cost, type_="chat",
                note="生成日记" if normalized["mode"] == "end" else "对话")
    except InsufficientVitality:
        # 罕见：余额刚好 1 但 LLM 返回 end（需要 5）。允许扣到 0，避免 LLM 调用浪费
        from ..vitality_service import revoke
        revoke(user, user.vitality_balance, note="活力不足按当前余额结算")

    return jsonify({
        "success": True, "content": normalized, "raw": raw,
        "vitality": user.vitality_balance,
    })
