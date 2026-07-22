import { useState, useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';

export default function PWAUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState(null);

  useEffect(() => {
    const swUpdate = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {
        // App ready for offline use
      },
    });
    setUpdateSW(() => swUpdate);
  }, []);

  const handleUpdate = () => {
    if (updateSW) {
      updateSW();
      setNeedRefresh(false);
    }
  };

  const handleDismiss = () => {
    setNeedRefresh(false);
  };

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">Update available</p>
            <p className="text-xs text-gray-500">A new version of BazarNet is ready.</p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={handleDismiss} className="flex-1 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
            Dismiss
          </button>
          <button onClick={handleUpdate} className="flex-1 py-2 text-xs font-medium text-white bg-[#007c89] rounded-lg hover:bg-[#006d77] transition">
            Update
          </button>
        </div>
      </div>
    </div>
  );
}
