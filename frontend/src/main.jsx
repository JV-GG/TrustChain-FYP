import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { wagmiConfig } from './config/wagmi';
import { ThemeProvider, useTheme } from './hooks/useTheme';
import App from './App';
import './index.css';

const queryClient = new QueryClient();

// RainbowKit modals follow the app theme so the connect flow matches the ledger palette
function ThemedRainbowKit({ children }) {
  const { theme } = useTheme();
  const rkTheme =
    theme === 'dark'
      ? darkTheme({ accentColor: '#eef1ec', accentColorForeground: '#0e1210', borderRadius: 'medium' })
      : lightTheme({ accentColor: '#111613', accentColorForeground: '#ffffff', borderRadius: 'medium' });
  return <RainbowKitProvider theme={rkTheme}>{children}</RainbowKitProvider>;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ThemedRainbowKit>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </ThemedRainbowKit>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
