import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { AuthProvider } from './components/AuthProvider';

function resolveBasename() {
  if (import.meta.env.DEV) return '/';
  const path = window.location.pathname || '/';
  const marker = '/frontend/dist';
  const idx = path.indexOf(marker);
  if (idx >= 0) return path.slice(0, idx + marker.length);
  if (path.endsWith('/index.html')) return path.slice(0, -'/index.html'.length) || '/';
  return '/';
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={resolveBasename()}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
