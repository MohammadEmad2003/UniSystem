#ifdef __AVR_ATmega32__
#ifndef UART_H
#define UART_H
#include <avr/io.h>
void uart_init(uint32_t baud);
void uart_send(char data);
void uart_send_string(const char* str);
char uart_receive(void);
uint8_t uart_available(void);
#endif
#endif