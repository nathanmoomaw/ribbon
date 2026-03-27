# Crypto Integration Options for Ribbon

## Option A: NFT/EFT Preset Minting

**Concept:** Users mint their preset configurations as NFTs. Each QR preset becomes a tradeable/collectible token.

**How it works:**
1. User creates a sound preset they like
2. Clicks "Mint" in the QR modal — signs a transaction to mint the preset as an NFT
3. The NFT metadata contains the preset URL (all synth settings encoded)
4. Others can buy/trade the preset NFT, which gives them the exact sound configuration
5. Original creator gets royalties on secondary sales

**Pros:**
- Direct revenue path — creators earn from presets they make
- Natural fit: the QR preset system already serializes all settings into a URL
- Could build a marketplace/gallery of community sounds
- Royalty structure rewards good sound design
- Low technical complexity — just need to mint metadata pointing to the preset URL

**Cons:**
- Requires wallet connection (MetaMask, WalletConnect, etc.)
- Gas fees on Ethereum mainnet make small mints impractical
- Need to choose a chain (Polygon/Base/Arbitrum for low fees vs Ethereum for prestige)
- Marketplace discovery is a separate challenge
- User friction: most musicians aren't crypto-native

**Implementation effort:** Medium — wallet connect library + smart contract + mint UI

---

## Option B: POAP (Proof of Attendance Protocol)

**Concept:** Users earn collectible badges for using Ribbon — attending events, hitting milestones, or participating in community activities.

**How it works:**
1. Define "moments" — first play, 100 notes played, shared a preset, attended a jam session
2. Users claim POAPs by meeting criteria (could be automatic or via claim links)
3. POAPs are free to claim (issuer pays, not user)
4. POAPs live in user's wallet as collectible badges

**Pros:**
- Zero cost to users — POAPs are free to claim
- No wallet required upfront (POAP has email-based claiming)
- Great for community building and engagement tracking
- Simple to issue — POAP has an API and existing infrastructure
- Fun/gamification angle fits Ribbon's playful vibe
- Could gate features behind POAP ownership (e.g., "attended v3 launch" unlocks a scale)

**Cons:**
- No direct revenue — POAPs are free collectibles, not tradeable assets
- Requires defining meaningful "moments" worth commemorating
- POAP issuance needs approval from poap.xyz for each event
- Less exciting for users who don't care about collectibles

**Implementation effort:** Low — POAP API integration + claim UI + milestone tracking

---

## Option C: Hybrid Approach (Recommended)

**Start with POAP** for engagement and community building (low friction, free for users), **then add NFT preset minting** once there's an active community.

### Phase 1: POAP Milestones
- "First Sound" — played your first note on Ribbon
- "Sound Shaper" — created and shared a QR preset
- "Shake Master" — triggered 100 shakes
- "Version Collector" — used v1, v2, and v3
- Launch event POAPs for version releases

### Phase 2: NFT Preset Marketplace
- Mint presets as NFTs on a low-fee L2 (Base or Polygon)
- Gallery page showing community presets with playback
- Creator royalties on secondary sales
- POAP holders get free mints or reduced fees

### Tech Stack Recommendation
- **Wallet:** RainbowKit or Web3Modal (supports MetaMask, WalletConnect, Coinbase)
- **Chain:** Base (Coinbase L2, very low fees, growing ecosystem)
- **POAP:** poap.xyz API
- **NFT contract:** Simple ERC-721 with on-chain metadata (preset URL + name)
- **Storage:** Preset data lives in the URL itself (no IPFS needed — it's just settings)
