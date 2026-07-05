import 'package:http/http.dart' as http;
import 'dart:convert';
import '../models/attendance_event.dart';

class BackendService {
  final String baseUrl;

  BackendService({required this.baseUrl});

  Future<String?> getToken() async {
    // This should be called from AuthService, but for simplicity we'll get it here
    // In production, use dependency injection
    return null;
  }

  Future<Map<String, dynamic>> requestAuthChallenge(
    String studentId,
    String deviceId,
    String sessionToken,
  ) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/nfc/auth-challenge'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'studentId': studentId,
          'deviceId': deviceId,
          'sessionToken': sessionToken,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          return {
            'success': true,
            'challenge': data['data']['challenge'],
            'timestamp': data['data']['timestamp'],
            'permittedActions': data['data']['permittedActions'],
          };
        }
        return {'success': false, 'error': data['message'] ?? 'Challenge request failed'};
      }
      
      final errorData = jsonDecode(response.body);
      return {'success': false, 'error': errorData['message'] ?? 'Server error'};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  Future<Map<String, dynamic>> verifyResponse(
    String studentId,
    String challengeResponse,
    String deviceId,
  ) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/nfc/verify-response'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'studentId': studentId,
          'challengeResponse': challengeResponse,
          'deviceId': deviceId,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          return {
            'success': true,
            'verified': data['data']['verified'],
            'attendanceStatus': data['data']['attendanceStatus'],
            'userData': data['data']['userData'],
          };
        }
        return {'success': false, 'error': data['message'] ?? 'Verification failed'};
      }
      
      final errorData = jsonDecode(response.body);
      return {'success': false, 'error': errorData['message'] ?? 'Server error'};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  Future<Map<String, dynamic>> logEvent(AttendanceEvent event) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/nfc/log-event'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(event.toJson()),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'logId': data['data']['logId']};
      }
      
      final errorData = jsonDecode(response.body);
      return {'success': false, 'error': errorData['message'] ?? 'Logging failed'};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  Future<Map<String, dynamic>> getStudentProfile(String studentId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/nfc/student/$studentId'),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'student': data['data']};
      }
      
      final errorData = jsonDecode(response.body);
      return {'success': false, 'error': errorData['message'] ?? 'Failed to fetch student'};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  Future<Map<String, dynamic>> getStudentSchedule(String userId, String token) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/classes/student/$userId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'classes': data['data'] ?? data};
      }
      
      final errorData = jsonDecode(response.body);
      return {'success': false, 'error': errorData['message'] ?? 'Failed to fetch schedule'};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  Future<Map<String, dynamic>> getStudentGrades(String userId, String token) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/grades/student/$userId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'grades': data['data'] ?? data};
      }
      
      final errorData = jsonDecode(response.body);
      return {'success': false, 'error': errorData['message'] ?? 'Failed to fetch grades'};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  Future<Map<String, dynamic>> getStudentPayments(String userId, String token) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/students/$userId/payment'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'payments': data['data'] ?? data};
      }
      
      final errorData = jsonDecode(response.body);
      return {'success': false, 'error': errorData['message'] ?? 'Failed to fetch payments'};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  Future<Map<String, dynamic>> createPaymentIntent(
    String studentId,
    String amount,
    String token,
  ) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/payment/$studentId/create-intent'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'amount': amount,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {
          'success': true,
          'clientSecret': data['data']['clientSecret'],
          'paymentIntentId': data['data']['paymentIntentId'],
        };
      }
      
      final errorData = jsonDecode(response.body);
      return {'success': false, 'error': errorData['message'] ?? 'Failed to create payment intent'};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  Future<Map<String, dynamic>> confirmPayment(
    String paymentIntentId,
    String token,
  ) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/payment/confirm'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'paymentIntentId': paymentIntentId,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {
          'success': true,
          'data': data['data'],
        };
      }
      
      final errorData = jsonDecode(response.body);
      return {'success': false, 'error': errorData['message'] ?? 'Failed to confirm payment'};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  Future<Map<String, dynamic>> getAllClasses(String token) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/classes'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'classes': data['data'] ?? data};
      }
      
      final errorData = jsonDecode(response.body);
      return {'success': false, 'error': errorData['message'] ?? 'Failed to fetch classes'};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  Future<Map<String, dynamic>> getStudentClasses(String userId, String token) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/classes/student/$userId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'classes': data['data'] ?? data};
      }
      
      final errorData = jsonDecode(response.body);
      return {'success': false, 'error': errorData['message'] ?? 'Failed to fetch student classes'};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  Future<Map<String, dynamic>> enrollStudent(String classId, String studentId, String token) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/classes/$classId/enroll'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'student_id': studentId,
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        return {'success': true, 'data': data['data']};
      }
      
      final errorData = jsonDecode(response.body);
      dynamic msgData = errorData['message'] ?? errorData['msg'];
      String errorMsg = 'Enrollment failed';
      if (msgData is Map) {
        errorMsg = msgData['msg']?.toString() ?? msgData.toString();
      } else if (msgData != null) {
        errorMsg = msgData.toString();
      }
      return {'success': false, 'error': errorMsg};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  Future<Map<String, dynamic>> dropStudent(String classId, String studentId, String token) async {
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl/api/classes/$classId/enroll/$studentId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'data': data['data']};
      }
      
      final errorData = jsonDecode(response.body);
      return {'success': false, 'error': errorData['message'] ?? 'Drop failed'};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  Future<Map<String, dynamic>> getDepartmentName(int departmentId, String token) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/departments/$departmentId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'departmentName': data['data']['name'] ?? data['name']};
      }
      
      return {'success': false, 'error': 'Department not found'};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }
}
