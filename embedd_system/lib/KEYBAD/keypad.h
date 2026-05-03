#ifdef __AVR_ATmega32__
#ifndef KEYPAD_H
#define KEYPAD_H

#ifndef F_CPU
#define F_CPU 16000000UL
#endif

#include <avr/io.h>
#include <util/delay.h>

#define KEYPAD_ROW_PORT PORTB
#define KEYPAD_ROW_DDR  DDRB

#define KEYPAD_COL_PIN  PIND
#define KEYPAD_COL_DDR  DDRD
#define KEYPAD_COL_PORT PORTD

void keypad_init(void);
char keypad_get_key(void);

#endif
#endif