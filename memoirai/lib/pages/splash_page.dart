import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../theme/colors.dart';

class SplashPage extends StatefulWidget {
  const SplashPage({super.key});
  @override State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage> {
  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    final auth = context.read<AuthProvider>();
    await auth.bootstrap();
    if (!mounted) return;
    context.go(auth.isAuthed ? '/main' : '/login');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgPage,
      body: Center(
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Container(
            width: 96, height: 96,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppColors.primaryLight, AppColors.primary],
                begin: Alignment.topLeft, end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(28),
              boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: .3),
                blurRadius: 30, offset: const Offset(0, 10))],
            ),
            child: const Icon(Icons.favorite_rounded, color: Colors.white, size: 44),
          ),
          const SizedBox(height: 20),
          const Text('声迹',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600,
              color: AppColors.textPrimary)),
          const SizedBox(height: 6),
          const Text('听见心事的 AI 日记',
            style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
        ]),
      ),
    );
  }
}
