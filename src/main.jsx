import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from './crypto/config'
import App from './App.jsx'
import TextRibbonApp from './TextRibbonApp.jsx'
import '@rainbow-me/rainbowkit/styles.css'

const queryClient = new QueryClient()

const path = window.location.pathname
// /v3 = ASCII ribbon; root, /v1, /v2 all serve the stable App (v2 ribbon)
export const version = path.startsWith('/v3') ? 3 : path.startsWith('/v2') ? 2 : path.startsWith('/v1') ? 1 : 2

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: '#5577cc' })}>
          {version === 3 ? <TextRibbonApp /> : <App />}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)
