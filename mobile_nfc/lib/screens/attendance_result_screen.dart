import 'package:flutter/material.dart';
import '../main.dart';

class AttendanceResultScreen extends StatelessWidget {
  final bool success;
  final String? message;
  final String? attendanceId;
  final VoidCallback onBackToDashboard;

  const AttendanceResultScreen({
    required this.success,
    this.message,
    this.attendanceId,
    required this.onBackToDashboard,
    Key? key,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final successColor = AppColors.success;
    final errorColor = AppColors.error;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Attendance Result'),
        automaticallyImplyLeading: false,
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Success/Failure Icon
              Container(
                width: 140,
                height: 140,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    colors: success
                        ? [successColor.withOpacity(0.1), successColor.withOpacity(0.2)]
                        : [errorColor.withOpacity(0.1), errorColor.withOpacity(0.2)],
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: (success ? successColor : errorColor).withOpacity(0.2),
                      blurRadius: 30,
                      spreadRadius: 10,
                    ),
                  ],
                ),
                child: Icon(
                  success ? Icons.check_circle_outline : Icons.cancel_outlined,
                  size: 80,
                  color: success ? successColor : errorColor,
                ),
              ),
              const SizedBox(height: 32),

              // Result Title
              Text(
                success ? 'Check-In Successful!' : 'Check-In Failed',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: success ? successColor : errorColor,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),

              // Message
              if (message != null)
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: (success ? successColor : errorColor).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: (success ? successColor : errorColor).withOpacity(0.3),
                      width: 1,
                    ),
                  ),
                  child: Text(
                    message!,
                    style: TextStyle(
                      color: success ? successColor : errorColor,
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              if (message != null) const SizedBox(height: 24),

              // Attendance ID
              if (attendanceId != null)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      children: [
                        Text(
                          'Attendance ID',
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark ? AppColors.textDark.withOpacity(0.7) : Colors.grey.shade600,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 1.2,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            attendanceId!,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                              letterSpacing: 1.5,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              if (attendanceId != null) const SizedBox(height: 32),

              // Back to Dashboard button
              ElevatedButton(
                onPressed: onBackToDashboard,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 32),
                  minimumSize: const Size(double.infinity, 56),
                ),
                child: const Text(
                  'Back to Dashboard',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
