import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { supabase } from '@/utils/supabase';
import { fetchEnvironmentalData } from '@/utils/environmentalDataAPI';
import { checkTriggerSimilarity } from '@/utils/riskAssessment';
import { sendRiskAlert } from '@/utils/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BACKGROUND_RISK_TASK = 'BACKGROUND_RISK_MONITOR_TASK';

// Define background task: runs when significant location updates occur
TaskManager.defineTask(BACKGROUND_RISK_TASK, async ({ data, error }) => {
  try {
    if (error) {
      console.log('Background task error:', error);
      return;
    }
    const locationEvent = data as Location.LocationSubscription;
    const lastLocation: any = (locationEvent as any)?.locations?.[0];
    const coords = lastLocation?.coords;
    if (!coords) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const envData = await fetchEnvironmentalData(coords.latitude, coords.longitude);
    if (!envData) return;

    const assessment = await checkTriggerSimilarity(envData, user.id);
    if (assessment.isRisky) {
      // 1-minute cooldown across background runs
      const tsStr = await AsyncStorage.getItem('riskNotifyLastTs');
      const lastTs = tsStr ? Number(tsStr) : 0;
      const now = Date.now();
      if (now - lastTs >= 60 * 1000) {
        await sendRiskAlert(assessment);
        await AsyncStorage.setItem('riskNotifyLastTs', String(now));
      } else {
        console.log('BG risk notification suppressed (cooldown active)');
      }
    }
  } catch (e) {
    console.log('Background risk monitor exception:', e);
  }
});

export async function startBackgroundRiskMonitoring() {
  // Request background updates with reasonable battery policy
  const hasPerm = await Location.getBackgroundPermissionsAsync();
  if (!hasPerm.granted) {
    const req = await Location.requestBackgroundPermissionsAsync();
    if (!req.granted) return false;
  }

  // Avoid duplicate registrations
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_RISK_TASK).catch(() => false);
  if (isRegistered) {
    return true;
  }

  // Start updates: ~1 minute, ~200 meters changes (adjust as needed)
  await Location.startLocationUpdatesAsync(BACKGROUND_RISK_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 1 * 60 * 1000,
    distanceInterval: 200,
    pausesUpdatesAutomatically: true,
    foregroundService: {
      notificationTitle: 'QAir Risk Monitoring',
      notificationBody: 'Monitoring environmental risk in the background.',
    },
    // Android-specific options
    showsBackgroundLocationIndicator: false,
  });
  return true;
}

export async function stopBackgroundRiskMonitoring() {
  const tasks = await TaskManager.getTaskOptionsAsync(BACKGROUND_RISK_TASK).catch(() => null);
  // Even if options not retrievable, call stop
  try {
    await Location.stopLocationUpdatesAsync(BACKGROUND_RISK_TASK);
  } catch {}
}
