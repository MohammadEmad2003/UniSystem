#include "BuzzerModule.h"

const int buzzerPin = 0; // البنز اللي اخترناها

void initBuzzer() {
    pinMode(buzzerPin, OUTPUT);
    digitalWrite(buzzerPin, LOW);
}

void beepKey() {
    digitalWrite(buzzerPin, HIGH);
    delay(50); // صوت سريع جداً 50 ملي ثانية
    digitalWrite(buzzerPin, LOW);
}

void beepSuccess() {
    digitalWrite(buzzerPin, HIGH);
    delay(150); // صوت نجاح متوسط
    digitalWrite(buzzerPin, LOW);
}

void beepError() {
    // صوتين ورا بعض كإنذار
    digitalWrite(buzzerPin, HIGH);
    delay(300);
    digitalWrite(buzzerPin, LOW);
    delay(100);
    digitalWrite(buzzerPin, HIGH);
    delay(300);
    digitalWrite(buzzerPin, LOW);
}