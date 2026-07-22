import { useNetworkStatus } from '../hooks/useNetworkStatus';

export default function NetworkStatus() {
  const { isOnline, wasOffline } = useNetworkStatus();

  if (isOnline && !wasOffline) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-[9999] transition-all duration-300 ${isOnline ? 'translate-y-0' : 'translate-y-0'}`}>
      <div className={`px-4 py-2 text-center text-sm font-medium ${isOnline ? 'bg-green-600 text-white' : 'bg-amber-500 text-white'}`}>
        {isOnline ? (
          <span>Back online. Data syncing...</span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m-2.829-2.829a5 5 0 000-7.07m-4.243 2.122a1.5 1.5 0 012.122 0m4.243 4.243a1.5 1.5 0 010 2.122M7 10l2 2m0 0l2-2m-2 2V7" />
            </svg>
            You&apos;re offline. Some features may be limited.
          </span>
        )}
      </div>
    </div>
  );
}
