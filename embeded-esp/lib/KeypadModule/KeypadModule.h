#ifndef KEYPAD_MODULE_H
#define KEYPAD_MODULE_H

#include <Arduino.h>
#include <Keypad.h>

// تهيئة الكيباد وتحديد البنز
void initKeypad();

// دالة لقراءة الزرار المضغوط حالياً (ترجع 0 لو مفيش ضغطة)
char getPressedKey();

#endif