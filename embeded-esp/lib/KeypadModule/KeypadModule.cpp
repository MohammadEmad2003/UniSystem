#include "KeypadModule.h"

// تحديد حجم الكيباد 4 في 4
const byte ROWS = 4; 
const byte COLS = 4; 

// خريطة الزراير الكلاسيكية
char hexaKeys[ROWS][COLS] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'}
};

// توصيل البنز اللي اتفقنا عليها
byte rowPins[ROWS] = {32, 33, 15, 5}; 
byte colPins[COLS] = {17, 16, 4, 2}; 

// عمل Object من مكتبة Keypad
Keypad customKeypad = Keypad(makeKeymap(hexaKeys), rowPins, colPins, ROWS, COLS);

void initKeypad() {
    // مكتبة الكيباد بتظبط الـ Input والـ Pull-up أوتوماتيك داخلياً
    // بس هنبدأ السيريال مونيتر للتأكد
    Serial.begin(115200);
}

char getPressedKey() {
    return customKeypad.getKey();
}