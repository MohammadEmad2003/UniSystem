#ifdef __AVR_ATmega32__
#include "keypad.h"
#include "../../include/MACROS.h"

// مصفوفة المفاتيح القياسية
char keys[4][4] = {
    {'1','2','3','A'},
    {'4','5','6','B'},
    {'7','8','9','C'},
    {'*','0','#','D'}
};

// تعريف الـ Pins بناءً على الرسمة
uint8_t row_pins[4] = {PB4, PB5, PB6, PB7};
uint8_t col_pins[4] = {PD2, PD3, PD4, PD5};

void keypad_init(void) {
    // 1. ضبط الـ Rows كـ Output
    for(int i=0; i<4; i++) {
        set_bit(KEYPAD_ROW_DDR, row_pins[i]);
        set_bit(KEYPAD_ROW_PORT, row_pins[i]); // خليهم High فى البداية
    }

    // 2. ضبط الـ Columns كـ Input
    for(int i=0; i<4; i++) {
        clear_bit(KEYPAD_COL_DDR, col_pins[i]);
        // بما إن فيه Pull-up resistors خارجية فى الرسمة، مش لازم نفعل الـ Internal
        // بس للأمان ممكن نفعلها لو المقاومات الخارجية مش واصلة كويس
        set_bit(KEYPAD_COL_PORT, col_pins[i]); 
    }
}

char keypad_get_key(void) {
    for (int r = 0; r < 4; r++) {
        // نزل الصف الحالى لـ Ground (Active Low)
        clear_bit(KEYPAD_ROW_PORT, row_pins[r]);
        
        _delay_us(10); // استقرار الإشارة
        
        for (int c = 0; c < 4; c++) {
            // فحص العمود: لو قرأ 0 يبقى الزرار اتضغط
            if (read_bit(KEYPAD_COL_PIN, col_pins[c]) == 0) {
                _delay_ms(20); // Debouncing
                while (read_bit(KEYPAD_COL_PIN, col_pins[c]) == 0); // استنى لما يرفع إيده
                
                set_bit(KEYPAD_ROW_PORT, row_pins[r]); // رجع الصف High قبل ما تخرج
                return keys[r][c];
            }
        }
        // رجع الصف High عشان نجرب اللى بعده
        set_bit(KEYPAD_ROW_PORT, row_pins[r]);
    }
    return 0; // مفيش ضغطة
}

#endif