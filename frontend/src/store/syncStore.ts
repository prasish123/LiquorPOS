import { create } from 'zustand';

interface SyncStore {
    isOnline: boolean;
    isSyncing: boolean;
    lastSyncTime: Date | null;
    pendingTransactions: number;
    setOnline: (online: boolean) => void;
    setSyncing: (syncing: boolean) => void;
    setLastSyncTime: (time: Date) => void;
    setPendingTransactions: (count: number) => void;
}

export const useSyncStore = create<SyncStore>((set) => ({
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSyncTime: null,
    pendingTransactions: 0,

    setOnline: (online) => set({ isOnline: online }),
    setSyncing: (syncing) => set({ isSyncing: syncing }),
    setLastSyncTime: (time) => set({ lastSyncTime: time }),
    setPendingTransactions: (count) => set({ pendingTransactions: count }),
}));

// Listen to online/offline events
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        useSyncStore.getState().setOnline(true);
    });

    window.addEventListener('offline', () => {
        useSyncStore.getState().setOnline(false);
    });
}
