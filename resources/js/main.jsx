import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './i18n';

// Import CSS - try different approaches
import '../css/app.css'; // Laravel default location
// OR
// import './assets/tailwind.css';
// import './style.css';

import './autoLogout';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </React.StrictMode>
);