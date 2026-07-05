import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../models/user.dart';
import '../models/student.dart';

class AuthService {
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  final String baseUrl;

  AuthService({required this.baseUrl});

  Future<String?> getToken() async {
    return await _storage.read(key: 'auth_token');
  }

  Future<void> setToken(String token) async {
    await _storage.write(key: 'auth_token', value: token);
  }

  Future<void> setDeviceId(String deviceId) async {
    await _storage.write(key: 'device_id', value: deviceId);
  }

  Future<String?> getDeviceId() async {
    return await _storage.read(key: 'device_id');
  }

  Future<void> clearAuth() async {
    await _storage.delete(key: 'auth_token');
    await _storage.delete(key: 'device_id');
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      print('🔐 Attempting login to: $baseUrl/api/auth/login');
      final response = await http.post(
        Uri.parse('$baseUrl/api/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
        }),
      );

      print('📡 Login response status: ${response.statusCode}');
      print('📄 Login response body: ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        print('📊 Parsed data: $data');
        
        if (data['success'] == true && data['data'] != null) {
          final token = data['data']['token'] ?? data['token'];
          final user = data['data']['user'] ?? data['data'];
          
          print('🎫 Token: ${token != null ? "found" : "null"}');
          print('👤 User: $user');
          
          if (token != null) {
            await setToken(token);
            print('✅ Token stored successfully');
          }
          
          return {'success': true, 'user': user, 'token': token};
        }
        return {'success': false, 'error': 'Invalid response format'};
      }
      
      final errorData = jsonDecode(response.body);
      return {'success': false, 'error': errorData['message'] ?? 'Login failed'};
    } catch (e) {
      print('❌ Login error: $e');
      return {'success': false, 'error': e.toString()};
    }
  }

  Future<Map<String, dynamic>> registerDevice(String deviceId, String studentId) async {
    try {
      final token = await getToken();
      if (token == null) {
        return {'success': false, 'error': 'Not authenticated'};
      }

      final response = await http.post(
        Uri.parse('$baseUrl/api/nfc/register-device'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'deviceId': deviceId,
          'studentId': studentId,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        await setDeviceId(deviceId);
        return {'success': true, 'data': data};
      }
      
      final errorData = jsonDecode(response.body);
      return {'success': false, 'error': errorData['message'] ?? 'Device registration failed'};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  Future<User?> getCurrentUser() async {
    try {
      final token = await getToken();
      if (token == null) {
        print('❌ No token found in storage');
        return null;
      }

      print('👤 Fetching user profile from: $baseUrl/api/auth/profile');
      final response = await http.get(
        Uri.parse('$baseUrl/api/auth/profile'),
        headers: {'Authorization': 'Bearer $token'},
      );

      print('📡 Profile response status: ${response.statusCode}');
      print('📄 Profile response body: ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        print('📊 Parsed profile data: $data');
        final user = User.fromJson(data['data'] ?? data);
        print('✅ User parsed successfully: ${user.id}');
        return user;
      }
      print('❌ Profile request failed with status: ${response.statusCode}');
      return null;
    } catch (e) {
      print('❌ Get current user error: $e');
      return null;
    }
  }

  Future<Student?> getStudentProfile(String studentId) async {
    try {
      final token = await getToken();
      if (token == null) return null;

      final response = await http.get(
        Uri.parse('$baseUrl/api/nfc/student/$studentId'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return Student.fromJson(data['data'] ?? data);
      }
      return null;
    } catch (e) {
      return null;
    }
  }
}
