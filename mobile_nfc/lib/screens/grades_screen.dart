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
      debugPrint('📊 Grades result keys: ${result.keys}');
      if (result['success'] == true) {
        final gradesRaw = result['grades'];
        debugPrint('📊 grades type: ${gradesRaw.runtimeType}');
        List<dynamic> gradesList = [];
        if (gradesRaw is List) {
          gradesList = gradesRaw;
        } else if (gradesRaw is Map) {
          final inner = gradesRaw['data'];
          if (inner is List) {
            gradesList = inner;
          } else {
            gradesList = [gradesRaw];
          }
        }
        if (gradesList.isNotEmpty) {
          debugPrint('📊 First grade fields: ${gradesList[0].keys}');
          debugPrint('📊 credit_hours: ${gradesList[0]['credit_hours']}');
          debugPrint('📊 letter: ${gradesList[0]['letter']}');
          debugPrint('📊 gpa: ${gradesList[0]['gpa']}');
        }
        setState(() {
          _grades = gradesList;
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

  // Map letter to color
  Color _getLetterColor(String? letter) {
    if (letter == null || letter.isEmpty) return Colors.grey;
    final l = letter.toUpperCase();
    if (l == 'A+' || l == 'A') return const Color(0xFF10B981);   // green
    if (l == 'A-') return const Color(0xFF34D399);
    if (l == 'B+' || l == 'B') return const Color(0xFF3B82F6);   // blue
    if (l == 'B-') return const Color(0xFF60A5FA);
    if (l == 'C+' || l == 'C') return const Color(0xFFF59E0B);   // amber
    if (l == 'C-') return const Color(0xFFFBBF24);
    if (l == 'D+' || l == 'D') return const Color(0xFFF97316);   // orange
    return const Color(0xFFEF4444);                                // red = F
  }

  // Safe double parser — handles String OR num from Postgres/JSON
  double _d(dynamic v) {
    if (v == null) return 0.0;
    if (v is num) return v.toDouble();
    return double.tryParse(v.toString()) ?? 0.0;
  }

  int _i(dynamic v) {
    if (v == null) return 0;
    if (v is num) return v.toInt();
    return int.tryParse(v.toString()) ?? 0;
  }

  // Compute overall cumulative GPA
  double _computeCumulativeGPA() {
    if (_grades.isEmpty) return 0.0;
    double totalPoints = 0;
    double totalHours = 0;
    for (final g in _grades) {
      final gpa = _d(g['gpa']);
      final hours = _d(g['credit_hours']);
      totalPoints += gpa * hours;
      totalHours += hours;
    }
    if (totalHours == 0) return 0.0;
    return totalPoints / totalHours;
  }

  int _computeTotalHours() {
    int total = 0;
    for (final g in _grades) {
      total += _i(g['credit_hours']);
    }
    return total;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cumGPA = _computeCumulativeGPA();
    final totalHours = _computeTotalHours();

    return Scaffold(
      appBar: AppBar(title: const Text('Grades')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? _buildError(isDark)
              : _grades.isEmpty
                  ? _buildEmpty(isDark)
                  : RefreshIndicator(
                      onRefresh: _loadGrades,
                      child: ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          // ── Summary header ──────────────────────────────
                          _buildSummaryCard(isDark, cumGPA, totalHours),
                          const SizedBox(height: 20),
                          // ── Grade cards ─────────────────────────────────
                          ..._grades.map((g) => _buildGradeCard(g, isDark)),
                        ],
                      ),
                    ),
    );
  }

  // ─── Summary Card ────────────────────────────────────────────────────────
  Widget _buildSummaryCard(bool isDark, double cumGPA, int totalHours) {
    final gpaColor = cumGPA >= 3.5
        ? AppColors.success
        : cumGPA >= 2.5
            ? Colors.blue
            : cumGPA >= 1.5
                ? Colors.orange
                : AppColors.error;

    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            // GPA circle
            Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: gpaColor.withOpacity(0.1),
                border: Border.all(color: gpaColor, width: 3),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    cumGPA.toStringAsFixed(2),
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      color: gpaColor,
                    ),
                  ),
                  Text(
                    'CGPA',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: gpaColor,
                      letterSpacing: 1,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 20),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Academic Summary',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppColors.textDark : AppColors.text,
                    ),
                  ),
                  const SizedBox(height: 10),
                  _summaryRow(Icons.menu_book_outlined, 'Courses', '${_grades.length}', isDark),
                  const SizedBox(height: 6),
                  _summaryRow(Icons.timer_outlined, 'Total Credit Hours', '$totalHours', isDark),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _summaryRow(IconData icon, String label, String value, bool isDark) {
    return Row(
      children: [
        Icon(icon, size: 16, color: isDark ? AppColors.textDark.withOpacity(0.6) : Colors.grey.shade500),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(
            fontSize: 13,
            color: isDark ? AppColors.textDark.withOpacity(0.7) : Colors.grey.shade600,
          ),
        ),
        const Spacer(),
        Text(
          value,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: isDark ? AppColors.textDark : AppColors.text,
          ),
        ),
      ],
    );
  }

  // ─── Individual Grade Card ────────────────────────────────────────────────
  Widget _buildGradeCard(Map<dynamic, dynamic> g, bool isDark) {
    final letter = g['letter']?.toString() ?? '';
    final letterColor = _getLetterColor(letter);
    final creditHours = _i(g['credit_hours']);
    final gpaPoints = _d(g['gpa']).toStringAsFixed(2);
    final courseName = g['course_name']?.toString() ?? 'Unknown Course';
    final courseCode = g['course_code']?.toString() ?? '';
    final semester = g['semester']?.toString() ?? '';
    final level = g['level']?.toString() ?? '';

    // breakdown scores
    final attendance = _d(g['attendance']);
    final practical  = _d(g['practical']);
    final project    = _d(g['project']);
    final midterm    = _d(g['midterm']);
    final finalMark  = _d(g['final']);
    final maxAttendance = _d(g['max_attendance']);
    final maxPractical  = _d(g['max_practical']);
    final maxProject    = _d(g['max_project']);
    final maxMidterm    = _d(g['max_midterm']);
    final maxFinal      = _d(g['max_final']);

    final total    = attendance + practical + project + midterm + finalMark;
    final maxTotal = maxAttendance + maxPractical + maxProject + maxMidterm + maxFinal;

    return Card(
      elevation: 3,
      margin: const EdgeInsets.only(bottom: 14),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          // ── Header row ──────────────────────────────────────────────────
          leading: Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: letterColor.withOpacity(0.12),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: letterColor.withOpacity(0.4), width: 1.5),
            ),
            child: Center(
              child: Text(
                letter.isEmpty ? '?' : letter,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  color: letterColor,
                ),
              ),
            ),
          ),
          title: Text(
            courseName,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: isDark ? AppColors.textDark : AppColors.text,
            ),
          ),
          subtitle: Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Row(
              children: [
                if (courseCode.isNotEmpty)
                  _chip(courseCode, AppColors.primary.withOpacity(0.1), AppColors.primary),
                const SizedBox(width: 6),
                if (creditHours > 0)
                  _chip('${creditHours}H', AppColors.success.withOpacity(0.1), AppColors.success),
                const SizedBox(width: 6),
                if (semester.isNotEmpty)
                  _chip(semester, Colors.grey.withOpacity(0.15), Colors.grey.shade600),
              ],
            ),
          ),
          trailing: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '$total/$maxTotal',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppColors.textDark : AppColors.text,
                ),
              ),
              Text(
                'GPA: $gpaPoints',
                style: TextStyle(
                  fontSize: 11,
                  color: letterColor,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          // ── Expanded detail ─────────────────────────────────────────────
          children: [
            const Divider(),
            const SizedBox(height: 8),
            // meta info row
            if (level.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  children: [
                    const Icon(Icons.school_outlined, size: 15, color: Colors.grey),
                    const SizedBox(width: 4),
                    Text('Level $level  •  $semester',
                        style: const TextStyle(fontSize: 12, color: Colors.grey)),
                    const Spacer(),
                    const Icon(Icons.credit_score_outlined, size: 15, color: Colors.grey),
                    const SizedBox(width: 4),
                    Text('$creditHours Credit Hour${creditHours != 1 ? "s" : ""}',
                        style: const TextStyle(fontSize: 12, color: Colors.grey)),
                  ],
                ),
              ),
            // Progress bars
            if (maxAttendance > 0)
              _scoreRow('Attendance', attendance, maxAttendance, const Color(0xFF6366F1), isDark),
            if (maxPractical > 0)
              _scoreRow('Practical', practical, maxPractical, const Color(0xFF3B82F6), isDark),
            if (maxProject > 0)
              _scoreRow('Project', project, maxProject, const Color(0xFFF59E0B), isDark),
            if (maxMidterm > 0)
              _scoreRow('Midterm', midterm, maxMidterm, const Color(0xFFF97316), isDark),
            if (maxFinal > 0)
              _scoreRow('Final', finalMark, maxFinal, AppColors.error, isDark),
            const SizedBox(height: 12),
            // Total bar
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: letterColor.withOpacity(0.07),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: letterColor.withOpacity(0.25)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Total Score',
                                style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                            Text(
                              '$total / $maxTotal',
                              style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: letterColor),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: LinearProgressIndicator(
                            value: maxTotal > 0 ? total / maxTotal : 0,
                            minHeight: 7,
                            backgroundColor: letterColor.withOpacity(0.15),
                            valueColor: AlwaysStoppedAnimation<Color>(letterColor),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  // Letter badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: letterColor,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      letter.isEmpty ? '?' : letter,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── Score row with progress bar ─────────────────────────────────────────
  Widget _scoreRow(String label, double score, double max, Color color, bool isDark) {
    final pct = max > 0 ? (score / max).clamp(0.0, 1.0) : 0.0;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label,
                  style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.textDark.withOpacity(0.8) : Colors.grey.shade700)),
              Text(
                '${score.toInt()} / ${max.toInt()}',
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: color),
              ),
            ],
          ),
          const SizedBox(height: 4),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: pct,
              minHeight: 5,
              backgroundColor: color.withOpacity(0.12),
              valueColor: AlwaysStoppedAnimation<Color>(color),
            ),
          ),
        ],
      ),
    );
  }

  // ─── Chip ────────────────────────────────────────────────────────────────
  Widget _chip(String label, Color bg, Color fg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
      child: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: fg)),
    );
  }

  // ─── States ──────────────────────────────────────────────────────────────
  Widget _buildError(bool isDark) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: AppColors.error),
            const SizedBox(height: 16),
            Text(_errorMessage!,
                style: TextStyle(
                    color: isDark ? AppColors.textDark : AppColors.text, fontSize: 16),
                textAlign: TextAlign.center),
            const SizedBox(height: 24),
            ElevatedButton(onPressed: _loadGrades, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }

  Widget _buildEmpty(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.grade_outlined,
              size: 64, color: isDark ? AppColors.textDark.withOpacity(0.4) : Colors.grey.shade400),
          const SizedBox(height: 16),
          Text('No grades available yet',
              style: TextStyle(
                  color: isDark ? AppColors.textDark : AppColors.text, fontSize: 16)),
        ],
      ),
    );
  }
}
