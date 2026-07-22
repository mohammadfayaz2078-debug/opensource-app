import { useInstallPrompt } from '../hooks/useInstallPrompt';

export default function InstallBanner() {
  const { isInstallable, install, dismiss } = useInstallPrompt();

  if (!isInstallable) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#007c89] flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">BN</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">Install BazarNet</p>
          <p className="text-xs text-gray-500 truncate">Add to your home screen for quick access</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={dismiss} className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 rounded-lg transition">
            Later
          </button>
          <button onClick={install} className="px-3 py-1.5 text-xs font-medium text-white bg-[#007c89] hover:bg-[#006d77] rounded-lg transition">
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
