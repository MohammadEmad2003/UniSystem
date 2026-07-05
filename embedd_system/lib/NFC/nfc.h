#ifdef ESP8266
#ifndef NFC_H
#define NFC_H

#include <Adafruit_PN532.h>

void initNFC(uint8_t csPin);
bool scanCard();
String getUID();
String getHcePayload();
String readHcePayload();
bool nfcIsOnline();

#endif
#endif