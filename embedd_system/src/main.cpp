#include <ArduinoJson.h>

// ================================================================
// 1. ESP8266 Code
// ================================================================
#ifdef ESP8266

#include "nfc.h"
#include <Arduino.h>
#include <ESP8266HTTPClient.h>
#include <ESP8266WiFi.h>
#include <WiFiClient.h>

const char *ssid = "MZandEB";
const char *password = "16520053071982MMA";
const char *serverUrl = "http://192.168.1.66:3000";

char serialBuffer[256];
uint16_t serialIndex = 0;

void setup() {
  Serial.begin(9600);

  initNFC(D8);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }

  // ✅ FIX 3: escaped quotes صح
  Serial.println("{\"status\":\"ready\"}");
}

void handleBackendRequest(char *jsonStr) {
  StaticJsonDocument<256> doc;

  DeserializationError error = deserializeJson(doc, jsonStr);
  if (error) return;

  const char *type = doc["type"];
  int room_id = doc["room_id"];

  WiFiClient client;
  HTTPClient http;

  String payload;
  String url;

  if (strcmp(type, "nfc") == 0) {

    const char *uid = doc["uid"];

    url = String(serverUrl) + "/api/attendance/nfc";

    payload = "{\"uid\":\"" + String(uid) +
              "\",\"room_id\":" + String(room_id) + "}";

    http.setTimeout(5000);
    http.begin(client, url);
    http.addHeader("Content-Type", "application/json");

  } else if (strcmp(type, "manual") == 0) {

    const char *studentId = doc["studentId"];
    const char *pass = doc["password"];

    url = String(serverUrl) + "/api/attendance/manual";

    payload = "{\"studentId\":\"" + String(studentId) +
              "\",\"password\":\"" + String(pass) +
              "\",\"room_id\":" + String(room_id) + "}";

    http.setTimeout(5000);
    http.begin(client, url);
    http.addHeader("Content-Type", "application/json");

  } else {
    return;
  }

  int httpCode = http.POST(payload);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.println(response);
  } else {
    // ✅ FIX 3: escaped quotes صح
    Serial.println("{\"success\":false,\"message\":\"Conn Error\"}");
  }

  http.end();
}

void loop() {

  while (Serial.available()) {

    char c = Serial.read();

    if (c == '\n') {

      serialBuffer[serialIndex] = '\0';
      handleBackendRequest(serialBuffer);
      serialIndex = 0;

    } else if (c != '\r') {

      if (serialIndex < sizeof(serialBuffer) - 1) {
        serialBuffer[serialIndex++] = c;
      }
    }
  }

  static String lastUid = "";
  static unsigned long lastUidTime = 0;

  if (scanCard()) {

    String uid = getUID();
    String hceData = getHcePayload();

    // If HCE payload is available, use it instead of UID
    String dataToSend = hceData.length() > 0 ? hceData : uid;

    if (dataToSend != lastUid || millis() - lastUidTime > 2000) {

      StaticJsonDocument<256> doc;

      doc["type"] = "nfc_detected";
      doc["uid"] = dataToSend;
      doc["isHce"] = hceData.length() > 0;

      serializeJson(doc, Serial);
      Serial.println();

      lastUid = dataToSend;
      lastUidTime = millis();
    }
  }
}

#endif

// ================================================================
// 2. ATmega32 Code
// ================================================================

// ✅ FIX 2: double underscores صح
#ifdef __AVR_ATmega32__

#include "buzzer.h"
#include "keypad.h"
#include "lcd.h"
#include "uart.h"

#include <ArduinoJson.h>
#include <avr/io.h>
#include <string.h>
#include <util/delay.h>

enum State {
  WAITING_READY,
  HOME,
  NFC_SCAN,
  MANUAL_ID,
  MANUAL_PASS,
  PROCESSING
};

State currentState = WAITING_READY;

char studentId[32];
char password[32];

uint8_t inputIdx = 0;

unsigned long processingStartTime = 0;

char serialBuffer[256];
uint16_t serialIndex = 0;

int currentRoomId = 2;

void resetInputs() {
  memset(studentId, 0, sizeof(studentId));
  memset(password, 0, sizeof(password));
  inputIdx = 0;
}

void showHome() {
  lcd_clear();
  lcd_print("1.Scan Card");
  lcd_set_cursor(1, 0);
  lcd_print("2.Enter ID");
}

void sendNfcRequest(const char *uid) {

  StaticJsonDocument<256> doc;

  doc["type"] = "nfc";
  doc["uid"] = uid;
  doc["room_id"] = currentRoomId;

  char buffer[256];
  serializeJson(doc, buffer);

  uart_send_string(buffer);
  uart_send('\n');

  currentState = PROCESSING;
  processingStartTime = millis();

  lcd_clear();
  lcd_print("Processing...");
}

void sendManualRequest() {

  StaticJsonDocument<256> doc;

  doc["type"] = "manual";
  doc["studentId"] = studentId;
  doc["password"] = password;
  doc["room_id"] = currentRoomId;

  char buffer[256];
  serializeJson(doc, buffer);

  uart_send_string(buffer);
  uart_send('\n');

  currentState = PROCESSING;
  processingStartTime = millis();

  lcd_clear();
  lcd_print("Processing...");
}

void showError(const char *msg) {

  lcd_clear();
  lcd_print("Error:");
  lcd_set_cursor(1, 0);

  char temp[17];
  strncpy(temp, msg, 16);
  temp[16] = '\0';
  lcd_print(temp);

  buzzer_beep(500);
  _delay_ms(2000);

  showHome();
  currentState = HOME;
}

void handleSerialResponse(char *jsonStr) {

  StaticJsonDocument<256> doc;

  DeserializationError error = deserializeJson(doc, jsonStr);

  if (error) {
    showError("Parse Error");
    return;
  }

  if (doc.containsKey("status")) {

    const char *status = doc["status"];

    if (strcmp(status, "ready") == 0) {

      currentState = HOME;
      lcd_clear();
      lcd_print("System Ready");
      buzzer_beep(100);
      _delay_ms(1000);
      showHome();
    }

    return;
  }

  if (doc.containsKey("type")) {

    const char *type = doc["type"];

    if (strcmp(type, "nfc_detected") == 0) {

      if (currentState == NFC_SCAN) {
        const char *uid = doc["uid"];
        sendNfcRequest(uid);
      }

      return;
    }
  }

  if (currentState == PROCESSING) {

    // Backend may return success as boolean (true/false) or string ("success"/"fail")
    bool success = false;
    if (doc["success"].is<bool>()) {
      success = doc["success"].as<bool>();
    } else if (doc["success"].is<const char*>()) {
      const char *successStr = doc["success"] | "";
      success = (strcmp(successStr, "success") == 0) || (strcmp(successStr, "true") == 0) || (strcmp(successStr, "1") == 0);
    } else if (doc["success"].is<int>()) {
      success = doc["success"].as<int>() != 0;
    }

    lcd_clear();

    // Line 1: show backend message (explains what happened)
    const char *rawMsg = success ? "OK" : "Failed";
    if (doc["message"].is<const char*>()) {
      rawMsg = doc["message"] | rawMsg;
    } else if (doc["message"].is<JsonObject>()) {
      rawMsg = doc["message"]["msg"] | rawMsg;
    }

    char line1[17];
    strncpy(line1, rawMsg, 16);
    line1[16] = '\0';
    lcd_print(line1);

    // Line 2: show FIRST name only (if provided)
    lcd_set_cursor(1, 0);
    const char *fullName = "";
    if (doc["data"].is<JsonObject>()) {
      fullName = doc["data"]["studentName"] | "";
    }

    if (fullName && fullName[0] != '\0') {
      char firstName[17];
      uint8_t i = 0;
      while (fullName[i] != '\0' && fullName[i] != ' ' && i < 16) {
        firstName[i] = fullName[i];
        i++;
      }
      firstName[i] = '\0';
      lcd_print(firstName);
    }

    if (success) buzzer_beep(100);
    else buzzer_beep(500);

    _delay_ms(2000);
    currentState = HOME;
    showHome();
  }
}

int main(void) {

  lcd_init();
  uart_init(9600);
  keypad_init();
  buzzer_init();

  lcd_print("Connecting...");

  while (1) {

    // ============================================================
    // FAILSAFE TIMEOUT
    // ============================================================
    if (currentState == PROCESSING && (millis() - processingStartTime > 10000)) {
      showError("Timeout Error");
      currentState = HOME;
    }

    // ============================================================
    // UART RECEIVE
    // ============================================================

    while (uart_available()) {

      char c = uart_receive();

      if (c == '\n') {

        serialBuffer[serialIndex] = '\0';
        handleSerialResponse(serialBuffer);
        serialIndex = 0;

      } else if (c != '\r') {

        if (serialIndex < sizeof(serialBuffer) - 1) {
          serialBuffer[serialIndex++] = c;
        }
      }
    }

    // ============================================================
    // KEYPAD
    // ============================================================

    char key = keypad_get_key();

    if (key != 0) {

      if (currentState == HOME) {

        if (key == '1') {

          currentState = NFC_SCAN;
          lcd_clear();
          lcd_print("Scan card...");

        } else if (key == '2') {

          currentState = MANUAL_ID;
          resetInputs();
          lcd_clear();
          lcd_print("Enter ID:");
          lcd_set_cursor(1, 0);
        }

      } else if (currentState == NFC_SCAN) {

        if (key == '*') {
          currentState = HOME;
          showHome();
        }

      } else if (currentState == MANUAL_ID) {

        if (key == '#') {

          currentState = MANUAL_PASS;
          inputIdx = 0;
          lcd_clear();
          lcd_print("Password:");
          lcd_set_cursor(1, 0);

        } else if (key == '*') {

          currentState = HOME;
          showHome();

        } else {

          if (inputIdx < sizeof(studentId) - 1) {
            studentId[inputIdx++] = key;
            lcd_char(key);
          }
        }

      } else if (currentState == MANUAL_PASS) {

        if (key == '#') {

          sendManualRequest();

        } else if (key == '*') {

          currentState = MANUAL_ID;
          inputIdx = 0;
          lcd_clear();
          lcd_print("Enter ID:");
          lcd_set_cursor(1, 0);

        } else {

          if (inputIdx < sizeof(password) - 1) {
            password[inputIdx++] = key;
            lcd_char('*');
          }
        }
      }
    }
  }

  return 0;
}

#endif