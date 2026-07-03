#ifndef BUZZER_MODULE_H
#define BUZZER_MODULE_H

#include <Arduino.h>

// تهيئة البنز بتاعت الـ Buzzer
void initBuzzer();

// نغمة نجاح (صوت قصير وسريع) - مثلاً كارت مقبول
void beepSuccess();

// نغمة خطأ (صوتين ورا بعض طويلين) - مثلاً كارت مرفوض
void beepError();

// نغمة سريعة جداً لدوسة الكيباد
void beepKey();

#endif