#include <Arduino.h>
#include "MACROS.h"
#ifdef ESP8266
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <SoftwareSerial.h>
#include "nfc.h"
void displayOnLCD(uint8_t line, String text);

SoftwareSerial atmegaSerial(D1, D2); // RX, TX

const char* ssid = "Mazen";
const char* password = "123456789";
ESP8266WebServer server(80);
bool hasNewCard = false;

void setup() {
    // 1. بدأ السيريال (الأساسي للـ Debug والمخصص للـ ATmega)
    Serial.begin(115200);
    atmegaSerial.begin(4800); 
    
    // 2. تهيئة الـ NFC
    initNFC(D8);
    
    // 3. تأخير زمني (مهم جداً) لضمان استقرار الـ ATmega32 والـ LCD
    // الـ ATmega بيحتاج وقت بسيط عشان يخلص الـ lcd_init ويعرض رسالته الخاصة
    delay(2000); 

    // 4. البدء في إرسال أوامر العرض
    atmegaSerial.print("L0WiFi Connecting\n"); 

    // 5. محاولة الاتصال بالـ WiFi
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) { 
        delay(500); 
        Serial.print("."); // طباعة نقط على الـ Serial Monitor لمتابعة الحالة
    }
    
    // 6. بمجرد الاتصال، تحديث الشاشة
    atmegaSerial.print("L0WiFi Connected \n");
    atmegaSerial.print("L1IP:"); 
    atmegaSerial.print(WiFi.localIP().toString() + "\n"); 
    
    // 7. تشغيل الـ Web Server
    server.begin();
    Serial.println("\nSystem Ready and Connected!");
}

void loop() {
    server.handleClient();
    
    if (scanCard()) {
        String uid = getUID();
        atmegaSerial.print("L0ID Detected:   \n");
        atmegaSerial.print("L1" + uid + "\n");
        delay(1000);
    }
    
    // استقبال ضغطات الكيباد من ATmega
    if (atmegaSerial.available()) {
        char key = atmegaSerial.read();
        Serial.print("Key from ATmega: ");
        Serial.println(key);
    }
    yield();
}
#endif


//atmega32 code
#ifdef __AVR_ATmega32__
#include <util/delay.h>
#include "lcd.h"
#include "keypad.h"
#include "buzzer.h"
#include "uart.h"

int main(void) {
    lcd_init();
    keypad_init();
    buzzer_init();
    uart_init(4800);

    lcd_print("System Ready...");

    while (1) {
        // 1. إرسال ضغطة الكيباد للـ ESP
        char key = keypad_get_key();
        if (key != 0) {
            uart_send(key);
            buzzer_beep(50);
        }

        // 2. استقبال أوامر العرض من الـ ESP
        if (UCSRA & (1<<RXC)) {
            char cmd = uart_receive();
            _delay_ms(1);
            if (cmd == 'L') { // بروتوكول بسيط لتحديد السطر
                char line = uart_receive();
                lcd_set_cursor((line == '0' ? 0 : 1), 0);
                lcd_print("                "); // مسح السطر
                lcd_set_cursor((line == '0' ? 0 : 1), 0);
            } else {
                lcd_char(cmd);
            }
        }
    }
    return 0;
}
#endif