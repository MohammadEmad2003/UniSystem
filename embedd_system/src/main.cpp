#include "MACROS.h"

// ================================================================
// 1. كود الـ ESP8266 (الـ NFC والـ Web Server والـ Serial)
// ================================================================
#ifdef ESP8266
#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include "nfc.h"

// ✅ Hardware Serial بدل SoftwareSerial
// السبب: SoftwareSerial بيتأثر بـ WiFi interrupts وبيعمل Garbage
// Hardware Serial (GPIO1=TX, GPIO3=RX) مش بيتأثر خالص
const char* ssid = "MZandEB";
const char* password = "16520053071982MMA";
ESP8266WebServer server(80);
bool hasNewCard = false;

void sendStringSlow(String str) {
    for (size_t i = 0; i < str.length(); i++) {
        Serial.write(str[i]);
        delay(20);
    }
}

void handleNfcRequest() {
    String json = "{\"status\":\"Online\", \"uid\":\"" + (hasNewCard ? getUID() : "") + "\"}";
    server.send(200, "application/json", json);
    hasNewCard = false;
}

void setup() {
    // ✅ Hardware Serial للتواصل مع الـ ATmega
    // setDebugOutput(false) يمنع رسائل الـ ESP Boot من توصل للـ ATmega كـ Garbage
    Serial.begin(9600);
    Serial.setDebugOutput(false);

    initNFC(D8);

    // 1. إرسال "جاري الاتصال"
    Serial.write('C');

    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
    }

    // 2. إرسال "تم الاتصال" + الـ IP
    Serial.write('D');
    delay(300); // وقت للـ ATmega يمسح الشاشة ويجهز

    sendStringSlow(WiFi.localIP().toString());
    Serial.write('#');

    server.on("/nfc", handleNfcRequest);
    server.begin();
}

void loop() {
    server.handleClient();

    if (scanCard()) {
        hasNewCard = true;
        String uid = getUID();

        // 3. إرسال الـ UID
        Serial.write('U');
        delay(300);

        sendStringSlow(uid);
        Serial.write('#');
    }
    yield();
}
#endif


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

// ================================================================
// ✅ UART Buffer - يمنع ضياع الداتا لما الكيباد يتهنج
// ================================================================
#define BUFFER_SIZE 64
volatile char uartBuffer[BUFFER_SIZE];
volatile uint8_t bufHead = 0;
volatile uint8_t bufTail = 0;

static inline void buffer_push(char c) {
    uint8_t next = (bufHead + 1) % BUFFER_SIZE;
    if (next != bufTail) {
        uartBuffer[bufHead] = c;
        bufHead = next;
    }
}

static inline char buffer_pop(void) {
    char c = uartBuffer[bufTail];
    bufTail = (bufTail + 1) % BUFFER_SIZE;
    return c;
}

static inline uint8_t buffer_available(void) {
    return (bufHead != bufTail);
}

int main(void) {
    lcd_init();
    uart_init(9600);
    keypad_init();
    buzzer_init();

    lcd_print("Mazen System");
    _delay_ms(2000);
    lcd_clear();
    _delay_ms(5);

    while (1) {
        // ✅ الخطوة 1: فرّغ الـ UART فوراً في الـ Buffer
        while (uart_available()) {
            char incoming = uart_receive();
            buffer_push(incoming);
        }

        // ✅ الخطوة 2: عالج الداتا من الـ Buffer
        while (buffer_available()) {
            char data = buffer_pop();

            switch (data) {
                case 'C':
                    lcd_clear();
                    _delay_ms(5);
                    lcd_print("Connecting WiFi");
                    break;

                case 'D':
                    lcd_clear();
                    _delay_ms(5);
                    lcd_print("WiFi Online!");
                    lcd_set_cursor(1, 0);
                    break;

                case 'U':
                    lcd_clear();
                    _delay_ms(5);
                    lcd_print("Card Detected:");
                    lcd_set_cursor(1, 0);
                    buzzer_beep(100);
                    break;

                case '#':
                    break;

                default:
                    lcd_char(data);
                    break;
            }
        }

        // ✅ الخطوة 3: الكيباد بعد ما نضمن استقبال الـ UART
        char key = keypad_get_key();
        if (key != 0) {
            lcd_set_cursor(0, 15);
            lcd_char(key);
            uart_send(key);
        }
    }

    return 0;
}
#endif