# 内购（IAP）接入文档

> Apple App Store 内购的完整接入指南。当前代码里 UI / 后端骨架已就绪，
> 等真机能测时按本文档操作即可上线。

## 价格梯度（与代码严格对齐）

| product_id | 价格（CN）| 基础活力 | 含赠送 | 单价 |
|---|---|---|---|---|
| `memoirai.vitality.starter`  | ¥8   | 120  | **120** ⚡  | 0.067 元/⚡ |
| `memoirai.vitality.standard` | ¥30  | 450  | **500** ⚡  | 0.060 元/⚡ |
| `memoirai.vitality.popular`  | ¥68  | 1020 | **1200** ⚡ | 0.057 元/⚡ |
| `memoirai.vitality.premium`  | ¥198 | 2970 | **3800** ⚡ | 0.052 元/⚡ |

来源：
- 前端：`memoirai/lib/services/iap_pricing.dart::IapPricing.products`
- 后端：`backend/app/routes/iap.py::PRODUCTS`

⚠️ 改价时**两处必须同步改**，否则用户付了 ¥198 后端只发 1200 ⚡ 就要赔钱。

## App Store Connect 配置

### 1. 创建 4 个 Consumable 商品

App Store Connect → 你的 App → 内购项目 → 创建：

对每个 product_id：
- **类型**：消耗型（Consumable）
- **参考名称**：声迹·起步包 / 进阶包 / 推荐包 / 超值包
- **产品 ID**：严格用上表的 `memoirai.vitality.xxx`
- **定价**：选对应的中国区 Tier
  - ¥8   → Tier 8
  - ¥30  → Tier 30
  - ¥68  → Tier 68
  - ¥198 → Tier 198
- **本地化显示名称**（zh-Hans）：起步包 / 进阶包 / 推荐包 / 超值包
- **描述**：「120 活力，用于 AI 对话和日记生成」（按档位填）
- **审核截图**：截一张充值页对应卡片的图

### 2. 共享密钥

创建后到 App 信息 → App 专用共享密钥（App-Specific Shared Secret），生成并复制 32 位 hex。
填到后端 `.env`：

```
APP_STORE_SHARED_SECRET=xxxx...（32 位 hex）
```

### 3. 沙盒测试账号

用户和访问 → 沙箱测试员 → 添加。
真机登出 App Store 后用沙箱账号登录才能测购买（**不会真扣钱**）。

## Flutter 端集成步骤

### 1. 加依赖

`memoirai/pubspec.yaml`：
```yaml
dependencies:
  in_app_purchase: ^3.2.0
```

### 2. 实现购买流程

新建 `memoirai/lib/services/iap_service.dart`，主流程：

```dart
import 'package:in_app_purchase/in_app_purchase.dart';

class IapService {
  static final _iap = InAppPurchase.instance;

  /// 启动时调用：监听购买队列
  static Future<void> init({
    required Future<void> Function(PurchaseDetails) onVerify,
  }) async {
    if (!await _iap.isAvailable()) return;

    _iap.purchaseStream.listen((purchases) async {
      for (final p in purchases) {
        if (p.status == PurchaseStatus.purchased ||
            p.status == PurchaseStatus.restored) {
          // 上传 receipt 到后端校验
          await onVerify(p);
        } else if (p.status == PurchaseStatus.error) {
          // 用户取消或支付失败
        }
        if (p.pendingCompletePurchase) {
          await _iap.completePurchase(p);
        }
      }
    });
  }

  /// 拉商品详情（拿本地化价格）
  static Future<List<ProductDetails>> queryProducts(Set<String> ids) async {
    final r = await _iap.queryProductDetails(ids);
    return r.productDetails;
  }

  /// 发起购买
  static Future<bool> buy(ProductDetails product) {
    final param = PurchaseParam(productDetails: product);
    return _iap.buyConsumable(purchaseParam: param);
  }
}
```

### 3. 充值页接入

`recharge_page.dart` 的 `_onPurchase`：

```dart
void _onPurchase(BuildContext context) async {
  Haptics.tap();
  // 拿对应的 ProductDetails
  final pd = await IapService.queryProducts({product.productId});
  if (pd.isEmpty) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('商品暂不可购买')));
    return;
  }
  final ok = await IapService.buy(pd.first);
  // 后续在 IapService.init 注册的回调里处理
}
```

### 4. App 启动时注册回调

`main.dart` 启动后或 `splash_page.dart`：

```dart
IapService.init(onVerify: (purchase) async {
  // 上传 receipt 到后端
  final receipt = purchase.verificationData.serverVerificationData;
  await ApiService.instance.verifyIap(
    productId: purchase.productID,
    receipt: receipt,
    transactionId: purchase.purchaseID ?? '',
  );
  // 后端会加活力，前端刷新余额
  context.read<VitalityProvider>().refreshBalance();
});
```

## 后端校验流程（`/api/iap/verify`）

当前代码：`backend/app/routes/iap.py`，已经有完整骨架，只剩 Apple 校验调用要填。

填充以下逻辑：

```python
# 1. 调用 Apple verifyReceipt
import requests
r = requests.post(
    "https://buy.itunes.apple.com/verifyReceipt",
    json={
        "receipt-data": receipt,
        "password": current_app.config["APP_STORE_SHARED_SECRET"],
        "exclude-old-transactions": True,
    },
    timeout=10,
)
j = r.json()
# 21007 = 沙箱收据被发到生产环境
if j.get("status") == 21007:
    r = requests.post(
        "https://sandbox.itunes.apple.com/verifyReceipt",
        json={...}, timeout=10,
    )
    j = r.json()
if j.get("status") != 0:
    return jsonify({"status": "error", "message": "Apple 校验失败"}), 402

# 2. 找到对应 product_id 的最新 transaction
in_app = j.get("receipt", {}).get("in_app", [])
matched = [t for t in in_app if t["product_id"] == product_id]
if not matched: return ...
tx = max(matched, key=lambda t: int(t["purchase_date_ms"]))
tx_id = tx["transaction_id"]

# 3. 防重放：写库前查 IapTransaction 表
if IapTransaction.query.filter_by(transaction_id=tx_id).first():
    # 已处理过，直接返回成功（幂等）
    return jsonify({"status": "success", "vitality": user.vitality_balance})

# 4. 入账
_, total = PRODUCTS[product_id]
grant(user, total, type_="iap", note=f"iAP {product_id} tx:{tx_id}")
db.session.add(IapTransaction(
    transaction_id=tx_id, user_id=user.id, product_id=product_id,
    vitality=total, raw_receipt=receipt[:1000],  # 截断防止存太大
))
db.session.commit()

return jsonify({
    "status": "success",
    "vitality": user.vitality_balance,
    "gained": total,
})
```

需要新建 `IapTransaction` model：

```python
class IapTransaction(db.Model):
    __tablename__ = "iap_transactions"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    transaction_id = db.Column(db.String(64), unique=True, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    product_id = db.Column(db.String(64), nullable=False)
    vitality = db.Column(db.Integer, nullable=False)
    raw_receipt = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
```

## 安全 / 防爆破

- `/api/iap/verify` 已套用 `auth_required`（必须登录）
- 已套用 `@rate_limit("iap_verify", max_attempts=30, window=60)`
  - 单个用户 1 分钟内最多 30 次 verify 请求
  - 正常使用一笔订单只触发 1 次，30 次足以应对网络重试
- `transaction_id` 唯一索引保证幂等：同一笔不会被加两次活力

## 上线 checklist

- [ ] App Store Connect 4 个商品创建并提交审核
- [ ] 共享密钥 `APP_STORE_SHARED_SECRET` 写入生产 `.env`
- [ ] 后端 `IapTransaction` 表迁移
- [ ] 后端 `verify` 接口的 TODO 部分填充实现
- [ ] Flutter 加 `in_app_purchase` 依赖
- [ ] `IapService` 实现 + `_onPurchase` 接入
- [ ] `main.dart` 注册购买回调
- [ ] 用沙盒账号在真机走完一遍：购买 → 收 receipt → 后端校验 → 活力到账
- [ ] 测试网络中断恢复：购买成功但服务端没收到 → 重启 App 应能自动重发 receipt
- [ ] 测试用户登出/换账户的边界（receipt 应当属于当前 Apple ID 而非 App 用户）

## 退款策略

苹果消耗品在中国区一般不退。如果用户找客服要求退款：
1. 确认是否真的扣款（让用户提供 Apple 邮箱发的收据邮件）
2. 在管理后台 `/admin` 找到该用户，扣除对应活力（如已消费完则不扣）
3. 引导用户走 [Apple 退款流程](https://reportaproblem.apple.com)
