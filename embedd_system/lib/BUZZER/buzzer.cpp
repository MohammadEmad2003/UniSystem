#ifdef __AVR_ATmega32__
#include "buzzer.h"
#include "../../include/MACROS.h" // التأكد من وجوده في الـ include path

void buzzer_init(void) {
    // ضبط PC5 كـ Output باستخدام الماكرو بتاعك
    set_bit(BUZZER_DDR, BUZZER_PIN);
    // التأكد إنه مطفي في البداية
    clear_bit(BUZZER_PORT, BUZZER_PIN);
}

void buzzer_on(void) {
    set_bit(BUZZER_PORT, BUZZER_PIN);
}

void buzzer_off(void) {
    clear_bit(BUZZER_PORT, BUZZER_PIN);
}

void buzzer_beep(uint16_t duration_ms) {
    buzzer_on();
    // استخدام delay_ms مع المتغيرات يحتاج إعدادات خاصة، 
    // لذا يفضل استدعاؤها في حلقة لو كانت المدة متغيرة
    for(uint16_t i=0; i < duration_ms; i++) {
        _delay_ms(1);
    }
    buzzer_off();
}

#endif