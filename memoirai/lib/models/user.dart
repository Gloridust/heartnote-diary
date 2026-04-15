class AppUser {
  final int id;
  final String phone;
  final String nickname;
  final String status;

  AppUser({required this.id, required this.phone, required this.nickname, required this.status});

  factory AppUser.fromJson(Map<String, dynamic> j) => AppUser(
    id: j['id'] as int,
    phone: j['phone'] as String? ?? '',
    nickname: j['nickname'] as String? ?? '用户${j['id']}',
    status: j['status'] as String? ?? 'active',
  );

  Map<String, dynamic> toJson() => {
    'id': id, 'phone': phone, 'nickname': nickname, 'status': status,
  };
}
