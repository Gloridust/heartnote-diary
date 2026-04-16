/// 内购套餐定价
/// 价格档位严格对齐 App Store Connect 中国区可用 tier。
/// product_id 同时用作后端校验的标识。
class IapProduct {
  /// 必须与 App Store Connect 中创建的 product id 一致
  final String productId;
  final String name;
  /// 含赠送的实际到账活力
  final int vitality;
  /// 基础活力（不含赠送）
  final int baseVitality;
  /// 显示价格 — 真机上会被 in_app_purchase 拉到的本地化价格覆盖
  final String displayPrice;
  /// 价位档位标识
  final IapBadge? badge;

  const IapProduct({
    required this.productId,
    required this.name,
    required this.vitality,
    required this.baseVitality,
    required this.displayPrice,
    this.badge,
  });

  int get bonus => vitality - baseVitality;
  bool get hasBonus => bonus > 0;
}

enum IapBadge {
  popular,  // 最受欢迎
  bestValue, // 最划算
}

class IapPricing {
  IapPricing._();

  static const products = <IapProduct>[
    IapProduct(
      productId: 'memoirai.vitality.starter',
      name: '起步包',
      baseVitality: 120,
      vitality: 120,
      displayPrice: '¥8',
    ),
    IapProduct(
      productId: 'memoirai.vitality.standard',
      name: '进阶包',
      baseVitality: 450,
      vitality: 500,
      displayPrice: '¥30',
    ),
    IapProduct(
      productId: 'memoirai.vitality.popular',
      name: '推荐包',
      baseVitality: 1020,
      vitality: 1200,
      displayPrice: '¥68',
      badge: IapBadge.popular,
    ),
    IapProduct(
      productId: 'memoirai.vitality.premium',
      name: '超值包',
      baseVitality: 2970,
      vitality: 3800,
      displayPrice: '¥198',
      badge: IapBadge.bestValue,
    ),
  ];
}
