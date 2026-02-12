/**
 * Local SQLite Database Manager
 * Handles local storage of triggers and pending sync operations
 * Part of the offline-first architecture
 */

import * as SQLite from 'expo-sqlite';

export interface TriggerRecord {
  id?: number;
  trigger_timestamp: string;
  fsr_value: number;
  latitude: number | null;
  longitude: number | null;
  aqi: number | null;
  temperature: number | null;
  humidity: number | null;
  weather_condition: string | null;
  synced: boolean;
  local_created_at: string;
  device_id: string | null;
  sync_retry_count: number;
  last_sync_attempt: string | null;
}

export interface PendingSyncOperation {
  id?: number;
  operation_type: 'INSERT' | 'UPDATE' | 'DELETE';
  table_name: string;
  record_id: number;
  payload: string;
  created_at: string;
  retry_count: number;
  last_attempt: string | null;
  error_message: string | null;
}

class LocalDatabase {
  private db: SQLite.SQLiteDatabase | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.db = await SQLite.openDatabaseAsync('qair_local.db');
      await this.createTables();
      this.initialized = true;
      console.log('[LocalDB] Database initialized successfully');
    } catch (error) {
      console.error('[LocalDB] Initialization failed:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS triggers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          trigger_timestamp TEXT NOT NULL,
          fsr_value INTEGER NOT NULL,
          latitude REAL,
          longitude REAL,
          aqi INTEGER,
          temperature REAL,
          humidity REAL,
          weather_condition TEXT,
          synced INTEGER DEFAULT 0,
          local_created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          device_id TEXT,
          sync_retry_count INTEGER DEFAULT 0,
          last_sync_attempt TEXT
        );

        CREATE TABLE IF NOT EXISTS pending_sync (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          operation_type TEXT NOT NULL,
          table_name TEXT NOT NULL,
          record_id INTEGER NOT NULL,
          payload TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          retry_count INTEGER DEFAULT 0,
          last_attempt TEXT,
          error_message TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_triggers_synced ON triggers(synced);
        CREATE INDEX IF NOT EXISTS idx_triggers_timestamp ON triggers(trigger_timestamp);
        CREATE INDEX IF NOT EXISTS idx_pending_sync_created ON pending_sync(created_at);
      `);

      console.log('[LocalDB] Tables created successfully');
    } catch (error) {
      console.error('[LocalDB] Table creation failed:', error);
      throw error;
    }
  }

  // ==================== TRIGGER OPERATIONS ====================

  /**
   * Insert a new trigger event (immediate local storage)
   */
  async insertTrigger(trigger: Omit<TriggerRecord, 'id' | 'local_created_at'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.runAsync(
        `INSERT INTO triggers (
          trigger_timestamp, fsr_value, latitude, longitude,
          aqi, temperature, humidity, weather_condition,
          synced, device_id, sync_retry_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          trigger.trigger_timestamp,
          trigger.fsr_value,
          trigger.latitude,
          trigger.longitude,
          trigger.aqi,
          trigger.temperature,
          trigger.humidity,
          trigger.weather_condition,
          trigger.synced ? 1 : 0,
          trigger.device_id,
          trigger.sync_retry_count,
        ]
      );

      console.log('[LocalDB] Trigger inserted:', result.lastInsertRowId);
      return result.lastInsertRowId;
    } catch (error) {
      console.error('[LocalDB] Insert trigger failed:', error);
      throw error;
    }
  }

  /**
   * Get all unsynced triggers
   */
  async getUnsyncedTriggers(): Promise<TriggerRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const triggers = await this.db.getAllAsync<TriggerRecord>(
        'SELECT * FROM triggers WHERE synced = 0 ORDER BY trigger_timestamp ASC'
      );
      return triggers;
    } catch (error) {
      console.error('[LocalDB] Get unsynced triggers failed:', error);
      throw error;
    }
  }

  /**
   * Mark trigger as synced
   */
  async markTriggerSynced(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(
        'UPDATE triggers SET synced = 1, last_sync_attempt = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );
      console.log('[LocalDB] Trigger marked as synced:', id);
    } catch (error) {
      console.error('[LocalDB] Mark synced failed:', error);
      throw error;
    }
  }

  /**
   * Increment sync retry count for failed syncs
   */
  async incrementSyncRetry(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(
        `UPDATE triggers 
         SET sync_retry_count = sync_retry_count + 1,
             last_sync_attempt = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [id]
      );
    } catch (error) {
      console.error('[LocalDB] Increment retry failed:', error);
      throw error;
    }
  }

  /**
   * Get recent triggers (for UI display)
   */
  async getRecentTriggers(limit: number = 50): Promise<TriggerRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const triggers = await this.db.getAllAsync<TriggerRecord>(
        'SELECT * FROM triggers ORDER BY trigger_timestamp DESC LIMIT ?',
        [limit]
      );
      return triggers;
    } catch (error) {
      console.error('[LocalDB] Get recent triggers failed:', error);
      throw error;
    }
  }

  /**
   * Get trigger statistics
   */
  async getTriggerStats(): Promise<{
    total: number;
    today: number;
    unsynced: number;
    failedSyncs: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const row = await this.db.getFirstAsync<any>(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN DATE(trigger_timestamp) = DATE('now') THEN 1 ELSE 0 END) as today,
          SUM(CASE WHEN synced = 0 THEN 1 ELSE 0 END) as unsynced,
          SUM(CASE WHEN sync_retry_count > 0 AND synced = 0 THEN 1 ELSE 0 END) as failedSyncs
        FROM triggers`
      );

      return {
        total: row?.total || 0,
        today: row?.today || 0,
        unsynced: row?.unsynced || 0,
        failedSyncs: row?.failedSyncs || 0,
      };
    } catch (error) {
      console.error('[LocalDB] Get stats failed:', error);
      throw error;
    }
  }

  // ==================== PENDING SYNC OPERATIONS ====================

  /**
   * Add operation to sync queue
   */
  async addPendingSync(operation: Omit<PendingSyncOperation, 'id' | 'created_at'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(
        `INSERT INTO pending_sync (operation_type, table_name, record_id, payload, retry_count)
         VALUES (?, ?, ?, ?, ?)`,
        [
          operation.operation_type,
          operation.table_name,
          operation.record_id,
          operation.payload,
          operation.retry_count,
        ]
      );
      console.log('[LocalDB] Pending sync operation added');
    } catch (error) {
      console.error('[LocalDB] Add pending sync failed:', error);
      throw error;
    }
  }

  /**
   * Get all pending sync operations
   */
  async getPendingSyncOperations(): Promise<PendingSyncOperation[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const operations = await this.db.getAllAsync<PendingSyncOperation>(
        'SELECT * FROM pending_sync ORDER BY created_at ASC'
      );
      return operations;
    } catch (error) {
      console.error('[LocalDB] Get pending sync failed:', error);
      throw error;
    }
  }

  /**
   * Remove sync operation after successful sync
   */
  async removePendingSync(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync('DELETE FROM pending_sync WHERE id = ?', [id]);
      console.log('[LocalDB] Pending sync operation removed:', id);
    } catch (error) {
      console.error('[LocalDB] Remove pending sync failed:', error);
      throw error;
    }
  }

  /**
   * Update sync operation after failed attempt
   */
  async updateSyncFailure(id: number, errorMessage: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(
        `UPDATE pending_sync 
         SET retry_count = retry_count + 1,
             last_attempt = CURRENT_TIMESTAMP,
             error_message = ?
         WHERE id = ?`,
        [errorMessage, id]
      );
    } catch (error) {
      console.error('[LocalDB] Update sync failure failed:', error);
      throw error;
    }
  }

  // ==================== CLEANUP ====================

  /**
   * Clean up old synced records (optional - keep local history)
   */
  async cleanupOldRecords(daysToKeep: number = 30): Promise<void> {
    if (!this.db)  throw new Error('Database not initialized');

    try {
      await this.db.runAsync(
        `DELETE FROM triggers 
         WHERE synced = 1 
         AND DATE(local_created_at) < DATE('now', '-' || ? || ' days')`,
        [daysToKeep]
      );
      console.log('[LocalDB] Old records cleaned up');
    } catch (error) {
      console.error('[LocalDB] Cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Clear all data (use with caution)
   */
  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.execAsync(`
        DELETE FROM triggers;
        DELETE FROM pending_sync;
      `);
      console.log('[LocalDB] All data cleared');
    } catch (error) {
      console.error('[LocalDB] Clear data failed:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      this.initialized = false;
      console.log('[LocalDB] Database closed');
    }
  }
}

// Export singleton instance
export const localDatabase = new LocalDatabase();
