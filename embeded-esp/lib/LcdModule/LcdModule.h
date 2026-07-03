#ifndef LCD_MODULE_H
#define LCD_MODULE_H

#include <Arduino.h>
#include <LiquidCrystal.h>

// تعريف الفانكشنز اللي هنستخدمها بره في الـ main
void initLCD();
void displayMessage(String line1, String line2 = "");
void clearLCD();
void displayLoading(String message, int delayTime);
void displayCenteredMessage(String line1, String line2 = "");

#endif