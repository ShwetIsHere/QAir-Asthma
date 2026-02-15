/**
 * Realtime Service - Client Layer
 * Handles WebSocket connections for real-time alerts and updates
 * 
 * Features:
 * - Subscribe to risk alerts
 * - Real-time trigger updates
 * - Broadcast notifications
 * - Connection management
 */

import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase';
import * as Notifications from 'expo-notifications';

export interface RiskAlert {
  id: number;
  user_id: string;
  trigger_id: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  alert_message: string;
  is_read: boolean;
  created_at: string;
}

export interface RealtimeCallbacks {
  onRiskAlert?: (alert: RiskAlert) => void;
  onTriggerUpdate?: (trigger: any) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: Error) => void;
}

class RealtimeServiceClass {
  private alertsChannel: RealtimeChannel | null = null;
  private triggersChannel: RealtimeChannel | null = null;
  private callbacks: RealtimeCallbacks = {};
  private userId: string | null = null;
  private isConnected = false;

  /**
   * Initialize realtime service
   */
  async initialize(): Promise<void> {
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      this.userId = user.id;

      // Setup notification handler
      await this.setupNotificationHandler();

      console.log('[Realtime] Service initialized');
    } catch (error) {
      console.error('[Realtime] Initialization error:', error);
      throw error;
    }
  }

  /**
   * Set callbacks for realtime events
   */
  setCallbacks(callbacks: RealtimeCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Subscribe to risk alerts channel
   */
  async subscribeToAlerts(): Promise<void> {
    if (!this.userId) {
      throw new Error('User ID not set. Call initialize() first.');
    }

    if (this.alertsChannel) {
      console.log('[Realtime] Already subscribed to alerts');
      return;
    }

    console.log('[Realtime] Subscribing to risk alerts...');

    // Create channel for risk alerts
    this.alertsChannel = supabase
      .channel(`risk_alerts:${this.userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'risk_alerts',
          filter: `user_id=eq.${this.userId}`,
        },
        (payload: RealtimePostgresChangesPayload<RiskAlert>) => {
          this.handleRiskAlert(payload.new as RiskAlert);
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Alerts channel status:', status);

        if (status === 'SUBSCRIBED') {
          this.isConnected = true;
          this.callbacks.onConnectionChange?.(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          this.isConnected = false;
          this.callbacks.onConnectionChange?.(false);
        }
      });
  }

  /**
   * Subscribe to trigger updates
   */
  async subscribeToTriggers(): Promise<void> {
    if (!this.userId) {
      throw new Error('User ID not set. Call initialize() first.');
    }

    if (this.triggersChannel) {
      console.log('[Realtime] Already subscribed to triggers');
      return;
    }

    console.log('[Realtime] Subscribing to trigger updates...');

    this.triggersChannel = supabase
      .channel(`triggers:${this.userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'triggers',
          filter: `user_id=eq.${this.userId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          this.handleTriggerUpdate(payload.new);
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Triggers channel status:', status);
      });
  }

  /**
   * Handle incoming risk alert
   */
  private async handleRiskAlert(alert: RiskAlert): Promise<void> {
    console.log('[Realtime] Risk alert received:', alert);

    // Send local notification
    await this.sendLocalNotification(alert);

    // Callback
    this.callbacks.onRiskAlert?.(alert);
  }

  /**
   * Handle trigger update
   */
  private handleTriggerUpdate(trigger: any): void {
    console.log('[Realtime] Trigger update received:', trigger.id);
    this.callbacks.onTriggerUpdate?.(trigger);
  }

  /**
   * Send local push notification
   */
  private async sendLocalNotification(alert: RiskAlert): Promise<void> {
    try {
      const { status } = await Notifications.getPermissionsAsync();

      if (status !== 'granted') {
        console.log('[Realtime] Notification permission not granted');
        return;
      }

      // Determine notification priority based on risk level
      const priority =
        alert.risk_level === 'critical' || alert.risk_level === 'high'
          ? Notifications.AndroidNotificationPriority.HIGH
          : Notifications.AndroidNotificationPriority.DEFAULT;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${alert.risk_level.toUpperCase()} Risk Alert`,
          body: alert.alert_message,
          sound: alert.risk_level === 'critical' ? 'default' : undefined,
          priority,
          data: { alert_id: alert.id, trigger_id: alert.trigger_id },
        },
        trigger: null, // Immediate
      });

      console.log('[Realtime] Notification sent');
    } catch (error) {
      console.error('[Realtime] Notification error:', error);
    }
  }

  /**
   * Setup notification handler for when user taps notification
   */
  private async setupNotificationHandler(): Promise<void> {
    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Realtime] Notification permissions denied');
      return;
    }

    // Configure notification behavior
    await Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Handle notification tap
    Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      console.log('[Realtime] Notification tapped:', data);

      // You can navigate to specific screen here
      // e.g., navigation.navigate('TriggerDetails', { triggerId: data.trigger_id })
    });

    console.log('[Realtime] Notification handler configured');
  }

  /**
   * Mark alert as read
   */
  async markAlertAsRead(alertId: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('risk_alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      if (error) throw error;

      console.log('[Realtime] Alert marked as read:', alertId);
    } catch (error) {
      console.error('[Realtime] Error marking alert as read:', error);
      throw error;
    }
  }

  /**
   * Get unread alerts count
   */
  async getUnreadAlertsCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('risk_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', this.userId!)
        .eq('is_read', false);

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('[Realtime] Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Get recent alerts
   */
  async getRecentAlerts(limit: number = 20): Promise<RiskAlert[]> {
    try {
      const { data, error } = await supabase
        .from('risk_alerts')
        .select('*')
        .eq('user_id', this.userId!)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('[Realtime] Error fetching alerts:', error);
      return [];
    }
  }

  /**
   * Broadcast presence (optional - for future features)
   */
  async broadcastPresence(status: 'online' | 'offline'): Promise<void> {
    if (!this.alertsChannel) return;

    try {
      await this.alertsChannel.track({
        user_id: this.userId,
        status,
        timestamp: new Date().toISOString(),
      });

      console.log('[Realtime] Presence broadcasted:', status);
    } catch (error) {
      console.error('[Realtime] Presence broadcast error:', error);
    }
  }

  /**
   * Unsubscribe from alerts
   */
  async unsubscribeFromAlerts(): Promise<void> {
    if (this.alertsChannel) {
      await supabase.removeChannel(this.alertsChannel);
      this.alertsChannel = null;
      console.log('[Realtime] Unsubscribed from alerts');
    }
  }

  /**
   * Unsubscribe from triggers
   */
  async unsubscribeFromTriggers(): Promise<void> {
    if (this.triggersChannel) {
      await supabase.removeChannel(this.triggersChannel);
      this.triggersChannel = null;
      console.log('[Realtime] Unsubscribed from triggers');
    }
  }

  /**
   * Unsubscribe from all channels
   */
  async unsubscribeAll(): Promise<void> {
    await this.unsubscribeFromAlerts();
    await this.unsubscribeFromTriggers();
    this.isConnected = false;
    this.callbacks.onConnectionChange?.(false);
    console.log('[Realtime] Unsubscribed from all channels');
  }

  /**
   * Check connection status
   */
  isRealtimeConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Reconnect (useful after network issues)
   */
  async reconnect(): Promise<void> {
    console.log('[Realtime] Reconnecting...');

    await this.unsubscribeAll();
    await this.subscribeToAlerts();
    await this.subscribeToTriggers();
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    await this.unsubscribeAll();
    this.userId = null;
    this.callbacks = {};
    console.log('[Realtime] Service cleaned up');
  }
}

// Export singleton instance
export const RealtimeService = new RealtimeServiceClass();
