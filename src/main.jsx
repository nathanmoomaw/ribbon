import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from './crypto/config'
import App from './App.jsx'
import TextRibbonApp from './TextRibbonApp.jsx'
import V4App from './V4App.jsx'
import '@rainbow-me/rainbowkit/styles.css'

const queryClient = new QueryClient()

const path = window.location.pathname
export const version = path.startsWith('/v1') ? 1 : path.startsWith('/v2') ? 2 : path.startsWith('/v4') ? 4 : 3

function RibbonApp() {
  if (version <= 2) return <App />
  if (version === 4) return <V4App />
  return <TextRibbonApp />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: '#5577cc' })}>
          <RibbonApp />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)
