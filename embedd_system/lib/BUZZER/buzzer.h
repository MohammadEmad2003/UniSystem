
#ifdef __AVR_ATmega32__
#ifndef BUZZER_H
#define BUZZER_H

#include <avr/io.h>
#include <util/delay.h>

// بناءً على المخطط: الـ Buzzer متوصل بـ PC5
#define BUZZER_PORT PORTC
#define BUZZER_DDR  DDRC
#define BUZZER_PIN  PC5

void buzzer_init(void);
void buzzer_on(void);
void buzzer_off(void);
void buzzer_beep(uint16_t duration_ms);

#endif
#endif