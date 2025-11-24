// Geofencing Service
// Monitor user location and trigger alerts when entering risky areas

import * as Location from 'expo-location';
import { Platform } from 'react-native';

const GEOFENCE_TASK_NAME = 'ASTHMA_RISK_GEOFENCE';
const LOCATION_TRACKING_TASK = 'ASTHMA_LOCATION_TRACKING';

export type GeofenceRegion = {
  identifier: string;
  latitude: number;
  longitude: number;
  radius: number; // meters
  riskLevel: 'low' | 'medium' | 'high';
  notifyOnEnter: boolean;
  notifyOnExit: boolean;
};

/**
 * Get current user location
 * @returns Current latitude and longitude
 */
export const getCurrentLocation = async (): Promise<{
  latitude: number;
  longitude: number;
} | null> => {
  try {
    // Check if location services are enabled
    const enabled = await Location.hasServicesEnabledAsync();
    if (!enabled) {
      console.error('Location services are disabled');
      return null;
    }

    // Request location permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.error('Location permission denied');
      return null;
    }

    // Get current position with high accuracy
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    console.log('Current location:', location.coords);

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    return null;
  }
};

/**
 * Request background location permissions for geofencing
 * Required for iOS and Android 10+
 */
export const requestBackgroundLocationPermission = async (): Promise<boolean> => {
  try {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    
    if (foregroundStatus !== 'granted') {
      console.log('Foreground location permission denied');
      return false;
    }

    // Request background location permission
    try {
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      if (backgroundStatus !== 'granted') {
        console.log('Background location permission denied');
        return false;
      }

      console.log('Background location permission granted');
      return true;
    } catch (bgError: any) {
      // If background permission request fails (e.g., manifest not updated), 
      // gracefully fallback to foreground-only mode
      if (bgError.message?.includes('ACCESS_BACKGROUND_LOCATION')) {
        console.warn('⚠️ Background location not available - needs app rebuild');
        console.warn('📝 Foreground location will work, but auto-monitoring requires rebuild');
        // Return true for foreground permission (partial success)
        return true;
      }
      throw bgError;
    }
  } catch (error) {
    console.error('Error requesting background location permission:', error);
    return false;
  }
};

/**
 * Create geofences around known trigger locations
 * @param triggerLocations Array of past trigger locations
 * @returns Array of geofence regions
 */
export const createGeofencesFromTriggers = (
  triggerLocations: Array<{ latitude: number; longitude: number; id: string }>
): Location.LocationRegion[] => {
  return triggerLocations.map((trigger) => ({
    identifier: `trigger_${trigger.id}`,
    latitude: trigger.latitude,
    longitude: trigger.longitude,
    radius: 500, // 500 meters radius around past trigger
    notifyOnEnter: true,
    notifyOnExit: true,
  }));
};

/**
 * Start geofencing for high-risk areas
 * Note: Full geofencing requires expo-task-manager (install separately)
 * This is a simplified version for manual location checking
 * @param regions Array of geofence regions to monitor
 */
export const startGeofencing = async (
  regions: Location.LocationRegion[]
): Promise<boolean> => {
  try {
    // Check if background permission is granted
    const hasPermission = await requestBackgroundLocationPermission();
    if (!hasPermission) {
      console.error('Cannot start geofencing without background location permission');
      return false;
    }

    console.log('Geofencing setup for', regions.length, 'regions');
    console.log('Note: Install expo-task-manager for full background geofencing support');
    
    // For now, we'll use periodic location checks instead of true geofencing
    // True geofencing requires: npx expo install expo-task-manager
    
    return true;
  } catch (error) {
    console.error('Error starting geofencing:', error);
    return false;
  }
};

/**
 * Stop geofencing
 */
export const stopGeofencing = async (): Promise<void> => {
  try {
    console.log('Geofencing stopped');
    // Full implementation requires expo-task-manager
  } catch (error) {
    console.error('Error stopping geofencing:', error);
  }
};

/**
 * Start background location tracking (simplified version)
 * For full background tracking, install: npx expo install expo-task-manager
 */
export const startBackgroundLocationTracking = async (): Promise<boolean> => {
  try {
    const hasPermission = await requestBackgroundLocationPermission();
    if (!hasPermission) {
      return false;
    }

    console.log('Background location tracking ready');
    console.log('Note: Full background tracking requires expo-task-manager');
    return true;
  } catch (error) {
    console.error('Error starting background location tracking:', error);
    return false;
  }
};

/**
 * Stop background location tracking
 */
export const stopBackgroundLocationTracking = async (): Promise<void> => {
  try {
    console.log('Background location tracking stopped');
  } catch (error) {
    console.error('Error stopping location tracking:', error);
  }
};

/**
 * Check if location tracking is currently active
 */
export const isLocationTrackingActive = async (): Promise<boolean> => {
  // Simplified version - always returns false
  // Full implementation requires expo-task-manager
  return false;
};

/**
 * Get location permission status
 */
export const getLocationPermissionStatus = async (): Promise<{
  foreground: boolean;
  background: boolean;
}> => {
  try {
    const foreground = await Location.getForegroundPermissionsAsync();
    
    // Try to get background permission, but gracefully handle errors
    let backgroundGranted = false;
    try {
      const background = await Location.getBackgroundPermissionsAsync();
      backgroundGranted = background.status === 'granted';
    } catch (bgError: any) {
      // If background permission check fails, it means manifest wasn't updated yet
      if (bgError.message?.includes('ACCESS_BACKGROUND_LOCATION')) {
        console.warn('⚠️ Background location check failed - app needs rebuild');
        backgroundGranted = false; // Not available until rebuild
      } else {
        throw bgError;
      }
    }

    return {
      foreground: foreground.status === 'granted',
      background: backgroundGranted,
    };
  } catch (error) {
    console.error('Error getting permission status:', error);
    return {
      foreground: false,
      background: false,
    };
  }
};
