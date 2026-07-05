class AttendanceEvent {
  final String eventType;
  final String status;
  final int timestamp;
  final String? location;
  final Map<String, dynamic>? metadata;
  final String? verifiedBy;

  AttendanceEvent({
    required this.eventType,
    required this.status,
    required this.timestamp,
    this.location,
    this.metadata,
    this.verifiedBy,
  });

  factory AttendanceEvent.fromJson(Map<String, dynamic> json) {
    return AttendanceEvent(
      eventType: json['eventType'] ?? 'check_in',
      status: json['status'] ?? 'pending',
      timestamp: json['timestamp'] ?? DateTime.now().millisecondsSinceEpoch,
      location: json['location'],
      metadata: json['metadata'] != null ? Map<String, dynamic>.from(json['metadata']) : null,
      verifiedBy: json['verifiedBy'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'eventType': eventType,
      'status': status,
      'timestamp': timestamp,
      if (location != null) 'location': location,
      if (metadata != null) 'metadata': metadata,
      if (verifiedBy != null) 'verifiedBy': verifiedBy,
    };
  }
}
