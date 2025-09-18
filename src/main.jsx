// Revolutionary Classifier main.jsx - Integrated with unboXed UI framework
console.log('🚀 Revolutionary Classifier with unboXed UI - Loading at', new Date().toLocaleTimeString());

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ModalProvider } from './context/ModalContext';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { SessionProvider } from './context/SessionContext.jsx';
import { unifiedToolMap, openTool } from './config/revolutionaryToolRegistry';

// Global tool access for UI framework
window.toolMap = unifiedToolMap;
window.openTool = openTool;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SessionProvider>
      <ThemeProvider>
        <ModalProvider>
          <App />
        </ModalProvider>
      </ThemeProvider>
    </SessionProvider>
  </React.StrictMode>
);