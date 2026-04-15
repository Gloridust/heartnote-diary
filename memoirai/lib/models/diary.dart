class DiaryEntry {
  final int id;
  final String title;
  final String content;
  final DateTime date;
  final int? score;
  final String? tag;

  DiaryEntry({
    required this.id, required this.title, required this.content,
    required this.date, this.score, this.tag,
  });

  factory DiaryEntry.fromJson(Map<String, dynamic> j) {
    final dateStr = (j['date'] as String?) ?? '';
    DateTime dt;
    try {
      dt = DateTime.parse(dateStr).toLocal();
    } catch (_) {
      dt = DateTime.now();
    }
    return DiaryEntry(
      id: (j['diary_id'] ?? j['id']) as int,
      title: j['title'] as String? ?? '',
      content: j['content'] as String? ?? '',
      date: dt,
      score: j['score'] as int?,
      tag: j['tag'] as String?,
    );
  }

  String get dateKey =>
    '${date.year}-${date.month.toString().padLeft(2,'0')}-${date.day.toString().padLeft(2,'0')}';
  String get timeLabel =>
    '${date.hour.toString().padLeft(2,'0')}:${date.minute.toString().padLeft(2,'0')}';

  static const Map<String, String> tagTitles = {
    'work': '工作日记',
    'personal': '个人日记',
    'travel': '旅行日记',
    'relationships': '人际日记',
    'health': '健康日记',
    'goals': '目标日记',
    'reflection': '反思日记',
    'gratitude': '感恩日记',
    'dreams': '梦想日记',
    'memories': '回忆日记',
  };

  String get tagTitle => tagTitles[tag ?? ''] ?? '今日日记';
}
