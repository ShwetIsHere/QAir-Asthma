/**
 * Enhanced BLE Inhaler Monitor Hook
 * Integrates all client layer services following the architecture
 */

import { useEffect, useState, useCallback } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import {
  BLEManager,
  BackgroundSyncService,
  RealtimeService,
  localDatabase,
  BLETriggerEvent,
  BLEDeviceInfo,
  RiskAlert,
  SyncStatus,
  TriggerRecord,
} from '@/client';

export interface UseInhalerMonitorReturn {
  // BLE
  isScanning: boolean;
  connectedDevice: BLEDeviceInfo | null;
  startScan: (timeoutMs?: number) => Promise<void>;
  stopScan: () => void;
  connect: (deviceId: string) => Promise<boolean>;
  disconnect: () => Promise<void>;
  
  // Data
  recentTriggers: TriggerRecord[];
  lastTrigger: BLETriggerEvent | null;
  triggerStats: {
    total: number;
    today: number;
    unsynced: number;
    failedSyncs: number;
  };
  
  // Sync
  syncStatus: SyncStatus;
  syncNow: () => Promise<void>;
  
  // Alerts
  unreadAlerts: number;
  recentAlerts: RiskAlert[];
  markAlertAsRead: (alertId: number) => Promise<void>;
  
  // Status
  isRealtimeConnected: boolean;
}

export function useInhalerMonitor(): UseInhalerMonitorReturn {
  // BLE State
  const [isScanning, setIsScanning] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<BLEDeviceInfo | null>(null);
  const [lastTrigger, setLastTrigger] = useState<BLETriggerEvent | null>(null);
  
  // Data State
  const [recentTriggers, setRecentTriggers] = useState<TriggerRecord[]>([]);
  const [triggerStats, setTriggerStats] = useState({
    total: 0,
    today: 0,
    unsynced: 0,
    failedSyncs: 0,
  });
  
  // Sync State
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isRunning: false,
    lastSyncTime: null,
    pendingCount: 0,
    failedCount: 0,
    totalSynced: 0,
  });
  
  // Alerts State
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [recentAlerts, setRecentAlerts] = useState<RiskAlert[]>([]);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  /**
   * Initialize all services
   */
  useEffect(() => {
    const initializeServices = async () => {
      try {
        console.log('[Hook] Initializing services...');

        // Initialize local database
        await localDatabase.initialize();

        // Initialize Background Sync Service
        await BackgroundSyncService.initialize();

        // Initialize Realtime Service
        await RealtimeService.initialize();
        await RealtimeService.subscribeToAlerts();
        await RealtimeService.subscribeToTriggers();

        // Setup BLE callbacks
        BLEManager.setCallbacks({
          onTriggerReceived: handleTriggerReceived,
          onConnectionStateChange: handleConnectionStateChange,
          onError: handleBLEError,
        });

        // Setup Realtime callbacks
        RealtimeService.setCallbacks({
          onRiskAlert: handleRiskAlert,
          onTriggerUpdate: handleTriggerUpdate,
          onConnectionChange: setIsRealtimeConnected,
          onError: (error) => console.error('[Hook] Realtime error:', error),
        });

        // Setup Sync callbacks
        const unsubscribe = BackgroundSyncService.onStatusChange(setSyncStatus);

        // Load initial data
        await loadInitialData();

        console.log('[Hook] Services initialized');

        return unsubscribe;
      } catch (error) {
        console.error('[Hook] Initialization error:', error);
        Alert.alert('Initialization Error', 'Failed to initialize services');
      }
    };

    const unsubscribe = initializeServices();

    return () => {
      // Cleanup
      unsubscribe?.then((unsub) => unsub?.());
      RealtimeService.cleanup();
    };
  }, []);

  /**
   * Load initial data
   */
  const loadInitialData = async () => {
    try {
      // Load recent triggers
      const triggers = await localDatabase.getRecentTriggers(50);
      setRecentTriggers(triggers);

      // Load trigger stats
      const stats = await localDatabase.getTriggerStats();
      setTriggerStats(stats);

      // Load unread alerts count
      const unreadCount = await RealtimeService.getUnreadAlertsCount();
      setUnreadAlerts(unreadCount);

      // Load recent alerts
      const alerts = await RealtimeService.getRecentAlerts(20);
      setRecentAlerts(alerts);

      // Get sync status
      const currentSyncStatus = BackgroundSyncService.getStatus();
      setSyncStatus(currentSyncStatus);
    } catch (error) {
      console.error('[Hook] Error loading initial data:', error);
    }
  };

  /**
   * Refresh data (call after updates)
   */
  const refreshData = useCallback(async () => {
    await loadInitialData();
  }, []);

  // ==================== BLE HANDLERS ====================

  const handleTriggerReceived = useCallback(
    async (trigger: BLETriggerEvent) => {
      console.log('[Hook] Trigger received:', trigger);
      setLastTrigger(trigger);

      // Refresh data to show new trigger
      await refreshData();

      // Show alert
      Alert.alert(
        'Inhaler Use Detected',
        `FSR Value: ${trigger.fsrValue}\nTimestamp: ${new Date(trigger.timestamp).toLocaleString()}`,
        [{ text: 'OK' }]
      );
    },
    [refreshData]
  );

  const handleConnectionStateChange = useCallback(
    (connected: boolean, device?: any) => {
      if (connected && device) {
        setConnectedDevice({
          id: device.id,
          name: device.name,
          rssi: null,
        });
      } else {
        setConnectedDevice(null);
      }
    },
    []
  );

  const handleBLEError = useCallback((error: Error) => {
    console.error('[Hook] BLE Error:', error);
    Alert.alert('BLE Error', error.message);
  }, []);

  // ==================== REALTIME HANDLERS ====================

  const handleRiskAlert = useCallback(
    async (alert: RiskAlert) => {
      console.log('[Hook] Risk alert received:', alert);

      // Update unread count
      const count = await RealtimeService.getUnreadAlertsCount();
      setUnreadAlerts(count);

      // Add to recent alerts
      setRecentAlerts((prev) => [alert, ...prev].slice(0, 20));

      // Show critical alerts immediately
      if (alert.risk_level === 'critical' || alert.risk_level === 'high') {
        Alert.alert(
          `${alert.risk_level.toUpperCase()} Risk Alert`,
          alert.alert_message,
          [{ text: 'OK' }]
        );
      }
    },
    []
  );

  const handleTriggerUpdate = useCallback(
    async (trigger: any) => {
      console.log('[Hook] Trigger update received:', trigger);
      await refreshData();
    },
    [refreshData]
  );

  // ==================== BLE METHODS ====================

  const startScan = useCallback(async (timeoutMs: number = 10000) => {
    setIsScanning(true);

    const foundDevices: BLEDeviceInfo[] = [];

    await BLEManager.startScan(
      (device) => {
        console.log('[Hook] Device found:', device.name);
        foundDevices.push(device);
      },
      timeoutMs
    );

    setIsScanning(false);

    // Show device selection if devices found
    if (foundDevices.length > 0) {
      Alert.alert(
        'Devices Found',
        `Found ${foundDevices.length} device(s). Connect to the first one?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Connect',
            onPress: () => connect(foundDevices[0].id),
          },
        ]
      );
    } else {
      Alert.alert('No Devices', 'No inhaler devices found nearby');
    }
  }, []);

  const stopScan = useCallback(() => {
    BLEManager.stopScan();
    setIsScanning(false);
  }, []);

  const connect = useCallback(async (deviceId: string) => {
    const success = await BLEManager.connect(deviceId);
    if (success) {
      Alert.alert('Connected', 'Successfully connected to inhaler device');
    }
    return success;
  }, []);

  const disconnect = useCallback(async () => {
    await BLEManager.disconnect();
    Alert.alert('Disconnected', 'Inhaler device disconnected');
  }, []);

  // ==================== SYNC METHODS ====================

  const syncNow = useCallback(async () => {
    await BackgroundSyncService.syncNow();
    await refreshData();
  }, [refreshData]);

  // ==================== ALERT METHODS ====================

  const markAlertAsRead = useCallback(async (alertId: number) => {
    await RealtimeService.markAlertAsRead(alertId);
    
    // Update local state
    setRecentAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId ? { ...alert, is_read: true } : alert
      )
    );
    
    // Update unread count
    const count = await RealtimeService.getUnreadAlertsCount();
    setUnreadAlerts(count);
  }, []);

  // ==================== APP STATE HANDLING ====================

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Refresh data when app becomes active
        refreshData();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refreshData]);

  return {
    // BLE
    isScanning,
    connectedDevice,
    startScan,
    stopScan,
    connect,
    disconnect,
    
    // Data
    recentTriggers,
    lastTrigger,
    triggerStats,
    
    // Sync
    syncStatus,
    syncNow,
    
    // Alerts
    unreadAlerts,
    recentAlerts,
    markAlertAsRead,
    
    // Status
    isRealtimeConnected,
  };
}
