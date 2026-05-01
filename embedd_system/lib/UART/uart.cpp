#ifdef __AVR_ATmega32__
#include <avr/io.h>
#include "uart.h"

// التأكيد على التردد 16 ميجا
#ifndef F_CPU
#define F_CPU 16000000UL
#endif

void uart_init(uint32_t baud) {
    // استخدام 16UL لضمان أن الحسبة تتم كـ Long ولا يحدث Overflow
    uint16_t ubrr = (F_CPU / (16UL * baud)) - 1;
    
    // ضبط سرعة الباود
    UBRRH = (uint8_t)(ubrr >> 8);
    UBRRL = (uint8_t)ubrr;
    
    // تفعيل الاستقبال والارسال
    UCSRB = (1 << RXEN) | (1 << TXEN);
    
    /* ضبط التنسيق: 
       1. URSEL=1 عشان نعدل في سجل UCSRC (مهم جداً في mega32)
       2. UCSZ1:0 = 11 عشان نختار 8-bit data
    */
    UCSRC = (1 << URSEL) | (1 << UCSZ1) | (1 << UCSZ0);
}

void uart_send(char data) {
    // الانتظار حتى يفرغ سجل البيانات
    while (!(UCSRA & (1 << UDRE)));
    UDR = data;
}

char uart_receive(void) {
    // الانتظار حتى وصول بيانات
    while (!(UCSRA & (1 << RXC)));
    return UDR;
}

// دالة إضافية للتأكد من وجود داتا قبل القراءة (تمنع التهنيج)
uint8_t uart_available(void) {
    return (UCSRA & (1 << RXC));
}
#endif