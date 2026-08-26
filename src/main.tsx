import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign iframe preview Vite HMR websocket reconnection errors early and completely
if (typeof window !== 'undefined') {
  const isWebsocketError = (err: any) => {
    if (!err) return false;
    const str = String(err?.message || err?.reason || err || '');
    return (
      str.includes('WebSocket closed without opened') ||
      str.includes('failed to connect to websocket') ||
      str.includes('WebSocket') ||
      str.includes('[vite]')
    );
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (isWebsocketError(event.reason)) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
    }
  }, true);

  window.addEventListener('error', (event) => {
    if (isWebsocketError(event.message) || isWebsocketError(event.error)) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
