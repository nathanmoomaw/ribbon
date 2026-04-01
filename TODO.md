# TODO

## Deploy RibbonPuddle Contract (Phase 1)

To enable minting on the Puddle QR tokenization feature, complete these steps:

### 1. Install Foundry (Solidity toolchain)
```sh
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 2. Install OpenZeppelin contracts
```sh
forge install OpenZeppelin/openzeppelin-contracts
```

### 3. Deploy to Base Sepolia (testnet)
```sh
forge create contracts/RibbonPuddle.sol:RibbonPuddle \
  --rpc-url https://sepolia.base.org \
  --private-key YOUR_PRIVATE_KEY
```
Copy the `Deployed to:` address from the output.

### 4. Set env vars for testnet
Create or update `.env`:
```
VITE_PUDDLE_CONTRACT_ADDRESS=0x...   # paste deployed address here
VITE_USE_TESTNET=true
```

### 5. Test minting in dev
```sh
npm run dev
```
Connect wallet → open a QR → mint a Puddle. Confirm it shows ownership badge.

### 6. Deploy to Base mainnet (when ready)
```sh
forge create contracts/RibbonPuddle.sol:RibbonPuddle \
  --rpc-url https://mainnet.base.org \
  --private-key YOUR_PRIVATE_KEY
```
Update `.env` (and production secrets):
```
VITE_PUDDLE_CONTRACT_ADDRESS=0x...   # mainnet address
VITE_USE_TESTNET=false               # or remove this line
```

### 7. (Optional) Set up Pinata for NFT metadata
- Create account at pinata.cloud
- Generate an API JWT
- Add to `.env`: `VITE_PINATA_JWT=your_jwt_here`
- Without this, minting still works — `tokenURI` will just be empty until set separately

---

## Notes
- Never commit `.env` to git (already in `.gitignore`)
- Contract is ownerless after deploy except for the `Ownable` constructor — `msg.sender` becomes owner
- Phase 2 (future): `mutate()` function so owners can update their preset on-chain
- Phase 3 (future): marketplace / listing
