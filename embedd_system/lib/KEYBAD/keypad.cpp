#ifdef __AVR_ATmega32__
#include "keypad.h"
#include "../../include/MACROS.h"

char keys[4][4] = {
    {'1', '2', '3', 'A'},
    {'4', '5', '6', 'B'},
    {'7', '8', '9', 'C'},
    {'*', '0', '#', 'D'}};

uint8_t row_pins[4] = {PB4, PB5, PB6, PB7};
uint8_t col_pins[4] = {PD2, PD3, PD4, PD5};

void keypad_init(void)
{
    for (int i = 0; i < 4; i++)
    {
        set_bit(KEYPAD_ROW_DDR, row_pins[i]);
        set_bit(KEYPAD_ROW_PORT, row_pins[i]);
    }
    for (int i = 0; i < 4; i++)
    {
        clear_bit(KEYPAD_COL_DDR, col_pins[i]);
        set_bit(KEYPAD_COL_PORT, col_pins[i]);
    }
}

char keypad_get_key(void)
{
    static char last_key = 0;
    char current_key = 0;

    for (int r = 0; r < 4; r++)
    {
        clear_bit(KEYPAD_ROW_PORT, row_pins[r]);
        _delay_us(10);

        for (int c = 0; c < 4; c++)
        {
            if (read_bit(KEYPAD_COL_PIN, col_pins[c]) == 0)
            {
                current_key = keys[r][c];
                break;
            }
        }
        set_bit(KEYPAD_ROW_PORT, row_pins[r]);
        if (current_key != 0)
            break;
    }

    if (current_key != last_key)
    {
        _delay_ms(50); // Debouncing
        last_key = current_key;
        return current_key;
    }
    return 0;
}

#endif
