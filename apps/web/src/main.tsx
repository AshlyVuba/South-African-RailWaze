import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { UnifiedViewport } from './components/UnifiedViewport';

const rootEl = document.getElementById('root');
if (!rootEl) {
    throw new Error('Root element #root not found in index.html');
}

ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
        <UnifiedViewport />
    </React.StrictMode>
);

// Register the offline-first service worker (Iteration 3 Issue #6).
// Registered after 'load' so it never competes with the initial page
// render for bandwidth/CPU on a slow or intermittent connection.
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
            // A failed registration should never break the app itself - it just
            // means this session runs without offline caching.
            console.error('Service worker registration failed:', err);
        });
    });
}