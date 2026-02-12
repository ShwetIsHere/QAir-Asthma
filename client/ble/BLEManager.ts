/**
 * BLE Manager - Client Layer
 * Handles Bluetooth Low Energy communication with ESP32 inhaler device
 * Responsibilities:
 * - Scan for devices
 * - Connect/disconnect
 * - Receive trigger events
 * - Immediate local storage
 */

import { BleManager, Device, State as BleState, Characteristic } from 'react-native-ble-plx';
import { Alert, Platform, PermissionsAndroid } from 'react-native';
import { localDatabase } from '../database/LocalDatabase';
import * as Location from 'expo-location';
import { fetchAirQuality } from '@/utils/airQuality';

// ESP32 BLE Configuration
const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const TRIGGER_CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
const STATUS_CHAR_UUID = '1c95d5e3-d8f7-413a-bf3d-7a2e5d7be87e';

export interface BLETriggerEvent {
  event: string;
  fsrValue: number;
  timestamp: number;
  count: number;
}

export interface BLEDeviceInfo {
  id: string;
  name: string | null;
  rssi: number | null;
}

interface BLEManagerCallbacks {
  onTriggerReceived?: (trigger: BLETriggerEvent) => void;
  onConnectionStateChange?: (connected: boolean, device?: Device) => void;
  onError?: (error: Error) => void;
}

class BLEManagerClass {
  private manager: BleManager;
  private connectedDevice: Device | null = null;
  private isScanning = false;
  private callbacks: BLEManagerCallbacks = {};

  constructor() {
    this.manager = new BleManager();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Initialize local database
    await localDatabase.initialize();

    // Monitor BLE state
    this.manager.onStateChange((state) => {
      console.log('[BLE] State changed:', state);
      if (state === BleState.PoweredOn) {
        console.log('[BLE] Bluetooth is ready');
      }
    }, true);
  }

  /**
   * Set callbacks for BLE events
   */
  setCallbacks(callbacks: BLEManagerCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Request necessary permissions for BLE
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        if (Platform.Version >= 31) {
          // Android 12+
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ]);

          return (
            granted['android.permission.BLUETOOTH_SCAN'] === 'granted' &&
            granted['android.permission.BLUETOOTH_CONNECT'] === 'granted' &&
            granted['android.permission.ACCESS_FINE_LOCATION'] === 'granted'
          );
        } else {
          // Android < 12
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
          return granted === 'granted';
        }
      }

      // iOS - handled by Info.plist
      return true;
    } catch (error) {
      console.error('[BLE] Permission request error:', error);
      return false;
    }
  }

  /**
   * Scan for BLE devices
   */
  async startScan(
    onDeviceFound: (device: BLEDeviceInfo) => void,
    timeoutMs: number = 10000
  ): Promise<void> {
    if (this.isScanning) {
      console.log('[BLE] Already scanning');
      return;
    }

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      Alert.alert('Permissions Required', 'Bluetooth and location permissions are needed');
      return;
    }

    console.log('[BLE] Starting scan...');
    this.isScanning = true;

    const foundDevices = new Set<string>();

    this.manager.startDeviceScan(
      [SERVICE_UUID], // Filter by service UUID for efficiency
      { allowDuplicates: false },
      (error, device) => {
        if (error) {
          console.error('[BLE] Scan error:', error);
          this.isScanning = false;
          return;
        }

        if (device && !foundDevices.has(device.id)) {
          foundDevices.add(device.id);
          console.log('[BLE] Device found:', device.name || device.id);

          onDeviceFound({
            id: device.id,
            name: device.name,
            rssi: device.rssi,
          });
        }
      }
    );

    // Stop scan after timeout
    setTimeout(() => {
      this.stopScan();
    }, timeoutMs);
  }

  /**
   * Stop scanning
   */
  stopScan(): void {
    if (this.isScanning) {
      this.manager.stopDeviceScan();
      this.isScanning = false;
      console.log('[BLE] Scan stopped');
    }
  }

  /**
   * Connect to a device
   */
  async connect(deviceId: string): Promise<boolean> {
    try {
      console.log('[BLE] Connecting to device:', deviceId);

      // Disconnect if already connected
      if (this.connectedDevice) {
        await this.disconnect();
      }

      // Connect
      const device = await this.manager.connectToDevice(deviceId, {
        autoConnect: false,
        requestMTU: 512,
      });

      console.log('[BLE] Connected, discovering services...');

      // Discover services
      await device.discoverAllServicesAndCharacteristics();

      this.connectedDevice = device;
      this.callbacks.onConnectionStateChange?.(true, device);

      // Start monitoring for triggers
      await this.startMonitoring();

      console.log('[BLE] Device ready:', device.name);
      return true;
    } catch (error) {
      console.error('[BLE] Connection error:', error);
      this.callbacks.onError?.(error as Error);
      this.callbacks.onConnectionStateChange?.(false);
      return false;
    }
  }

  /**
   * Disconnect from device
   */
  async disconnect(): Promise<void> {
    if (this.connectedDevice) {
      try {
        await this.manager.cancelDeviceConnection(this.connectedDevice.id);
        console.log('[BLE] Disconnected from:', this.connectedDevice.name);
      } catch (error) {
        console.error('[BLE] Disconnect error:', error);
      }

      this.connectedDevice = null;
      this.callbacks.onConnectionStateChange?.(false);
    }
  }

  /**
   * Start monitoring for trigger notifications
   */
  private async startMonitoring(): Promise<void> {
    if (!this.connectedDevice) {
      throw new Error('No device connected');
    }

    console.log('[BLE] Starting characteristic monitoring...');

    this.connectedDevice.monitorCharacteristicForService(
      SERVICE_UUID,
      TRIGGER_CHAR_UUID,
      (error, characteristic) => {
        if (error) {
          console.error('[BLE] Monitor error:', error);
          this.callbacks.onError?.(error);
          return;
        }

        if (characteristic?.value) {
          this.handleTriggerNotification(characteristic);
        }
      }
    );

    console.log('[BLE] Monitoring active');
  }

  /**
   * Handle incoming trigger notification from ESP32
   * Immediate local storage pattern
   */
  private async handleTriggerNotification(characteristic: Characteristic): Promise<void> {
    try {
      // Decode Base64 BLE data
      const rawData = Buffer.from(characteristic.value!, 'base64').toString('utf-8');
      console.log('[BLE] Received trigger data:', rawData);

      const triggerData: BLETriggerEvent = JSON.parse(rawData);

      // Immediately store in local SQLite (offline-first)
      await this.storeTriggerLocally(triggerData);

      // Notify callbacks
      this.callbacks.onTriggerReceived?.(triggerData);

      console.log('[BLE] Trigger processed successfully');
    } catch (error) {
      console.error('[BLE] Error processing trigger:', error);
      this.callbacks.onError?.(error as Error);
    }
  }

  /**
   * Store trigger in local database immediately
   * Enriched with location and environmental data
   */
  private async storeTriggerLocally(trigger: BLETriggerEvent): Promise<void> {
    try {
      // Get location (if available)
      let location: { latitude: number; longitude: number } | null = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          location = {
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
          };
        }
      } catch (locError) {
        console.warn('[BLE] Location unavailable:', locError);
      }

      // Get environmental data (if location available)
      let environmentalData: any = null;
      if (location) {
        try {
          environmentalData = await fetchAirQuality(location.latitude, location.longitude);
        } catch (envError) {
          console.warn('[BLE] Environmental data unavailable:', envError);
        }
      }

      // Insert into local database
      const recordId = await localDatabase.insertTrigger({
        trigger_timestamp: new Date(trigger.timestamp).toISOString(),
        fsr_value: trigger.fsrValue,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        aqi: environmentalData?.aqi ?? null,
        temperature: environmentalData?.temperature ?? null,
        humidity: environmentalData?.humidity ?? null,
        weather_condition: environmentalData?.weather ?? null,
        synced: false, // Not yet synced to cloud
        device_id: this.connectedDevice?.id ?? null,
        sync_retry_count: 0,
        last_sync_attempt: null,
      });

      console.log('[BLE] Trigger stored locally with ID:', recordId);
    } catch (error) {
      console.error('[BLE] Error storing trigger locally:', error);
      throw error;
    }
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.connectedDevice !== null;
  }

  /**
   * Get connected device info
   */
  getConnectedDevice(): BLEDeviceInfo | null {
    if (!this.connectedDevice) return null;

    return {
      id: this.connectedDevice.id,
      name: this.connectedDevice.name,
      rssi: null,
    };
  }

  /**
   * Read status characteristic (device info)
   */
  async readDeviceStatus(): Promise<string | null> {
    if (!this.connectedDevice) {
      console.warn('[BLE] No device connected');
      return null;
    }

    try {
      const characteristic = await this.connectedDevice.readCharacteristicForService(
        SERVICE_UUID,
        STATUS_CHAR_UUID
      );

      if (characteristic.value) {
        const status = Buffer.from(characteristic.value, 'base64').toString('utf-8');
        console.log('[BLE] Device status:', status);
        return status;
      }

      return null;
    } catch (error) {
      console.error('[BLE] Error reading device status:', error);
      return null;
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.disconnect();
    this.manager.destroy();
    console.log('[BLE] Manager destroyed');
  }
}

// Export singleton instance
export const BLEManager = new BLEManagerClass();
