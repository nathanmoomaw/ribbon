import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from './crypto/config'
import '@rainbow-me/rainbowkit/styles.css'
import './index.css'
import App from './App.jsx'

// Clear wagmi's persisted connector state before the provider mounts.
// Prevents auto-reconnect prompts (e.g. Coinbase Base Account modal) on page load.
// Users reconnect explicitly via the wallet button.
Object.keys(localStorage)
  .filter(k => k.startsWith('wagmi'))
  .forEach(k => localStorage.removeItem(k))

const queryClient = new QueryClient()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: '#e040fb' })}>
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)
