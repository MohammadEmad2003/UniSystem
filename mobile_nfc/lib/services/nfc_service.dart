import 'dart:async';
import 'package:flutter/services.dart';
import '../models/nfc_payload.dart';

class NfcService {
  static const MethodChannel _methodChannel = MethodChannel('com.unisystem.nfc/hce');
  static const EventChannel _eventChannel = EventChannel('com.unisystem.nfc/hce_events');
  
  StreamController<NfcEvent>? _eventController;
  Stream<NfcEvent>? _eventStream;
  StreamSubscription? _eventSubscription;
  bool _isInitialized = false;
  bool _isScanning = false;

  bool get isInitialized => _isInitialized;
  bool get isScanning => _isScanning;

  Stream<NfcEvent> get events {
    _eventController ??= StreamController<NfcEvent>.broadcast();
    _eventStream ??= _eventController!.stream;
    return _eventStream!;
  }

  Future<bool> initialize() async {
    try {
      final result = await _methodChannel.invokeMethod<bool>('initializeNfc');
      _isInitialized = result ?? false;
      
      // Start listening to NFC events
      if (_isInitialized) {
        _eventSubscription = _eventChannel.receiveBroadcastStream().listen(
          (event) {
            print('NFC Event received: $event');
            _eventController?.add(NfcEvent(
              type: event.toString(),
              data: {'event': event},
            ));
          },
          onError: (error) {
            print('NFC Event error: $error');
            _eventController?.addError(error);
          },
        );
      }
      
      return _isInitialized;
    } catch (e) {
      print('Failed to initialize NFC: $e');
      return false;
    }
  }

  Future<bool> isNfcAvailable() async {
    try {
      final result = await _methodChannel.invokeMethod<bool>('isNfcAvailable');
      return result ?? false;
    } catch (e) {
      print('Failed to check NFC availability: $e');
      return false;
    }
  }

  Future<bool> startHceSession(NfcPayload payload) async {
    try {
      _isScanning = true;
      final result = await _methodChannel.invokeMethod<bool>('startHceSession', {
        'studentId': payload.studentId,
        'deviceId': payload.deviceId,
        'challenge': payload.challenge,
        'timestamp': payload.timestamp,
        'signature': payload.signature,
        'hash': payload.hash,
      });
      _isScanning = result ?? false;
      return _isScanning;
    } catch (e) {
      print('Failed to start HCE session: $e');
      _isScanning = false;
      return false;
    }
  }

  Future<bool> stopHceSession() async {
    try {
      final result = await _methodChannel.invokeMethod<bool>('stopHceSession');
      _isScanning = !(result ?? true);
      return !_isScanning;
    } catch (e) {
      print('Failed to stop HCE session: $e');
      _isScanning = false;
      return true;
    }
  }

  Future<Map<String, dynamic>> getHceStatus() async {
    try {
      final result = await _methodChannel.invokeMethod<Map<String, dynamic>>('getHceStatus');
      return result ?? {'active': false, 'payload': null};
    } catch (e) {
      print('Failed to get HCE status: $e');
      return {'active': false, 'payload': null};
    }
  }

  void dispose() {
    _eventSubscription?.cancel();
    _eventController?.close();
    _eventController = null;
    _eventStream = null;
  }
}

class NfcEvent {
  final String type;
  final Map<String, dynamic>? data;

  NfcEvent({required this.type, this.data});
}
