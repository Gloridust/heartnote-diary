import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/env.dart';
import '../theme/colors.dart';
import '../widgets/glass_card.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});
  @override State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _idCtrl = TextEditingController();
  final _pwdCtrl = TextEditingController();
  bool _registering = false;
  bool _busy = false;
  String? _err;

  @override
  void dispose() { _idCtrl.dispose(); _pwdCtrl.dispose(); super.dispose(); }

  Future<void> _submit() async {
    setState(() { _busy = true; _err = null; });
    try {
      final auth = context.read<AuthProvider>();
      if (_registering) {
        await auth.register(_idCtrl.text.trim(), _pwdCtrl.text);
      } else {
        await auth.login(_idCtrl.text.trim(), _pwdCtrl.text);
      }
      if (!mounted) return;
      context.go('/main');
    } catch (e) {
      setState(() => _err = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
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
                  const Text('声命体 MemoirAI',
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary)),
                  const SizedBox(height: 4),
                  const Text('记录生活，听见自己',
                    style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                  const SizedBox(height: 28),
                  GlassCard(
                    padding: const EdgeInsets.all(24),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                      // Tab
                      Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: AppColors.bgPage,
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Row(children: [
                          _TabItem(label: '登录', active: !_registering,
                            onTap: () => setState(() { _registering = false; _err = null; })),
                          _TabItem(label: '注册', active: _registering,
                            onTap: () => setState(() { _registering = true; _err = null; })),
                        ]),
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
                      const SizedBox(height: 20),
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

class _TabItem extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;
  const _TabItem({required this.label, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            gradient: active ? const LinearGradient(
              colors: [AppColors.primaryLight, AppColors.primary],
              begin: Alignment.topLeft, end: Alignment.bottomRight,
            ) : null,
            borderRadius: BorderRadius.circular(999),
            boxShadow: active ? [BoxShadow(color: AppColors.primary.withValues(alpha: .25),
              blurRadius: 8, offset: const Offset(0, 3))] : null,
          ),
          child: Text(label, textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14, fontWeight: FontWeight.w600,
              color: active ? Colors.white : AppColors.textSecondary)),
        ),
      ),
    );
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
          colors: [Color(0xFFE8E0F7), Color(0xFFF7F5EC)],
        ),
      ),
    );
  }
}
