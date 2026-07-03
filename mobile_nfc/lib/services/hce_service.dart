import 'dart:async';
import 'package:flutter/services.dart';
import '../models/nfc_payload.dart';

class HceService {
  static const MethodChannel _channel = MethodChannel('com.unisystem.nfc/hce');
  
  StreamController<HceEvent>? _eventController;
  Stream<HceEvent>? _eventStream;
  bool _isActive = false;

  bool get isActive => _isActive;

  Stream<HceEvent> get events {
    _eventController ??= StreamController<HceEvent>.broadcast();
    _eventStream ??= _eventController!.stream;
    return _eventStream!;
  }

  Future<bool> startHceSession(NfcPayload payload) async {
    try {
      _isActive = true;
      final result = await _channel.invokeMethod<bool>('startHceSession', {
        'studentId': payload.studentId,
        'deviceId': payload.deviceId,
        'challenge': payload.challenge,
        'timestamp': payload.timestamp,
        'signature': payload.signature,
        'hash': payload.hash,
      });
      _isActive = result ?? false;
      return _isActive;
    } catch (e) {
      print('Failed to start HCE session: $e');
      _isActive = false;
      return false;
    }
  }

  Future<bool> stopHceSession() async {
    try {
      final result = await _channel.invokeMethod<bool>('stopHceSession');
      _isActive = !(result ?? true);
      return !_isActive;
    } catch (e) {
      print('Failed to stop HCE session: $e');
      _isActive = false;
      return true;
    }
  }

  Future<Map<String, dynamic>> getHceStatus() async {
    try {
      final result = await _channel.invokeMethod<Map<String, dynamic>>('getHceStatus');
      return result ?? {'active': false, 'payload': null};
    } catch (e) {
      print('Failed to get HCE status: $e');
      return {'active': false, 'payload': null};
    }
  }

  void _handleHceEvent(dynamic event) {
    if (event is Map) {
      final hceEvent = HceEvent(
        type: event['type'] ?? 'unknown',
        data: event['data'] != null ? Map<String, dynamic>.from(event['data']) : null,
      );
      _eventController?.add(hceEvent);
    }
  }

  void dispose() {
    _eventController?.close();
    _eventController = null;
    _eventStream = null;
  }
}

class HceEvent {
  final String type;
  final Map<String, dynamic>? data;

  HceEvent({required this.type, this.data});
}
