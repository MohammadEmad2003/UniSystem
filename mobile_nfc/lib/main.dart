import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'state/app_state.dart';
import 'services/auth_service.dart';
import 'services/backend_service.dart';
import 'services/nfc_service.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/nfc_scan_screen.dart';
import 'screens/attendance_result_screen.dart';
import 'screens/schedule_screen.dart';
import 'screens/grades_screen.dart';
import 'screens/payments_screen.dart';
import 'screens/browse_classes_screen.dart';
import 'models/student.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'dart:io' show Platform;

String getBaseUrl() {
  // Use Vercel url for production or fallback, but for local dev:
  // return 'https://uni-system-psi.vercel.app';

  // Using your computer's local network IP so both Emulator and Physical devices can connect!
  return 'http://192.168.1.5:3000';
}

// Web-inspired color scheme
class AppColors {
  static const Color primary = Color(0xFF00B8D4); // Cyan
  static const Color primaryDark = Color(0xFF00E5FF); // Lighter cyan for dark mode
  static const Color primaryLight = Color(0xFF00ACC1); // Darker cyan
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceDark = Color(0xFF0A192F);
  static const Color background = Color(0xFFFFFFFF);
  static const Color backgroundDark = Color(0xFF050B14);
  static const Color text = Color(0xFF0F172A);
  static const Color textDark = Color(0xFFE2E8F0);
  static const Color card = Color(0xFFFFFFFF);
  static const Color cardDark = Color(0xFF0A192F);
  static const Color border = Color(0xFFE2E8F0);
  static const Color borderDark = Color(0xFF334155);
  static const Color error = Color(0xFFEF4444);
  static const Color success = Color(0xFF10B981);
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Stripe with your publishable key
  // TODO: Replace with your actual Stripe publishable key
  Stripe.publishableKey = 'pk_test_51ToJQy34552aA5kTYCVMsXmrXCqj9t7DMHVPNRukbl7BZuHnKkthDjKx0MEBBGEOel9ugPP5kmymHGgCiBxoisd600ei9QE24t';
  
  runApp(const UniSystemNFCApp());
}

class UniSystemNFCApp extends StatelessWidget {
  const UniSystemNFCApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AppState()),
        Provider(
          create: (_) => AuthService(
            baseUrl: getBaseUrl(), // Backend URL
          ),
        ),
        Provider(
          create: (_) => BackendService(
            baseUrl: getBaseUrl(), // Backend URL
          ),
        ),
        Provider(
          create: (_) => NfcService(),
        ),
      ],
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        title: 'UniSystem NFC',
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(
            seedColor: AppColors.primary,
            primary: AppColors.primary,
            secondary: AppColors.primaryLight,
            surface: AppColors.surface,
            background: AppColors.background,
            error: AppColors.error,
          ),
          scaffoldBackgroundColor: AppColors.background,
          useMaterial3: true,
          appBarTheme: const AppBarTheme(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            elevation: 0,
            centerTitle: true,
          ),
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              elevation: 2,
            ),
          ),
          inputDecorationTheme: InputDecorationTheme(
            filled: true,
            fillColor: AppColors.surface,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.primary, width: 2),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          ),
          cardTheme: CardThemeData(
            color: AppColors.card,
            elevation: 2,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: const BorderSide(color: AppColors.border, width: 1),
            ),
          ),
        ),
        darkTheme: ThemeData(
          colorScheme: ColorScheme.fromSeed(
            seedColor: AppColors.primaryDark,
            primary: AppColors.primaryDark,
            secondary: AppColors.primary,
            surface: AppColors.surfaceDark,
            background: AppColors.backgroundDark,
            error: AppColors.error,
          ),
          scaffoldBackgroundColor: AppColors.backgroundDark,
          useMaterial3: true,
          appBarTheme: const AppBarTheme(
            backgroundColor: AppColors.surfaceDark,
            foregroundColor: AppColors.textDark,
            elevation: 0,
            centerTitle: true,
          ),
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryDark,
              foregroundColor: Colors.black,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              elevation: 2,
            ),
          ),
          inputDecorationTheme: InputDecorationTheme(
            filled: true,
            fillColor: AppColors.surfaceDark,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.borderDark),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.borderDark),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.primaryDark, width: 2),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          ),
          cardTheme: CardThemeData(
            color: AppColors.cardDark,
            elevation: 4,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: const BorderSide(color: AppColors.borderDark, width: 1),
            ),
          ),
        ),
        themeMode: ThemeMode.system,
        home: const MainNavigation(),
      ),
    );
  }
}

class MainNavigation extends StatefulWidget {
  const MainNavigation({super.key});

  @override
  State<MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<MainNavigation> {
  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();

    if (!appState.isLoggedIn) {
      return LoginScreen(
        authService: context.read<AuthService>(),
        onLoginSuccess: _handleLoginSuccess,
      );
    }

    if (appState.currentStudent == null) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    return _buildNavigation();
  }

  Widget _buildNavigation() {
    return Navigator(
      onGenerateRoute: (settings) {
        switch (settings.name) {
          case '/dashboard':
            return MaterialPageRoute(
              builder: (navContext) => DashboardScreen(
                authService: context.read<AuthService>(),
                backendService: context.read<BackendService>(),
                student: context.read<AppState>().currentStudent!,
                onLogout: _handleLogout,
                onNfcScan: () => Navigator.pushNamed(navContext, '/nfc-scan'),
                onNavigate: (route) => Navigator.pushNamed(navContext, route),
              ),
            );
          case '/nfc-scan':
            return MaterialPageRoute(
              builder: (navContext) => NfcScanScreen(
                nfcService: context.read<NfcService>(),
                backendService: context.read<BackendService>(),
                authService: context.read<AuthService>(),
                onScanComplete: () => Navigator.pushNamed(
                  navContext, 
                  '/attendance-result',
                  arguments: {
                    'success': true,
                    'message': 'Attendance recorded successfully',
                    'attendanceId': 'ATT_${DateTime.now().millisecondsSinceEpoch}',
                  },
                ),
                onCancel: () => Navigator.pop(navContext),
              ),
            );
          case '/attendance-result':
            final args = settings.arguments as Map<String, dynamic>?;
            return MaterialPageRoute(
              builder: (navContext) => AttendanceResultScreen(
                success: args?['success'] ?? false,
                message: args?['message'],
                attendanceId: args?['attendanceId'],
                onBackToDashboard: () => Navigator.pushNamedAndRemoveUntil(navContext, '/dashboard', (route) => false),
              ),
            );
          case '/schedule':
            return MaterialPageRoute(
              builder: (navContext) => ScheduleScreen(
                backendService: context.read<BackendService>(),
                authService: context.read<AuthService>(),
              ),
            );
          case '/grades':
            return MaterialPageRoute(
              builder: (navContext) => GradesScreen(
                backendService: context.read<BackendService>(),
                authService: context.read<AuthService>(),
              ),
            );
          case '/payments':
            return MaterialPageRoute(
              builder: (navContext) => PaymentsScreen(
                backendService: context.read<BackendService>(),
                authService: context.read<AuthService>(),
              ),
            );
          case '/browse-classes':
            return MaterialPageRoute(
              builder: (navContext) => BrowseClassesScreen(
                backendService: context.read<BackendService>(),
                authService: context.read<AuthService>(),
              ),
            );
          default:
            return MaterialPageRoute(
              builder: (navContext) => DashboardScreen(
                authService: context.read<AuthService>(),
                backendService: context.read<BackendService>(),
                student: context.read<AppState>().currentStudent!,
                onLogout: _handleLogout,
                onNfcScan: () => Navigator.pushNamed(navContext, '/nfc-scan'),
                onNavigate: (route) => Navigator.pushNamed(navContext, route),
              ),
            );
        }
      },
      initialRoute: '/dashboard',
    );
  }

  Future<void> _handleLoginSuccess() async {
    final authService = context.read<AuthService>();
    final appState = context.read<AppState>();

    print('🔄 Starting login success handler...');

    // Get user profile first
    final user = await authService.getCurrentUser();
    print('👤 User: ${user != null ? user.id : "null"}');
    
    if (user != null) {
      appState.setUser(user);
      print('✅ User set in app state');
      
      // Get or generate persistent device ID
      String? deviceId = await authService.getDeviceId();
      if (deviceId == null) {
        deviceId = 'device_${DateTime.now().millisecondsSinceEpoch}';
        await authService.setDeviceId(deviceId);
        print('📱 New device ID generated: $deviceId');
      } else {
        print('📱 Existing device ID: $deviceId');
      }

      // Register device with student ID
      final registerResult = await authService.registerDevice(deviceId, user.id);
      print('📝 Device registration: ${registerResult['success']}');
      
      // Get student profile with user ID
      final student = await authService.getStudentProfile(user.id);
      
      if (student != null) {
        appState.setStudent(student);
        print('✅ Student set in app state from profile');
      } else {
        print('⚠️ Student profile not found, generating minimal student from user data...');
        
        // Fallback to generating a minimal Student from User data
        String departmentValue = 'N/A';
        
        // Try to get department name from backend if we have departmentId but no departmentName
        if (user.departmentName != null && user.departmentName!.isNotEmpty) {
          departmentValue = user.departmentName!;
        } else if (user.departmentId != null) {
          final backendService = context.read<BackendService>();
          final token = await authService.getToken();
          final deptResult = await backendService.getDepartmentName(user.departmentId!, token ?? '');
          
          if (deptResult['success'] == true && deptResult['departmentName'] != null) {
            departmentValue = deptResult['departmentName'];
          } else {
            departmentValue = 'Department ${user.departmentId}';
          }
        }
        
        final minimalStudent = Student(
          id: user.id,
          studentNumber: user.ssn ?? user.id,
          name: user.name,
          faculty: 'Faculty of Information Technology',
          department: departmentValue,
          academicLevel: user.academicLevel ?? '1',
          accountStatus: user.accountStatus ?? 'Active',
          paymentStatus: user.paymentStatus ?? 'Unknown',
          ssn: user.ssn,
        );
        appState.setStudent(minimalStudent);
        print('✅ Minimal student object created and set in app state');
      }
    } else {
      print('❌ User is null, cannot proceed');
    }
    
    print('🏁 Login success handler completed');
  }

  Future<void> _handleLogout() async {
    final authService = context.read<AuthService>();
    final appState = context.read<AppState>();

    await authService.clearAuth();
    appState.logout();
  }
}

