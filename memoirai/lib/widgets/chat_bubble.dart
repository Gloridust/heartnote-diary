import 'package:flutter/material.dart';
import '../theme/colors.dart';

class ChatBubble extends StatelessWidget {
  final String text;
  final bool isUser;
  const ChatBubble({super.key, required this.text, required this.isUser});

  @override
  Widget build(BuildContext context) {
    final br = isUser
      ? const BorderRadius.only(
          topLeft: Radius.circular(20), topRight: Radius.circular(20),
          bottomLeft: Radius.circular(20), bottomRight: Radius.circular(6))
      : const BorderRadius.only(
          topLeft: Radius.circular(20), topRight: Radius.circular(20),
          bottomRight: Radius.circular(20), bottomLeft: Radius.circular(6));

    final bubble = ConstrainedBox(
      constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * .78),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          gradient: isUser
            ? const LinearGradient(
                begin: Alignment.topLeft, end: Alignment.bottomRight,
                colors: [AppColors.primaryLight, AppColors.primary])
            : null,
          color: isUser ? null : AppColors.primarySoft,
          borderRadius: br,
          boxShadow: const [
            BoxShadow(color: Color(0x14000000), blurRadius: 10, offset: Offset(0, 3)),
          ],
        ),
        child: Text(text,
          style: TextStyle(
            fontSize: 15, height: 1.5,
            color: isUser ? Colors.white : AppColors.textPrimary,
          )),
      ),
    );

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [bubble],
      ),
    );
  }
}

class TypingBubble extends StatefulWidget {
  const TypingBubble({super.key});
  @override State<TypingBubble> createState() => _TypingBubbleState();
}

class _TypingBubbleState extends State<TypingBubble> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this, duration: const Duration(milliseconds: 1200))..repeat();

  @override void dispose() { _c.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
            decoration: BoxDecoration(
              color: AppColors.primarySoft,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(20), topRight: Radius.circular(20),
                bottomRight: Radius.circular(20), bottomLeft: Radius.circular(6)),
            ),
            child: AnimatedBuilder(
              animation: _c,
              builder: (_, __) {
                return Row(mainAxisSize: MainAxisSize.min,
                  children: List.generate(3, (i) {
                    final t = (_c.value - i * .2) % 1.0;
                    final s = (t < .5 ? t * 2 : (1 - t) * 2).clamp(0.0, 1.0);
                    return Container(
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      width: 7, height: 7,
                      decoration: BoxDecoration(
                        color: AppColors.primaryDark.withValues(alpha: .3 + .7 * s),
                        shape: BoxShape.circle,
                      ),
                    );
                  }),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
