import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/chat_provider.dart';
import '../providers/diary_provider.dart';
import '../providers/vitality_provider.dart';
import '../theme/colors.dart';
import '../widgets/glass_card.dart';
import 'home_page.dart';
import 'diary_list_page.dart';
import 'profile_page.dart';

class MainShell extends StatefulWidget {
  const MainShell({super.key});
  @override State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _idx = 0;
  final _pages = const [HomePage(), DiaryListPage(), ProfilePage()];

  AuthProvider? _auth;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final auth = context.read<AuthProvider>();
    if (_auth != auth) {
      _auth?.removeListener(_onAuthChange);
      _auth = auth;
      _auth!.addListener(_onAuthChange);
    }
  }

  void _onAuthChange() {
    final reason = _auth?.lastForceLogoutReason;
    if (reason != null && mounted) {
      // 清掉本地状态并跳到登录
      context.read<DiaryProvider>().clear();
      context.read<ChatProvider>().reset();
      context.read<VitalityProvider>().clear();
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(reason)));
      _auth!.clearForceLogout();
      context.go('/login');
    }
  }

  @override
  void dispose() {
    _auth?.removeListener(_onAuthChange);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgPage,
      extendBody: true,
      body: IndexedStack(index: _idx, children: _pages),
      bottomNavigationBar: FrostedTabBar(
        currentIndex: _idx,
        onTap: (i) => setState(() => _idx = i),
        tabs: const [
          FrostedTab(Icons.chat_bubble_outline_rounded, '对话'),
          FrostedTab(Icons.book_outlined, '日记本'),
          FrostedTab(Icons.person_outline_rounded, '我的'),
        ],
      ),
    );
  }
}
