package com.unisystem.unisystem_nfc

import android.nfc.cardemulation.HostApduService
import android.os.Bundle
import android.util.Log

class HceService : HostApduService() {
    companion object {
        private const val TAG = "HceService"
        private const val SELECT_AID = "00A4040000"
        private const val READ_DATA = "00B00000"
        private const val RESPONSE_OK = "9000"
        private const val RESPONSE_ERROR = "6F00"
        
        // Callback for NFC events
        var nfcEventCallback: ((String) -> Unit)? = null
        
        // Helper function to convert hex string to byte array
        fun hexStringToByteArray(hex: String): ByteArray {
            val len = hex.length
            val data = ByteArray(len / 2)
            var i = 0
            while (i < len) {
                data[i / 2] = ((Character.digit(hex[i], 16) shl 4) + Character.digit(hex[i + 1], 16)).toByte()
                i += 2
            }
            return data
        }
        
        // Helper function to convert byte array to hex string
        fun toHexString(bytes: ByteArray): String {
            return bytes.joinToString("") { "%02X".format(it) }
        }
    }
    
    override fun processCommandApdu(commandApdu: ByteArray?, extras: Bundle?): ByteArray {
        if (commandApdu == null) {
            Log.e(TAG, "Received null APDU")
            return hexStringToByteArray(RESPONSE_ERROR)
        }
        
        val commandHex = toHexString(commandApdu)
        Log.d(TAG, "Received APDU: $commandHex")
        
        return when {
            commandHex.startsWith(SELECT_AID) -> {
                // SELECT command - return OK
                Log.d(TAG, "SELECT command received, returning OK")
                hexStringToByteArray(RESPONSE_OK)
            }
            commandHex.startsWith(READ_DATA) -> {
                // READ command - return payload data from MainActivity
                Log.d(TAG, "READ command received")
                val payload = MainActivity.getPayload()
                
                if (payload != null) {
                    Log.d(TAG, "Returning payload: $payload")
                    
                    // Notify Flutter that NFC was read
                    nfcEventCallback?.invoke("nfc_read")
                    
                    // Convert payload to UTF-8 bytes for proper JSON encoding
                    val payloadBytes = payload.toByteArray(Charsets.UTF_8)
                    val statusBytes = hexStringToByteArray(RESPONSE_OK)
                    val response = payloadBytes + statusBytes
                    
                    // Limit response size to avoid buffer overflow (max 255 bytes for APDU)
                    val finalResponse = if (response.size > 255) {
                        Log.w(TAG, "Response too large (${response.size} bytes), truncating to 255")
                        // Keep the status bytes and truncate the payload if needed
                        val truncatedPayload = payloadBytes.copyOf(255 - statusBytes.size)
                        truncatedPayload + statusBytes
                    } else {
                        response
                    }
                    
                    Log.d(TAG, "Sending ${finalResponse.size} bytes back to reader")
                    finalResponse
                } else {
                    Log.e(TAG, "No payload available")
                    val errorResponse = "NO_DATA".toByteArray() + hexStringToByteArray(RESPONSE_ERROR)
                    errorResponse
                }
            }
            else -> {
                Log.d(TAG, "Unknown command: $commandHex")
                hexStringToByteArray(RESPONSE_ERROR)
            }
        }
    }
    
    override fun onDeactivated(reason: Int) {
        Log.d(TAG, "HCE Service deactivated, reason: $reason")
        MainActivity.setPayload(null)
        nfcEventCallback?.invoke("nfc_deactivated")
    }
}
