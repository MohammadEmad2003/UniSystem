import 'package:flutter/material.dart';
import '../services/backend_service.dart';
import '../services/auth_service.dart';
import '../main.dart';

class ScheduleScreen extends StatefulWidget {
  final BackendService backendService;
  final AuthService authService;

  const ScheduleScreen({
    required this.backendService,
    required this.authService,
    Key? key,
  }) : super(key: key);

  @override
  State<ScheduleScreen> createState() => _ScheduleScreenState();
}

class _ScheduleScreenState extends State<ScheduleScreen> {
  bool _isLoading = true;
  List<dynamic> _classes = [];
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadSchedule();
  }

  Future<void> _loadSchedule() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final token = await widget.authService.getToken();
    final user = await widget.authService.getCurrentUser();

    if (token != null && user != null) {
      final result = await widget.backendService.getStudentSchedule(user.id, token);
      if (result['success'] == true) {
        final classesData = result['classes'];
        setState(() {
          // Handle both List and Map responses
          if (classesData is List) {
            _classes = classesData;
          } else if (classesData is Map) {
            _classes = [classesData];
          } else {
            _classes = [];
          }
          _isLoading = false;
        });
      } else {
        setState(() {
          _errorMessage = result['error'] ?? 'Failed to load schedule';
          _isLoading = false;
        });
      }
    } else {
      setState(() {
        _errorMessage = 'Not logged in';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Classes'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.error_outline,
                          size: 64,
                          color: AppColors.error,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _errorMessage!,
                          style: TextStyle(
                            color: isDark ? AppColors.textDark : AppColors.text,
                            fontSize: 16,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 24),
                        ElevatedButton(
                          onPressed: _loadSchedule,
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  ),
                )
              : _classes.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.schedule_outlined,
                            size: 64,
                            color: isDark ? AppColors.textDark.withOpacity(0.5) : Colors.grey.shade400,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'No classes scheduled',
                            style: TextStyle(
                              color: isDark ? AppColors.textDark : AppColors.text,
                              fontSize: 16,
                            ),
                          ),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _loadSchedule,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _classes.length,
                        itemBuilder: (context, index) {
                          final cls = _classes[index];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: AppColors.primary.withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          cls['course_code'] ?? 'N/A',
                                          style: TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.primary,
                                          ),
                                        ),
                                      ),
                                      const Spacer(),
                                      Text(
                                        cls['semester'] ?? 'N/A',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: isDark ? AppColors.textDark.withOpacity(0.7) : Colors.grey.shade600,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  Text(
                                    cls['course_name'] ?? 'Unknown Course',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: isDark ? AppColors.textDark : AppColors.text,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      Icon(
                                        Icons.person_outline,
                                        size: 16,
                                        color: isDark ? AppColors.textDark.withOpacity(0.7) : Colors.grey.shade600,
                                      ),
                                      const SizedBox(width: 4),
                                      Expanded(
                                        child: Text(
                                          cls['doctor_name'] ?? 'TBA',
                                          style: TextStyle(
                                            fontSize: 14,
                                            color: isDark ? AppColors.textDark.withOpacity(0.8) : Colors.grey.shade700,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      Icon(
                                        Icons.credit_card_outlined,
                                        size: 16,
                                        color: isDark ? AppColors.textDark.withOpacity(0.7) : Colors.grey.shade600,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        '${cls['credit_hours'] ?? 0} Credit Hours',
                                        style: TextStyle(
                                          fontSize: 14,
                                          color: isDark ? AppColors.textDark.withOpacity(0.8) : Colors.grey.shade700,
                                        ),
                                      ),
                                      const SizedBox(width: 16),
                                      Icon(
                                        Icons.people_outline,
                                        size: 16,
                                        color: isDark ? AppColors.textDark.withOpacity(0.7) : Colors.grey.shade600,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        '${cls['enrolled_count'] ?? 0}/${cls['capacity'] ?? 0} Students',
                                        style: TextStyle(
                                          fontSize: 14,
                                          color: isDark ? AppColors.textDark.withOpacity(0.8) : Colors.grey.shade700,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      Icon(
                                        Icons.school_outlined,
                                        size: 16,
                                        color: isDark ? AppColors.textDark.withOpacity(0.7) : Colors.grey.shade600,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        'Level ${cls['level'] ?? 'N/A'}',
                                        style: TextStyle(
                                          fontSize: 14,
                                          color: isDark ? AppColors.textDark.withOpacity(0.8) : Colors.grey.shade700,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}
