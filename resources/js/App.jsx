// App.jsx
import { Routes, Route } from 'react-router-dom';
import routes from './routes'; // This will now import routes.jsx
import { Suspense } from 'react';

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
  return (
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          {renderRoutes(routes)}
        </Routes>
      </Suspense>
  );
}

export default App;