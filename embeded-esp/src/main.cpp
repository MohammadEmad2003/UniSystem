#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h> 
#include <HTTPClient.h>
#include <ArduinoJson.h>

// استدعاء موديولات السيستم
#include "LcdModule.h"
#include "KeypadModule.h"
#include "NfcModule.h"
#include "BuzzerModule.h"

// إعدادات الشبكة والسيرفر
const char *ssid = "realme";
const char *password = "12345678";
const char *serverUrl = "https://uni-system-psi.vercel.app";
const int currentRoomId = 2;

enum State {
    WIFI_CONNECTING,
    ROLE_SELECT,   // NEW: اختيار الدور - طالب ولا Other
    HOME,          // فلو الطالب (حضور)
    NFC_SCAN,
    MANUAL_ID,
    MANUAL_PASS,
    OTHER_MENU,    // NEW: فلو الـ Other (Link / Lookup)
    OTHER_SCAN,    // NEW: قراءة الكارت لصالح الـ Other فلو - منفصل تمامًا عن الحضور
    PROCESSING
};

State currentState = WIFI_CONNECTING;

char studentId[32];
char passwordInput[32]; 
uint8_t inputIdx = 0;

// 1 = Link Card (Broadcast للفرونت بس), 2 = Card Info (يعرض بيانات الكارت على الـ LCD)
uint8_t otherSubMode = 0;

void resetInputs() {
    memset(studentId, 0, sizeof(studentId));
    memset(passwordInput, 0, sizeof(passwordInput));
    inputIdx = 0;
}

void showRoleSelect() {
    displayMessage("1.Student", "2.Other");
}

void showHome() {
    displayMessage("1.Scan Card", "2.Enter ID");
}

void showOtherMenu() {
    displayMessage("1.Link Card", "2.Card Info");
}

void handleBackendResponse(String responseStr) {
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, responseStr);

    if (error) {
        displayCenteredMessage("Error:", "Parse Error");
        beepError();
        delay(2000);
        currentState = HOME;
        showHome();
        return;
    }

    bool success = false;
    if (doc["success"].is<bool>()) {
        success = doc["success"].as<bool>();
    } else if (doc["success"].is<const char*>()) {
        const char *successStr = doc["success"] | "";
        if (strcmp(successStr, "true") == 0 || strcmp(successStr, "success") == 0 || strcmp(successStr, "1") == 0) {
            success = true;
        } else {
            success = false;
        }
    } else if (doc["success"].is<int>()) {
        success = doc["success"].as<int>() != 0;
    }

    const char *rawMsg = success ? "OK" : "Failed";
    if (doc["message"].is<const char*>()) {
        rawMsg = doc["message"] | rawMsg;
    } else if (doc["message"].is<JsonObject>()) {
        rawMsg = doc["message"]["msg"] | rawMsg;
    }
    
    String firstName = "";
    if (doc["data"].is<JsonObject>()) {
        const char* fullName = doc["data"]["studentName"] | "";
        if (fullName && fullName[0] != '\0') {
            int i = 0;
            while (fullName[i] != '\0' && fullName[i] != ' ' && i < 16) {
                firstName += fullName[i];
                i++;
            }
        }
    }

    displayMessage(String(rawMsg), firstName);
    
    if (success) {
        beepSuccess();
    } else {
        beepError();
    }

    delay(3000); 
    currentState = HOME;
    showHome();
}

// ============================================================
// فلو الـ Other (Link Card / Card Info) - منفصل تمامًا عن الحضور
// بيكلم /api/nfc/scan اللي بدورها بتعمل io.emit + ترجع بيانات
// الكارت من غير ما تلمس Lecture/Attendance خالص
// ============================================================
void handleOtherScanResponse(String responseStr) {
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, responseStr);

    if (error) {
        displayCenteredMessage("Error:", "Parse Error");
        beepError();
        delay(2000);
        currentState = OTHER_MENU;
        showOtherMenu();
        return;
    }

    bool success = false;
    if (doc["success"].is<bool>()) {
        success = doc["success"].as<bool>();
    } else if (doc["success"].is<const char*>()) {
        const char *successStr = doc["success"] | "";
        if (strcmp(successStr, "true") == 0 || strcmp(successStr, "success") == 0 || strcmp(successStr, "1") == 0) {
            success = true;
        }
    } else if (doc["success"].is<int>()) {
        success = doc["success"].as<int>() != 0;
    }

    bool linked = doc["data"]["linked"] | false;
    const char* studentName = doc["data"]["studentName"] | "";

    if (!success) {
        displayMessage("Error:", "Read Failed");
        beepError();
    } else if (otherSubMode == 2) {
        // Card Info: يعرض بيانات الكارت على الـ LCD
        if (linked && studentName[0] != '\0') {
            int level = doc["data"]["academicLevel"] | 0;
            float gpa = doc["data"]["gpa"] | 0.0;
            
            // Format name to fit (max 16 chars)
            String nameStr = String(studentName);
            if (nameStr.length() > 16) {
                nameStr = nameStr.substring(0, 16);
            }
            
            char line2[17];
            snprintf(line2, sizeof(line2), "L:%d GPA:%.2f", level, gpa);
            displayMessage(nameStr, String(line2));
        } else {
            displayMessage("Card Status:", "Not Linked");
        }
        beepSuccess();
    } else {
        // Link Card: مجرد تأكيد إنه اتبعت للفرونت (Socket) بس
        displayCenteredMessage("Card Sent", "Check Web App");
        beepSuccess();
    }

    delay(3000);
    currentState = OTHER_MENU;
    showOtherMenu();
}

void makeCardScanRequest(String uid) {
    currentState = PROCESSING;
    displayCenteredMessage("Reading Card...", "Please wait");

    if (WiFi.status() != WL_CONNECTED) {
        displayMessage("Error:", "No WiFi Conn");
        beepError();
        delay(2000);
        currentState = OTHER_MENU;
        showOtherMenu();
        return;
    }

    JsonDocument doc;
    doc["uid"] = uid;
    doc["room_id"] = currentRoomId;

    String payload;
    serializeJson(doc, payload);

    WiFiClientSecure client;
    client.setInsecure();

    HTTPClient http;
    String endpoint = (otherSubMode == 2) ? "/api/nfc/read-info" : "/api/nfc/read-only";
    String url = String(serverUrl) + endpoint;

    http.setTimeout(8000);
    http.begin(client, url);
    http.addHeader("Content-Type", "application/json");

    int httpCode = http.POST(payload);

    if (httpCode > 0) {
        String response = http.getString();
        Serial.println("Card Scan Response: " + response);
        handleOtherScanResponse(response);
    } else {
        Serial.printf("HTTP Post Failed, error: %s\n", http.errorToString(httpCode).c_str());
        displayMessage("Error:", "Conn Error");
        beepError();
        delay(2000);
        currentState = OTHER_MENU;
        showOtherMenu();
    }
    http.end();
}

void makePostRequest(String endpoint, String payload) {
    currentState = PROCESSING;
    displayCenteredMessage("Processing...", "Please wait");

    if (WiFi.status() != WL_CONNECTED) {
        displayMessage("Error:", "No WiFi Conn");
        beepError();
        delay(2000);
        currentState = HOME;
        showHome();
        return;
    }

    WiFiClientSecure client;
    client.setInsecure();

    HTTPClient http;
    String url = String(serverUrl) + endpoint;

    http.setTimeout(8000); 
    http.begin(client, url);
    
    // 💡 شيلنا السطر اللي كان مسبب Error للـ IDE هنا خالص عشان يـ Build عل طول
    http.addHeader("Content-Type", "application/json");

    int httpCode = http.POST(payload);

    if (httpCode > 0) {
        String response = http.getString();
        Serial.println("Backend Response: " + response);
        handleBackendResponse(response);
    } else {
        Serial.printf("HTTP Post Failed, error: %s\n", http.errorToString(httpCode).c_str());
        displayMessage("Error:", "Conn Error");
        beepError();
        delay(2000);
        currentState = HOME;
        showHome();
    }
    http.end();
}

void setup() {
    initLCD();
    initKeypad();
    initBuzzer();
    
    displayMessage("Connecting WiFi", "Please wait...");
    WiFi.begin(ssid, password);
    
    int timeoutCounter = 0;
    while (WiFi.status() != WL_CONNECTED && timeoutCounter < 40) {
        delay(500);
        timeoutCounter++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        displayCenteredMessage("WiFi Connected!", "Booting NFC...");
    } else {
        displayCenteredMessage("WiFi Timeout", "Check Router");
        delay(2000);
    }

    initNFC();
    
    if (nfcIsOnline()) {
        beepSuccess();
        displayCenteredMessage("System Ready", "UniSystem Active");
        delay(1500);
        currentState = ROLE_SELECT;
        showRoleSelect();
    } else {
        beepError();
        displayCenteredMessage("NFC Hardware", "Error!");
    }
}

void loop() {
    if (currentState == NFC_SCAN) {
        if (scanCard()) {
            String uid = getUID();
            String hceData = getHcePayload();

            // If HCE payload is available, use it instead of UID
            String dataToSend = hceData.length() > 0 ? hceData : uid;

            Serial.println("NFC Detected Local: " + uid);
            if (hceData.length() > 0) {
                Serial.println("HCE Payload: " + hceData);
            }

            JsonDocument doc;
            doc["type"] = "nfc";
            doc["uid"] = dataToSend;
            doc["room_id"] = currentRoomId;
            doc["isHce"] = hceData.length() > 0;

            String payload;
            serializeJson(doc, payload);

            // جرب تبعت لـ /api/attendance/nfc من غير السلاش الأخيرة
            makePostRequest("/api/attendance/nfc", payload);
        }
    }
    else if (currentState == OTHER_SCAN) {
        if (scanCard()) {
            String uid = getUID();
            Serial.println("NFC Detected (Other flow): " + uid);
            makeCardScanRequest(uid);
        }
    }

    char key = getPressedKey();

    if (key != 0) {
        beepKey(); 

        if (currentState == ROLE_SELECT) {
            if (key == '1') {
                currentState = HOME;
                showHome();
            } else if (key == '2') {
                currentState = OTHER_MENU;
                showOtherMenu();
            }
        }
        else if (currentState == HOME) {
            if (key == '1') {
                currentState = NFC_SCAN;
                displayMessage("Scan card...", "(* to Cancel)");
            } else if (key == '2') {
                currentState = MANUAL_ID;
                resetInputs();
                displayMessage("Enter ID:", "");
            } else if (key == '*') {
                currentState = ROLE_SELECT;
                showRoleSelect();
            }
        } 
        else if (currentState == OTHER_MENU) {
            if (key == '1') {
                otherSubMode = 1; // Link Card
                currentState = OTHER_SCAN;
                displayMessage("Scan card...", "(* to Cancel)");
            } else if (key == '2') {
                otherSubMode = 2; // Card Info
                currentState = OTHER_SCAN;
                displayMessage("Scan card...", "(* to Cancel)");
            } else if (key == '*') {
                currentState = ROLE_SELECT;
                showRoleSelect();
            }
        }
        else if (currentState == OTHER_SCAN) {
            if (key == '*') {
                currentState = OTHER_MENU;
                showOtherMenu();
            }
        }
        else if (currentState == NFC_SCAN) {
            if (key == '*') {
                currentState = HOME;
                showHome();
            }
        } 
        else if (currentState == MANUAL_ID) {
            if (key == '#') {
                currentState = MANUAL_PASS;
                inputIdx = 0;
                displayMessage("Password:", "");
            } else if (key == '*') {
                currentState = HOME;
                showHome();
            } else {
                if (inputIdx < sizeof(studentId) - 1) {
                    studentId[inputIdx++] = key;
                    displayMessage("Enter ID:", String(studentId));
                }
            }
        } 
        else if (currentState == MANUAL_PASS) {
            if (key == '#') {
                JsonDocument doc;
                doc["type"] = "manual";
                doc["studentId"] = studentId;
                doc["password"] = passwordInput;
                doc["room_id"] = currentRoomId;

                String payload;
                serializeJson(doc, payload);

                makePostRequest("/api/attendance/manual", payload);
            } else if (key == '*') {
                currentState = MANUAL_ID;
                inputIdx = 0;
                displayMessage("Enter ID:", "");
            } else {
                if (inputIdx < sizeof(passwordInput) - 1) {
                    passwordInput[inputIdx++] = key;
                    
                    String stars = "";
                    for(int s=0; s<inputIdx; s++) stars += "*";
                    displayMessage("Password:", stars);
                }
            }
        }
    }
}