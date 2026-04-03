import { ConnectButton } from '@rainbow-me/rainbowkit'
import './WalletButton.css'

/**
 * Minimal wallet connect button — uses RainbowKit's ConnectButton.
 *
 * When disconnected + previously connected (flagSet):
 *   shows [reconnect] [forget] — user explicitly initiates, no auto-popup.
 * When disconnected + never connected:
 *   shows the subtle 0x connect button.
 * When connected:
 *   shows address, clicking opens account modal.
 */
export function WalletButton({ flagSet, onForget }) {
  return (
    <div className="wallet-btn">
      <ConnectButton.Custom>
        {({ account, chain, openConnectModal, openAccountModal, mounted }) => {
          const ready = mounted
          const connected = ready && account && chain

          return (
            <span className="wallet-btn__group">
              {connected ? (
                <button
                  className="wallet-btn__trigger wallet-btn__trigger--connected"
                  onClick={openAccountModal}
                  title={`${account.displayName} on ${chain.name}`}
                >
                  <span className="wallet-btn__address">{account.displayName}</span>
                </button>
              ) : flagSet ? (
                <>
                  <button
                    className="wallet-btn__trigger wallet-btn__reconnect"
                    onClick={openConnectModal}
                    title="Reconnect wallet"
                  >
                    reconnect
                  </button>
                  <button
                    className="wallet-btn__forget"
                    onClick={onForget}
                    title="Stop reconnecting wallet on load"
                  >
                    forget
                  </button>
                </>
              ) : (
                <button
                  className="wallet-btn__trigger"
                  onClick={openConnectModal}
                  title="Connect wallet"
                >
                  <span className="wallet-btn__connect">0x</span>
                </button>
              )}
            </span>
          )
        }}
      </ConnectButton.Custom>
    </div>
  )
}
