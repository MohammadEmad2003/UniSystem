import 'package:flutter/material.dart';
import '../services/backend_service.dart';
import '../services/auth_service.dart';
import '../main.dart';

class GradesScreen extends StatefulWidget {
  final BackendService backendService;
  final AuthService authService;

  const GradesScreen({
    required this.backendService,
    required this.authService,
    Key? key,
  }) : super(key: key);

  @override
  State<GradesScreen> createState() => _GradesScreenState();
}

class _GradesScreenState extends State<GradesScreen> {
  bool _isLoading = true;
  List<dynamic> _grades = [];
  String? _errorMessage;
  Map<String, dynamic>? _selectedGrade;

  @override
  void initState() {
    super.initState();
    _loadGrades();
  }

  Future<void> _loadGrades() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final token = await widget.authService.getToken();
    final user = await widget.authService.getCurrentUser();

    if (token != null && user != null) {
      final result = await widget.backendService.getStudentGrades(user.id, token);
      if (result['success'] == true) {
        final gradesData = result['grades'];
        setState(() {
          // Handle both List and Map responses
          if (gradesData is List) {
            _grades = gradesData;
          } else if (gradesData is Map) {
            _grades = [gradesData];
          } else {
            _grades = [];
          }
          _isLoading = false;
        });
      } else {
        setState(() {
          _errorMessage = result['error'] ?? 'Failed to load grades';
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

  Color _getGradeColor(dynamic grade) {
    if (grade == null || grade == '-' || grade == '') return Colors.grey;
    final gradeStr = grade.toString();
    final g = gradeStr.toUpperCase();
    if (g.startsWith('A')) return AppColors.success;
    if (g.startsWith('B')) return Colors.blue;
    if (g.startsWith('C')) return Colors.orange;
    if (g.startsWith('D')) return Colors.orange.shade700;
    return AppColors.error;
  }

  void _showGradeDetails(Map<String, dynamic> grade) {
    setState(() {
      _selectedGrade = grade;
    });
    
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _buildGradeDetailsSheet(grade),
    );
  }

  Widget _buildGradeDetailsSheet(Map<String, dynamic> grade) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final gradeValue = grade['grade']?.toString() ?? '';
    final gradeColor = _getGradeColor(gradeValue);
    
    // Calculate total
    final midterm = (grade['midterm'] as num?)?.toDouble() ?? 0.0;
    final practical = (grade['practical'] as num?)?.toDouble() ?? 0.0;
    final project = (grade['project'] as num?)?.toDouble() ?? 0.0;
    final attendance = (grade['attendance'] as num?)?.toDouble() ?? 0.0;
    final finalExam = (grade['final'] as num?)?.toDouble() ?? 0.0;
    final total = midterm + practical + project + attendance + finalExam;
    
    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.cardDark : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle bar
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 20),
          
          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        grade['course_name']?.toString() ?? 'Unknown Course',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: isDark ? AppColors.textDark : AppColors.text,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        grade['course_code']?.toString() ?? '',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey.shade600,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  gradeValue,
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: gradeColor,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          
          // Grade Breakdown Table
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Container(
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : Colors.grey.shade50,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: isDark ? AppColors.borderDark : AppColors.border),
              ),
              child: Column(
                children: [
                  _buildGradeRow('Midterm', midterm, isDark),
                  Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.border),
                  _buildGradeRow('Practical', practical, isDark),
                  Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.border),
                  _buildGradeRow('Project', project, isDark),
                  Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.border),
                  _buildGradeRow('Attendance', attendance, isDark),
                  Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.border),
                  _buildGradeRow('Final', finalExam, isDark, isBold: true),
                  Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.border),
                  _buildGradeRow('Total', total, isDark, isBold: true, isTotal: true),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          
          // Additional Details
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              children: [
                _buildDetailRow(
                  icon: Icons.credit_card_outlined,
                  label: 'Credit Hours',
                  value: '${grade['credit_hours']?.toString() ?? '0'} Hours',
                  isDark: isDark,
                ),
                const SizedBox(height: 16),
                _buildDetailRow(
                  icon: Icons.calendar_today_outlined,
                  label: 'Semester',
                  value: grade['semester']?.toString() ?? '',
                  isDark: isDark,
                ),
                const SizedBox(height: 16),
                _buildDetailRow(
                  icon: Icons.school_outlined,
                  label: 'Level',
                  value: grade['level']?.toString() ?? '',
                  isDark: isDark,
                ),
                const SizedBox(height: 16),
                if (grade['gpa'] != null)
                  _buildDetailRow(
                    icon: Icons.analytics_outlined,
                    label: 'GPA',
                    value: grade['gpa'].toString(),
                    isDark: isDark,
                  ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          
          // Close button
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text('Close', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildGradeRow(String label, double value, bool isDark, {bool isBold = false, bool isTotal = false}) {
    final color = isTotal 
        ? (value >= 50 ? AppColors.success : AppColors.error)
        : (isDark ? AppColors.textDark : AppColors.text);
    
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 14,
              fontWeight: isBold ? FontWeight.bold : FontWeight.w500,
              color: isDark ? AppColors.textDark.withOpacity(0.8) : Colors.grey.shade700,
            ),
          ),
          Text(
            value.toStringAsFixed(0),
            style: TextStyle(
              fontSize: 16,
              fontWeight: isBold ? FontWeight.bold : FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow({
    required IconData icon,
    required String label,
    required String value,
    required bool isDark,
  }) {
    return Row(
      children: [
        Icon(icon, size: 20, color: Colors.grey.shade600),
        const SizedBox(width: 12),
        Text(
          label,
          style: TextStyle(
            fontSize: 14,
            color: Colors.grey.shade600,
            fontWeight: FontWeight.w500,
          ),
        ),
        const Spacer(),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: isDark ? AppColors.textDark : AppColors.text,
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Grades'),
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
                          onPressed: _loadGrades,
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  ),
                )
              : _grades.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.grade_outlined,
                            size: 64,
                            color: isDark ? AppColors.textDark.withOpacity(0.5) : Colors.grey.shade400,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'No grades available',
                            style: TextStyle(
                              color: isDark ? AppColors.textDark : AppColors.text,
                              fontSize: 16,
                            ),
                          ),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _loadGrades,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _grades.length,
                        itemBuilder: (context, index) {
                          final grade = _grades[index];
                          final gradeValue = grade['grade']?.toString() ?? '';
                          final gradeColor = _getGradeColor(gradeValue);

                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: InkWell(
                              onTap: () => _showGradeDetails(grade),
                              borderRadius: BorderRadius.circular(12),
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                grade['course_name'] ?? 'Unknown Course',
                                                style: TextStyle(
                                                  fontSize: 16,
                                                  fontWeight: FontWeight.bold,
                                                  color: isDark ? AppColors.textDark : AppColors.text,
                                                ),
                                              ),
                                              const SizedBox(height: 4),
                                              Text(
                                                grade['course_code']?.toString() ?? '',
                                                style: TextStyle(
                                                  fontSize: 12,
                                                  color: isDark ? AppColors.textDark.withOpacity(0.7) : Colors.grey.shade600,
                                                  fontWeight: FontWeight.w500,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        Text(
                                          gradeValue,
                                          style: TextStyle(
                                            fontSize: 18,
                                            fontWeight: FontWeight.bold,
                                            color: gradeColor,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 12),
                                    Row(
                                      children: [
                                        Icon(
                                          Icons.calendar_today_outlined,
                                          size: 16,
                                          color: isDark ? AppColors.textDark.withOpacity(0.7) : Colors.grey.shade600,
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          grade['semester']?.toString() ?? '',
                                          style: TextStyle(
                                            fontSize: 14,
                                            color: isDark ? AppColors.textDark.withOpacity(0.8) : Colors.grey.shade700,
                                          ),
                                        ),
                                        const SizedBox(width: 16),
                                        Icon(
                                          Icons.credit_card_outlined,
                                          size: 16,
                                          color: isDark ? AppColors.textDark.withOpacity(0.7) : Colors.grey.shade600,
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          '${grade['credit_hours']?.toString() ?? '0'} Credits',
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
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}
