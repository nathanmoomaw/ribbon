import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { base } from 'wagmi/chains'

export const wagmiConfig = getDefaultConfig({
  appName: 'Ribbon Puddle',
  projectId: 'ribbon-puddle-v3', // WalletConnect project ID — replace with real one for production
  chains: [base],
  ssr: false,
})
