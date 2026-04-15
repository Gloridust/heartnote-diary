import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'pages/splash_page.dart';
import 'pages/login_page.dart';
import 'pages/main_shell.dart';
import 'providers/auth_provider.dart';
import 'providers/chat_provider.dart';
import 'providers/diary_provider.dart';
import 'theme/app_theme.dart';

class MemoirAIApp extends StatelessWidget {
  const MemoirAIApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => DiaryProvider()),
        ChangeNotifierProvider(create: (_) => ChatProvider()),
      ],
      child: Builder(builder: (context) {
        final router = GoRouter(
          initialLocation: '/',
          routes: [
            GoRoute(path: '/', builder: (_, __) => const SplashPage()),
            GoRoute(path: '/login', builder: (_, __) => const LoginPage()),
            GoRoute(path: '/main', builder: (_, __) => const MainShell()),
          ],
        );
        return MaterialApp.router(
          title: '声迹',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.light(),
          routerConfig: router,
          locale: const Locale('zh', 'CN'),
          localizationsDelegates: const [
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          supportedLocales: const [Locale('zh', 'CN'), Locale('en', 'US')],
        );
      }),
    );
  }
}
