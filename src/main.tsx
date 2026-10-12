import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppRoot } from './App';
import { StoreProvider } from './state/store';
import './styles/app.css';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <StoreProvider>
        <AppRoot />
      </StoreProvider>
    </StrictMode>,
  );
}
