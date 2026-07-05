import 'dart:async';
import 'package:flutter/material.dart';
import '../services/nfc_service.dart';
import '../services/backend_service.dart';
import '../services/auth_service.dart';
import '../models/nfc_payload.dart';
import '../main.dart';

class NfcScanScreen extends StatefulWidget {
  final NfcService nfcService;
  final BackendService backendService;
  final AuthService authService;
  final VoidCallback onScanComplete;
  final VoidCallback onCancel;

  const NfcScanScreen({
    required this.nfcService,
    required this.backendService,
    required this.authService,
    required this.onScanComplete,
    required this.onCancel,
    Key? key,
  }) : super(key: key);

  @override
  State<NfcScanScreen> createState() => _NfcScanScreenState();
}

class _NfcScanScreenState extends State<NfcScanScreen> {
  bool _isInitializing = false;
  bool _isScanning = false;
  bool _hasError = false;
  String _statusMessage = 'Initializing NFC...';
  String? _errorMessage;
  StreamSubscription? _eventSubscription;

  @override
  void initState() {
    super.initState();
    _initializeNfc();
  }

  Future<void> _initializeNfc() async {
    setState(() {
      _isInitializing = true;
      _statusMessage = 'Initializing NFC...';
    });

    final isAvailable = await widget.nfcService.isNfcAvailable();
    
    if (!isAvailable) {
      setState(() {
        _isInitializing = false;
        _hasError = true;
        _errorMessage = 'NFC is not available on this device';
        _statusMessage = 'NFC Unavailable';
      });
      return;
    }

    final initialized = await widget.nfcService.initialize();
    
    if (!initialized) {
      setState(() {
        _isInitializing = false;
        _hasError = true;
        _errorMessage = 'Failed to initialize NFC';
        _statusMessage = 'Initialization Failed';
      });
      return;
    }

    await _startNfcSession();
  }

  Future<void> _startNfcSession() async {
    final deviceId = await widget.authService.getDeviceId();
    final student = await widget.authService.getCurrentUser();
    
    if (deviceId == null || student == null) {
      setState(() {
        _isInitializing = false;
        _hasError = true;
        _errorMessage = 'Device not registered or user not logged in';
        _statusMessage = 'Setup Required';
      });
      return;
    }

    setState(() {
      _isInitializing = false;
      _isScanning = true;
      _statusMessage = 'Requesting challenge...';
    });

    // Request challenge from backend
    final challengeResult = await widget.backendService.requestAuthChallenge(
      student.id,
      deviceId,
      await widget.authService.getToken() ?? '',
    );

    if (challengeResult['success'] != true) {
      setState(() {
        _hasError = true;
        _errorMessage = challengeResult['error'] ?? 'Failed to get challenge';
        _statusMessage = 'Challenge Failed';
        _isScanning = false;
      });
      return;
    }

    final challenge = challengeResult['challenge'];
    final timestamp = challengeResult['timestamp'] ?? DateTime.now().millisecondsSinceEpoch;

    // Create NFC payload
    final payload = NfcPayload(
      studentId: student.id,
      deviceId: deviceId,
      challenge: challenge,
      timestamp: timestamp,
    );

    setState(() {
      _statusMessage = 'Hold phone near NFC reader...';
    });

    // Start HCE session
    final hceStarted = await widget.nfcService.startHceSession(payload);
    
    if (!hceStarted) {
      setState(() {
        _hasError = true;
        _errorMessage = 'Failed to start HCE session';
        _statusMessage = 'HCE Failed';
        _isScanning = false;
      });
      return;
    }

    // Listen for NFC events
    _eventSubscription = widget.nfcService.events.listen((event) {
      _handleNfcEvent(event, challenge);
    });

    // Set a timeout for the scan
    Future.delayed(const Duration(seconds: 30), () {
      if (_isScanning) {
        _handleScanTimeout();
      }
    });
  }

  void _handleNfcEvent(dynamic event, String challenge) {
    print('📡 NFC Event received: $event');
    
    // Handle NFC reader interaction
    setState(() {
      _statusMessage = 'NFC interaction detected...';
    });

    // Verify with backend
    _verifyAttendance(challenge);
  }

  void _handleScanTimeout() {
    setState(() {
      _hasError = true;
      _errorMessage = 'Scan timeout - no NFC reader detected';
      _statusMessage = 'Timeout';
      _isScanning = false;
    });
    widget.nfcService.stopHceSession();
  }

  Future<void> _verifyAttendance(String challenge) async {
    final deviceId = await widget.authService.getDeviceId();
    final student = await widget.authService.getCurrentUser();
    
    if (deviceId == null || student == null) {
      setState(() {
        _hasError = true;
        _errorMessage = 'Verification failed: Missing credentials';
        _statusMessage = 'Verification Failed';
        _isScanning = false;
      });
      return;
    }

    setState(() {
      _statusMessage = 'Verifying attendance...';
    });

    // Create challenge response (simplified - in production use proper crypto)
    final challengeResponse = '$challenge:${DateTime.now().millisecondsSinceEpoch}';

    final result = await widget.backendService.verifyResponse(
      student.id,
      challengeResponse,
      deviceId,
    );

    await widget.nfcService.stopHceSession();

    if (result['success'] == true && result['verified'] == true) {
      widget.onScanComplete();
    } else {
      setState(() {
        _hasError = true;
        _errorMessage = result['error'] ?? 'Attendance verification failed';
        _statusMessage = 'Verification Failed';
        _isScanning = false;
      });
    }
  }

  Future<void> _handleCancel() async {
    await widget.nfcService.stopHceSession();
    widget.onCancel();
  }

  @override
  void dispose() {
    _eventSubscription?.cancel();
    widget.nfcService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('NFC Check-In'),
        leading: IconButton(
          icon: const Icon(Icons.close_outlined),
          onPressed: _handleCancel,
        ),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // NFC Animation
              Container(
                width: 200,
                height: 200,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: _hasError
                      ? LinearGradient(
                          colors: [Colors.red.shade100, Colors.red.shade200],
                        )
                      : LinearGradient(
                          colors: [
                            AppColors.primary.withOpacity(0.1),
                            AppColors.primaryLight.withOpacity(0.2),
                          ],
                        ),
                  boxShadow: [
                    BoxShadow(
                      color: (_hasError ? Colors.red : AppColors.primary).withOpacity(0.2),
                      blurRadius: 30,
                      spreadRadius: 10,
                    ),
                  ],
                ),
                child: Center(
                  child: _isInitializing || _isScanning
                      ? SizedBox(
                          width: 100,
                          height: 100,
                          child: CircularProgressIndicator(
                            strokeWidth: 4,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              _hasError ? Colors.red : AppColors.primary,
                            ),
                          ),
                        )
                      : Icon(
                          _hasError ? Icons.error_outline : Icons.nfc,
                          size: 100,
                          color: _hasError ? Colors.red : AppColors.primary,
                        ),
                ),
              ),
              const SizedBox(height: 32),

              // Status message
              Text(
                _statusMessage,
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: _hasError ? Colors.red : AppColors.primary,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),

              // Error message
              if (_errorMessage != null)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: Colors.red.withOpacity(0.3),
                      width: 1,
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.error_outline,
                        color: Colors.red.shade400,
                        size: 20,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          _errorMessage!,
                          style: TextStyle(
                            color: Colors.red.shade400,
                            fontSize: 14,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ],
                  ),
                ),
              if (_errorMessage != null) const SizedBox(height: 24),

              // Instructions
              if (!_hasError && _isScanning)
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: AppColors.primary.withOpacity(0.3),
                      width: 1,
                    ),
                  ),
                  child: Column(
                    children: [
                      Icon(
                        Icons.info_outline,
                        color: AppColors.primary,
                        size: 28,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Hold your phone near the NFC reader',
                        style: TextStyle(
                          color: isDark ? AppColors.textDark : AppColors.text,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),

              const SizedBox(height: 32),

              // Cancel button
              if (_isScanning)
                OutlinedButton(
                  onPressed: _handleCancel,
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                    side: BorderSide(
                      color: isDark ? AppColors.borderDark : AppColors.border,
                      width: 1,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Text(
                    'Cancel',
                    style: TextStyle(
                      color: isDark ? AppColors.textDark : AppColors.text,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
