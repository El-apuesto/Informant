import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster 
      position="top-center"
      toastOptions={{
        style: {
          background: '#10141c',
          color: '#e0ffe0',
          border: '1px solid #2a3b4f',
          fontFamily: '"Share Tech Mono", monospace',
        },
      }}
    />
  </StrictMode>
);
