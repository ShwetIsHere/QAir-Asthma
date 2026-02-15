import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permission not granted');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

/**
 * Get Expo Push Token for this device
 */
export const getExpoPushToken = async (): Promise<string | null> => {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: 'your-project-id', // You can get this from app.json
    });

    console.log('Expo Push Token:', token.data);
    return token.data;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
};

/**
 * Save push token to user's emergency contacts
 */
export const savePushTokenToContact = async (contactId: string, pushToken: string) => {
  try {
    const { error } = await supabase
      .from('emergency_contacts')
      .update({ push_token: pushToken })
      .eq('id', contactId);

    if (error) {
      console.error('Error saving push token:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in savePushTokenToContact:', error);
    return false;
  }
};

/**
 * Send local notification (appears on this device)
 */
export const sendLocalNotification = async (title: string, body: string) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        vibrate: [0, 250, 250, 250],
      },
      trigger: null, // Send immediately
    });
  } catch (error) {
    console.error('Error sending local notification:', error);
  }
};

/**
 * Send emergency push notifications to all emergency contacts
 */
export const sendEmergencyPushNotifications = async (
  userName: string,
  location: { latitude: number; longitude: number }
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get all emergency contacts with push tokens
    const { data: contacts, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', user.id);

    if (error || !contacts || contacts.length === 0) {
      console.log('No emergency contacts found');
      return;
    }

    // Filter contacts that have push tokens
    const contactsWithTokens = contacts.filter(c => c.push_token);

    if (contactsWithTokens.length === 0) {
      console.log('No contacts have push notification enabled');
      return;
    }

    const locationUrl = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
    
    // Prepare push notification messages
    const messages = contactsWithTokens.map(contact => ({
      to: contact.push_token,
      sound: 'default',
      title: '🚨 ASTHMA EMERGENCY',
      body: `${userName} just used their inhaler and may need help! Tap to see location.`,
      data: { 
        type: 'emergency',
        userName,
        location: locationUrl,
        timestamp: new Date().toISOString(),
      },
      priority: 'high',
      channelId: 'emergency',
    }));

    // Send notifications via Expo Push API
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    console.log('Push notifications sent:', result);

    return true;
  } catch (error) {
    console.error('Error sending emergency push notifications:', error);
    return false;
  }
};

/**
 * Simple fallback: Send emergency alert using local notifications
 * This shows a notification on the user's own device
 */
export const sendEmergencyAlertLocal = async (userName: string) => {
  await sendLocalNotification(
    '🚨 Emergency Alert Sent',
    `Inhaler use recorded. Emergency contacts have been notified.`
  );
};
