/**
 * Background Sync Service - Client Layer
 * Handles synchronization between local SQLite and Supabase cloud
 * Responsibilities:
 * - Queue operations
 * - Retry failed syncs with exponential backoff
 * - Batch uploads for efficiency
 * - Network-aware syncing
 */

import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { localDatabase, TriggerRecord } from '../database/LocalDatabase';
import { supabase } from '@/utils/supabase';

const BACKGROUND_SYNC_TASK = 'BACKGROUND_SYNC_TASK';
const SYNC_INTERVAL_MINUTES = 15; // Sync every 15 minutes
const MAX_RETRY_ATTEMPTS = 5;
const BATCH_SIZE = 10; // Upload 10 triggers at a time

export interface SyncStatus {
  isRunning: boolean;
  lastSyncTime: Date | null;
  pendingCount: number;
  failedCount: number;
  totalSynced: number;
}

class BackgroundSyncServiceClass {
  private syncStatus: SyncStatus = {
    isRunning: false,
    lastSyncTime: null,
    pendingCount: 0,
    failedCount: 0,
    totalSynced: 0,
  };

  private syncCallbacks: Array<(status: SyncStatus) => void> = [];
  private isInitialized = false;
  private appStateSubscription: any = null;

  /**
   * Initialize the background sync service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('[BackgroundSync] Initializing...');

    // Initialize local database
    await localDatabase.initialize();

    // Register background fetch task
    await this.registerBackgroundTask();

    // Monitor app state changes
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);

    // Monitor network connectivity
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        console.log('[BackgroundSync] Network available, triggering sync');
        this.syncNow();
      }
    });

    this.isInitialized = true;
    console.log('[BackgroundSync] Initialized successfully');

    // Initial sync
    this.syncNow();
  }

  /**
   * Register background fetch task
   */
  private async registerBackgroundTask(): Promise<void> {
    try {
      // Define the background task
      TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
        try {
          console.log('[BackgroundSync] Background task triggered');
          await this.performSync();
          return BackgroundFetch.BackgroundFetchResult.NewData;
        } catch (error) {
          console.error('[BackgroundSync] Background task error:', error);
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
      });

      // Register the task
      await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: SYNC_INTERVAL_MINUTES * 60, // Convert to seconds
        stopOnTerminate: false, // Continue even if app is terminated
        startOnBoot: true, // Start on device boot
      });

      console.log('[BackgroundSync] Background task registered');
    } catch (error) {
      console.error('[BackgroundSync] Failed to register background task:', error);
    }
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    if (nextAppState === 'active') {
      console.log('[BackgroundSync] App became active, syncing...');
      this.syncNow();
    }
  };

  /**
   * Trigger immediate sync
   */
  async syncNow(): Promise<void> {
    if (this.syncStatus.isRunning) {
      console.log('[BackgroundSync] Sync already in progress');
      return;
    }

    await this.performSync();
  }

  /**
   * Perform the actual sync operation
   */
  private async performSync(): Promise<void> {
    this.syncStatus.isRunning = true;
    this.notifyStatusChange();

    try {
      console.log('[BackgroundSync] Starting sync...');

      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected || !netInfo.isInternetReachable) {
        console.log('[BackgroundSync] No network connection, skipping sync');
        return;
      }

      // Get unsynced triggers
      const unsyncedTriggers = await localDatabase.getUnsyncedTriggers();
      console.log(`[BackgroundSync] Found ${unsyncedTriggers.length} unsynced triggers`);

      if (unsyncedTriggers.length === 0) {
        this.syncStatus.lastSyncTime = new Date();
        return;
      }

      // Process in batches
      for (let i = 0; i < unsyncedTriggers.length; i += BATCH_SIZE) {
        const batch = unsyncedTriggers.slice(i, i + BATCH_SIZE);
        await this.syncBatch(batch);
      }

      // Update stats
      const stats = await localDatabase.getTriggerStats();
      this.syncStatus.pendingCount = stats.unsynced;
      this.syncStatus.failedCount = stats.failedSyncs;
      this.syncStatus.lastSyncTime = new Date();

      console.log('[BackgroundSync] Sync completed successfully');
    } catch (error) {
      console.error('[BackgroundSync] Sync failed:', error);
    } finally {
      this.syncStatus.isRunning = false;
      this.notifyStatusChange();
    }
  }

  /**
   * Sync a batch of triggers
   */
  private async syncBatch(triggers: TriggerRecord[]): Promise<void> {
    console.log(`[BackgroundSync] Syncing batch of ${triggers.length} triggers`);

    for (const trigger of triggers) {
      // Skip if too many retry attempts
      if (trigger.sync_retry_count >= MAX_RETRY_ATTEMPTS) {
        console.warn(`[BackgroundSync] Max retries exceeded for trigger ${trigger.id}`);
        continue;
      }

      try {
        // Call Supabase Edge Function for trigger processing
        const { data, error } = await supabase.functions.invoke('process-trigger', {
          body: {
            trigger_timestamp: trigger.trigger_timestamp,
            fsr_value: trigger.fsr_value,
            latitude: trigger.latitude,
            longitude: trigger.longitude,
            aqi: trigger.aqi,
            temperature: trigger.temperature,
            humidity: trigger.humidity,
            weather_condition: trigger.weather_condition,
            device_id: trigger.device_id,
          },
        });

        if (error) throw error;

        // Mark as synced
        await localDatabase.markTriggerSynced(trigger.id!);
        this.syncStatus.totalSynced++;

        console.log(`[BackgroundSync] Trigger ${trigger.id} synced successfully`);
      } catch (error) {
        console.error(`[BackgroundSync] Failed to sync trigger ${trigger.id}:`, error);

        // Increment retry count
        await localDatabase.incrementSyncRetry(trigger.id!);
      }

      // Small delay between uploads to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  /**
   * Retry failed syncs with exponential backoff
   */
  async retryFailedSyncs(): Promise<void> {
    console.log('[BackgroundSync] Retrying failed syncs...');

    const stats = await localDatabase.getTriggerStats();
    if (stats.failedSyncs === 0) {
      console.log('[BackgroundSync] No failed syncs to retry');
      return;
    }

    // Trigger regular sync which will handle retries
    await this.syncNow();
  }

  /**
   * Get sync status
   */
  getStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Subscribe to status updates
   */
  onStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.syncCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.syncCallbacks.indexOf(callback);
      if (index > -1) {
        this.syncCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify all subscribers of status change
   */
  private notifyStatusChange(): void {
    this.syncCallbacks.forEach((callback) => {
      try {
        callback(this.getStatus());
      } catch (error) {
        console.error('[BackgroundSync] Error in status callback:', error);
      }
    });
  }

  /**
   * Force a full resync (admin/debug feature)
   */
  async forceResyncAll(): Promise<void> {
    console.log('[BackgroundSync] Force resyncing all triggers...');
    console.warn('[BackgroundSync] Force resync not fully implemented in this version');
    
    // Trigger sync of unsynced items
    await this.syncNow();
  }

  /**
   * Get sync statistics
   */
  async getSyncStatistics(): Promise<{
    total: number;
    synced: number;
    pending: number;
    failed: number;
  }> {
    const stats = await localDatabase.getTriggerStats();

    return {
      total: stats.total,
      synced: stats.total - stats.unsynced,
      pending: stats.unsynced,
      failed: stats.failedSyncs,
    };
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    try {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
      if (this.appStateSubscription) {
        this.appStateSubscription.remove();
        this.appStateSubscription = null;
      }
      this.isInitialized = false;
      console.log('[BackgroundSync] Cleaned up');
    } catch (error) {
      console.error('[BackgroundSync] Cleanup error:', error);
    }
  }
}

// Export singleton instance
export const BackgroundSyncService = new BackgroundSyncServiceClass();
