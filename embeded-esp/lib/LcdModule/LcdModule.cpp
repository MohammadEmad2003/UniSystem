#include "LcdModule.h"

// ترتيب البنز الثابتة بتاعتك اللي جربناها واشتغلت
const int rs = 13, en = 12, d4 = 14, d5 = 27, d6 = 26, d7 = 25;
LiquidCrystal myLcd(rs, en, d4, d5, d6, d7);

// دالة تهيئة الشاشة
void initLCD() {
    myLcd.begin(16, 2);
    myLcd.clear();
}

// دالة مسح الشاشة
void clearLCD() {
    myLcd.clear();
}

// دالة طباعة عادية على السطرين
void displayMessage(String line1, String line2) {
    myLcd.clear();
    myLcd.setCursor(0, 0);
    myLcd.print(line1);
    
    if (line2 != "") {
        myLcd.setCursor(0, 1);
        myLcd.print(line2);
    }
}

// دالة لتوسيط الكلام تلقائياً بناءً على طول النص (ممتازة لشكل السيستم)
void displayCenteredMessage(String line1, String line2) {
    myLcd.clear();
    
    // السطر الأول
    int pos1 = (16 - line1.length()) / 2;
    if (pos1 < 0) pos1 = 0;
    myLcd.setCursor(pos1, 0);
    myLcd.print(line1);
    
    // السطر الثاني
    if (line2 != "") {
        int pos2 = (16 - line2.length()) / 2;
        if (pos2 < 0) pos2 = 0;
        myLcd.setCursor(pos2, 1);
        myLcd.print(line2);
    }
}

// دالة عمل تليين أو Loading (مثلاً: أثناء فحص الكارت أو رفع البيانات)
void displayLoading(String message, int delayTime) {
    myLcd.clear();
    myLcd.setCursor(0, 0);
    myLcd.print(message);
    myLcd.setCursor(0, 1);
    for (int i = 0; i < 16; i++) {
        myLcd.print(".");
        delay(delayTime / 16);
    }
}