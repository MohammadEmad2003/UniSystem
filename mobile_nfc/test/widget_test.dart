import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:unisystem_nfc/main.dart';
import 'package:provider/provider.dart';
import 'package:unisystem_nfc/state/app_state.dart';
import 'package:unisystem_nfc/services/auth_service.dart';
import 'package:unisystem_nfc/services/backend_service.dart';
import 'package:unisystem_nfc/services/nfc_service.dart';

void main() {
  testWidgets('App builds without crashing', (WidgetTester tester) async {
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AppState()),
          Provider(create: (_) => AuthService(baseUrl: 'http://localhost:5000')),
          Provider(create: (_) => BackendService(baseUrl: 'http://localhost:3000')),
          Provider(create: (_) => NfcService()),
        ],
        child: const MaterialApp(
          home: UniSystemNFCApp(),
        ),
      ),
    );

    expect(find.text('Capital University'), findsOneWidget);
  });
}
