class VitalityDay {
  final String day;        // YYYY-MM-DD
  final int gained;
  final int spent;
  final int records;

  VitalityDay({required this.day, required this.gained, required this.spent, required this.records});

  factory VitalityDay.fromJson(Map<String, dynamic> j) => VitalityDay(
    day: j['day'] as String? ?? '',
    gained: (j['gained'] as num?)?.toInt() ?? 0,
    spent: (j['spent'] as num?)?.toInt() ?? 0,
    records: (j['records'] as num?)?.toInt() ?? 0,
  );

  int get net => gained - spent;
}
