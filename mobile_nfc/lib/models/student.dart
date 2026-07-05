class Student {
  final String id;
  final String studentNumber;
  final String name;
  final String faculty;
  final String department;
  final String academicLevel;
  final String? photoUrl;
  final String accountStatus;
  final String paymentStatus;
  final String? ssn;
  final String? nfcTagId;  // إضافة NFC Tag ID

  Student({
    required this.id,
    required this.studentNumber,
    required this.name,
    required this.faculty,
    required this.department,
    required this.academicLevel,
    this.photoUrl,
    required this.accountStatus,
    required this.paymentStatus,
    this.ssn,
    this.nfcTagId,  // إضافة هنا
  });

  factory Student.fromJson(Map<String, dynamic> json) {
    final department = json['department']?.toString() ?? 
                      json['department_name']?.toString() ?? 
                      json['department_id']?.toString() ?? 
                      '';
    
    return Student(
      id: json['id']?.toString() ?? json['user_id']?.toString() ?? '',
      studentNumber: json['studentNumber']?.toString() ?? json['student_id']?.toString() ?? '',
      name: json['name']?.toString() ?? '${json['f_name'] ?? ''} ${json['l_name'] ?? ''}'.trim(),
      faculty: json['faculty']?.toString() ?? 'Faculty of Information Technology',
      department: department,
      academicLevel: json['academicLevel']?.toString() ?? json['academic_level']?.toString() ?? '1',
      photoUrl: json['photoUrl']?.toString(),
      accountStatus: json['accountStatus']?.toString() ?? json['account_status']?.toString() ?? 'pending',
      paymentStatus: json['paymentStatus']?.toString() ?? json['payment_status']?.toString() ?? 'unpaid',
      ssn: json['ssn']?.toString(),
      nfcTagId: json['nfcTagId']?.toString() ?? json['nfc_tag_id']?.toString(),  // من API
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'studentNumber': studentNumber,
      'name': name,
      'faculty': faculty,
      'department': department,
      'academicLevel': academicLevel,
      'photoUrl': photoUrl,
      'accountStatus': accountStatus,
      'paymentStatus': paymentStatus,
      'ssn': ssn,
      'nfcTagId': nfcTagId,
    };
  }
}
