# 🔵 Bluetooth IoT Device Integration Guide

## Overview
QAir now supports Bluetooth connectivity to connect with IoT devices such as smart inhalers, air quality monitors, and health trackers.

## Features

### ✅ Current Implementation (Demo Mode)
- **Connection Status Table**: Shows "Not-Connected" or "Connected" status
- **Device Scanning**: Modal that lists nearby Bluetooth devices
- **Signal Strength Indicator**: Visual bars showing device RSSI (signal quality)
- **Device Management**: Connect/Disconnect functionality with confirmations
- **Permission Handling**: Automatic Bluetooth and Location permission requests (Android)
- **Mock Device List**: 5 sample IoT devices for testing UI

### 📱 User Interface
1. **Status Card** (on Profile page):
   - IoT Device Status header with Bluetooth icon
   - Connection status badge (Connected/Not-Connected with colored dot)
   - Device details table (when connected):
     - Device name
     - Device ID
     - Signal strength (dBm)
   - Action button: "Find Nearby Devices" or "Disconnect Device"

2. **Device List Modal**:
   - Gradient header with title and close button
   - Scanning indicator with loading animation
   - List of available devices showing:
     - Device icon
     - Device name
     - Device ID
     - Signal strength bars (color-coded)
   - Empty state when no devices found
   - Rescan button to refresh device list

## 🛠️ Production Implementation

To connect real Bluetooth devices, you need to integrate a Bluetooth library:

### Recommended Libraries:

#### 1. **react-native-ble-plx** (For BLE Devices - Recommended)
Best for: Smart Inhalers, Health Trackers, Modern IoT Sensors

```bash
npm install react-native-ble-plx
```

**Setup Steps:**
1. Install the package
2. Update `BluetoothManager.tsx` to use BLE Manager
3. Configure permissions in `app.json`:
```json
{
  "expo": {
    "plugins": [
      [
        "react-native-ble-plx",
        {
          "isBackgroundEnabled": true,
          "modes": ["peripheral", "central"],
          "bluetoothAlwaysUsageDescription": "Allow QAir to connect to your smart inhaler and health devices"
        }
      ]
    ]
  }
}
```

#### 2. **react-native-bluetooth-classic** (For Classic Bluetooth)
Best for: Older IoT devices, Serial communication devices

```bash
npm install react-native-bluetooth-classic
```

### Implementation Example (BLE):

Replace the mock scanning code in `BluetoothManager.tsx`:

```typescript
import { BleManager, Device } from 'react-native-ble-plx';

const bleManager = new BleManager();

const scanForDevices = async () => {
  const hasPermissions = await requestBluetoothPermissions();
  
  if (!hasPermissions) {
    Alert.alert('Permissions Required', 'Please enable Bluetooth permissions');
    return;
  }

  setIsScanning(true);
  setAvailableDevices([]);

  // Start BLE scan
  bleManager.startDeviceScan(null, null, (error, device) => {
    if (error) {
      console.error('Scan error:', error);
      setIsScanning(false);
      return;
    }

    if (device && device.name) {
      const newDevice: BluetoothDevice = {
        id: device.id,
        name: device.name,
        rssi: device.rssi || undefined,
        isConnected: false,
      };

      setAvailableDevices(prev => {
        // Avoid duplicates
        if (prev.find(d => d.id === newDevice.id)) return prev;
        return [...prev, newDevice];
      });
    }
  });

  // Stop scanning after 10 seconds
  setTimeout(() => {
    bleManager.stopDeviceScan();
    setIsScanning(false);
  }, 10000);
};

const connectToDevice = async (device: BluetoothDevice) => {
  try {
    setIsScanning(true);
    
    // Connect to BLE device
    const connectedDevice = await bleManager.connectToDevice(device.id);
    await connectedDevice.discoverAllServicesAndCharacteristics();
    
    const connectedDeviceData: BluetoothDevice = {
      ...device,
      isConnected: true,
    };
    
    setConnectedDevice(connectedDeviceData);
    setIsModalVisible(false);
    setIsScanning(false);
    
    Alert.alert('Connected', `Successfully connected to ${device.name}`);
    
    if (onDeviceConnected) {
      onDeviceConnected(connectedDeviceData);
    }
  } catch (error) {
    setIsScanning(false);
    Alert.alert('Connection Failed', `Could not connect to ${device.name}`);
  }
};
```

## 📋 Permissions Required

### Android (`android/app/src/main/AndroidManifest.xml`):
```xml
<!-- Android 12+ -->
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE" />

<!-- Android 11 and below -->
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />

<!-- Location (required for Bluetooth scanning) -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

### iOS (`ios/YourApp/Info.plist`):
```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>QAir needs Bluetooth to connect to your smart inhaler and health monitoring devices</string>

<key>NSBluetoothPeripheralUsageDescription</key>
<string>QAir needs Bluetooth to communicate with your health devices</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>Location is required for Bluetooth device scanning</string>
```

## 🎯 Use Cases

### 1. Smart Inhaler Integration
- Track inhaler usage automatically
- Monitor medication adherence
- Get real-time usage notifications
- Sync data with health records

### 2. Air Quality Monitor
- Receive live PM2.5, CO2, VOC readings
- Get alerts when air quality is poor
- Log environmental conditions with triggers
- Create personalized exposure reports

### 3. Health Tracker
- Monitor heart rate, SpO2, temperature
- Correlate vital signs with asthma triggers
- Track physical activity impact on symptoms
- Generate comprehensive health insights

## 🔧 Testing

### Current Mock Devices:
1. **QAir Sensor Pro** - Simulated air quality monitor (RSSI: -45 dBm)
2. **Smart Inhaler** - Simulated medication tracker (RSSI: -60 dBm)
3. **Air Quality Monitor** - Generic IoT sensor (RSSI: -72 dBm)
4. **IoT Health Tracker** - Fitness device (RSSI: -55 dBm)
5. **Bluetooth Device 12:34** - Unknown device (RSSI: -80 dBm)

### Testing Steps:
1. Go to **Profile** page
2. Scroll to "IoT Device Status" section
3. Tap "Find Nearby Devices"
4. Wait for scanning animation (2 seconds)
5. See list of 5 mock devices
6. Tap any device to connect
7. See connection confirmation
8. Status changes to "Connected" with device details
9. Tap "Disconnect Device" to disconnect
10. Confirm disconnection in alert

## 📊 Data Flow

```
User Action → Request Permissions → Scan for Devices → Display List
                                                             ↓
                                                    User Selects Device
                                                             ↓
                                                    Connect to Device
                                                             ↓
                                          Discover Services/Characteristics
                                                             ↓
                                              Subscribe to Notifications
                                                             ↓
                                           Receive Real-Time Data (IoT)
                                                             ↓
                                          Process & Store in Database
                                                             ↓
                                          Display in App (Dashboard/Profile)
```

## 🚀 Next Steps

### Phase 1: Basic Connection (Current)
- ✅ UI for connection status
- ✅ Device scanning modal
- ✅ Permission handling
- ✅ Connect/Disconnect functionality

### Phase 2: Real Device Integration
- ⏳ Integrate react-native-ble-plx
- ⏳ Implement actual BLE scanning
- ⏳ Connect to real devices
- ⏳ Handle connection errors

### Phase 3: Data Communication
- ⏳ Discover device services/characteristics
- ⏳ Subscribe to sensor notifications
- ⏳ Parse received data
- ⏳ Store in Supabase database

### Phase 4: Advanced Features
- ⏳ Auto-reconnect on disconnect
- ⏳ Background data syncing
- ⏳ Device firmware updates (OTA)
- ⏳ Multi-device support
- ⏳ Device pairing history
- ⏳ Data visualization (real-time charts)

## 📚 Resources

- **BLE PLX Documentation**: https://github.com/dotintent/react-native-ble-plx
- **Bluetooth Classic**: https://github.com/kenjdavidson/react-native-bluetooth-classic
- **Expo Bluetooth**: https://docs.expo.dev/versions/latest/sdk/bluetooth/
- **BLE Primer**: https://learn.adafruit.com/introduction-to-bluetooth-low-energy

## 🐛 Troubleshooting

### Issue: Devices not appearing
- Ensure device is powered on and in pairing mode
- Check Bluetooth is enabled on phone
- Verify location permissions granted (required for BLE scanning on Android)
- Try rescan button

### Issue: Connection fails
- Device might be out of range
- Check if device is already connected to another phone
- Restart device and try again
- Check app has Bluetooth permissions

### Issue: Permission errors (Android)
- Go to Settings → Apps → QAir → Permissions
- Enable Bluetooth, Location permissions
- For Android 12+, ensure "Nearby devices" permission is granted

## 💡 Tips

1. **Signal Strength**: Green = Excellent, Yellow = Fair, Red = Poor
2. **Range**: BLE typically works within 10-30 meters
3. **Battery**: Bluetooth connection may drain battery faster
4. **Pairing**: Some devices require PIN codes (check device manual)
5. **Updates**: Keep device firmware updated for best compatibility

---

**Need Help?** Contact support or check our FAQ section in the app.
