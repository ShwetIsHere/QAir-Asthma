/**
 * Network Utility Functions
 * Provides network connectivity detection and helpers
 */

import NetInfo from '@react-native-community/netinfo';

/**
 * Check if device has internet connectivity
 * @returns Promise<boolean> - true if online, false if offline
 */
export async function isOnline(): Promise<boolean> {
  try {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected === true && netInfo.isInternetReachable === true;
  } catch (error) {
    console.error('[NetworkUtils] Error checking connectivity:', error);
    // Assume offline if check fails
    return false;
  }
}

/**
 * Check if device is connected to a network (may not have internet)
 * @returns Promise<boolean> - true if connected to network, false otherwise
 */
export async function isConnected(): Promise<boolean> {
  try {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected === true;
  } catch (error) {
    console.error('[NetworkUtils] Error checking connection:', error);
    return false;
  }
}

/**
 * Get current network connection type
 * @returns Promise<string> - Connection type (wifi, cellular, none, etc.)
 */
export async function getConnectionType(): Promise<string> {
  try {
    const netInfo = await NetInfo.fetch();
    return netInfo.type || 'unknown';
  } catch (error) {
    console.error('[NetworkUtils] Error getting connection type:', error);
    return 'unknown';
  }
}

/**
 * Subscribe to network state changes
 * @param callback - Function to call when network state changes
 * @returns Unsubscribe function
 */
export function subscribeToNetworkChanges(
  callback: (isOnline: boolean) => void
): () => void {
  const unsubscribe = NetInfo.addEventListener((state) => {
    const online = state.isConnected === true && state.isInternetReachable === true;
    callback(online);
  });

  return unsubscribe;
}
