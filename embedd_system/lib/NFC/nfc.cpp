#ifdef ESP8266
#include "nfc.h"

static Adafruit_PN532* nfcPtr = nullptr;
static String currentUID = "";
static String hcePayload = "";
static bool isReady = false;

void initNFC(uint8_t csPin) {
    nfcPtr = new Adafruit_PN532(csPin);
    nfcPtr->begin();

    uint32_t versiondata = nfcPtr->getFirmwareVersion();
    if (!versiondata) {
        Serial.println("Error: PN532 Board not found!");
        isReady = false;
        return;
    }

    nfcPtr->SAMConfig();
    nfcPtr->setPassiveActivationRetries(0xFF);
    isReady = true;
    Serial.println("NFC Module is Online and Ready.");
}

bool scanCard() {
    if (!isReady || nfcPtr == nullptr) return false;

    uint8_t uid[] = { 0, 0, 0, 0, 0, 0, 0 };
    uint8_t uidLength;

    if (nfcPtr->readPassiveTargetID(PN532_MIFARE_ISO14443A, &uid[0], &uidLength, 200)) {
        currentUID = "";
        for (uint8_t i = 0; i < uidLength; i++) {
            if (uid[i] < 0x10) currentUID += "0";
            currentUID += String(uid[i], HEX);
            if (i < uidLength - 1) currentUID += ":";
        }
        currentUID.toUpperCase();

        // Try to read HCE payload using APDU commands
        hcePayload = readHcePayload();

        return true;
    }
    return false;
}

String readHcePayload() {
    if (!isReady || nfcPtr == nullptr) return "";

    uint8_t response[255];
    uint8_t responseLength = 255;

    // SELECT APDU command
    uint8_t selectApdu[] = { 0x00, 0xA4, 0x04, 0x00, 0x07, 0xF0, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06 };

    bool success = nfcPtr->inDataExchange(selectApdu, sizeof(selectApdu), response, &responseLength);

    if (success && responseLength > 2) {
        // Check if response is OK (0x90 0x00)
        if (response[responseLength - 2] == 0x90 && response[responseLength - 1] == 0x00) {
            // Send READ command
            uint8_t readApdu[] = { 0x00, 0xB0, 0x00, 0x00, 0x00 };
            success = nfcPtr->inDataExchange(readApdu, sizeof(readApdu), response, &responseLength);

            if (success && responseLength > 2) {
                // Convert response bytes to string
                String payloadStr = "";
                for (uint8_t i = 0; i < responseLength - 2; i++) {
                    payloadStr += (char)response[i];
                }
                Serial.print("HCE Payload: ");
                Serial.println(payloadStr);
                return payloadStr;
            }
        }
    }

    return "";
}

String getUID() {
    return currentUID;
}

String getHcePayload() {
    return hcePayload;
}

bool nfcIsOnline() {
    return isReady;
}

#endif