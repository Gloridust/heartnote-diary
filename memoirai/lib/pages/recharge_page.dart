import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../providers/settings_provider.dart';
import '../providers/vitality_provider.dart';
import '../services/iap_pricing.dart';
import '../theme/colors.dart';
import '../utils/haptics.dart';
import '../widgets/glass_card.dart';
import '../widgets/sliding_segment.dart';

class RechargePage extends StatefulWidget {
  const RechargePage({super.key});
  @override State<RechargePage> createState() => _RechargePageState();
}

class _RechargePageState extends State<RechargePage> {
  late final PageController _pc;
  int _idx = 0;
  late final List<_TabSpec> _tabs;

  @override
  void initState() {
    super.initState();
    final settings = context.read<SettingsProvider>();
    final iapEnabled = Platform.isIOS && settings.iapEnabled;
    final redeemEnabled = settings.redeemCodeEnabled;
    _tabs = [
      if (iapEnabled) _TabSpec('iap', 'App Store', _IapPanel()),
      if (redeemEnabled) _TabSpec('redeem', '兑换码', _RedeemPanel()),
    ];
    if (_tabs.isEmpty) {
      _tabs = [_TabSpec('disabled', '提示', _DisabledPanel())];
    }
    _pc = PageController();
  }

  @override
  void dispose() { _pc.dispose(); super.dispose(); }

  void _go(int i) {
    setState(() => _idx = i);
    _pc.animateToPage(i,
      duration: const Duration(milliseconds: 320), curve: Curves.easeOutCubic);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('充值')),
      body: Column(children: [
        if (_tabs.length > 1) Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 6),
          child: SlidingSegment<int>(
            value: _idx,
            onChanged: _go,
            items: [
              for (int i = 0; i < _tabs.length; i++)
                SlidingSegmentItem(value: i, label: _tabs[i].label),
            ],
          ),
        ),
        Expanded(child: PageView(
          controller: _pc,
          onPageChanged: (i) => setState(() => _idx = i),
          children: [for (final t in _tabs) t.body],
        )),
      ]),
    );
  }
}

class _TabSpec {
  final String key;
  final String label;
  final Widget body;
  _TabSpec(this.key, this.label, this.body);
}

// ===== IAP 面板 =====
class _IapPanel extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 30),
      children: [
        for (final p in IapPricing.products)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _IapProductCard(product: p),
          ),
        const SizedBox(height: 8),
        const Center(
          child: Text('支付通过 Apple App Store 完成',
            style: TextStyle(fontSize: 11, color: AppColors.textTertiary)),
        ),
      ],
    );
  }
}

class _IapProductCard extends StatelessWidget {
  final IapProduct product;
  const _IapProductCard({required this.product});

  void _onPurchase(BuildContext context) {
    Haptics.tap();
    // TODO: 集成 in_app_purchase 包，发起 Apple StoreKit 购买流程
    // 1. await InAppPurchase.instance.buyConsumable(product: ...);
    // 2. 拿到 purchase receipt 上传后端 /api/iap/verify
    // 3. 后端校验通过 → 加活力 → 客户端 vitality 自动刷新
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('App Store 内购功能即将上线'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isHot = product.badge != null;
    return GestureDetector(
      onTap: () => _onPurchase(context),
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter, end: Alignment.bottomCenter,
            colors: isHot
              ? [AppColors.surface, Color.lerp(AppColors.surface, AppColors.primarySoft, .55)!]
              : [AppColors.surface, Color.lerp(AppColors.surface, AppColors.bgPageAlt, .12)!],
          ),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isHot ? AppColors.primary.withValues(alpha: .35) : AppColors.border,
            width: isHot ? 1.5 : 1,
          ),
          boxShadow: isHot
            ? [BoxShadow(color: AppColors.primary.withValues(alpha: .15),
                blurRadius: 18, offset: const Offset(0, 6))]
            : const [BoxShadow(color: Color(0x14000000),
                blurRadius: 14, offset: Offset(0, 5))],
        ),
        child: Stack(clipBehavior: Clip.none, children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
            child: Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
              // 左侧：闪电图
              Container(
                width: 56, height: 56,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppColors.primaryLight, AppColors.primary],
                    begin: Alignment.topLeft, end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(18),
                  boxShadow: [BoxShadow(
                    color: AppColors.primary.withValues(alpha: .35),
                    blurRadius: 12, offset: const Offset(0, 4))],
                ),
                child: const Center(
                  child: Icon(Icons.bolt_rounded, color: Colors.white, size: 30)),
              ),
              const SizedBox(width: 14),
              // 中间：名称 + 活力
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(product.name,
                      style: const TextStyle(fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary)),
                    const SizedBox(height: 4),
                    Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                      Text('${product.vitality}',
                        style: const TextStyle(fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                          height: 1)),
                      const SizedBox(width: 4),
                      const Padding(
                        padding: EdgeInsets.only(bottom: 3),
                        child: Text('活力',
                          style: TextStyle(fontSize: 12,
                            color: AppColors.textSecondary,
                            fontWeight: FontWeight.w500)),
                      ),
                      if (product.hasBonus) ...[
                        const SizedBox(width: 6),
                        Padding(
                          padding: const EdgeInsets.only(bottom: 2),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.success.withValues(alpha: .15),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text('+${product.bonus}',
                              style: const TextStyle(fontSize: 11,
                                color: AppColors.success,
                                fontWeight: FontWeight.w700)),
                          ),
                        ),
                      ],
                    ]),
                  ],
                ),
              ),
              // 右侧：价格按钮
              ElevatedButton(
                onPressed: () => _onPurchase(context),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                ),
                child: Text(product.displayPrice,
                  style: const TextStyle(fontSize: 15,
                    fontWeight: FontWeight.w700, letterSpacing: .5)),
              ),
            ]),
          ),
          // 角标
          if (product.badge != null)
            Positioned(
              top: -8, right: 14,
              child: _BadgeChip(badge: product.badge!),
            ),
        ]),
      ),
    );
  }
}

class _BadgeChip extends StatelessWidget {
  final IapBadge badge;
  const _BadgeChip({required this.badge});

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (badge) {
      IapBadge.popular => ('🔥 最受欢迎', AppColors.primary),
      IapBadge.bestValue => ('💎 最划算', AppColors.success),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [color, Color.lerp(color, Colors.white, .25)!],
          begin: Alignment.topLeft, end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(999),
        boxShadow: [BoxShadow(
          color: color.withValues(alpha: .35),
          blurRadius: 8, offset: const Offset(0, 3))],
      ),
      child: Text(label,
        style: const TextStyle(fontSize: 10,
          color: Colors.white, fontWeight: FontWeight.w700, letterSpacing: .3)),
    );
  }
}

// ===== 兑换码面板 =====
class _RedeemPanel extends StatefulWidget {
  @override State<_RedeemPanel> createState() => _RedeemPanelState();
}

class _RedeemPanelState extends State<_RedeemPanel> {
  final _ctrl = TextEditingController();
  bool _busy = false;
  String? _err;
  String? _success;

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  Future<void> _submit() async {
    final code = _ctrl.text.trim();
    if (code.isEmpty) {
      setState(() => _err = '请输入兑换码');
      return;
    }
    setState(() { _busy = true; _err = null; _success = null; });
    try {
      final gained = await context.read<VitalityProvider>().redeem(code);
      if (!mounted) return;
      setState(() { _success = '兑换成功，已到账 +$gained'; _ctrl.clear(); });
    } catch (e) {
      setState(() => _err = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _paste() async {
    final data = await Clipboard.getData('text/plain');
    final t = data?.text?.trim();
    if (t != null && t.isNotEmpty) _ctrl.text = t.toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    return ListView(padding: const EdgeInsets.all(16), children: [
      GlassCard(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Text('输入兑换码',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700,
              color: AppColors.textPrimary)),
          const SizedBox(height: 4),
          const Text('从客服或活动渠道获取',
            style: TextStyle(fontSize: 12, color: AppColors.textTertiary)),
          const SizedBox(height: 16),
          TextField(
            controller: _ctrl,
            textCapitalization: TextCapitalization.characters,
            style: const TextStyle(letterSpacing: 2, fontSize: 16,
              fontWeight: FontWeight.w600),
            decoration: InputDecoration(
              hintText: '例如：A1B2C3D4E5F6',
              suffixIcon: TextButton(
                onPressed: _paste,
                child: const Text('粘贴', style: TextStyle(color: AppColors.primaryDark)),
              ),
            ),
          ),
          if (_err != null) Padding(
            padding: const EdgeInsets.only(top: 10),
            child: Text(_err!,
              style: const TextStyle(color: AppColors.danger, fontSize: 13)),
          ),
          if (_success != null) Padding(
            padding: const EdgeInsets.only(top: 10),
            child: Text(_success!,
              style: const TextStyle(color: AppColors.success, fontSize: 13,
                fontWeight: FontWeight.w600)),
          ),
          const SizedBox(height: 18),
          ElevatedButton(
            onPressed: _busy ? null : _submit,
            child: _busy
              ? const SizedBox(height: 18, width: 18,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('立即兑换'),
          ),
        ]),
      ),
    ]);
  }
}

class _DisabledPanel extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(mainAxisSize: MainAxisSize.min, children: const [
          Icon(Icons.shopping_bag_outlined, size: 56, color: AppColors.textTertiary),
          SizedBox(height: 12),
          Text('暂未开放充值',
            style: TextStyle(fontSize: 15, color: AppColors.textSecondary)),
          SizedBox(height: 4),
          Text('如需更多活力，请联系客服',
            style: TextStyle(fontSize: 12, color: AppColors.textTertiary)),
        ]),
      ),
    );
  }
}
