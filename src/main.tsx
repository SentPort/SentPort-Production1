import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

window.addEventListener('error', (event) => {
  const errorMessage = event.message || event.error?.message || '';

  if (
    errorMessage.includes('withInstrumentation') ||
    errorMessage.includes('no active span found') ||
    errorMessage.includes('aborted:true to span')
  ) {
    console.warn('Suppressed Supabase instrumentation error:', errorMessage);
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason?.message || event.reason || '';

  if (
    typeof reason === 'string' &&
    (reason.includes('withInstrumentation') ||
     reason.includes('no active span found') ||
     reason.includes('aborted:true to span'))
  ) {
    console.warn('Suppressed Supabase instrumentation rejection:', reason);
    event.preventDefault();
    return false;
  }
});

createRoot(document.getElementById('root')!).render(
  <App />
);
