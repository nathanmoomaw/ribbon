# NFT/EFT Gain from Usage — Simple & Transparent Plan

## Concept

Users who create music with Ribbon could earn value from their usage — compositions, sound designs, and creative sessions become ownable digital artifacts. The goal is to keep this **simple, transparent, and non-intrusive** — it should feel like a natural extension of the toy, not a crypto product.

## Approach: Session Recordings as Mintable Artifacts

### What Gets Captured
- **Session snapshots**: A frozen state of all synth parameters (oscillator settings, effects, crunch level, scale, BPM, etc.) at a moment the user chooses to "save"
- **Short audio clips**: Record 10-30 second loops of what the user is playing via `MediaRecorder` + Web Audio API
- **Ribbon gestures**: The sequence of touch/mouse movements on the ribbon — a "performance" that can be replayed

### How It Works (User Flow)
1. User plays Ribbon, finds a sound/loop they like
2. Taps a **"Mint"** or **"Save"** button (simple, one-tap)
3. Behind the scenes:
   - Audio is captured as a short clip (WAV/MP3)
   - Synth parameters are serialized as JSON metadata
   - Ribbon gesture data is saved for replay
4. User gets a shareable link and/or an NFT on a low-cost chain
5. Others can listen, remix (fork the parameters), or collect

### Technical Implementation

#### Phase 1: Local Save (No Blockchain)
- Add `MediaRecorder` to capture audio output from the `AudioContext.destination`
- Serialize synth state (all params) as JSON
- Store locally (IndexedDB) and allow export/download
- Generate shareable URLs (hosted audio + param snapshots)
- **Effort**: Small — mostly frontend, no infra needed

#### Phase 2: On-Chain Minting
- Use a low-gas L2 chain (Base, Zora, or Polygon)
- Mint via a simple smart contract:
  - Audio file stored on IPFS/Arweave
  - Metadata (synth params, gesture data) stored on-chain or IPFS
- Use a gasless/sponsored mint flow (user doesn't need a wallet to start)
  - Embedded wallet (Privy, Dynamic, or Coinbase Wallet SDK)
  - App sponsors first N mints per user
- **Effort**: Medium — needs smart contract, IPFS integration, wallet SDK

#### Phase 3: Royalties & Remixing
- When someone "forks" a saved sound (loads its parameters and modifies them), the original creator is credited
- On-chain remix tree: each mint references its parent
- Royalties flow back to original creators on secondary sales
- Collaborative compositions: multiple users contribute layers
- **Effort**: Larger — needs remix tracking, royalty splits

### Revenue / Gain Model
| Source | Who Benefits | How |
|--------|-------------|-----|
| Mint fees | Creator + Platform | Small fee per mint (e.g., $0.50-2) |
| Secondary sales | Original creator | Royalty % on resales (e.g., 5-10%) |
| Remix royalties | Parent creators | % flows upstream on remix chain |
| Premium features | Platform | Advanced effects, longer recordings, collaboration tools |
| Curated collections | Curators | Users curate playlists of mints, earn from engagement |

### Transparency Principles
- **No hidden fees** — all costs shown upfront
- **Open metadata** — synth params are public, anyone can see how a sound was made
- **No lock-in** — audio files are standard formats, downloadable anytime
- **Clear ownership** — creator owns their mints, platform doesn't claim IP
- **Optional** — NFT features are opt-in, the synth works perfectly without them

### Tech Stack Considerations
- **Wallet**: Privy or Dynamic (embedded wallets, no MetaMask required)
- **Chain**: Base (Coinbase L2) — low fees, good ecosystem
- **Storage**: IPFS via Pinata or web3.storage for audio, Arweave for permanence
- **Smart Contract**: Simple ERC-721 with remix reference field
- **Frontend**: Keep it in React, add a mint modal/flow

### Open Questions
- Should "performances" (gesture replays) be separate from "sounds" (parameter snapshots)?
- How to handle collaborative sessions (multi-ribbon)?
- What's the right balance between free usage and incentivized minting?
- Should there be a social/discovery feed of minted sounds?
