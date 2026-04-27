#ifdef __AVR_ATmega32__
#include "uart.h"
#define F_CPU 16000000UL

void uart_init(uint32_t baud) {
    uint16_t ubrr = F_CPU/16/baud-1;
    UBRRH = (uint8_t)(ubrr>>8);
    UBRRL = (uint8_t)ubrr;
    UCSRB = (1<<RXEN)|(1<<TXEN);
    UCSRC = (1<<URSEL)|(3<<UCSZ0);
}
void uart_send(char data) {
    while (!(UCSRA & (1<<UDRE)));
    UDR = data;
}
char uart_receive(void) {
    while (!(UCSRA & (1<<RXC)));
    return UDR;
}
#endif