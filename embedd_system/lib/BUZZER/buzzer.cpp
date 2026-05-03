#ifdef __AVR_ATmega32__
#include "buzzer.h"
#include "../../include/MACROS.h"

void buzzer_init(void) {
    set_bit(BUZZER_DDR, BUZZER_PIN);
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
    for (uint16_t i = 0; i < duration_ms; i++) {
        _delay_ms(1);
    }
    buzzer_off();
}

#endif