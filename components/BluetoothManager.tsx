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
    console.warn('BLE not available:', error);
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
};

// BLE manager will be initialized lazily via initializeBLE()

export default function BluetoothManager({ 
  onDeviceConnected, 
  onDeviceDisconnected 
}: BluetoothManagerProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
  const [availableDevices, setAvailableDevices] = useState<BluetoothDevice[]>([]);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  const [checkingBluetooth, setCheckingBluetooth] = useState(false);

  // Monitor Bluetooth state changes in real-time
  useEffect(() => {
    let subscription: any = null;

    const setupBLE = async () => {
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
        setBluetoothEnabled(state === State.PoweredOn);
      }, true);

      // Check initial state
      checkBluetoothEnabled();
    };

    setupBLE();

    return () => {
      if (subscription) {
        subscription.remove();
      }
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
      console.error('Error checking Bluetooth state:', error);
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
                console.error('Error opening settings:', error);
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
        console.warn('Bluetooth permission error:', err);
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
    setAvailableDevices([]);

    try {
      // Start real BLE scanning
      console.log('Starting BLE scan...');

      const manager = await initializeBLE();
      if (!manager) {
        setIsScanning(false);
        Alert.alert('BLE Not Available', 'Bluetooth features require a development build.');
        return;
      }
      
      manager.startDeviceScan(
        null, // null = scan for all devices
        { allowDuplicates: false }, // don't report same device multiple times
        (error: any, device: any) => {
          if (error) {
            console.error('Scan error:', error);
            setIsScanning(false);
            Alert.alert('Scan Error', 'Failed to scan for devices. Please try again.');
            return;
          }

          if (device && device.name) {
            console.log('Found device:', device.name, device.id);
            
            const newDevice: BluetoothDevice = {
              id: device.id,
              name: device.name,
              rssi: device.rssi || undefined,
              isConnected: false,
            };

            setAvailableDevices(prevDevices => {
              // Avoid duplicates
              if (prevDevices.find(d => d.id === newDevice.id)) {
                return prevDevices;
              }
              return [...prevDevices, newDevice];
            });
          }
        }
      );

      // Stop scanning after 10 seconds
      setTimeout(async () => {
        console.log('Stopping BLE scan...');
        const manager = await initializeBLE();
        if (manager) {
          manager.stopDeviceScan();
        }
        setIsScanning(false);
      }, 10000);
    } catch (error) {
      console.error('Error starting scan:', error);
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
      
      console.log('Connecting to device:', device.name);
      
      // Connect to the BLE device
      const connectedBleDevice = await manager.connectToDevice(device.id);
      console.log('Connected! Discovering services...');
      
      // Discover all services and characteristics
      await connectedBleDevice.discoverAllServicesAndCharacteristics();
      console.log('Services discovered');
      
      const connectedDeviceData: BluetoothDevice = {
        ...device,
        isConnected: true,
      };
      
      setConnectedDevice(connectedDeviceData);
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
      console.error('Connection error:', error);
      setIsScanning(false);
      Alert.alert(
        'Connection Failed',
        `Could not connect to ${device.name}. Please make sure the device is in pairing mode and try again.`,
        [{ text: 'OK' }]
      );
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
                console.log('Disconnecting from:', connectedDevice.name);
                const manager = await initializeBLE();
                if (manager) {
                  await manager.cancelDeviceConnection(connectedDevice.id);
                  console.log('Disconnected successfully');
                }
              }
              
              setConnectedDevice(null);
              
              if (onDeviceDisconnected) {
                onDeviceDisconnected();
              }
              
              Alert.alert('Disconnected', 'Device has been disconnected.');
            } catch (error) {
              console.error('Disconnect error:', error);
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
              <Text style={styles.modalTitle}>Available Bluetooth Devices</Text>
              <TouchableOpacity
                onPress={() => setIsModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={28} color="white" />
              </TouchableOpacity>
            </LinearGradient>

            {/* Scanning Indicator */}
            {isScanning && (
              <View style={styles.scanningContainer}>
                <ActivityIndicator size="small" color="#6366F1" />
                <Text style={styles.scanningText}>Scanning for devices...</Text>
              </View>
            )}

            {/* Bluetooth Checking Indicator */}
            {checkingBluetooth && (
              <View style={styles.bluetoothCheckContainer}>
                <Ionicons name="bluetooth" size={48} color="#6366F1" />
                <Text style={styles.bluetoothCheckText}>Checking Bluetooth status...</Text>
                <Text style={styles.bluetoothCheckSubtext}>
                  Please wait while we verify your Bluetooth connection
                </Text>
              </View>
            )}

            {/* Bluetooth Disabled Warning */}
            {!bluetoothEnabled && !checkingBluetooth && (
              <View style={styles.bluetoothDisabledContainer}>
                <Ionicons name="warning" size={48} color="#F59E0B" />
                <Text style={styles.bluetoothDisabledText}>Bluetooth is Disabled</Text>
                <Text style={styles.bluetoothDisabledSubtext}>
                  Please enable Bluetooth to scan for nearby IoT devices
                </Text>
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
                  <Ionicons name="power" size={20} color="white" />
                  <Text style={styles.enableBluetoothButtonText}>Enable Bluetooth</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Device List */}
            {!checkingBluetooth && bluetoothEnabled && availableDevices.length > 0 ? (
              <FlatList
                data={availableDevices}
                renderItem={renderDeviceItem}
                keyExtractor={(item) => item.id}
                style={styles.deviceList}
                contentContainerStyle={styles.deviceListContent}
              />
            ) : (
              !isScanning && (
                <View style={styles.emptyState}>
                  <Ionicons name="bluetooth-outline" size={64} color="#D1D5DB" />
                  <Text style={styles.emptyText}>No devices found</Text>
                  <Text style={styles.emptySubtext}>
                    Make sure your IoT device is powered on and in pairing mode
                  </Text>
                </View>
              )
            )}

            {/* Rescan Button */}
            <TouchableOpacity
              style={styles.rescanButton}
              onPress={scanForDevices}
              disabled={isScanning}
            >
              <Ionicons name="refresh" size={20} color="#6366F1" />
              <Text style={styles.rescanButtonText}>Rescan</Text>
            </TouchableOpacity>
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
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 10,
  },
  statusTable: {
    backgroundColor: '#F9FAFB',
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
    borderBottomColor: '#E5E7EB',
  },
  tableLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tableValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  closeButton: {
    padding: 4,
  },
  scanningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: '#EEF2FF',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 12,
  },
  scanningText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  deviceList: {
    flex: 1,
  },
  deviceListContent: {
    padding: 20,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  deviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 12,
    color: '#9CA3AF',
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  rescanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366F1',
    backgroundColor: 'white',
    gap: 8,
  },
  rescanButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6366F1',
  },
  bluetoothCheckContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  bluetoothCheckText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6366F1',
    marginTop: 16,
  },
  bluetoothCheckSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  bluetoothDisabledContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  bluetoothDisabledText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F59E0B',
    marginTop: 16,
  },
  bluetoothDisabledSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  enableBluetoothButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  enableBluetoothButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});
