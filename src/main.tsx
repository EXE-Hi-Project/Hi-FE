import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import RealtimeSocketBridge from './components/realtime/RealtimeSocketBridge';
import 'maplibre-gl/dist/maplibre-gl.css';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 2,
    },
  },
});

const rootElement = document.getElementById('root')!;
if (rootElement.dataset.prerendered === 'true') {
  rootElement.replaceChildren();
  delete rootElement.dataset.prerendered;
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <RealtimeSocketBridge />
          <App />
        </ErrorBoundary>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: { background: '#fff', color: '#333', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' },
            success: { iconTheme: { primary: '#f43f5e', secondary: '#fff' } },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
