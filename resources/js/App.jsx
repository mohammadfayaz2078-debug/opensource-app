// App.jsx
import { Routes, Route } from 'react-router-dom';
import routes from './routes';
import { Suspense, useEffect } from 'react';
import InstallBanner from './components/InstallBanner';
import NetworkStatus from './components/NetworkStatus';
import PWAUpdatePrompt from './components/PWAUpdatePrompt';

const renderRoutes = (routes) => {
  return routes.map((route, index) => {
    if (route.path === '*') {
      return <Route key={index} path="*" element={route.element} />;
    }
    
    if (route.children && route.children.length > 0) {
      return (
        <Route key={index} path={route.path} element={route.element}>
          {renderRoutes(route.children)}
        </Route>
      );
    }
    
    return <Route key={index} path={route.path} element={route.element} />;
  });
};

function App() {
  useEffect(() => {
    // Prevent pull-to-refresh on mobile using CSS instead of JS blocking
    // overscroll-behavior: contain on scroll containers handles this natively
  }, []);

  return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#007c89] flex items-center justify-center animate-pulse">
              <span className="text-white font-bold text-2xl">BN</span>
            </div>
            <p className="text-sm text-gray-500">Loading...</p>
          </div>
        </div>
      }>
        <NetworkStatus />
        <Routes>
          {renderRoutes(routes)}
        </Routes>
        <InstallBanner />
        <PWAUpdatePrompt />
      </Suspense>
  );
}

export default App;
