"""客户端公开的云控开关。"""
from flask import Blueprint, jsonify
from ..models import AppSetting

bp = Blueprint("settings", __name__)


# 这里集中声明前端能感知的开关 + 默认值
PUBLIC_KEYS = {
    "redeem_code_enabled": False,   # 兑换码入口
    "iap_enabled": True,             # iOS App Store 内购入口
}


@bp.get("/public")
def public():
    out = {}
    for k, default in PUBLIC_KEYS.items():
        out[k] = AppSetting.get_bool(k, default)
    return jsonify({"status": "success", "data": out})
