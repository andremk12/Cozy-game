import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App.jsx';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/fraunces/latin-400.css';
import '@fontsource/pixelify-sans/latin-400.css';
import './styles/global.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
