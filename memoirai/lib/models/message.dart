class ChatMessage {
  final String content;
  final bool isUser;
  final DateTime time;

  ChatMessage({required this.content, required this.isUser, DateTime? time})
    : time = time ?? DateTime.now();

  Map<String, dynamic> toApi() => {
    'role': isUser ? 'user' : 'assistant',
    'content': content,
  };
}

class DiaryDraft {
  final String title;
  final String content;
  final int score;
  final String tag;

  DiaryDraft({required this.title, required this.content, required this.score, required this.tag});

  factory DiaryDraft.fromJson(Map<String, dynamic> j) => DiaryDraft(
    title: j['title'] as String? ?? '今日日记',
    content: j['message'] as String? ?? '',
    score: (j['score'] as num?)?.toInt() ?? 5,
    tag: j['tag'] as String? ?? 'personal',
  );
}
