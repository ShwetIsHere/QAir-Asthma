import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
  PermissionsAndroid,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { supabase } from '@/utils/supabase';
import { fetchAirQuality } from '@/utils/airQuality';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Lazy import BLE Manager to avoid initialization errors in Expo Go
let BleManager: any = null;
let State: any = null;
let bleManager: any = null;

// Initialize BLE only when needed
const initializeBLE = async () => {
  if (bleManager) return bleManager;
  
  try {
    const BleModule = await import('react-native-ble-plx');
    BleManager = BleModule.BleManager;
    State = BleModule.State;
    bleManager = new BleManager();
    return bleManager;
  } catch (error) {
    // BLE initialization failed - likely in Expo Go
    return null;
  }
};

type BluetoothDevice = {
  id: string;
  name: string;
  rssi?: number;
  isConnected: boolean;
};

type BluetoothManagerProps = {
  onDeviceConnected?: (device: BluetoothDevice) => void;
  onDeviceDisconnected?: () => void;
  onTriggerRecorded?: () => void; // Callback when inhaler trigger is recorded
};

// BLE manager will be initialized lazily via initializeBLE()

export default function BluetoothManager({ 
  onDeviceConnected, 
  onDeviceDisconnected,
  onTriggerRecorded
}: BluetoothManagerProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
  const [availableDevices, setAvailableDevices] = useState<BluetoothDevice[]>([]);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  const [checkingBluetooth, setCheckingBluetooth] = useState(false);
  const [bleDataBuffer, setBleDataBuffer] = useState<string>(''); // Buffer for incomplete BLE data

  // Monitor Bluetooth state changes in real-time
  useEffect(() => {
    let subscription: any = null;
    let isMounted = true;
    let disconnectListener: any = null;

    const setupBLE = async () => {
      if (!isMounted) return;
      
      const manager = await initializeBLE();
      if (!manager) {
        Alert.alert(
          'BLE Not Available',
          'Bluetooth features require a development build. Running in Expo Go mode with limited functionality.',
          [{ text: 'OK' }]
        );
        return;
      }

      subscription = manager.onStateChange((state: any) => {
        if (isMounted) {
          setBluetoothEnabled(state === State.PoweredOn);
        }
      }, true);

      // Check initial state
      if (isMounted) {
        checkBluetoothEnabled();
      }

      // Rehydrate previously connected device state if still connected
      try {
        const saved = await AsyncStorage.getItem('bleConnectedDevice');
        if (saved) {
          const savedDevice: BluetoothDevice = JSON.parse(saved);
          if (savedDevice?.id) {
            const stillConnected = await manager.isDeviceConnected(savedDevice.id);
            if (stillConnected) {
              setConnectedDevice({ ...savedDevice, isConnected: true });
              // Listen for disconnects to keep UI in sync
              disconnectListener = manager.onDeviceDisconnected(savedDevice.id, () => {
                setConnectedDevice(null);
                AsyncStorage.removeItem('bleConnectedDevice').catch(() => {});
                if (onDeviceDisconnected) onDeviceDisconnected();
              });
            } else {
              await AsyncStorage.removeItem('bleConnectedDevice');
            }
          }
        }
      } catch (e) {
        // Failed to rehydrate connection state
      }
    };

    setupBLE();

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.remove();
      }
      if (disconnectListener) {
        disconnectListener.remove?.();
      }
      // Cleanup: Stop any ongoing scans and clear device list
      const cleanup = async () => {
        const manager = await initializeBLE();
        if (manager) {
          manager.stopDeviceScan();
        }
      };
      cleanup();
      setAvailableDevices([]);
      setIsScanning(false);
    };
  }, []);

  // Check if Bluetooth is enabled
  const checkBluetoothEnabled = async (): Promise<boolean> => {
    try {
      const manager = await initializeBLE();
      if (!manager) {
        setBluetoothEnabled(false);
        return false;
      }
      const state = await manager.state();
      const enabled = state === State.PoweredOn;
      setBluetoothEnabled(enabled);
      return enabled;
    } catch (error) {
      // Bluetooth state check error
      setBluetoothEnabled(false);
      return false;
    }
  };

  // Request to enable Bluetooth
  const requestEnableBluetooth = async () => {
    setCheckingBluetooth(true);
    
    const isEnabled = await checkBluetoothEnabled();
    
    if (!isEnabled) {
      Alert.alert(
        'Bluetooth is Off',
        'Please enable Bluetooth to connect to IoT devices. Would you like to open Bluetooth settings?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              setCheckingBluetooth(false);
              setBluetoothEnabled(false);
            },
          },
          {
            text: 'Open Settings',
            onPress: async () => {
              try {
                if (Platform.OS === 'android') {
                  // Open Android Bluetooth settings
                  await Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS');
                } else if (Platform.OS === 'ios') {
                  // Open iOS Settings (can't directly open Bluetooth settings)
                  await Linking.openURL('App-Prefs:Bluetooth');
                }
                
                // Wait a moment for user to enable Bluetooth
                setTimeout(async () => {
                  const enabled = await checkBluetoothEnabled();
                  setBluetoothEnabled(enabled);
                  setCheckingBluetooth(false);
                  
                  if (enabled) {
                    Alert.alert(
                      'Bluetooth Enabled',
                      'You can now scan for nearby devices.',
                      [
                        {
                          text: 'Scan Now',
                          onPress: () => scanForDevices(),
                        },
                      ]
                    );
                  }
                }, 3000);
              } catch (error) {
                // Error opening settings
                setCheckingBluetooth(false);
                Alert.alert(
                  'Error',
                  'Could not open Bluetooth settings. Please enable Bluetooth manually in your device settings.'
                );
              }
            },
          },
        ]
      );
    } else {
      setBluetoothEnabled(true);
      setCheckingBluetooth(false);
    }
    
    return isEnabled;
  };

  // Request Bluetooth permissions (Android)
  const requestBluetoothPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
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
          // Android 11 and below - use location permission only
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
          
          return granted === 'granted';
        }
      } catch (err) {
        // Bluetooth permission error
        return false;
      }
    }
    return true; // iOS handles permissions differently
  };

  // Scan for nearby Bluetooth devices
  const scanForDevices = async () => {
    // First check if Bluetooth is enabled
    const isEnabled = await requestEnableBluetooth();
    
    if (!isEnabled) {
      return; // User will be prompted to enable Bluetooth
    }
    
    // Check permissions
    const hasPermissions = await requestBluetoothPermissions();
    
    if (!hasPermissions) {
      Alert.alert(
        'Permissions Required',
        'Please enable Bluetooth and Location permissions to scan for devices.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsScanning(true);
    setAvailableDevices([]); // Clear previous devices

    try {
      // Start real BLE scanning
      const manager = await initializeBLE();
      if (!manager) {
        setIsScanning(false);
        Alert.alert('BLE Not Available', 'Bluetooth features require a development build.');
        return;
      }
      
      // Keep track of discovered devices to avoid duplicates
      const discoveredDevices = new Map<string, BluetoothDevice>();
      
      manager.startDeviceScan(
        null, // null = scan for all devices
        { allowDuplicates: false }, // don't report same device multiple times
        (error: any, device: any) => {
          if (error) {
            // Scan error handled silently
            setIsScanning(false);
            Alert.alert('Scan Error', 'Failed to scan for devices. Please try again.');
            return;
          }

          if (device) {
            // Use device name or ID as fallback
            const deviceName = device.name || device.localName || `Unknown Device (${device.id.slice(0, 8)}...)`;
            
            const newDevice: BluetoothDevice = {
              id: device.id,
              name: deviceName,
              rssi: device.rssi || undefined,
              isConnected: false,
            };

            // Add to map to avoid duplicates
            discoveredDevices.set(device.id, newDevice);
            
            // Update state with all discovered devices
            setAvailableDevices(Array.from(discoveredDevices.values()));
          }
        }
      );

      // Stop scanning after 10 seconds and cleanup
      setTimeout(async () => {
        const manager = await initializeBLE();
        if (manager) {
          manager.stopDeviceScan();
        }
        setIsScanning(false);
        // Clear the devices map to free memory
        discoveredDevices.clear();
      }, 10000);
    } catch (error) {
      // Scan startup error handled silently
      setIsScanning(false);
      Alert.alert('Error', 'Failed to start Bluetooth scan.');
    }
  };

  // Connect to a device
  const connectToDevice = async (device: BluetoothDevice) => {
    try {
      setIsScanning(true);

      const manager = await initializeBLE();
      if (!manager) {
        setIsScanning(false);
        Alert.alert('BLE Not Available', 'Bluetooth features require a development build.');
        return;
      }
      
      // Stop scanning before connecting
      manager.stopDeviceScan();
      
      // Connect to the BLE device
      const connectedBleDevice = await manager.connectToDevice(device.id);
      
      // Discover all services and characteristics
      await connectedBleDevice.discoverAllServicesAndCharacteristics();
      
      // Monitor ESP32 Inhaler Triggers
      if (device.name === 'QAir-Inhaler' || device.name?.includes('QAir')) {
        connectedBleDevice.monitorCharacteristicForService(
          '4fafc201-1fb5-459e-8fcc-c5c9c331914b', // SERVICE_UUID
          'beb5483e-36e1-4688-b7f5-ea07361b26a8', // TRIGGER_CHAR_UUID
          async (error: any, characteristic: any) => {
            if (error) {
              // BLE monitoring error handled silently
              return;
            }
            
            if (characteristic?.value) {
              try {
                // Decode base64 BLE data
                const base64Data = characteristic.value;
                const decodedData = atob(base64Data);
                
                // Parse short format: "T,fsrValue,count" (e.g., "T,856,1")
                const parts = decodedData.split(',');
                
                if (parts[0] === 'T' && parts.length === 3) {
                  const triggerData = {
                    event: 'trigger',
                    fsrValue: parseInt(parts[1]),
                    count: parseInt(parts[2])
                  };
                  
                  // Record trigger with location and air quality
                  await recordInhalerTrigger(triggerData);
                }
              } catch (e) {
                // BLE data processing error handled silently
              }
            }
          }
        );
      }
      
      const connectedDeviceData: BluetoothDevice = {
        ...device,
        isConnected: true,
      };
      
      setConnectedDevice(connectedDeviceData);
      // Persist connection so other screens can reflect status
      try {
        await AsyncStorage.setItem('bleConnectedDevice', JSON.stringify({ id: connectedDeviceData.id, name: connectedDeviceData.name, rssi: connectedDeviceData.rssi, isConnected: true }));
      } catch {}

      // Subscribe for disconnect to keep state/storage in sync
      try {
        manager.onDeviceDisconnected(device.id, () => {
          setConnectedDevice(null);
          AsyncStorage.removeItem('bleConnectedDevice').catch(() => {});
          if (onDeviceDisconnected) onDeviceDisconnected();
        });
      } catch {}
      setIsModalVisible(false);
      setIsScanning(false);
      
      Alert.alert(
        'Connected',
        `Successfully connected to ${device.name}`,
        [{ text: 'OK' }]
      );
      
      if (onDeviceConnected) {
        onDeviceConnected(connectedDeviceData);
      }
    } catch (error) {
      // Connection error handled silently
      setIsScanning(false);
      Alert.alert(
        'Connection Failed',
        `Could not connect to ${device.name}. Please make sure the device is in pairing mode and try again.`,
        [{ text: 'OK' }]
      );
    }
  };

  // Record inhaler trigger in Supabase with location and air quality
  const recordInhalerTrigger = async (triggerData: any) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please log in to record inhaler usage');
        return;
      }
      
      // Get GPS location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please enable location to record inhaler usage');
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      
      // Fetch air quality data
      const airQuality = await fetchAirQuality(latitude, longitude);
      
      // Insert into Supabase
      const { data, error } = await supabase
        .from('inhaler_triggers')
        .insert({
          user_id: user.id,
          latitude,
          longitude,
          timestamp: new Date().toISOString(),
          aqi: airQuality.aqi,
          category: airQuality.category,
          pm25: airQuality.pm25,
          pm10: airQuality.pm10,
          temperature: airQuality.temperature,
          humidity: airQuality.humidity,
        });
      
      if (error) {
        Alert.alert('Error', 'Failed to record inhaler usage');
        return;
      }
      
      Alert.alert(
        'Inhaler Use Recorded',
        `Trigger #${triggerData.count} recorded at ${airQuality.category} air quality (AQI: ${airQuality.aqi})`
      );

      // Decrement inhaler dose counter
      try {
        const { decrementDose } = await import('@/utils/inhalerCounter').then(m => m);
        await decrementDose();
      } catch {}
      
      // Notify parent component to refresh dashboard
      if (onTriggerRecorded) {
        onTriggerRecorded();
      }
    } catch (error) {
      // Trigger recording error handled silently
      Alert.alert('Error', 'Failed to record inhaler usage');
    }
  };

  // Disconnect from device
  const disconnectDevice = () => {
    Alert.alert(
      'Disconnect Device',
      `Are you sure you want to disconnect from ${connectedDevice?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              if (connectedDevice) {
                const manager = await initializeBLE();
                if (manager) {
                  await manager.cancelDeviceConnection(connectedDevice.id);
                }
              }
              
              setConnectedDevice(null);
              try { await AsyncStorage.removeItem('bleConnectedDevice'); } catch {}
              
              if (onDeviceDisconnected) {
                onDeviceDisconnected();
              }
              
              Alert.alert('Disconnected', 'Device has been disconnected.');
            } catch (error) {
              // Disconnect error handled
              // Still clear the connection even if there's an error
              setConnectedDevice(null);
              if (onDeviceDisconnected) {
                onDeviceDisconnected();
              }
            }
          },
        },
      ]
    );
  };

  // Open modal and start scanning
  const openDeviceList = async () => {
    setIsModalVisible(true);
    
    // Check Bluetooth status before scanning
    const isEnabled = await requestEnableBluetooth();
    
    if (isEnabled) {
      scanForDevices();
    }
  };

  // Get signal strength indicator
  const getSignalStrength = (rssi?: number): { color: string; bars: number } => {
    if (!rssi) return { color: '#9CA3AF', bars: 1 };
    
    if (rssi > -50) return { color: '#10B981', bars: 4 };
    if (rssi > -60) return { color: '#10B981', bars: 3 };
    if (rssi > -70) return { color: '#F59E0B', bars: 2 };
    return { color: '#EF4444', bars: 1 };
  };

  const renderDeviceItem = ({ item }: { item: BluetoothDevice }) => {
    const signal = getSignalStrength(item.rssi);
    
    return (
      <TouchableOpacity
        style={styles.deviceItem}
        onPress={() => connectToDevice(item)}
        disabled={isScanning}
      >
        <View style={styles.deviceIcon}>
          <Ionicons name="bluetooth" size={24} color="#6366F1" />
        </View>
        
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>{item.name}</Text>
          <Text style={styles.deviceId}>ID: {item.id}</Text>
        </View>
        
        <View style={styles.signalContainer}>
          <View style={styles.signalBars}>
            {[1, 2, 3, 4].map((bar) => (
              <View
                key={bar}
                style={[
                  styles.signalBar,
                  {
                    height: bar * 4,
                    backgroundColor: bar <= signal.bars ? signal.color : '#E5E7EB',
                  },
                ]}
              />
            ))}
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Connection Status Table */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Ionicons 
            name={connectedDevice ? "bluetooth" : "bluetooth-outline"} 
            size={24} 
            color={connectedDevice ? "#10B981" : "#9CA3AF"} 
          />
          <Text style={styles.statusTitle}>IoT Device Status</Text>
        </View>
        
        <View style={styles.statusTable}>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Bluetooth:</Text>
            <View style={styles.statusBadge}>
              <View 
                style={[
                  styles.statusDot, 
                  { backgroundColor: bluetoothEnabled ? '#10B981' : '#F59E0B' }
                ]} 
              />
              <Text 
                style={[
                  styles.statusText, 
                  { color: bluetoothEnabled ? '#10B981' : '#F59E0B' }
                ]}
              >
                {checkingBluetooth ? 'Checking...' : bluetoothEnabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>
          
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Status:</Text>
            <View style={styles.statusBadge}>
              <View 
                style={[
                  styles.statusDot, 
                  { backgroundColor: connectedDevice ? '#10B981' : '#EF4444' }
                ]} 
              />
              <Text 
                style={[
                  styles.statusText, 
                  { color: connectedDevice ? '#10B981' : '#EF4444' }
                ]}
              >
                {connectedDevice ? 'Connected' : 'Not-Connected'}
              </Text>
            </View>
          </View>
          
          {connectedDevice && (
            <>
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Device:</Text>
                <Text style={styles.tableValue}>{connectedDevice.name}</Text>
              </View>
              
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Device ID:</Text>
                <Text style={styles.tableValue}>{connectedDevice.id}</Text>
              </View>
              
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Signal:</Text>
                <Text style={styles.tableValue}>
                  {connectedDevice.rssi ? `${connectedDevice.rssi} dBm` : 'N/A'}
                </Text>
              </View>
            </>
          )}
        </View>
        
        <TouchableOpacity
          style={[
            styles.actionButton,
            connectedDevice ? styles.disconnectButton : styles.connectButton,
          ]}
          onPress={connectedDevice ? disconnectDevice : openDeviceList}
          disabled={checkingBluetooth}
        >
          {checkingBluetooth ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons 
              name={connectedDevice ? "close-circle" : bluetoothEnabled ? "search" : "power"} 
              size={20} 
              color="white" 
            />
          )}
          <Text style={styles.actionButtonText}>
            {checkingBluetooth 
              ? 'Checking Bluetooth...' 
              : connectedDevice 
                ? 'Disconnect Device' 
                : bluetoothEnabled 
                  ? 'Find Nearby Devices' 
                  : 'Enable Bluetooth & Scan'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Device List Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Nearby Devices</Text>
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </LinearGradient>

            {/* Scanning Indicator */}
            {isScanning && (
              <View style={styles.scanningContainer}>
                <ActivityIndicator size="small" color="#6366F1" />
                <Text style={styles.scanningText}>Scanning...</Text>
              </View>
            )}

            {/* Bluetooth Checking Indicator */}
            {checkingBluetooth && (
              <View style={styles.bluetoothCheckContainer}>
                <Ionicons name="bluetooth" size={40} color="#6366F1" />
                <Text style={styles.bluetoothCheckText}>Checking Bluetooth...</Text>
              </View>
            )}

            {/* Bluetooth Disabled Warning */}
            {!bluetoothEnabled && !checkingBluetooth && (
              <View style={styles.bluetoothDisabledContainer}>
                <Ionicons name="warning" size={40} color="#F59E0B" />
                <Text style={styles.bluetoothDisabledText}>Bluetooth is Disabled</Text>
                <TouchableOpacity
                  style={styles.enableBluetoothButton}
                  onPress={async () => {
                    setIsModalVisible(false);
                    await requestEnableBluetooth();
                    if (bluetoothEnabled) {
                      setIsModalVisible(true);
                      scanForDevices();
                    }
                  }}
                >
                  <Ionicons name="power" size={18} color="white" />
                  <Text style={styles.enableBluetoothButtonText}>Enable Bluetooth</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Device List */}
            {bluetoothEnabled && !checkingBluetooth && (
              <>
                {availableDevices.length > 0 ? (
                  <FlatList
                    data={availableDevices}
                    renderItem={renderDeviceItem}
                    keyExtractor={(item) => item.id}
                    style={styles.deviceList}
                    contentContainerStyle={styles.deviceListContent}
                    showsVerticalScrollIndicator={true}
                  />
                ) : !isScanning ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="bluetooth-outline" size={48} color="#D1D5DB" />
                    <Text style={styles.emptyText}>No devices found</Text>
                    <Text style={styles.emptySubtext}>
                      Turn on your device's Bluetooth
                    </Text>
                  </View>
                ) : null}
              </>
            )}

            {/* Rescan Button */}
            {bluetoothEnabled && !checkingBluetooth && (
              <TouchableOpacity
                style={styles.rescanButton}
                onPress={scanForDevices}
                disabled={isScanning}
              >
                <Ionicons name="refresh" size={18} color="#6366F1" />
                <Text style={styles.rescanButtonText}>Rescan</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 15,
  },
  statusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E7F1FF',
    marginLeft: 10,
  },
  statusTable: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  tableLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A9B7CC',
  },
  tableValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E7F1FF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  connectButton: {
    backgroundColor: '#6366F1',
  },
  disconnectButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    paddingBottom: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#E7F1FF',
  },
  closeButton: {
    padding: 4,
  },
  scanningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 10,
  },
  scanningText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#818CF8',
    fontWeight: '600',
  },
  deviceList: {
    flexGrow: 1,
    width: '100%',
  },
  deviceListContent: {
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 10,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  deviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E7F1FF',
    marginBottom: 3,
  },
  deviceId: {
    fontSize: 11,
    color: '#A9B7CC',
  },
  signalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signalBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  signalBar: {
    width: 3,
    borderRadius: 2,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 30,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#A9B7CC',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  rescanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#6366F1',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    gap: 6,
  },
  rescanButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#818CF8',
  },
  bluetoothCheckContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  bluetoothCheckText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#818CF8',
    marginTop: 16,
  },
  bluetoothCheckSubtext: {
    fontSize: 14,
    color: '#A9B7CC',
    textAlign: 'center',
    marginTop: 8,
  },
  bluetoothDisabledContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  bluetoothDisabledText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFA500',
    marginTop: 12,
  },
  bluetoothDisabledSubtext: {
    fontSize: 13,
    color: '#A9B7CC',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  enableBluetoothButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  enableBluetoothButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});
