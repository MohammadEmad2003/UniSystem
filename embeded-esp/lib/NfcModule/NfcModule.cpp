#include "NfcModule.h"

// تحديد أطراف الـ SPI للـ PN532
#define PN532_SCK  (18)
#define PN532_MISO (19)
#define PN532_MOSI (23)
#define PN532_SS   (21) // الـ CS بتاعة الـ NFC

static Adafruit_PN532* nfcPtr = nullptr;
static String currentUID = "";
static bool isReady = false;

void initNFC() {
    // تعديل الـ Constructor لدعم الـ Hardware SPI بالبنز المحددة
    nfcPtr = new Adafruit_PN532(PN532_SCK, PN532_MISO, PN532_MOSI, PN532_SS);
    nfcPtr->begin();

    uint32_t versiondata = nfcPtr->getFirmwareVersion();
    if (!versiondata) {
        Serial.println("Error: PN532 Board not found!");
        isReady = false;
        return;
    }

    nfcPtr->SAMConfig();
    // تقليل الـ Retries لـ 1 أو 2 عشان السيركل متعملش بلوك (Block) للكيباد والشاشة أثناء الانتظار
    nfcPtr->setPassiveActivationRetries(0x01); 
    
    isReady = true;
    Serial.println("NFC Module is Online and Ready.");
}

bool scanCard() {
    if (!isReady || nfcPtr == nullptr) return false;

    uint8_t uid[] = { 0, 0, 0, 0, 0, 0, 0 };
    uint8_t uidLength = 0; // التعديل هنا: حطينا نوع المتغير uint8_t

    // الـ Timeout هنا 50 مللي ثانية عشان ميعطلش باقي السيستم
    if (nfcPtr->readPassiveTargetID(PN532_MIFARE_ISO14443A, &uid[0], &uidLength, 50)) {
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