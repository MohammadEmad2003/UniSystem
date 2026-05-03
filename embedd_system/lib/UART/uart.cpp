#ifdef __AVR_ATmega32__
#include <avr/io.h>
#include "uart.h"

#ifndef F_CPU
#define F_CPU 16000000UL
#endif

void uart_init(uint32_t baud) {
    // ✅ تفعيل U2X (Double Speed) عشان الحسابة تبقى أدق مع 16MHz
    UCSRA = (1 << U2X);
    
    // مع U2X: UBRR = (F_CPU / (8 * baud)) - 1
    // مع 9600: UBRR = (16000000 / (8 * 9600)) - 1 = 207 → error أقل من 0.2%
    uint16_t ubrr = (F_CPU / (8UL * baud)) - 1;
    
    UBRRH = (uint8_t)(ubrr >> 8);
    UBRRL = (uint8_t)ubrr;
    
    // تفعيل الاستقبال والإرسال
    UCSRB = (1 << RXEN) | (1 << TXEN);
    
    // URSEL=1 مهم جداً في ATmega32 عشان تعدل في UCSRC
    // 8-bit data, 1 stop bit, no parity
    UCSRC = (1 << URSEL) | (1 << UCSZ1) | (1 << UCSZ0);
}

void uart_send(char data) {
    while (!(UCSRA & (1 << UDRE)));
    UDR = data;
}

// ✅ دالة جديدة لإرسال string كامل حرف حرف
void uart_send_string(const char* str) {
    while (*str) {
        uart_send(*str++);
    }
}

char uart_receive(void) {
    while (!(UCSRA & (1 << RXC)));
    return UDR;
}

uint8_t uart_available(void) {
    return (UCSRA & (1 << RXC));
}
#endif