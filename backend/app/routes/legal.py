"""隐私政策 / 用户协议 — 管理员可改的纯文本，App 内嵌打开。"""
from datetime import datetime
from flask import Blueprint, jsonify, render_template_string
from ..models import AppSetting

bp = Blueprint("legal", __name__)

DEFAULT_PRIVACY = """# 隐私政策

最后更新日期：2026-04-16

欢迎使用「声迹 MemoirAI」（以下简称"本应用"）。本应用尊重并保护所有用户的个人隐私权。本政策旨在帮助你了解我们如何收集、使用、存储和保护你的信息。

## 一、我们收集的信息

- **账号信息**：手机号、密码（加密存储）、自定义昵称。
- **日记内容**：你输入或语音生成的日记文本，以及你主动选择保存时的位置（市/区）和当时的天气信息。
- **对话记录**：与 AI 助手的对话，仅用于生成日记和保留未完成的草稿（24 小时本地缓存）。
- **设备权限**：麦克风（仅在录音时启用）、定位（仅在你打开对话页时获取一次粗粒度位置）。

## 二、我们如何使用这些信息

- 提供核心功能：账号登录、AI 对话、日记生成与查询。
- 改善体验：在日记中标注当时的天气与城市，便于回忆。
- 必要的安全防护：识别和防止异常登录、账号盗用。

## 三、我们如何保护你的信息

- 全程使用 HTTPS 加密传输。
- 密码采用 bcrypt 单向哈希，任何人（包括我们）都无法还原原始密码。
- 数据库访问受严格权限控制。

## 四、关于第三方服务

为实现核心功能，我们将必要的数据传输给以下第三方服务（这些服务商均承诺不留存或滥用你的数据）：

- **火山引擎（豆包）**：用于 AI 对话生成。
- **火山引擎（语音识别）**：用于将你的语音转写为文字。
- **高德地图**：用于把经纬度转换为城市名 + 当地天气。

## 五、你对自己数据的控制权

- 你可以随时在「我的 → 设置」中修改昵称、密码。
- 你可以随时删除任何一篇日记。
- 你可以注销账号，注销后你的所有日记将不再对外可见。

## 六、儿童隐私

本应用不针对 14 岁以下未成年人提供服务。如发现有未成年人未经监护人同意使用本应用，请及时联系我们删除。

## 七、政策变更

本政策可能会不定期更新。当政策有重大变更时，我们会在应用内显著位置进行提示。

## 八、联系我们

如对本政策有任何疑问，请通过应用内反馈渠道与我们联系。
"""


@bp.get("/privacy")
def privacy_html():
    """供 App 通过 WebView / 浏览器打开的隐私政策页面。"""
    md = AppSetting.get("legal_privacy") or DEFAULT_PRIVACY
    updated = AppSetting.get("legal_privacy_updated_at") or datetime.utcnow().strftime("%Y-%m-%d")
    # 极简 markdown → html，自己处理标题和段落即可
    html_body = _markdown_to_html(md)
    return render_template_string(_HTML_TEMPLATE, body=html_body, updated=updated)


@bp.get("/privacy.json")
def privacy_json():
    return jsonify({
        "status": "success",
        "data": {
            "content": AppSetting.get("legal_privacy") or DEFAULT_PRIVACY,
            "updated_at": AppSetting.get("legal_privacy_updated_at"),
        }
    })


def _markdown_to_html(md: str) -> str:
    out = []
    in_list = False
    for raw in md.splitlines():
        line = raw.rstrip()
        if not line.strip():
            if in_list:
                out.append("</ul>"); in_list = False
            out.append("")
            continue
        if line.startswith("# "):
            if in_list: out.append("</ul>"); in_list = False
            out.append(f"<h1>{_escape(line[2:])}</h1>")
        elif line.startswith("## "):
            if in_list: out.append("</ul>"); in_list = False
            out.append(f"<h2>{_escape(line[3:])}</h2>")
        elif line.startswith("### "):
            if in_list: out.append("</ul>"); in_list = False
            out.append(f"<h3>{_escape(line[4:])}</h3>")
        elif line.lstrip().startswith("- "):
            if not in_list: out.append("<ul>"); in_list = True
            out.append(f"<li>{_inline(line.lstrip()[2:])}</li>")
        else:
            if in_list: out.append("</ul>"); in_list = False
            out.append(f"<p>{_inline(line)}</p>")
    if in_list: out.append("</ul>")
    return "\n".join(out)


def _inline(s: str) -> str:
    s = _escape(s)
    # **加粗** → <strong>
    import re
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    return s


def _escape(s: str) -> str:
    return (s.replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


_HTML_TEMPLATE = """<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>隐私政策 · 声迹</title>
<style>
  :root{
    --bg:#f7f5ec; --surface:#fffcf4;
    --primary:#9b7fc7; --text:#2d2a3a; --muted:#7a7788;
    --border:#ede8d8;
  }
  *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
  body{margin:0;background:var(--bg);color:var(--text);
    font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Helvetica Neue",sans-serif;
    line-height:1.7;font-size:15px}
  .wrap{max-width:680px;margin:0 auto;padding:28px 22px 80px}
  .card{background:var(--surface);border-radius:18px;padding:24px;
    box-shadow:0 4px 20px rgba(0,0,0,.04);border:1px solid var(--border)}
  h1{font-size:22px;margin:0 0 8px;font-weight:700}
  h2{font-size:16px;margin:24px 0 8px;font-weight:600;color:var(--primary)}
  h3{font-size:14px;margin:16px 0 6px;font-weight:600}
  p{margin:0 0 12px}
  ul{padding-left:22px;margin:0 0 14px}
  li{margin-bottom:6px}
  strong{font-weight:600;color:var(--text)}
  .meta{color:var(--muted);font-size:12px;margin:0 0 18px}
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    {{ body|safe }}
  </div>
</div>
</body>
</html>
"""
