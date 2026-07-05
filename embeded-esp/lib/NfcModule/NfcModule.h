#ifndef NFC_MODULE_H
#define NFC_MODULE_H

#include <Arduino.h>
#include <Adafruit_PN532.h>

// دوالك الأصلية الرائعة
void initNFC();
bool scanCard();
String getUID();
String getHcePayload();
String readHcePayload();
bool nfcIsOnline();

#endif