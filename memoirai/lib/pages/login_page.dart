import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/env.dart';
import '../theme/colors.dart';
import '../widgets/glass_card.dart';
import '../widgets/sliding_segment.dart';
import 'privacy_page.dart';

import 'package:shared_preferences/shared_preferences.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});
  @override State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _idCtrl = TextEditingController();
  final _pwdCtrl = TextEditingController();
  bool _registering = false;
  bool _busy = false;
  bool _agree = false;
  String? _err;

  static const _kAgreedKey = 'privacy_agreed_v1';

  @override
  void initState() {
    super.initState();
    SharedPreferences.getInstance().then((sp) {
      final agreed = sp.getBool(_kAgreedKey) ?? false;
      if (mounted) setState(() => _agree = agreed);
    });
  }

  @override
  void dispose() { _idCtrl.dispose(); _pwdCtrl.dispose(); super.dispose(); }

  Future<void> _submit() async {
    if (!_agree) {
      setState(() => _err = '请先阅读并同意《隐私政策》');
      _shakeAgreement();
      return;
    }
    setState(() { _busy = true; _err = null; });
    try {
      final auth = context.read<AuthProvider>();
      if (_registering) {
        await auth.register(_idCtrl.text.trim(), _pwdCtrl.text);
      } else {
        await auth.login(_idCtrl.text.trim(), _pwdCtrl.text);
      }
      // 登录/注册成功 → 持久化同意状态
      final sp = await SharedPreferences.getInstance();
      await sp.setBool(_kAgreedKey, true);
      if (!mounted) return;
      context.go('/main');
    } catch (e) {
      setState(() => _err = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  // 简单提醒未勾选 — 滚动到底部并闪一下
  void _shakeAgreement() {
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
      content: Text('请先勾选同意隐私政策'),
      duration: Duration(seconds: 2),
      behavior: SnackBarBehavior.floating,
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(children: [
        // 背景渐晕
        const Positioned.fill(child: _BgGradient()),
        SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Column(children: [
                  const SizedBox(height: 12),
                  Container(
                    width: 72, height: 72,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppColors.primaryLight, AppColors.primary],
                        begin: Alignment.topLeft, end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(22),
                      boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: .3),
                        blurRadius: 24, offset: const Offset(0, 8))],
                    ),
                    child: const Icon(Icons.favorite_rounded, color: Colors.white, size: 34),
                  ),
                  const SizedBox(height: 14),
                  const Text('声迹',
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary)),
                  const SizedBox(height: 4),
                  const Text('记录生活，听见自己',
                    style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                  const SizedBox(height: 28),
                  GlassCard(
                    padding: const EdgeInsets.all(24),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                      // Tab —— 色块滑动
                      SlidingSegment<bool>(
                        value: _registering,
                        onChanged: (v) => setState(() { _registering = v; _err = null; }),
                        items: const [
                          SlidingSegmentItem(value: false, label: '登录'),
                          SlidingSegmentItem(value: true, label: '注册'),
                        ],
                      ),
                      const SizedBox(height: 20),
                      TextField(
                        controller: _idCtrl,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          hintText: _registering ? '手机号' : '手机号 或 6 位用户ID',
                          prefixIcon: const Icon(Icons.person_outline_rounded,
                            color: AppColors.textSecondary),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _pwdCtrl,
                        obscureText: true,
                        decoration: const InputDecoration(
                          hintText: '密码',
                          prefixIcon: Icon(Icons.lock_outline_rounded,
                            color: AppColors.textSecondary),
                        ),
                      ),
                      if (_err != null) ...[
                        const SizedBox(height: 12),
                        Text(_err!, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
                      ],
                      const SizedBox(height: 14),
                      // 隐私政策勾选
                      _AgreementRow(
                        agreed: _agree,
                        onToggle: () => setState(() => _agree = !_agree),
                        onTapPrivacy: () => Navigator.push(context,
                          MaterialPageRoute(builder: (_) => const PrivacyPage())),
                      ),
                      const SizedBox(height: 14),
                      ElevatedButton(
                        onPressed: _busy ? null : _submit,
                        child: _busy
                          ? const SizedBox(height: 20, width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : Text(_registering ? '注 册' : '登 录',
                              style: const TextStyle(letterSpacing: 2)),
                      ),
                    ]),
                  ),
                  const SizedBox(height: 20),
                  const Text('注册后请记住你的 6 位用户 ID\n可以用手机号或用户 ID 登录',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppColors.textTertiary, fontSize: 12, height: 1.6)),
                  if (Env.isDev) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.warning.withValues(alpha: .2),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: const Text('DEV',
                        style: TextStyle(fontSize: 10, color: AppColors.warning,
                          fontWeight: FontWeight.w700, letterSpacing: 1.2)),
                    ),
                  ],
                ]),
              ),
            ),
          ),
        ),
      ]),
    );
  }
}

class _AgreementRow extends StatelessWidget {
  final bool agreed;
  final VoidCallback onToggle;
  final VoidCallback onTapPrivacy;
  const _AgreementRow({
    required this.agreed, required this.onToggle, required this.onTapPrivacy,
  });
  @override
  Widget build(BuildContext context) {
    return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      GestureDetector(
        onTap: onToggle,
        behavior: HitTestBehavior.opaque,
        child: Padding(
          padding: const EdgeInsets.only(top: 1, right: 8),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            width: 18, height: 18,
            decoration: BoxDecoration(
              gradient: agreed ? const LinearGradient(
                colors: [AppColors.primaryLight, AppColors.primary],
              ) : null,
              color: agreed ? null : AppColors.surface,
              border: Border.all(
                color: agreed ? AppColors.primary : AppColors.border, width: 1.5),
              borderRadius: BorderRadius.circular(5),
            ),
            child: agreed
              ? const Icon(Icons.check_rounded, color: Colors.white, size: 14)
              : null,
          ),
        ),
      ),
      Expanded(child: GestureDetector(
        onTap: onToggle,
        behavior: HitTestBehavior.opaque,
        child: Padding(
          padding: const EdgeInsets.only(top: 1),
          child: RichText(
            text: TextSpan(
              style: const TextStyle(fontSize: 12, height: 1.5,
                color: AppColors.textSecondary),
              children: [
                const TextSpan(text: '我已阅读并同意'),
                TextSpan(
                  text: '《隐私政策》',
                  style: const TextStyle(color: AppColors.primaryDark,
                    fontWeight: FontWeight.w600),
                  recognizer: TapGestureRecognizer()..onTap = onTapPrivacy,
                ),
              ],
            ),
          ),
        ),
      )),
    ]);
  }
}

class _BgGradient extends StatelessWidget {
  const _BgGradient();
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: RadialGradient(
          center: Alignment(-.4, -.8), radius: 1.2,
          colors: [AppColors.primaryTint, AppColors.bgPage],
        ),
      ),
    );
  }
}
