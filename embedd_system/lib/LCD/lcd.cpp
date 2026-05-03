#ifdef __AVR_ATmega32__
#include "lcd.h"
#include "../../include/MACROS.h"

void lcd_pulse_enable() {
    set_bit(LCD_PORT, EN);
    _delay_us(1);
    clear_bit(LCD_PORT, EN);
    _delay_us(100);
}

void lcd_send_nibble(uint8_t nibble) {
    clear_bit(LCD_PORT, D4);
    clear_bit(LCD_PORT, D5);
    clear_bit(LCD_PORT, D6);
    clear_bit(LCD_PORT, D7);

    if (read_bit(nibble, 0)) set_bit(LCD_PORT, D4);
    if (read_bit(nibble, 1)) set_bit(LCD_PORT, D5);
    if (read_bit(nibble, 2)) set_bit(LCD_PORT, D6);
    if (read_bit(nibble, 3)) set_bit(LCD_PORT, D7);

    lcd_pulse_enable();
}

void lcd_send_byte(uint8_t byte, uint8_t mode) {
    if (mode == 0)
        clear_bit(LCD_PORT, RS);
    else
        set_bit(LCD_PORT, RS);

    lcd_send_nibble(byte >> 4);
    lcd_send_nibble(byte & 0x0F);
}

void lcd_cmd(uint8_t cmd) {
    lcd_send_byte(cmd, 0);
    _delay_ms(2);
}

void lcd_char(char c) {
    lcd_send_byte(c, 1);
    _delay_us(100);
}

void lcd_print(const char* str) {
    while (*str)
        lcd_char(*str++);
}

void lcd_clear() {
    lcd_cmd(0x01);
    _delay_ms(2);
}

void lcd_set_cursor(uint8_t row, uint8_t col) {
    uint8_t address = (row == 0) ? (0x80 + col) : (0xC0 + col);
    lcd_cmd(address);
}

void lcd_init() {
    set_bit(LCD_DDR, RS);
    set_bit(LCD_DDR, EN);
    set_bit(LCD_DDR, D4);
    set_bit(LCD_DDR, D5);
    set_bit(LCD_DDR, D6);
    set_bit(LCD_DDR, D7);

    _delay_ms(50);

    lcd_send_nibble(0x03); _delay_ms(5);
    lcd_send_nibble(0x03); _delay_ms(1);
    lcd_send_nibble(0x03); _delay_ms(1);
    lcd_send_nibble(0x02); _delay_ms(1);

    lcd_cmd(0x28);
    lcd_cmd(0x0C);
    lcd_cmd(0x06);
    lcd_cmd(0x01);
    _delay_ms(2);
}
#endif