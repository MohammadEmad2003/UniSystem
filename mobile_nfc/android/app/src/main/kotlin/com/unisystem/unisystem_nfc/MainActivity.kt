package com.unisystem.unisystem_nfc

import android.nfc.NfcAdapter
import android.os.Bundle
import io.flutter.embedding.android.FlutterFragmentActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.EventChannel
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterFragmentActivity() {
    private val METHOD_CHANNEL = "com.unisystem.nfc/hce"
    private val EVENT_CHANNEL = "com.unisystem.nfc/hce_events"
    private var methodChannel: MethodChannel? = null
    private var eventChannel: EventChannel? = null
    private var eventSink: EventChannel.EventSink? = null
    private var currentPayload: String? = null

    companion object {
        private var instance: MainActivity? = null
        
        fun getInstance(): MainActivity? = instance
        
        fun getPayload(): String? = instance?.currentPayload
        
        fun setPayload(payload: String?) {
            instance?.currentPayload = payload
        }
        
        fun sendNfcEvent(event: String) {
            instance?.eventSink?.success(event)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        instance = this
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
        eventSink?.endOfStream()
        eventSink = null
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        
        // Setup Method Channel
        methodChannel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, METHOD_CHANNEL)
        methodChannel?.setMethodCallHandler { call, result ->
            when (call.method) {
                "initializeNfc" -> {
                    val success = initializeNfc()
                    result.success(success)
                }
                "isNfcAvailable" -> {
                    val available = isNfcAvailable()
                    result.success(available)
                }
                "startHceSession" -> {
                    val studentId = call.argument<String>("studentId")
                    val deviceId = call.argument<String>("deviceId")
                    val challenge = call.argument<String>("challenge")
                    val timestamp = call.argument<Long>("timestamp")
                    val success = startHceSession(studentId, deviceId, challenge, timestamp)
                    result.success(success)
                }
                "stopHceSession" -> {
                    val success = stopHceSession()
                    result.success(success)
                }
                "getHceStatus" -> {
                    val status = getHceStatus()
                    result.success(status)
                }
                else -> {
                    result.notImplemented()
                }
            }
        }
        
        // Setup Event Channel for NFC events
        eventChannel = EventChannel(flutterEngine.dartExecutor.binaryMessenger, EVENT_CHANNEL)
        eventChannel?.setStreamHandler(object : EventChannel.StreamHandler {
            override fun onListen(arguments: Any?, events: EventChannel.EventSink?) {
                eventSink = events
                // Set callback in HceService
                HceService.nfcEventCallback = { event ->
                    sendNfcEvent(event)
                }
            }

            override fun onCancel(arguments: Any?) {
                eventSink?.endOfStream()
                eventSink = null
                HceService.nfcEventCallback = null
            }
        })
    }

    private fun initializeNfc(): Boolean {
        return try {
            val nfcAdapter = NfcAdapter.getDefaultAdapter(this)
            nfcAdapter != null
        } catch (e: Exception) {
            false
        }
    }

    private fun isNfcAvailable(): Boolean {
        return try {
            val nfcAdapter = NfcAdapter.getDefaultAdapter(this)
            nfcAdapter != null && nfcAdapter.isEnabled
        } catch (e: Exception) {
            false
        }
    }

    private fun startHceSession(
        studentId: String?,
        deviceId: String?,
        challenge: String?,
        timestamp: Long?
    ): Boolean {
        return try {
            if (studentId != null && deviceId != null && challenge != null) {
                val payload = mapOf(
                    "studentId" to studentId,
                    "deviceId" to deviceId,
                    "challenge" to challenge,
                    "timestamp" to (timestamp ?: System.currentTimeMillis())
                )
                currentPayload = payload.toString()
                true
            } else {
                false
            }
        } catch (e: Exception) {
            false
        }
    }

    private fun stopHceSession(): Boolean {
        return try {
            currentPayload = null
            true
        } catch (e: Exception) {
            false
        }
    }

    private fun getHceStatus(): Map<String, Any?> {
        return try {
            mapOf(
                "active" to (currentPayload != null),
                "payload" to currentPayload
            )
        } catch (e: Exception) {
            mapOf(
                "active" to false,
                "payload" to null
            )
        }
    }
}
