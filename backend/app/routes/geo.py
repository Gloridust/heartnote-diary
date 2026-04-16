"""
位置 & 天气代理 — 使用高德地图 Web 服务
大陆网络稳定、同一 key 覆盖逆地理+天气、免费额度 5000 次/天。
申请：https://console.amap.com/dev/key/app (选"Web 服务"类型)

只代理，不缓存（请求量足够低），前端只拿到格式化好的 JSON。
"""
from flask import Blueprint, request, jsonify, current_app
import requests

from ..auth_helpers import auth_required

bp = Blueprint("geo", __name__)

AMAP_REGEO = "https://restapi.amap.com/v3/geocode/regeo"
AMAP_WEATHER = "https://restapi.amap.com/v3/weather/weatherInfo"

# 高德天气描述 → 简化 emoji/icon 映射
_WEATHER_ICON = {
    "晴": "sunny", "热": "sunny", "多云": "cloudy", "阴": "cloudy",
    "雨": "rain", "阵雨": "rain", "雷阵雨": "thunder", "小雨": "rain",
    "中雨": "rain", "大雨": "rain", "暴雨": "rain", "雪": "snow",
    "小雪": "snow", "中雪": "snow", "大雪": "snow", "雾": "fog",
    "霾": "fog", "沙尘": "fog",
}


def _icon_for(desc: str) -> str:
    for k, v in _WEATHER_ICON.items():
        if k in desc:
            return v
    return "unknown"


def _err(msg, code=400):
    return jsonify({"status": "error", "message": msg}), code


@bp.get("/context")
@auth_required
def context():
    """一次请求同时返回位置 + 天气，前端更简单。
    query: ?lat=...&lon=...
    """
    cfg = current_app.config
    key = cfg.get("AMAP_KEY")
    if not key:
        return _err("服务端未配置 AMAP_KEY", 500)

    try:
        lat = float(request.args.get("lat", ""))
        lon = float(request.args.get("lon", ""))
    except ValueError:
        return _err("lat/lon 必须为数字")

    # 1) 逆地理编码
    try:
        r = requests.get(AMAP_REGEO, params={
            "key": key, "location": f"{lon},{lat}",
            "radius": 200, "extensions": "base", "output": "JSON",
        }, timeout=8)
        r.raise_for_status()
        rj = r.json()
    except Exception as e:
        current_app.logger.exception("高德逆地理失败")
        return _err(f"逆地理失败：{e}", 502)

    if rj.get("status") != "1":
        return _err(f"逆地理失败：{rj.get('info', 'unknown')}", 502)

    rg = rj.get("regeocode") or {}
    addr_comp = rg.get("addressComponent") or {}
    # 高德返回中 city 可能是 list（直辖市），district 为空
    def _s(v):
        if isinstance(v, list):
            return v[0] if v else ""
        return v or ""

    city = _s(addr_comp.get("city")) or _s(addr_comp.get("province"))
    district = _s(addr_comp.get("district"))
    township = _s(addr_comp.get("township"))
    street_info = addr_comp.get("streetNumber") or {}
    street = _s(street_info.get("street"))
    number = _s(street_info.get("number"))
    adcode = _s(addr_comp.get("adcode"))

    # 精简中文地址：城市 + 区 + 街道 + 门牌
    parts = [p for p in [city, district, township, street] if p]
    if number:
        parts.append(f"{number}号")
    formatted = "".join(parts) or rg.get("formatted_address", "未知位置")

    location = {
        "latitude": lat, "longitude": lon,
        "formatted_address": formatted,
        "city": city, "district": district, "street": street,
        "adcode": adcode,
    }

    # 2) 天气（需要 adcode）
    weather = None
    if adcode:
        try:
            r2 = requests.get(AMAP_WEATHER, params={
                "key": key, "city": adcode, "extensions": "base", "output": "JSON",
            }, timeout=8)
            r2.raise_for_status()
            wj = r2.json()
            if wj.get("status") == "1" and wj.get("lives"):
                live = wj["lives"][0]
                temp = int(live.get("temperature", 0) or 0)
                desc = live.get("weather", "") or ""
                weather = {
                    "temperature": temp,
                    "feels_like": temp,  # 高德免费版无体感，占位
                    "description": desc,
                    "icon": _icon_for(desc),
                    "humidity": int(live.get("humidity", 0) or 0),
                    "wind_speed": 0,  # 高德 windpower 是级别（字符串），这里简化
                    "wind_direction": live.get("winddirection") or "",
                    "wind_power": live.get("windpower") or "",
                }
        except Exception as e:
            current_app.logger.warning(f"高德天气失败：{e}")

    return jsonify({"status": "success", "data": {
        "location": location,
        "weather": weather,
    }})
