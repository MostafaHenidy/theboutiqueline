import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import App from './App';
import store from './store';
import { setLanguage, setTheme } from './store/slices/uiSlice';
import { resolveStorefrontLanguage, applyLanguage } from './utils/language';
import { resolveTheme, applyTheme } from './utils/theme';
import './index.css';

async function startApp() {
  const theme = resolveTheme();
  applyTheme(theme);
  store.dispatch(setTheme(theme));

  const lang = await resolveStorefrontLanguage();
  applyLanguage(lang);
  store.dispatch(setLanguage(lang));

  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <Provider store={store}>
        <BrowserRouter>
          <HelmetProvider>
            <App />
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3000,
                style: { fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em', borderRadius: '0', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text)', border: '1px solid var(--color-border)' },
                success: { style: { background: 'var(--color-bg-card)', color: 'var(--color-text)', borderLeft: '3px solid #eb301e' } },
                error:   { style: { background: 'var(--color-bg-card)', color: 'var(--color-text)', borderLeft: '3px solid #eb301e' } },
              }}
            />
          </HelmetProvider>
        </BrowserRouter>
      </Provider>
    </React.StrictMode>
  );
}

startApp();
