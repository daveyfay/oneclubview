import React from 'react';
import ReactDOM from 'react-dom/client';
import './lib/global.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// PWA install prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  setTimeout(() => {
    if (deferredPrompt && !window.matchMedia('(display-mode: standalone)').matches) {
      const b = document.createElement('div');
      b.id = 'installBanner';
      b.style.cssText = 'position:fixed;bottom:70px;left:12px;right:12px;background:#1a2a3a;color:#fff;padding:14px 16px;border-radius:16px;z-index:9998;display:flex;align-items:center;gap:12px;box-shadow:0 8px 30px rgba(0,0,0,.2);font-family:-apple-system,sans-serif;animation:ri .4s ease';
      b.innerHTML = '<img src="/icons/icon-192.png" style="width:40px;height:40px;border-radius:10px"><div style="flex:1"><div style="font-size:14px;font-weight:700">Add OneClubView to home screen</div><div style="font-size:12px;color:rgba(255,255,255,.5)">Quick access, works offline</div></div><button id="installBtn" style="padding:8px 16px;border-radius:10px;border:none;background:#e85d4a;color:#fff;font-weight:700;font-size:13px;cursor:pointer">Install</button><button id="dismissInstall" style="background:none;border:none;color:rgba(255,255,255,.4);font-size:18px;cursor:pointer;padding:0 4px">×</button>';
      document.body.appendChild(b);
      document.getElementById('installBtn').onclick = () => { deferredPrompt.prompt(); deferredPrompt.userChoice.then(() => { deferredPrompt = null; b.remove(); }); };
      document.getElementById('dismissInstall').onclick = () => b.remove();
    }
  }, 30000);
});

// iOS install hint
if (/iPhone|iPad/.test(navigator.userAgent) && !window.navigator.standalone) {
  setTimeout(() => {
    if (!localStorage.getItem('ocv_ios_hint')) {
      const b = document.createElement('div');
      b.style.cssText = 'position:fixed;bottom:70px;left:12px;right:12px;background:#1a2a3a;color:#fff;padding:14px 16px;border-radius:16px;z-index:9998;display:flex;align-items:center;gap:12px;box-shadow:0 8px 30px rgba(0,0,0,.2);font-family:-apple-system,sans-serif;animation:ri .4s ease';
      b.innerHTML = '<img src="/icons/icon-192.png" style="width:40px;height:40px;border-radius:10px"><div style="flex:1"><div style="font-size:14px;font-weight:700">Add to Home Screen</div><div style="font-size:12px;color:rgba(255,255,255,.5)">Tap <span style="font-size:16px">⎙</span> then "Add to Home Screen"</div></div><button style="background:none;border:none;color:rgba(255,255,255,.4);font-size:18px;cursor:pointer;padding:0 4px" onclick="this.parentElement.remove();localStorage.setItem(\'ocv_ios_hint\',\'1\')">×</button>';
      document.body.appendChild(b);
    }
  }, 60000);
}
