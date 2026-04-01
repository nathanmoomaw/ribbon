/**
 * RibbonPuddle contract — ABI, address, and wagmi hook wrappers.
 *
 * Set VITE_PUDDLE_CONTRACT_ADDRESS in your .env after deploying.
 * Until then, all hooks return graceful no-ops (contract === undefined guard).
 */

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useCallback } from 'react'

// ─── Contract config ─────────────────────────────────────────────────────────

export const PUDDLE_CONTRACT_ADDRESS =
  import.meta.env.VITE_PUDDLE_CONTRACT_ADDRESS || undefined

export const PUDDLE_ABI = [
  // mint(bytes32 contentHash, string name) → uint256 tokenId
  {
    type: 'function',
    name: 'mint',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'contentHash', type: 'bytes32' },
      { name: 'name',        type: 'string'  },
    ],
    outputs: [{ name: 'tokenId', type: 'uint256' }],
  },
  // hashExists(bytes32) → bool
  {
    type: 'function',
    name: 'hashExists',
    stateMutability: 'view',
    inputs:  [{ name: 'contentHash', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  // tokenIdForHash(bytes32) → uint256
  {
    type: 'function',
    name: 'tokenIdForHash',
    stateMutability: 'view',
    inputs:  [{ name: 'contentHash', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // ownerOfHash(bytes32) → address
  {
    type: 'function',
    name: 'ownerOfHash',
    stateMutability: 'view',
    inputs:  [{ name: 'contentHash', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
  },
  // stateOf(uint256) → (bytes32, string, address, uint64)
  {
    type: 'function',
    name: 'stateOf',
    stateMutability: 'view',
    inputs:  [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      { name: 'contentHash', type: 'bytes32' },
      { name: 'name',        type: 'string'  },
      { name: 'creator',     type: 'address' },
      { name: 'mintedAt',    type: 'uint64'  },
    ],
  },
  // Minted event
  {
    type: 'event',
    name: 'Minted',
    inputs: [
      { indexed: true,  name: 'tokenId',     type: 'uint256' },
      { indexed: true,  name: 'contentHash', type: 'bytes32' },
      { indexed: true,  name: 'creator',     type: 'address' },
      { indexed: false, name: 'name',        type: 'string'  },
    ],
  },
]

// ─── Hook: check if a preset hash already has an owner ───────────────────────

/**
 * Returns { owner, tokenId, isMinted, isLoading } for a given content hash.
 * owner is address(0) / undefined if not yet minted.
 */
export function usePuddleOwner(contentHash) {
  const enabled = Boolean(PUDDLE_CONTRACT_ADDRESS && contentHash)

  const ownerResult = useReadContract({
    address: PUDDLE_CONTRACT_ADDRESS,
    abi:     PUDDLE_ABI,
    functionName: 'ownerOfHash',
    args:    [contentHash],
    query:   { enabled },
  })

  const tokenIdResult = useReadContract({
    address: PUDDLE_CONTRACT_ADDRESS,
    abi:     PUDDLE_ABI,
    functionName: 'tokenIdForHash',
    args:    [contentHash],
    query:   { enabled },
  })

  const owner   = ownerResult.data
  const tokenId = tokenIdResult.data
  const isMinted = Boolean(
    owner && owner !== '0x0000000000000000000000000000000000000000'
  )

  return {
    owner,
    tokenId: tokenId ? Number(tokenId) : undefined,
    isMinted,
    isLoading: ownerResult.isLoading || tokenIdResult.isLoading,
    refetch: () => { ownerResult.refetch(); tokenIdResult.refetch() },
  }
}

// ─── Hook: mint a new Puddle ──────────────────────────────────────────────────

/**
 * Returns { mint, status, txHash, tokenId, error }.
 *
 * status: 'idle' | 'pending' | 'confirming' | 'success' | 'error'
 * Call mint(contentHash, name) to start the flow.
 */
export function useMintPuddle() {
  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract()

  const { isLoading: isConfirming, isSuccess, data: receipt } =
    useWaitForTransactionReceipt({ hash: txHash })

  // Extract tokenId from the Minted event in the receipt
  let mintedTokenId
  if (isSuccess && receipt?.logs?.length > 0) {
    // The Minted event's first topic is the event sig, second is tokenId (indexed uint256)
    const mintLog = receipt.logs.find(log =>
      log.address?.toLowerCase() === PUDDLE_CONTRACT_ADDRESS?.toLowerCase()
    )
    if (mintLog?.topics?.[1]) {
      mintedTokenId = Number(BigInt(mintLog.topics[1]))
    }
  }

  const status = isPending       ? 'pending'
    : isConfirming               ? 'confirming'
    : isSuccess                  ? 'success'
    : writeError                 ? 'error'
    : 'idle'

  const mintFn = useCallback((contentHash, name = '') => {
    if (!PUDDLE_CONTRACT_ADDRESS) {
      console.warn('RibbonPuddle: contract address not set (VITE_PUDDLE_CONTRACT_ADDRESS)')
      return
    }
    writeContract({
      address:      PUDDLE_CONTRACT_ADDRESS,
      abi:          PUDDLE_ABI,
      functionName: 'mint',
      args:         [contentHash, name],
    })
  }, [writeContract])

  return {
    mint: mintFn,
    status,
    txHash,
    tokenId: mintedTokenId,
    error: writeError,
  }
}
