#ifdef ESP8266
#include "nfc.h"

// متغيرات داخلية للموديول
static Adafruit_PN532* nfcPtr = nullptr;
static String currentUID = "";
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

    // إعدادات الموديول لأقصى استقرار وقوة قراءة
    nfcPtr->SAMConfig();
    nfcPtr->setPassiveActivationRetries(0xFF); // يحاول بقوة يلقط الكارت
    isReady = true;
    Serial.println("NFC Module is Online and Ready.");
}

bool scanCard() {
    if (!isReady || nfcPtr == nullptr) return false;

    uint8_t uid[] = { 0, 0, 0, 0, 0, 0, 0 };
    uint8_t uidLength;

    // مهلة قراءة 150ms موازنة بين السرعة والدقة
    if (nfcPtr->readPassiveTargetID(PN532_MIFARE_ISO14443A, &uid[0], &uidLength, 200)) {
        currentUID = "";
        for (uint8_t i = 0; i < uidLength; i++) {
            if (uid[i] < 0x10) currentUID += "0";
            currentUID += String(uid[i], HEX);
            if (i < uidLength - 1) currentUID += ":";
        }
        currentUID.toUpperCase();
        return true;
    }
    return false;
}

String getUID() {
    return currentUID;
}

bool nfcIsOnline() {
    return isReady;
}


  // كل الكود اللي جوه الملف هنا
#endif