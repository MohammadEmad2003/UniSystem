class NfcPayload {
  final String studentId;
  final String deviceId;
  final String challenge;
  final int timestamp;
  final String? signature;
  final String? hash;
  final String? nfcTagId;  // إضافة NFC Tag ID

  NfcPayload({
    required this.studentId,
    required this.deviceId,
    required this.challenge,
    required this.timestamp,
    this.signature,
    this.hash,
    this.nfcTagId,  // إضافة هنا
  });

  factory NfcPayload.fromJson(Map<String, dynamic> json) {
    return NfcPayload(
      studentId: json['studentId'] ?? '',
      deviceId: json['deviceId'] ?? '',
      challenge: json['challenge'] ?? '',
      timestamp: json['timestamp'] ?? DateTime.now().millisecondsSinceEpoch,
      signature: json['signature'],
      hash: json['hash'],
      nfcTagId: json['nfcTagId'],  // من API
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'studentId': studentId,
      'deviceId': deviceId,
      'challenge': challenge,
      'timestamp': timestamp,
      if (signature != null) 'signature': signature,
      if (hash != null) 'hash': hash,
      if (nfcTagId != null) 'nfcTagId': nfcTagId,
    };
  }

  String toApduResponse() {
    // Convert payload to APDU response format for HCE
    final data = toJson();
    final jsonString = data.toString();
    final bytes = jsonString.codeUnits;
    return bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  }
}
