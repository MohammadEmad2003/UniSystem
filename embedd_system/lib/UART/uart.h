#ifdef __AVR_ATmega32__
#ifndef UART_H
#define UART_H
#include <avr/io.h>
void uart_init(uint32_t baud);
void uart_send(char data);
char uart_receive(void);
#endif
#endif