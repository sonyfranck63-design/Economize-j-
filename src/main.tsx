import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {Capacitor} from '@capacitor/core';
import App from './App.tsx';
import './index.css';

if (Capacitor.isNativePlatform()) {
  // App Android: remove service workers registrados por versões anteriores do APK
  navigator.serviceWorker?.getRegistrations?.().then((regs) => regs.forEach((r) => r.unregister()));
} else {
  import('virtual:pwa-register').then(({registerSW}) => registerSW({immediate: true}));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
