class User {
  final String id;
  final String name;
  final String email;
  final String role;
  final String? photoUrl;
  final String? accountStatus;
  final String? paymentStatus;
  final String? academicLevel;
  final int? departmentId;
  final String? departmentName;
  final String? ssn;
  final String? nfcTagId;  // إضافة NFC Tag ID

  User({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.photoUrl,
    this.accountStatus,
    this.paymentStatus,
    this.academicLevel,
    this.departmentId,
    this.departmentName,
    this.ssn,
    this.nfcTagId,  // إضافة هنا
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id']?.toString() ?? json['user_id']?.toString() ?? '',
      name: json['name']?.toString() ?? '${json['f_name'] ?? ''} ${json['l_name'] ?? ''}'.trim(),
      email: json['email']?.toString() ?? '',
      role: json['role'] ?? '',
      photoUrl: json['photoUrl'] ?? json['image_url'],
      accountStatus: json['account_status']?.toString(),
      paymentStatus: json['payment_status']?.toString(),
      academicLevel: json['academic_level']?.toString(),
      departmentId: json['department_id'] != null ? int.tryParse(json['department_id'].toString()) : null,
      departmentName: json['department_name']?.toString(),
      ssn: json['ssn']?.toString(),
      nfcTagId: json['nfcTagId']?.toString() ?? json['nfc_tag_id']?.toString(),  // من API
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'role': role,
      'photoUrl': photoUrl,
      'account_status': accountStatus,
      'payment_status': paymentStatus,
      'academic_level': academicLevel,
      'department_id': departmentId,
      'department_name': departmentName,
      'ssn': ssn,
      'nfcTagId': nfcTagId,
    };
  }
}
