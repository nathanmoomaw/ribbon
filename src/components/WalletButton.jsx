import { ConnectButton } from '@rainbow-me/rainbowkit'
import './WalletButton.css'

/**
 * Minimal wallet connect button — uses RainbowKit's ConnectButton
 * with custom rendering to match Ribbon's aesthetic.
 *
 * onForget: optional callback — clears the auto-reconnect flag so the user
 *   is no longer prompted on load. They can still connect from the QR modal.
 */
export function WalletButton({ onForget }) {
  return (
    <div className="wallet-btn">
      <ConnectButton.Custom>
        {({ account, chain, openConnectModal, openAccountModal, mounted }) => {
          const ready = mounted
          const connected = ready && account && chain

          return (
            <span className="wallet-btn__group">
              <button
                className={`wallet-btn__trigger ${connected ? 'wallet-btn__trigger--connected' : ''}`}
                onClick={connected ? openAccountModal : openConnectModal}
                title={connected ? `${account.displayName} on ${chain.name}` : 'Connect wallet'}
              >
                {connected ? (
                  <span className="wallet-btn__address">{account.displayName}</span>
                ) : (
                  <span className="wallet-btn__connect">0x</span>
                )}
              </button>
              {!connected && onForget && (
                <button
                  className="wallet-btn__forget"
                  onClick={onForget}
                  title="Stop auto-reconnecting wallet on load"
                >
                  forget
                </button>
              )}
            </span>
          )
        }}
      </ConnectButton.Custom>
    </div>
  )
}
