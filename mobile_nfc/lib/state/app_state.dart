import 'package:flutter/foundation.dart';
import '../models/user.dart';
import '../models/student.dart';

class AppState extends ChangeNotifier {
  User? _currentUser;
  Student? _currentStudent;
  bool _isLoggedIn = false;
  bool _isLoading = false;
  String? _errorMessage;

  User? get currentUser => _currentUser;
  Student? get currentStudent => _currentStudent;
  bool get isLoggedIn => _isLoggedIn;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  void setUser(User? user) {
    _currentUser = user;
    _isLoggedIn = user != null;
    notifyListeners();
  }

  void setStudent(Student? student) {
    _currentStudent = student;
    notifyListeners();
  }

  void setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void setError(String? error) {
    _errorMessage = error;
    notifyListeners();
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  void logout() {
    _currentUser = null;
    _currentStudent = null;
    _isLoggedIn = false;
    _errorMessage = null;
    notifyListeners();
  }
}
