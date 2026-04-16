import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../providers/settings_provider.dart';
import '../providers/vitality_provider.dart';
import '../theme/colors.dart';
import '../widgets/glass_card.dart';

class RechargePage extends StatefulWidget {
  const RechargePage({super.key});
  @override State<RechargePage> createState() => _RechargePageState();
}

class _RechargePageState extends State<RechargePage> with SingleTickerProviderStateMixin {
  late TabController _tab;
  int _initialTab = 0;
  late List<_TabSpec> _tabs;

  @override
  void initState() {
    super.initState();
    final settings = context.read<SettingsProvider>();
    final iapEnabled = Platform.isIOS && settings.iapEnabled;
    final redeemEnabled = settings.redeemCodeEnabled;
    _tabs = [
      if (iapEnabled) _TabSpec('App Store', _IapPanel()),
      if (redeemEnabled) _TabSpec('兑换码', _RedeemPanel()),
    ];
    if (_tabs.isEmpty) {
      _tabs = [_TabSpec('提示', _DisabledPanel())];
    }
    _tab = TabController(length: _tabs.length, vsync: this, initialIndex: _initialTab);
  }

  @override
  void dispose() { _tab.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('充值'),
        bottom: _tabs.length > 1
          ? TabBar(controller: _tab,
              labelColor: AppColors.primaryDark,
              unselectedLabelColor: AppColors.textSecondary,
              indicatorColor: AppColors.primary,
              tabs: [for (final t in _tabs) Tab(text: t.label)])
          : null,
      ),
      body: TabBarView(controller: _tab,
        children: [for (final t in _tabs) t.body]),
    );
  }
}

class _TabSpec {
  final String label;
  final Widget body;
  _TabSpec(this.label, this.body);
}

// ===== IAP 面板（骨架，等接 in_app_purchase） =====
class _IapPanel extends StatelessWidget {
  // 套餐列表（最终对齐 App Store Connect 的 product id）
  static const _products = [
    (id: 'vitality_300',  name: '小杯', vitality: 300,  price: '¥6'),
    (id: 'vitality_1000', name: '中杯', vitality: 1000, price: '¥18'),
    (id: 'vitality_3000', name: '大杯', vitality: 3000, price: '¥45'),
  ];

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 30),
      children: [
        for (final p in _products) Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: GlassCard(
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 16),
            child: Row(children: [
              Container(
                width: 52, height: 52,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppColors.primaryLight, AppColors.primary]),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Center(
                  child: Text('⚡', style: TextStyle(fontSize: 24, color: Colors.white))),
              ),
              const SizedBox(width: 14),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(p.name, style: const TextStyle(fontSize: 15,
                    fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                  const SizedBox(height: 4),
                  Text('${p.vitality} 活力',
                    style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                ])),
              ElevatedButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('App Store 内购即将上线')));
                },
                child: Text(p.price),
              ),
            ]),
          ),
        ),
        const SizedBox(height: 8),
        const Center(child: Text('支付通过 Apple App Store 完成',
          style: TextStyle(fontSize: 11, color: AppColors.textTertiary))),
      ],
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
      setState(() { _success = '兑换成功！获得 $gained ⚡'; _ctrl.clear(); });
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
