import { ConnectButton } from '@rainbow-me/rainbowkit'
import './WalletButton.css'

/**
 * Minimal wallet connect button — uses RainbowKit's ConnectButton
 * with custom rendering to match Ribbon's aesthetic.
 */
export function WalletButton() {
  return (
    <div className="wallet-btn">
      <ConnectButton.Custom>
        {({ account, chain, openConnectModal, openAccountModal, mounted }) => {
          const ready = mounted
          const connected = ready && account && chain

          return (
            <button
              className={`wallet-btn__trigger ${connected ? 'wallet-btn__trigger--connected' : ''}`}
              onClick={connected ? openAccountModal : openConnectModal}
              title={connected ? `${account.displayName} on ${chain.name}` : 'Connect wallet'}
            >
              {connected ? (
                <span className="wallet-btn__address">{account.displayName}</span>
              ) : (
                <span className="wallet-btn__connect">Wallet</span>
              )}
            </button>
          )
        }}
      </ConnectButton.Custom>
    </div>
  )
}
