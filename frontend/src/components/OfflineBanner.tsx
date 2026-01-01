import { WifiOff, Cloud } from 'lucide-react';
import { useSyncStore } from '../store/syncStore';

export function OfflineBanner() {
  const isOnline = useSyncStore((state) => state.isOnline);
  const pendingTransactions = useSyncStore((state) => state.pendingTransactions);

  if (isOnline) {
    return null;
  }

  return (
    <div className="offline-banner">
      <WifiOff size={20} />
      <div className="offline-content">
        <strong>Offline Mode</strong>
        <span>Transactions will sync when online</span>
        {pendingTransactions > 0 && (
          <span className="pending-count">
            {pendingTransactions} pending
          </span>
        )}
      </div>
      <Cloud className="animate-pulse" size={20} />


    </div>
  );
}
