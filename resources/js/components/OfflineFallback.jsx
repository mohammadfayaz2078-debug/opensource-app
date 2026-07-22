export default function OfflineFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-sm w-full text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[#007c89] flex items-center justify-center">
          <span className="text-white font-bold text-3xl">BN</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">You&apos;re offline</h1>
        <p className="text-sm text-gray-500 mb-6">
          Please check your internet connection and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 bg-[#007c89] text-white text-sm font-medium rounded-lg hover:bg-[#006d77] transition"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
