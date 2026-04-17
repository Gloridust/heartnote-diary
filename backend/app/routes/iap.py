"""Apple App Store 内购 receipt 校验接口（骨架）。完整接入文档见 /doc/iap.md。"""
from flask import Blueprint, request, jsonify, g, current_app

from ..auth_helpers import auth_required
from ..rate_limit import Limits, rate_limit

bp = Blueprint("iap", __name__)


# 商品 ID → (基础活力, 总活力含赠送) — 与前端 IapPricing 严格对齐
PRODUCTS = {
    "memoirai.vitality.starter":  (120,  120),
    "memoirai.vitality.standard": (450,  500),
    "memoirai.vitality.popular":  (1020, 1200),
    "memoirai.vitality.premium":  (2970, 3800),
}


@bp.post("/verify")
@auth_required
@rate_limit("iap_verify", **Limits.IAP_VERIFY, key_fn=lambda: str(g.current_user.id))
def verify():
    """校验 Apple 收据并入账。"""
    data = request.get_json(silent=True) or {}
    product_id = (data.get("product_id") or "").strip()
    receipt = data.get("receipt")
    transaction_id = (data.get("transaction_id") or "").strip()

    if product_id not in PRODUCTS:
        return jsonify({"status": "error", "message": "未知商品 ID"}), 400
    if not receipt:
        return jsonify({"status": "error", "message": "缺少 receipt"}), 400

    # ===== TODO: 真正的 Apple 校验 =====
    # import requests
    # r = requests.post(
    #     "https://buy.itunes.apple.com/verifyReceipt",
    #     json={
    #         "receipt-data": receipt,
    #         "password": current_app.config["APP_STORE_SHARED_SECRET"],
    #         "exclude-old-transactions": True,
    #     }, timeout=10,
    # )
    # j = r.json()
    # if j.get("status") == 21007:  # sandbox
    #     r = requests.post("https://sandbox.itunes.apple.com/verifyReceipt", ...)
    # if j.get("status") != 0: return _err("Apple 校验失败", 402)
    # # 找到对应 product_id 的最新 transaction
    # # 防重放：transaction_id 在 iap_transactions 表里要唯一
    # ...
    # ===== 以上还没实现 =====

    return jsonify({
        "status": "error",
        "code": "iap_not_implemented",
        "message": "IAP 验证服务尚未接入，请等待版本更新",
    }), 501
