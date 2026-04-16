import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/chat_provider.dart';
import '../providers/diary_provider.dart';
import '../providers/vitality_provider.dart';
import '../services/api_service.dart';
import '../services/env.dart';
import '../theme/colors.dart';
import '../widgets/glass_card.dart';

class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});
  @override State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  Future<void> _editNickname() async {
    final u = context.read<AuthProvider>().user!;
    final ctrl = TextEditingController(text: u.nickname);
    final v = await showDialog<String>(context: context, builder: (_) => AlertDialog(
      title: const Text('修改昵称'),
      content: TextField(controller: ctrl, maxLength: 20,
        decoration: const InputDecoration(hintText: '新昵称')),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('取消')),
        TextButton(onPressed: () => Navigator.pop(context, ctrl.text.trim()),
          child: const Text('保存')),
      ],
    ));
    if (v == null || v.isEmpty) return;
    try {
      final user = await ApiService.instance.updateNickname(v);
      if (!mounted) return;
      context.read<AuthProvider>().setUser(user);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('已更新')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  Future<void> _changePassword() async {
    final oldCtrl = TextEditingController();
    final newCtrl = TextEditingController();
    final ok = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
      title: const Text('修改密码'),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: oldCtrl, obscureText: true,
          decoration: const InputDecoration(hintText: '原密码')),
        const SizedBox(height: 10),
        TextField(controller: newCtrl, obscureText: true,
          decoration: const InputDecoration(hintText: '新密码（至少 6 位）')),
      ]),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('取消')),
        TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('保存')),
      ],
    ));
    if (ok != true) return;
    try {
      final user = await ApiService.instance.changePassword(oldCtrl.text, newCtrl.text);
      if (!mounted) return;
      context.read<AuthProvider>().setUser(user);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('密码已修改，其它设备已自动下线')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  Future<void> _logout() async {
    final ok = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
      title: const Text('退出登录'),
      content: const Text('确定要退出当前账号吗？'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('取消')),
        TextButton(onPressed: () => Navigator.pop(context, true),
          child: const Text('退出', style: TextStyle(color: AppColors.danger))),
      ],
    ));
    if (ok != true) return;
    await context.read<AuthProvider>().logout();
    context.read<DiaryProvider>().clear();
    context.read<VitalityProvider>().clear();
    await context.read<ChatProvider>().reset();
    if (!mounted) return;
    context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    final u = context.watch<AuthProvider>().user;
    return Scaffold(
      appBar: AppBar(title: const Text('设置')),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        GlassCard(child: Column(children: [
          _SettingsRow(icon: Icons.badge_outlined, label: '用户 ID',
            trailing: Row(mainAxisSize: MainAxisSize.min, children: [
              Text('${u?.id}', style: const TextStyle(color: AppColors.textSecondary)),
              const SizedBox(width: 6),
              GestureDetector(
                onTap: () async {
                  await Clipboard.setData(ClipboardData(text: '${u?.id}'));
                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('已复制')));
                },
                child: const Icon(Icons.copy_rounded, size: 16, color: AppColors.textTertiary)),
            ])),
          const _Divider(),
          _SettingsRow(icon: Icons.phone_iphone_rounded, label: '手机号',
            trailing: Text(u?.phone ?? '—',
              style: const TextStyle(color: AppColors.textSecondary))),
          const _Divider(),
          _SettingsRow(icon: Icons.person_outline_rounded, label: '昵称',
            onTap: _editNickname,
            trailing: Row(mainAxisSize: MainAxisSize.min, children: [
              Text(u?.nickname ?? '—',
                style: const TextStyle(color: AppColors.textSecondary)),
              const Icon(Icons.chevron_right_rounded, color: AppColors.textTertiary),
            ])),
        ])),
        const SizedBox(height: 14),
        GlassCard(child: Column(children: [
          _SettingsRow(icon: Icons.lock_outline_rounded, label: '修改密码',
            onTap: _changePassword,
            trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.textTertiary)),
          const _Divider(),
          _SettingsRow(icon: Icons.cloud_outlined, label: '运行环境',
            trailing: Row(mainAxisSize: MainAxisSize.min, children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: (Env.isDev ? AppColors.warning : AppColors.success).withValues(alpha: .2),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(Env.label,
                  style: TextStyle(
                    fontSize: 10, fontWeight: FontWeight.w700,
                    letterSpacing: 1.2,
                    color: Env.isDev ? AppColors.warning : AppColors.success)),
              ),
            ])),
        ])),
        const SizedBox(height: 20),
        ElevatedButton(
          onPressed: _logout,
          style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
          child: const Text('退出登录'),
        ),
        const SizedBox(height: 30),
        Center(child: Text('声迹 · v1.0.0 · ${ApiService.instance.baseUrl}',
          style: const TextStyle(fontSize: 11, color: AppColors.textTertiary))),
      ]),
    );
  }
}

class _SettingsRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final Widget? trailing;
  final VoidCallback? onTap;
  const _SettingsRow({required this.icon, required this.label, this.trailing, this.onTap});
  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 4),
        child: Row(children: [
          Icon(icon, size: 20, color: AppColors.primaryDark),
          const SizedBox(width: 12),
          Expanded(child: Text(label,
            style: const TextStyle(fontSize: 15, color: AppColors.textPrimary))),
          if (trailing != null) trailing!,
        ]),
      ),
    );
  }
}

class _Divider extends StatelessWidget {
  const _Divider();
  @override
  Widget build(BuildContext context) => const Divider(
    height: 1, thickness: 1, color: AppColors.border);
}
