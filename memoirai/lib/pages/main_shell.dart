import 'package:flutter/material.dart';
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
