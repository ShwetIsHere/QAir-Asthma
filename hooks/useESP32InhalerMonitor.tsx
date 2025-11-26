// ESP32 BLE Integration for QAir App
// Add this code to your BluetoothManager.tsx or create a new hook

import { useEffect, useState, useRef } from 'react';
import { Alert } from 'react-native';
import { BleManager, Device, Characteristic } from 'react-native-ble-plx';
import * as Location from 'expo-location';
import { supabase } from '@/utils/supabase';
import { fetchAirQuality } from '@/utils/airQuality';

// ESP32 BLE Service and Characteristic UUIDs
const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const TRIGGER_CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
const STATUS_CHAR_UUID = '1c95d5e3-d8f7-413a-bf3d-7a2e5d7be87e';

interface TriggerData {
  event: string;
  fsrValue: number;
  timestamp: number;
  count: number;
}

export function useESP32InhalerMonitor() {
  const bleManager = useRef<BleManager | null>(null);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastTrigger, setLastTrigger] = useState<TriggerData | null>(null);

  useEffect(() => {
    bleManager.current = new BleManager();

    return () => {
      // Cleanup
      if (connectedDevice) {
        bleManager.current?.cancelDeviceConnection(connectedDevice.id);
      }
      bleManager.current?.destroy();
    };
  }, []);

  // Connect to ESP32 device
  const connectToInhaler = async (device: Device) => {
    try {
      console.log('[BLE] Connecting to ESP32 inhaler:', device.name);

      // Connect to device
      const connected = await bleManager.current?.connectToDevice(device.id);
      if (!connected) {
        throw new Error('Failed to connect');
      }

      // Discover services and characteristics
      await connected.discoverAllServicesAndCharacteristics();
      console.log('[BLE] Services discovered');

      setConnectedDevice(connected);

      // Start monitoring for trigger notifications
      startMonitoring(connected);

      Alert.alert(
        'Connected!',
        'Your smart inhaler is now connected. Triggers will be recorded automatically.',
        [{ text: 'OK' }]
      );

      return connected;
    } catch (error) {
      console.error('[BLE] Connection error:', error);
      Alert.alert('Connection Failed', 'Could not connect to inhaler device');
      throw error;
    }
  };

  // Start monitoring for trigger events
  const startMonitoring = (device: Device) => {
    console.log('[BLE] Starting trigger monitoring...');

    device.monitorCharacteristicForService(
      SERVICE_UUID,
      TRIGGER_CHAR_UUID,
      (error, characteristic) => {
        if (error) {
          console.error('[BLE] Monitoring error:', error);
          return;
        }

        if (characteristic?.value) {
          handleTriggerNotification(characteristic);
        }
      }
    );

    setIsMonitoring(true);
    console.log('[BLE] Monitoring active - waiting for triggers');
  };

  // Handle incoming trigger notification from ESP32
  const handleTriggerNotification = async (characteristic: Characteristic) => {
    try {
      // Decode base64 value
      const jsonString = atob(characteristic.value || '');
      const triggerData: TriggerData = JSON.parse(jsonString);

      console.log('[TRIGGER] Received from ESP32:', triggerData);
      setLastTrigger(triggerData);

      // Record trigger in Supabase
      await recordTriggerInSupabase(triggerData);
    } catch (error) {
      console.error('[BLE] Error parsing trigger data:', error);
    }
  };

  // Record trigger in Supabase with location and air quality data
  const recordTriggerInSupabase = async (triggerData: TriggerData) => {
    try {
      console.log('[SUPABASE] Recording trigger...');

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[SUPABASE] No user logged in');
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      console.log('[LOCATION] Got coordinates:', latitude, longitude);

      // Fetch air quality data
      const airQualityData = await fetchAirQuality(latitude, longitude);
      console.log('[AIR QUALITY] Fetched data:', airQualityData);

      // Insert into Supabase
      const { data, error } = await supabase
        .from('inhaler_triggers')
        .insert({
          user_id: user.id,
          latitude: latitude,
          longitude: longitude,
          timestamp: new Date().toISOString(),
          aqi: airQualityData.aqi,
          category: airQualityData.category,
          pm25: airQualityData.pm25,
          pm10: airQualityData.pm10,
          temperature: airQualityData.temperature,
          humidity: airQualityData.humidity,
        })
        .select()
        .single();

      if (error) {
        console.error('[SUPABASE] Insert error:', error);
        Alert.alert('Error', 'Failed to record trigger in database');
        return;
      }

      console.log('[SUPABASE] ✓ Trigger recorded successfully!');
      console.log('[SUPABASE] Record ID:', data.id);

      // Show success notification
      Alert.alert(
        'Trigger Recorded',
        `Inhaler use recorded at ${new Date().toLocaleTimeString()}`,
        [{ text: 'OK' }]
      );

      // Decrement inhaler dose counter
      try {
        const { decrementDose } = await import('@/utils/inhalerCounter').then(m => m);
        await decrementDose();
      } catch {}

      // You can emit an event here to refresh the map
      // EventEmitter.emit('triggerRecorded', data);

    } catch (error) {
      console.error('[SUPABASE] Recording error:', error);
      Alert.alert('Error', 'Could not record trigger. Please try again.');
    }
  };

  // Disconnect from device
  const disconnect = async () => {
    if (connectedDevice) {
      try {
        await bleManager.current?.cancelDeviceConnection(connectedDevice.id);
        setConnectedDevice(null);
        setIsMonitoring(false);
        console.log('[BLE] Disconnected from inhaler');
      } catch (error) {
        console.error('[BLE] Disconnect error:', error);
      }
    }
  };

  return {
    connectedDevice,
    isMonitoring,
    lastTrigger,
    connectToInhaler,
    disconnect,
  };
}

// ==================== USAGE EXAMPLE ====================

/*
// In your BluetoothManager.tsx or Dashboard component:

import { useESP32InhalerMonitor } from '@/hooks/useESP32InhalerMonitor';

function YourComponent() {
  const { connectedDevice, isMonitoring, lastTrigger, connectToInhaler, disconnect } = useESP32InhalerMonitor();

  // When user selects "QAir-Inhaler" device from BLE scan:
  const handleDeviceSelect = async (device: Device) => {
    if (device.name === 'QAir-Inhaler') {
      await connectToInhaler(device);
    }
  };

  // Show monitoring status
  return (
    <View>
      <Text>Connected: {connectedDevice ? 'Yes' : 'No'}</Text>
      <Text>Monitoring: {isMonitoring ? 'Active' : 'Inactive'}</Text>
      {lastTrigger && (
        <Text>Last Trigger: FSR={lastTrigger.fsrValue}, Count={lastTrigger.count}</Text>
      )}
    </View>
  );
}
*/

// ==================== INTEGRATION WITH EXISTING BluetoothManager ====================

/*
// Add this to your existing BluetoothManager.tsx connectToDevice function:

const connectToDevice = async (device: BluetoothDevice) => {
  try {
    // ... existing connection code ...

    // Check if this is the QAir-Inhaler ESP32
    if (device.name === 'QAir-Inhaler') {
      console.log('[INHALER] Detected ESP32 inhaler device');
      
      // Start monitoring for triggers
      connectedBleDevice.monitorCharacteristicForService(
        '4fafc201-1fb5-459e-8fcc-c5c9c331914b',  // SERVICE_UUID
        'beb5483e-36e1-4688-b7f5-ea07361b26a8',  // TRIGGER_CHAR_UUID
        async (error, characteristic) => {
          if (error) {
            console.error('[INHALER] Monitoring error:', error);
            return;
          }

          if (characteristic?.value) {
            // Decode trigger data
            const jsonString = atob(characteristic.value);
            const triggerData = JSON.parse(jsonString);
            
            console.log('[INHALER] Trigger received:', triggerData);
            
            // Record in Supabase (use your existing recordTrigger function)
            await handleInhalerTrigger(triggerData);
          }
        }
      );
    }

    // ... rest of existing code ...
  } catch (error) {
    // ... error handling ...
  }
};

// Add this handler function:
const handleInhalerTrigger = async (triggerData: any) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const location = await Location.getCurrentPositionAsync({});
    const airQuality = await fetchAirQuality(location.coords.latitude, location.coords.longitude);

    const { error } = await supabase
      .from('inhaler_triggers')
      .insert({
        user_id: user.id,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: new Date().toISOString(),
        aqi: airQuality.aqi,
        category: airQuality.category,
        pm25: airQuality.pm25,
        pm10: airQuality.pm10,
        temperature: airQuality.temperature,
        humidity: airQuality.humidity,
      });

    if (!error) {
      Alert.alert('Trigger Recorded', 'Inhaler use has been logged');
      // Refresh your trigger list here
    }
  } catch (error) {
    console.error('[INHALER] Recording error:', error);
  }
};
*/
