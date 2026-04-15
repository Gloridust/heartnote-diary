import 'package:flutter/foundation.dart';
import '../models/diary.dart';
import '../services/api_service.dart';

class DiaryProvider extends ChangeNotifier {
  List<DiaryEntry> _entries = [];
  bool _loading = false;
  String? _error;

  List<DiaryEntry> get entries => _entries;
  bool get loading => _loading;
  String? get error => _error;

  Future<void> load() async {
    _loading = true; _error = null; notifyListeners();
    try {
      _entries = await ApiService.instance.listDiaries();
      _entries.sort((a, b) => b.date.compareTo(a.date));
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false; notifyListeners();
    }
  }

  Future<int> save({
    int? diaryId, required String title, required String content,
    required DateTime date, int? score, String? tag,
  }) async {
    final id = await ApiService.instance.saveDiary(
      diaryId: diaryId, title: title, content: content,
      date: date, score: score, tag: tag,
    );
    await load();
    return id;
  }

  Future<void> remove(int id) async {
    await ApiService.instance.deleteDiary(id);
    await load();
  }

  void clear() { _entries = []; notifyListeners(); }

  /// 按日期索引
  List<DiaryEntry> onDate(DateTime d) {
    final k = '${d.year}-${d.month.toString().padLeft(2,'0')}-${d.day.toString().padLeft(2,'0')}';
    return _entries.where((e) => e.dateKey == k).toList();
  }

  Set<String> get dateKeysWithDiary => _entries.map((e) => e.dateKey).toSet();

  double? averageScoreOn(DateTime d) {
    final xs = onDate(d).where((e) => e.score != null).map((e) => e.score!).toList();
    if (xs.isEmpty) return null;
    return xs.reduce((a, b) => a + b) / xs.length;
  }
}
