#ifdef ESP8266
#ifndef NFC_H
#define NFC_H

#include <Adafruit_PN532.h>

// الدوال الأساسية للتعامل مع الـ NFC
void initNFC(uint8_t csPin);   // تشغيل الموديول وتظبط الإعدادات
bool scanCard();               // البحث عن كارت (بترجع true لو لقت)
String getUID();               // تجيب الـ UID بتاع الكارت اللي اتمسح
bool nfcIsOnline();            // للتأكد من حالة الموديول

#endif
#endif
