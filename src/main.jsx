import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from './crypto/config'
import App from './App.jsx'
import TextRibbonApp from './TextRibbonApp.jsx'
import { VersionSwitcher } from './components/VersionSwitcher.jsx'
import './components/VersionSwitcher.css'
import '@rainbow-me/rainbowkit/styles.css'

const queryClient = new QueryClient()

const urlVersion = new URLSearchParams(window.location.search).get('v')
const version = urlVersion === '2' ? 2 : 3

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: '#5577cc' })}>
          <VersionSwitcher current={version} />
          {version === 2 ? <App /> : <TextRibbonApp />}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)
