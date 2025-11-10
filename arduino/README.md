# QAir ESP32 IoT Files

## 📁 Essential Files Only

### 1️⃣ **ESP32_FSR_BLE_Inhaler/** (MAIN CODE)
The production-ready code for your ESP32 device.

**File:** `ESP32_FSR_BLE_Inhaler.ino`
- ✅ Bluetooth Low Energy (BLE)
- ✅ FSR pressure detection
- ✅ Sends notifications to QAir app
- ✅ Minimal code (103 lines)
- ✅ Ready to upload

**Upload this to your ESP32!**

---

### 2️⃣ **FSR_Calibration_Tool/** (OPTIONAL)
Utility to find the right threshold value for your FSR sensor.

**File:** `FSR_Calibration_Tool.ino`
- Use this FIRST to calibrate your FSR
- Upload this, press FSR, note recommended threshold
- Update threshold in main code
- Then upload main code

---

## 🚀 Quick Start

1. **Calibrate FSR** (optional but recommended):
   - Upload `FSR_Calibration_Tool.ino`
   - Open Serial Monitor (115200 baud)
   - Press FSR and note recommended threshold
   
2. **Upload Main Code**:
   - Update threshold if needed in `ESP32_FSR_BLE_Inhaler.ino`
   - Upload to ESP32
   - Done!

3. **Connect App**:
   - Open QAir app
   - Connect to "QAir-Inhaler" via Bluetooth
   - Press FSR to test

---

## 🗑️ Deleted Files

These were removed as unnecessary:
- ❌ `ESP32_FSR_Inhaler_Trigger/` - Old Wi-Fi version (replaced by BLE)
- ❌ `ESP32_FSR_GPS_Example/` - Wi-Fi + GPS example (not needed)
- ❌ All documentation markdown files (redundant)
- ❌ Integration guides (already integrated in app)

---

## ⚡ What You Need

**Hardware:**
- ESP32 NodeMCU
- FSR sensor
- 10kΩ resistor
- Wires

**Wiring:**
```
3.3V → FSR → GPIO34 → 10kΩ → GND
```

**Software:**
- Arduino IDE with ESP32 support
- BLE libraries (built-in with ESP32 package)

---

**That's it! Just 2 folders, 2 files. Simple.** ✅
