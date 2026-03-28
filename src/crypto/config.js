import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { base } from 'wagmi/chains'

// WalletConnect project ID from cloud.walletconnect.com
// Using placeholder — WalletConnect QR pairing won't work but injected wallets (MetaMask etc.) will.
// Replace with a real project ID for production WalletConnect support.
const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'placeholder'

export const wagmiConfig = getDefaultConfig({
  appName: 'Ribbon Puddle',
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [base],
  ssr: false,
})
