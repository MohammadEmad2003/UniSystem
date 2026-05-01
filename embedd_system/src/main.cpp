#include "MACROS.h"

// ================================================================
// 1. كود الـ ESP8266 (الـ NFC والـ Web Server والـ Serial)
// ================================================================
#ifdef ESP8266
#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <SoftwareSerial.h>
#include "nfc.h"

// إعدادات السيريال والشبكة
SoftwareSerial atmegaSerial(D1, D2); // D1:RX, D2:TX
const char* ssid = "Mazen";
const char* password = "123456789";
ESP8266WebServer server(80);
bool hasNewCard = false;

void handleNfcRequest() {
    String json = "{\"status\":\"Online\", \"uid\":\"" + (hasNewCard ? getUID() : "") + "\"}";
    server.send(200, "application/json", json);
    hasNewCard = false;
}

void setup() {
    Serial.begin(115200);
    atmegaSerial.begin(4800); // السرعة المتفق عليها مع بروتس والـ ATmega
    
    initNFC(D8);
    
    // 1. إرسال كود "جاري الاتصال"
    atmegaSerial.print('C'); 
    
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) { 
        delay(500); 
        Serial.print("."); 
    }
    
    // 2. إرسال كود "تم الاتصال" وعرض الـ IP
    atmegaSerial.print('D'); 
    delay(100); // وقت بسيط للـ ATmega يمسح الشاشة
    atmegaSerial.print(WiFi.localIP().toString());
    atmegaSerial.print('#'); // علامة نهاية البيانات

    server.on("/nfc", handleNfcRequest);
    server.begin();
}

void loop() {
    server.handleClient();
    
    if (scanCard()) {
        hasNewCard = true;
        String uid = getUID();
        Serial.println("Card Detected: " + uid);
        
        // 3. إرسال كود "تم اكتشاف كارت"
        atmegaSerial.print('U'); 
        delay(100); 
        
        // إرسال الـ UID حرف حرف مع Delay (لحل مشكلة الـ Buffer)
        for(int i = 0; i < uid.length(); i++) {
            atmegaSerial.print(uid[i]);
            delay(15); // الـ Copilot نبهنا إن الـ ATmega محتاج وقت يعرض على الـ LCD
        }
        atmegaSerial.print('#'); 
    }
    yield();
}
#endif // نهاية الـ ESP8266 (ده اللي كان ناقص وعامل Error)


// ================================================================
// 2. كود الـ ATmega32 (الـ LCD والـ Keypad والـ Serial)
// ================================================================
#ifdef __AVR_ATmega32__
#include <avr/io.h>
#include <util/delay.h>
#include "lcd.h"
#include "uart.h"
#include "keypad.h"
#include "buzzer.h"

int main(void) {
    // Initialization
    lcd_init();
    uart_init(4800);
    keypad_init();
    buzzer_init();

    lcd_print("Mazen System");
    _delay_ms(2000);
    lcd_clear();
    _delay_ms(2); // التأخير الإجباري بعد المسح

    while (1) {
        // 1. استقبال البيانات من الـ ESP بترجمة الـ Mapping
        if (uart_available()) {
            char data = uart_receive();

            switch(data) {
                case 'C': // Connecting
                    lcd_clear();
                    _delay_ms(2);
                    lcd_print("Connecting WiFi");
                    break;

                case 'D': // Connected
                    lcd_clear();
                    _delay_ms(2);
                    lcd_print("WiFi Online!");
                    _delay_ms(2);  // ✅ Ensure print completes
                    lcd_set_cursor(1, 0); // السطر التاني للـ IP
                    break;

                case 'U': // UID Start
                    lcd_clear();
                    _delay_ms(2);
                    lcd_print("Card Detected:");
                    lcd_set_cursor(1, 0); // السطر التاني للـ ID
                    buzzer_beep(100);
                    break;

                case '#': // End of data stream
                    _delay_ms(1);  // ✅ Allow buffer to settle
                    break;

                default:
                    // أي حرف عادي (أرقام الـ IP أو الـ UID) يتم طبعه فوراً
                    lcd_char(data);
                    break;
            }
        }

        // 2. معالجة الكيباد (اختياري)
        char key = keypad_get_key();
        if (key != 0) {
            lcd_set_cursor(0, 15); 
            lcd_char(key);
            uart_send(key); // إرسال الزر للـ ESP لو حبيت تطور السيستم
        }
    }
    return 0;
}
#endif