/**
 * Client Layer - Index
 * Export all client layer services
 */

export { localDatabase } from './database/LocalDatabase';
export type { TriggerRecord, PendingSyncOperation } from './database/LocalDatabase';

export { BLEManager } from './ble/BLEManager';
export type { BLETriggerEvent, BLEDeviceInfo } from './ble/BLEManager';

export { BackgroundSyncService } from './sync/BackgroundSyncService';
export type { SyncStatus } from './sync/BackgroundSyncService';

export { RealtimeService } from './sync/RealtimeService';
export type { RiskAlert, RealtimeCallbacks } from './sync/RealtimeService';
