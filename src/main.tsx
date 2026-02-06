import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Global error handler to catch any uncaught errors
window.onerror = (message, source, lineno, colno, error) => {
  console.error('Global error:', { message, source, lineno, colno, error });
  // Create a visible error display
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:red;color:white;padding:20px;z-index:99999;font-family:monospace;overflow:auto;';
  errorDiv.innerHTML = `<h1>JavaScript Error</h1><pre>${message}\n${source}:${lineno}:${colno}\n${error?.stack || ''}</pre>`;
  document.body.appendChild(errorDiv);
  return false;
};

// Catch unhandled promise rejections
window.onunhandledrejection = (event) => {
  console.error('Unhandled rejection:', event.reason);
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:darkred;color:white;padding:20px;z-index:99999;font-family:monospace;overflow:auto;';
  errorDiv.innerHTML = `<h1>Unhandled Promise Rejection</h1><pre>${event.reason?.stack || event.reason}</pre>`;
  document.body.appendChild(errorDiv);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
