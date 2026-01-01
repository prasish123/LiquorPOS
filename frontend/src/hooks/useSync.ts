import { useEffect } from 'react';
import { useSyncStore } from '../store/syncStore';
import { syncService } from '../infrastructure/services/SyncService';
import { Logger } from '../infrastructure/services/LoggerService';

export function useSync() {
    const { isOnline, setSyncing, setLastSyncTime } = useSyncStore();

    useEffect(() => {
        if (!isOnline) return;

        const doSync = async () => {
            try {
                setSyncing(true);
                await syncService.syncOrders();
                setLastSyncTime(new Date());
            } catch (error) {
                Logger.error("Sync failed:", error as Error);
            } finally {
                setSyncing(false);
            }
        };

        // Initial sync
        doSync();

        // Periodic sync (every 30 seconds)
        const syncInterval = setInterval(doSync, 30000);
        return () => clearInterval(syncInterval);
    }, [isOnline, setSyncing, setLastSyncTime]);
}
