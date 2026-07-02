import React from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { store, persistor } from './store.ts';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

interface ProvidersProps {
  children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster 
            position="top-right" 
            toastOptions={{
              duration: 4000,
              style: {
                background: '#FFFFFF',
                color: '#0E1116',
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)',
              },
            }} 
          />
        </QueryClientProvider>
      </PersistGate>
    </Provider>
  );
}
