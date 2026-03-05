/**
 * Offline-First Trigger Recorder
 * Handles recording inhaler triggers with offline capability
 * Automatically saves locally when offline and syncs when back online
 */

import NetInfo from '@react-native-community/netinfo';
import { supabase } from '@/utils/supabase';
import { localDatabase } from '@/client/database/LocalDatabase';
import { fetchAirQuality } from '@/utils/airQuality';

export interface TriggerData {
  latitude: number;
  longitude: number;
  timestamp: string;
  fsrValue?: number;
  deviceId?: string;
}

export interface RecordResult {
  success: boolean;
  isOffline: boolean;
  message: string;
  triggerId?: string | number;
}

/**
 * Record a trigger with offline-first strategy
 * Tries to save to Supabase first, falls back to local storage if offline
 */
export async function recordTriggerOfflineFirst(
  triggerData: TriggerData
): Promise<RecordResult> {
  try {
    // Check network connectivity
    const netInfo = await NetInfo.fetch();
    const isOnline = netInfo.isConnected && netInfo.isInternetReachable;

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      // If can't get user, save locally
      return await saveLocally(triggerData, 'User not authenticated');
    }

    // Try to fetch air quality data for enrichment
    let aqiData: any = null;
    if (isOnline) {
      try {
        aqiData = await fetchAirQuality(
          triggerData.latitude,
          triggerData.longitude
        );
      } catch (error) {
        console.warn('[OfflineTrigger] Failed to fetch AQI, continuing without it:', error);
      }
    }

    // If online, try to save to Supabase
    if (isOnline) {
      try {
        const { data, error } = await supabase
          .from('inhaler_triggers')
          .insert({
            user_id: user.id,
            latitude: triggerData.latitude,
            longitude: triggerData.longitude,
            timestamp: triggerData.timestamp,
            aqi: aqiData?.aqi || null,
            category: aqiData?.category || null,
            pm25: aqiData?.pm25 || null,
            pm10: aqiData?.pm10 || null,
            temperature: aqiData?.temperature || null,
            humidity: aqiData?.humidity || null,
            device_id: triggerData.deviceId || null,
            fsr_value: triggerData.fsrValue || 0,
          })
          .select()
          .single();

        if (error) {
          console.error('[OfflineTrigger] Supabase insert error:', error);
          return await saveLocally(triggerData, error.message);
        }

        // Also save locally for offline access
        await saveLocalCopy(triggerData, aqiData, true);

        return {
          success: true,
          isOffline: false,
          message: 'Trigger recorded successfully',
          triggerId: data?.id,
        };
      } catch (error: any) {
        console.error('[OfflineTrigger] Failed to save online:', error);
        return await saveLocally(triggerData, error.message);
      }
    }

    // If offline, save locally
    return await saveLocally(triggerData, 'Device is offline');
  } catch (error: any) {
    console.error('[OfflineTrigger] Unexpected error:', error);
    return {
      success: false,
      isOffline: false,
      message: error.message || 'Failed to record trigger',
    };
  }
}

/**
 * Save trigger locally with unsynced flag
 */
async function saveLocally(
  triggerData: TriggerData,
  reason: string
): Promise<RecordResult> {
  try {
    // Ensure database is initialized
    await localDatabase.initialize();

    const localId = await localDatabase.insertTrigger({
      trigger_timestamp: triggerData.timestamp,
      fsr_value: triggerData.fsrValue || 0,
      latitude: triggerData.latitude,
      longitude: triggerData.longitude,
      aqi: null,
      temperature: null,
      humidity: null,
      weather_condition: null,
      synced: false,
      device_id: triggerData.deviceId || null,
      sync_retry_count: 0,
      last_sync_attempt: null,
    });

    console.log(`[OfflineTrigger] Saved locally with ID ${localId}. Reason: ${reason}`);

    return {
      success: true,
      isOffline: true,
      message: 'Trigger saved locally. Will sync when connection is available.',
      triggerId: localId,
    };
  } catch (error: any) {
    console.error('[OfflineTrigger] Failed to save locally:', error);
    return {
      success: false,
      isOffline: true,
      message: `Failed to save locally: ${error.message}`,
    };
  }
}

/**
 * Save a copy locally even when saved online (for offline access)
 */
async function saveLocalCopy(
  triggerData: TriggerData,
  aqiData: any,
  synced: boolean
): Promise<void> {
  try {
    await localDatabase.initialize();
    
    await localDatabase.insertTrigger({
      trigger_timestamp: triggerData.timestamp,
      fsr_value: triggerData.fsrValue || 0,
      latitude: triggerData.latitude,
      longitude: triggerData.longitude,
      aqi: aqiData?.aqi || null,
      temperature: aqiData?.temperature || null,
      humidity: aqiData?.humidity || null,
      weather_condition: aqiData?.category || null,
      synced,
      device_id: triggerData.deviceId || null,
      sync_retry_count: 0,
      last_sync_attempt: synced ? new Date().toISOString() : null,
    });

    console.log('[OfflineTrigger] Local copy saved for offline access');
  } catch (error) {
    console.warn('[OfflineTrigger] Failed to save local copy:', error);
    // Don't throw - local copy is nice-to-have, not critical
  }
}
