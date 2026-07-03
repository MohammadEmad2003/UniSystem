import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_stripe/flutter_stripe.dart' as stripe;
import '../services/backend_service.dart';
import '../services/auth_service.dart';
import '../main.dart';

class PaymentsScreen extends StatefulWidget {
  final BackendService backendService;
  final AuthService authService;

  const PaymentsScreen({
    required this.backendService,
    required this.authService,
    Key? key,
  }) : super(key: key);

  @override
  State<PaymentsScreen> createState() => _PaymentsScreenState();
}

class _PaymentsScreenState extends State<PaymentsScreen> {
  bool _isLoading = true;
  bool _isProcessingPayment = false;
  bool _paymentSuccess = false;
  Map<String, dynamic>? _details;
  String? _errorMessage;
  final TextEditingController _amountController = TextEditingController();
  double _paymentAmount = 0.0;

  @override
  void initState() {
    super.initState();
    // Delay loading to prevent crash on screen open
    Future.delayed(const Duration(milliseconds: 100), () {
      if (mounted) {
        _loadPayments();
      }
    });
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _loadPayments() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _paymentSuccess = false;
    });

    try {
      final token = await widget.authService.getToken();
      final user = await widget.authService.getCurrentUser();

      if (token != null && user != null) {
        final result = await widget.backendService.getStudentPayments(user.id, token).timeout(
          const Duration(seconds: 30),
          onTimeout: () {
            throw Exception('Loading payments timeout. Please check your connection.');
          },
        );
        if (result['success'] == true) {
          final paymentsData = result['payments'];
          setState(() {
            if (paymentsData is Map<String, dynamic>) {
              _details = paymentsData;
            } else if (paymentsData is List && paymentsData.isNotEmpty) {
               // In case the backend returns a list
              _details = paymentsData[0] is Map ? paymentsData[0] as Map<String, dynamic> : null;
            } else {
              _details = null;
            }
            _isLoading = false;
          });
        } else {
          setState(() {
            _errorMessage = result['error'] ?? 'Failed to load payment details';
            _isLoading = false;
          });
        }
      } else {
        setState(() {
          _errorMessage = 'Not logged in';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Error loading payments: ${e.toString()}';
        _isLoading = false;
      });
    }
  }

  Future<void> _handlePayment() async {
    final amountText = _amountController.text;
    if (amountText.isEmpty) {
      _showError('Please enter a valid amount.');
      return;
    }

    final amount = double.tryParse(amountText);
    if (amount == null || amount <= 0) {
      _showError('Please enter a valid amount.');
      return;
    }

    final remaining = (_details?['remaining_amount'] as num?)?.toDouble() ?? 0.0;
    if (amount > remaining) {
      _showError('Amount cannot exceed the remaining balance (\$${remaining.toStringAsFixed(2)}).');
      return;
    }

    setState(() {
      _isProcessingPayment = true;
      _errorMessage = null;
      _paymentAmount = amount;
    });

    try {
      final token = await widget.authService.getToken();
      final user = await widget.authService.getCurrentUser();

      if (token == null || user == null) {
        _showError('Not logged in');
        setState(() => _isProcessingPayment = false);
        return;
      }

      // Create payment intent on backend
      final result = await widget.backendService.createPaymentIntent(
        user.id,
        amount.toString(),
        token,
      ).timeout(
        const Duration(seconds: 30),
        onTimeout: () {
          throw Exception('Request timeout. Please check your connection.');
        },
      );

      if (result['success'] != true) {
        _showError(result['error'] ?? 'Failed to create payment intent');
        setState(() => _isProcessingPayment = false);
        return;
      }

      final clientSecret = result['clientSecret'];
      final paymentIntentId = result['paymentIntentId'];

      // Initialize Stripe payment sheet with timeout
      await stripe.Stripe.instance.initPaymentSheet(
        paymentSheetParameters: stripe.SetupPaymentSheetParameters(
          paymentIntentClientSecret: clientSecret,
          merchantDisplayName: 'UniSystem',
          allowsDelayedPaymentMethods: true,
          style: ThemeMode.system,
        ),
      ).timeout(
        const Duration(seconds: 30),
        onTimeout: () {
          throw Exception('Payment sheet initialization timeout.');
        },
      );

      // Present payment sheet with timeout
      await stripe.Stripe.instance.presentPaymentSheet().timeout(
        const Duration(minutes: 5),
        onTimeout: () {
          throw Exception('Payment timeout.');
        },
      );

      // If we reach here, payment was successful
      
      // Confirm payment with backend with timeout
      await widget.backendService.confirmPayment(paymentIntentId, token).timeout(
        const Duration(seconds: 30),
        onTimeout: () {
          throw Exception('Payment confirmation timeout.');
        },
      );

      setState(() {
        _paymentSuccess = true;
        _isProcessingPayment = false;
        
        // Update local details to reflect payment
        if (_details != null) {
          final currentPaid = (_details!['paid_amount'] as num?)?.toDouble() ?? 0.0;
          final currentRemaining = (_details!['remaining_amount'] as num?)?.toDouble() ?? 0.0;
          
          _details!['paid_amount'] = currentPaid + amount;
          _details!['remaining_amount'] = (currentRemaining - amount).clamp(0.0, double.infinity);
          if (_details!['remaining_amount'] == 0) {
            _details!['payment_status'] = 'Paid';
          }
        }
      });
      _amountController.clear();
      
    } on stripe.StripeException catch (e) {
      setState(() => _isProcessingPayment = false);
      if (e.error.code == stripe.FailureCode.Canceled) {
        // User canceled, do nothing
      } else {
        _showError('Payment failed: ${e.error.message}');
      }
    } catch (e) {
      setState(() => _isProcessingPayment = false);
      _showError('Payment failed: ${e.toString()}');
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppColors.error,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isPaid = _details?['payment_status']?.toString().toLowerCase() == 'paid';
    final remaining = (_details?['remaining_amount'] as num?)?.toDouble() ?? 0.0;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Payment Portal'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null && _details == null
              ? _buildErrorState(isDark)
              : _details == null
                  ? _buildEmptyState(isDark)
                  : SingleChildScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _buildSummaryCard(isDark),
                          const SizedBox(height: 24),
                          if (_paymentSuccess)
                            _buildSuccessCard(isDark)
                          else if (isPaid)
                            _buildApprovedCard(isDark)
                          else
                            _buildPaymentForm(isDark, remaining),
                          const SizedBox(height: 24),
                          _buildCoursesCard(isDark),
                        ],
                      ),
                    ),
    );
  }

  Widget _buildSummaryCard(bool isDark) {
    final totalFees = (_details?['total_fees'] as num?)?.toDouble() ?? 0.0;
    final paidAmount = (_details?['paid_amount'] as num?)?.toDouble() ?? 0.0;
    final remainingAmount = (_details?['remaining_amount'] as num?)?.toDouble() ?? 0.0;
    final totalHours = _details?['total_hours']?.toString() ?? '0';
    final hourPrice = _details?['hour_price']?.toString() ?? '0';
    
    double progress = totalFees > 0 ? (paidAmount / totalFees) : 0.0;
    if (progress > 1.0) progress = 1.0;

    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Payment Summary',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: isDark ? AppColors.textDark : AppColors.text,
              ),
            ),
            const SizedBox(height: 20),
            
            // Tuition Total
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : Colors.grey.shade50,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: isDark ? AppColors.borderDark : AppColors.border),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'TUITION TOTAL',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 1.2),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '\$${totalFees.toStringAsFixed(2)}',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: isDark ? AppColors.textDark : AppColors.text),
                      ),
                      Text(
                        '${totalHours}hrs × \$${hourPrice}/hr',
                        style: const TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            
            // Amount Paid
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.success.withOpacity(0.05),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.success.withOpacity(0.2)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'AMOUNT PAID',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.success, letterSpacing: 1.2),
                  ),
                  Text(
                    '\$${paidAmount.toStringAsFixed(2)}',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.success),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            
            // Remaining
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.error.withOpacity(0.05),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.error.withOpacity(0.2)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'REMAINING',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.error, letterSpacing: 1.2),
                  ),
                  Text(
                    '\$${remainingAmount.toStringAsFixed(2)}',
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.error),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            
            // Progress - simplified without LinearProgressIndicator
            if (totalFees > 0) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('PAYMENT PROGRESS', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey)),
                  Text('${(progress * 100).round()}%', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey)),
                ],
              ),
              const SizedBox(height: 8),
              Container(
                height: 8,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(10),
                  color: isDark ? AppColors.borderDark : AppColors.border,
                ),
                child: FractionallySizedBox(
                  widthFactor: progress,
                  alignment: Alignment.centerLeft,
                  child: Container(
                    decoration: const BoxDecoration(
                      borderRadius: BorderRadius.only(
                        topLeft: Radius.circular(10),
                        bottomLeft: Radius.circular(10),
                      ),
                      color: AppColors.success,
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentForm(bool isDark, double remaining) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.credit_card, color: AppColors.primary),
                ),
                const SizedBox(width: 16),
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Secure Payment', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    Text('Pay your tuition fees via Stripe', style: TextStyle(fontSize: 12, color: Colors.grey)),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 24),
            
            Text(
              'PAYMENT AMOUNT (USD)',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey.shade500, letterSpacing: 1.2),
            ),
            const SizedBox(height: 8),
            Text(
              'Enter any amount up to your remaining balance of \$${remaining.toStringAsFixed(2)}',
              style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
            ),
            const SizedBox(height: 16),
            
            TextField(
              controller: _amountController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: AppColors.success,
              ),
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.attach_money, color: AppColors.success, size: 28),
                hintText: '0.00',
                filled: true,
                fillColor: AppColors.success.withOpacity(0.05),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
            ),
            const SizedBox(height: 24),
            
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton.icon(
                onPressed: _isProcessingPayment ? null : _handlePayment,
                icon: _isProcessingPayment
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.lock_outline),
                label: Text(
                  _isProcessingPayment ? 'Processing...' : 'Proceed to Payment',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  elevation: 4,
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Center(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.shield, size: 14, color: Colors.grey),
                  SizedBox(width: 6),
                  Text('Secured by Stripe', style: TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.bold)),
                ],
              ),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildApprovedCard(bool isDark) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 40.0, horizontal: 24.0),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.success.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_circle, size: 64, color: AppColors.success),
            ),
            const SizedBox(height: 24),
            const Text(
              'APPROVED',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w900,
                color: AppColors.success,
                letterSpacing: 2.0,
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : Colors.grey.shade50,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: isDark ? AppColors.borderDark : AppColors.border),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Status', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.success,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Text('FULLY PAID', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Your financial status is clear for the current semester.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSuccessCard(bool isDark) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 40.0, horizontal: 24.0),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.success.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_circle, size: 64, color: AppColors.success),
            ),
            const SizedBox(height: 24),
            const Text(
              'Payment Successful!',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w900,
                color: AppColors.success,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '\$${_paymentAmount.toStringAsFixed(2)} has been charged successfully.',
              style: const TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 24),
            if ((_details?['remaining_amount'] as num?)?.toDouble() != 0.0)
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () {
                    setState(() {
                      _paymentSuccess = false;
                    });
                  },
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: const Text('Make Another Payment', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              )
          ],
        ),
      ),
    );
  }

  Widget _buildCoursesCard(bool isDark) {
    final courses = _details?['courses'] as List<dynamic>? ?? [];

    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(20.0),
            child: Text(
              'Registered Courses & Hours',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: isDark ? AppColors.textDark : AppColors.text,
              ),
            ),
          ),
          const Divider(height: 1),
          if (courses.isEmpty)
            const Padding(
              padding: EdgeInsets.all(32.0),
              child: Center(child: Text('No courses found.', style: TextStyle(color: Colors.grey, fontStyle: FontStyle.italic))),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: courses.length,
              separatorBuilder: (context, index) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final course = courses[index];
                final hours = course['credit_hours'] ?? 0;
                final hourPrice = course['hour_price'] ?? 0;
                final total = hours * hourPrice;

                return Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              course['name'] ?? 'Unknown Course',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Semester: ${course['semester']}',
                              style: const TextStyle(fontSize: 12, color: Colors.grey),
                            ),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '\$${total.toStringAsFixed(2)}',
                            style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.success, fontSize: 14),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${hours}H',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  Widget _buildErrorState(bool isDark) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: AppColors.error),
            const SizedBox(height: 16),
            Text(
              _errorMessage!,
              style: TextStyle(color: isDark ? AppColors.textDark : AppColors.text, fontSize: 16),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton(onPressed: _loadPayments, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.payment_outlined, size: 64, color: Colors.grey.shade400),
          const SizedBox(height: 16),
          Text('No financial records found', style: TextStyle(color: isDark ? AppColors.textDark : AppColors.text, fontSize: 16)),
        ],
      ),
    );
  }
}
