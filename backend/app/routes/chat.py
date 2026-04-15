"""
LLM 对话代理 — 把豆包 API 包装成前端友好的结构化接口。
相比 MVP 的升级：
  1. 使用 Doubao 的 response_format=json_object 强制结构化输出
  2. 服务端校验 JSON schema + 兜底修复
  3. 增加 function-like tool: finish_diary / continue_chat
"""
import json
import re
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
import requests

bp = Blueprint("chat", __name__)

ARK_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions"

ALLOWED_TAGS = {
    "work", "personal", "travel", "relationships", "health",
    "goals", "reflection", "gratitude", "dreams", "memories",
}


def _system_prompt(weather: str | None, location: str | None) -> str:
    now = datetime.now()
    weekday = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][now.weekday() + 1 if now.weekday() != 6 else 0]
    # 修正周几计算
    weekday_map = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"]
    weekday = weekday_map[now.weekday()]
    time_ctx = f"今天是 {now.strftime('%Y-%m-%d')} {weekday} {now.strftime('%H:%M')}"
    env_bits = []
    if weather: env_bits.append(f"当前天气：{weather}")
    if location: env_bits.append(f"当前位置：{location}")
    env = ("\n\n# 环境信息\n" + "，".join(env_bits) + "。") if env_bits else ""

    return f"""# 角色
你是"声命体 MemoirAI"App 中的日记助手"小语"，是一位温柔、循循善诱的对话式日记引导者。你的语气像朋友，不急不躁，回复简短自然（通常一到两句），一次只问一个问题。禁止编造用户未提及的内容。

# 输出协议
必须输出合法 JSON（不加 markdown、不加代码块围栏），两种模式二选一：

模式 A — 继续对话：
{{"mode":"continue","message":"<你的回复，1-2 句>"}}

模式 B — 用户示意结束 / 信息足够时，生成日记：
{{"mode":"end","title":"<≤10字的标题>","message":"<完整日记 400-700 字>","score":<1-10 的整数>,"tag":"<下列之一>"}}

tag 只能取：work | personal | travel | relationships | health | goals | reflection | gratitude | dreams | memories。

# 行为规则
- 用户的情绪放在首位，偶尔给一句温柔的肯定/安慰，但别喧宾夺主。
- 生成日记时以第一人称，内容必须严格基于对话记录，不得虚构。
- 不要在回复里使用表情符号。

# 时间背景
{time_ctx}{env}
"""


def _extract_json(raw: str) -> dict | None:
    """尽力从模型输出里提出 JSON。"""
    if not raw:
        return None
    raw = raw.strip()
    # 去除可能的 ```json ``` 围栏
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.I | re.S).strip()
    try:
        return json.loads(raw)
    except Exception:
        pass
    # 找第一对 { ... }
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

    # end
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
@jwt_required()
def chat():
    cfg = current_app.config
    if not cfg.get("ARK_API_KEY"):
        return jsonify({"success": False, "error": "服务端未配置 ARK_API_KEY"}), 500

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
    return jsonify({"success": True, "content": normalized, "raw": raw})
