# 🔧 Fix: ESP32 Board Package Download Error

## ❌ Error:
```
Error downloading https://dl.espressif.com/dl/package_esp32_index.json
```

## ✅ Solutions (Try in order):

---

### **Solution 1: Use GitHub Mirror (Recommended)**

1. **Open Arduino IDE**
2. **Go to:** File → Preferences
3. **Find:** "Additional Boards Manager URLs"
4. **Replace the URL with GitHub mirror:**
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
5. **Click OK**
6. **Go to:** Tools → Board → Boards Manager
7. **Search:** "esp32"
8. **Click Install** on "esp32 by Espressif Systems"

---

### **Solution 2: Manual Download & Install**

If Solution 1 doesn't work:

1. **Download ESP32 package manually:**
   - Go to: https://github.com/espressif/arduino-esp32/releases
   - Download latest release ZIP file

2. **Extract to Arduino directory:**
   ```
   Windows: C:\Users\YourName\AppData\Local\Arduino15\packages\esp32
   ```

3. **Restart Arduino IDE**

---

### **Solution 3: Check Internet Connection**

1. **Turn off VPN** (if using)
2. **Try different network** (mobile hotspot)
3. **Check firewall** settings
4. **Disable antivirus** temporarily

---

### **Solution 4: Use Alternate Board Manager URL**

Try this alternate URL:

```
https://espressif.github.io/arduino-esp32/package_esp32_index.json
```

---

## 🎯 Quick Fix (Most Common):

**Just change the URL to GitHub:**

```
File → Preferences → Additional Boards Manager URLs:
https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
```

Then:
```
Tools → Board → Boards Manager → Search "esp32" → Install
```

---

## ✅ Verify Installation:

After installing, check:
```
Tools → Board → ESP32 Arduino → ESP32 Dev Module
```

If you see "ESP32 Dev Module", you're good to go! ✓

---

**Try the GitHub URL first - it usually works!** 🚀
