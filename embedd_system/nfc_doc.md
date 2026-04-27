# 📄 NFC Module (PN532) Engineering Documentation

**Project:** Student & Pharmacy Management System  
**Controller:** NodeMCU ESP8266  
**NFC Chip:** PN532 (Blue Module)  
**Communication Protocol:** SPI (High Stability Mode)

---

## 1. Hardware Configuration

To enable **SPI Mode**, the physical DIP switches on the PN532 board must be set correctly. This configuration activates the SPI bus pins instead of I2C or UART.

### DIP Switch Settings:
| Switch | Position | State |
| :--- | :--- | :--- |
| **Switch 1 (SET0)** | **OFF** | Up |
| **Switch 2 (SET1)** | **ON** | Down (Towards 'ON') |

---

## 2. Wiring Diagram (SPI Connection)

The following wiring map is optimized for the **NodeMCU ESP8266**. SPI is used to ensure the Web Server remains responsive during card scanning.

| PN532 Pin | NodeMCU Pin | Function |
| :--- | :--- | :--- |
| **5V / VCC** | **Vin (or VV)** | 5V Power Supply |
| **GND** | **GND** | Common Ground |
| **SCK** | **D5** | Serial Clock |
| **MI (MISO)** | **D6** | Master In Slave Out |
| **MO (MOSI)** | **D7** | Master Out Slave In |
| **NSS (SS/CS)** | **D8** | Chip Select |

---

## 3. Software Architecture (Modular Design)

The system is designed using a **Procedural Modular approach**. This separates the low-level hardware interaction from the high-level application logic.

### File Structure:
- `lib/nfc/nfc.h`: Function prototypes and definitions.
- `lib/nfc/nfc.cpp`: Implementation of NFC logic and data formatting.

### Key API Functions:
- `initNFC(uint8_t csPin)`: Initializes the SPI bus and sets up the SAM (Secure Access Module) configuration.
- `scanCard()`: Scans for ISO14443A tags. Returns `true` if a card is detected.
- `getUID()`: Returns the UID as a formatted String (e.g., `04:FE:A1:B2`).

---

## 4. Engineering Optimizations

Several tweaks were implemented to ensure production-level reliability:

1. **Scan Persistence:** Set `setPassiveActivationRetries(0xFF)` to allow the module to retry scanning multiple times per cycle, reducing "missed" scans.
2. **Timing Balance:** Configured a **150ms timeout** in `readPassiveTargetID`. This provides a balance between high sensitivity and keeping the Web Server loop fast.
3. **Hex Formatting:** Raw bytes are automatically processed into an Uppercase Hexadecimal string with colon delimiters for database compatibility.

---

## 5. Troubleshooting & Maintenance

- **Status "Offline":** - Verify that the red power LED on the PN532 is ON.
  - Re-check the DIP switches (1:OFF, 2:ON).
  - Ensure all jumper wires are securely connected or soldered.
- **Card Not Detected:**
  - Ensure the tag is **13.56MHz** (Mifare). The module will NOT read 125KHz (Proximity) tags.
  - Move the tag closer to the white rectangular antenna area on the board.
- **Interference:**
  - **Crucial:** Do not mount the NFC module on metal surfaces. Metal will interfere with the magnetic induction, making the module unable to read tags.

---

*Documented by: Mazen - Engineering Student* *Date: April 2026*