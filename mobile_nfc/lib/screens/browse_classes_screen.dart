import 'package:flutter/material.dart';
import '../services/backend_service.dart';
import '../services/auth_service.dart';
import '../main.dart';

class BrowseClassesScreen extends StatefulWidget {
  final BackendService backendService;
  final AuthService authService;

  const BrowseClassesScreen({
    required this.backendService,
    required this.authService,
    Key? key,
  }) : super(key: key);

  @override
  State<BrowseClassesScreen> createState() => _BrowseClassesScreenState();
}

class _BrowseClassesScreenState extends State<BrowseClassesScreen> {
  bool _isLoading = true;
  List<dynamic> _allClasses = [];
  List<dynamic> _enrolledClasses = [];
  Set<String> _enrolledIds = {};
  String _selectedSemester = 'Fall';
  String _searchQuery = '';
  String? _errorMessage;
  String? _busyClassId;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final user = await widget.authService.getCurrentUser();
      if (user == null) {
        setState(() {
          _errorMessage = 'Not logged in';
          _isLoading = false;
        });
        return;
      }

      final token = await widget.authService.getToken();
      if (token == null) {
        setState(() {
          _errorMessage = 'Not authenticated';
          _isLoading = false;
        });
        return;
      }

      final allClassesResult = await widget.backendService.getAllClasses(token);
      final enrolledClassesResult = await widget.backendService.getStudentClasses(user.id, token);

      if (allClassesResult['success'] == true) {
        setState(() {
          _allClasses = allClassesResult['classes'] ?? [];
        });
      }

      if (enrolledClassesResult['success'] == true) {
        final enrolled = enrolledClassesResult['classes'] ?? [];
        setState(() {
          _enrolledClasses = enrolled is List ? enrolled : enrolled.toList();
          _enrolledIds = <String>{
            ..._enrolledClasses.map((c) => c['class_id']?.toString() ?? '')
          };
        });
      }

      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load classes: ${e.toString()}';
        _isLoading = false;
      });
    }
  }

  List<dynamic> get _filteredClasses {
    return _allClasses.where((cls) {
      final semesterMatch = cls['semester'] == _selectedSemester;
      if (!semesterMatch) return false;
      
      if (_searchQuery.isEmpty) return true;
      
      final query = _searchQuery.toLowerCase();
      final courseName = (cls['course_name'] ?? '').toLowerCase();
      final courseCode = (cls['course_code'] ?? '').toLowerCase();
      final doctorName = (cls['doctor_name'] ?? '').toLowerCase();
      
      return courseName.contains(query) || 
             courseCode.contains(query) || 
             doctorName.contains(query);
    }).toList();
  }

  Future<void> _handleEnroll(String classId) async {
    setState(() {
      _busyClassId = classId;
      _errorMessage = null;
    });

    try {
      final user = await widget.authService.getCurrentUser();
      if (user == null) return;

      final token = await widget.authService.getToken();
      if (token == null) return;

      final result = await widget.backendService.enrollStudent(classId, user.id, token);
      
      if (result['success'] == true) {
        await _loadData();
      } else {
        setState(() {
          _errorMessage = result['error'] ?? 'Enrollment failed';
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Enrollment failed: ${e.toString()}';
      });
    } finally {
      setState(() {
        _busyClassId = null;
      });
    }
  }

  Future<void> _handleDrop(String classId) async {
    setState(() {
      _busyClassId = 'drop-$classId';
      _errorMessage = null;
    });

    try {
      final user = await widget.authService.getCurrentUser();
      if (user == null) return;

      final token = await widget.authService.getToken();
      if (token == null) return;

      final result = await widget.backendService.dropStudent(classId, user.id, token);
      
      if (result['success'] == true) {
        await _loadData();
      } else {
        setState(() {
          _errorMessage = result['error'] ?? 'Drop failed';
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Drop failed: ${e.toString()}';
      });
    } finally {
      setState(() {
        _busyClassId = null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Browse Classes'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Semester selector
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Row(
                    children: ['Fall', 'Spring', 'Summer'].map((semester) {
                      final isSelected = semester == _selectedSemester;
                      return Expanded(
                        child: GestureDetector(
                          onTap: () {
                            setState(() {
                              _selectedSemester = semester;
                            });
                          },
                          child: Container(
                            margin: EdgeInsets.only(
                              right: semester != 'Summer' ? 8 : 0,
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? AppColors.primary
                                  : (isDark ? AppColors.surfaceDark : Colors.grey.shade200),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              semester,
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: isSelected ? Colors.white : (isDark ? AppColors.textDark : AppColors.text),
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                // Search bar
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0),
                  child: TextField(
                    onChanged: (value) {
                      setState(() {
                        _searchQuery = value;
                      });
                    },
                    decoration: InputDecoration(
                      hintText: 'Search by course or instructor...',
                      prefixIcon: const Icon(Icons.search),
                      filled: true,
                      fillColor: isDark ? AppColors.surfaceDark : Colors.grey.shade100,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                // Error message
                if (_errorMessage != null)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.error.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.error.withOpacity(0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline, color: AppColors.error, size: 20),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _errorMessage!,
                              style: const TextStyle(color: AppColors.error),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                const SizedBox(height: 16),
                // Classes list
                Expanded(
                  child: _filteredClasses.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.search_off,
                                size: 64,
                                color: Colors.grey.shade400,
                              ),
                              const SizedBox(height: 16),
                              Text(
                                'No classes available for $_selectedSemester',
                                style: TextStyle(
                                  color: isDark ? AppColors.textDark : AppColors.text,
                                ),
                              ),
                            ],
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: _filteredClasses.length,
                          itemBuilder: (context, index) {
                            final cls = _filteredClasses[index];
                            final classId = cls['class_id'].toString();
                            final isEnrolled = _enrolledIds.contains(classId);
                            
                            // Safely parse enrolled_count and capacity
                            final enrolledCountStr = cls['enrolled_count']?.toString() ?? '0';
                            final capacityStr = cls['capacity']?.toString() ?? '0';
                            final enrolledCount = int.tryParse(enrolledCountStr) ?? 0;
                            final capacity = int.tryParse(capacityStr) ?? 0;
                            
                            final isFull = capacity > 0 && enrolledCount >= capacity;
                            final isBusy = _busyClassId == classId || _busyClassId == 'drop-$classId';

                            return Card(
                              margin: const EdgeInsets.only(bottom: 12),
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
                                                cls['course_name'] ?? 'Unknown Course',
                                                style: TextStyle(
                                                  fontSize: 16,
                                                  fontWeight: FontWeight.bold,
                                                  color: isDark ? AppColors.textDark : AppColors.text,
                                                ),
                                              ),
                                              const SizedBox(height: 4),
                                              Text(
                                                cls['course_code'] ?? '',
                                                style: TextStyle(
                                                  fontSize: 12,
                                                  color: Colors.grey.shade600,
                                                  fontWeight: FontWeight.w500,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: AppColors.primary.withOpacity(0.1),
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: Text(
                                            '${cls['credit_hours'] ?? 0}H',
                                            style: TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.bold,
                                              color: AppColors.primary,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 12),
                                    Row(
                                      children: [
                                        Icon(
                                          Icons.person_outline,
                                          size: 16,
                                          color: Colors.grey.shade600,
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          cls['doctor_name'] ?? 'TBA',
                                          style: TextStyle(
                                            fontSize: 14,
                                            color: Colors.grey.shade700,
                                          ),
                                        ),
                                        const SizedBox(width: 16),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: isFull
                                                ? AppColors.error.withOpacity(0.1)
                                                : AppColors.success.withOpacity(0.1),
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: Text(
                                            '$enrolledCount / $capacity',
                                            style: TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.bold,
                                              color: isFull ? AppColors.error : AppColors.success,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 12),
                                    if (isEnrolled)
                                      Row(
                                        children: [
                                          Expanded(
                                            child: OutlinedButton(
                                              onPressed: isBusy ? null : () => _handleDrop(classId),
                                              style: OutlinedButton.styleFrom(
                                                side: const BorderSide(color: AppColors.error),
                                                foregroundColor: AppColors.error,
                                              ),
                                              child: isBusy
                                                  ? const SizedBox(
                                                      height: 16,
                                                      width: 16,
                                                      child: CircularProgressIndicator(strokeWidth: 2),
                                                    )
                                                  : const Text('Drop'),
                                            ),
                                          ),
                                        ],
                                      )
                                    else
                                      Row(
                                        children: [
                                          Expanded(
                                            child: ElevatedButton(
                                              onPressed: (isFull || isBusy) ? null : () => _handleEnroll(classId),
                                              style: ElevatedButton.styleFrom(
                                                backgroundColor: isFull ? Colors.grey : AppColors.primary,
                                                foregroundColor: Colors.white,
                                              ),
                                              child: isBusy
                                                  ? const SizedBox(
                                                      height: 16,
                                                      width: 16,
                                                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                                    )
                                                  : Text(isFull ? 'Class Full' : 'Enroll Now'),
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
              ],
            ),
    );
  }
}
