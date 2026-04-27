
#ifdef __AVR_ATmega32__
#ifndef LCD_H
#define LCD_H

#ifndef F_CPU
#define F_CPU 16000000UL
#endif

#include <avr/io.h>
#include <util/delay.h>

// الدبابيس اللى أنت حددتها
#define LCD_PORT   PORTA
#define LCD_DDR    DDRA
#define RS         PA1
#define EN         PA2
#define D4         PA3
#define D5         PA4
#define D6         PA5
#define D7         PA6

// الدوال
void lcd_init();
void lcd_cmd(uint8_t cmd);
void lcd_char(char c);
void lcd_print(const char* str);
void lcd_set_cursor(uint8_t row, uint8_t col);
void lcd_clear();

#endif
#endif