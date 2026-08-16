import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/i18n';
import App from './App.tsx';
import './index.css';
// Después de la capa base a propósito: la impresión corrige lo que la pantalla
// pinta, y para eso tiene que llegar la última en la cascada.
import './styles/impresion.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
