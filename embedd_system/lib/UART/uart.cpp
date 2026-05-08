#ifdef __AVR_ATmega32__
#include <avr/io.h>
#include "uart.h"

// ✅ 8MHz Internal RC Oscillator
#ifndef F_CPU
#define F_CPU 8000000UL
#endif

void uart_init(uint32_t baud) {
    // ✅ U2X=1 مع 8MHz و 9600 baud:
    // UBRR = (8000000 / (8 * 9600)) - 1 = 103 → error 0.2%
    UCSRA = (1 << U2X);
    uint16_t ubrr = (F_CPU / (8UL * baud)) - 1;

    UBRRH = (uint8_t)(ubrr >> 8);
    UBRRL = (uint8_t)ubrr;

    UCSRB = (1 << RXEN) | (1 << TXEN);
    UCSRC = (1 << URSEL) | (1 << UCSZ1) | (1 << UCSZ0);
}

void uart_send(char data) {
    while (!(UCSRA & (1 << UDRE)));
    UDR = data;
}

void uart_send_string(const char* str) {
    while (*str) uart_send(*str++);
}

char uart_receive(void) {
    while (!(UCSRA & (1 << RXC)));
    return UDR;
}

uint8_t uart_available(void) {
    return (UCSRA & (1 << RXC));
}
#endif