# Fomo Agent DApp

Proyek NFT + token di BNB Chain, ala proyek-proyek Agent ID yang selama ini di-mint:
mint NFT → tiap NFT bisa klaim token tiap hari.

- **NFT:** Fomo Agent (ERC-721, maks 2.000)
- **Token:** AF (ERC-20, maks 100.000.000, simbol $AF)
- **Free mint:** 1 gratis per Agent ID `.ai` (dicek ke registry Binance Agent ID),
  kuota gratis maks 100 total (siapa cepat dia dapat)
- **Paid mint:** 0,0004 BNB/NFT, maks 5 per wallet
- **Klaim:** tiap NFT klaim 1.000 AF tiap 24 jam

## Kontrak (`contracts/`)

| File | Isi |
|---|---|
| `FomoToken.sol` | ERC-20 AF. Hanya `minter` (kontrak NFT) yang boleh mencetak, dibatasi max supply. |
| `FomoAgentNFT.sol` | ERC-721. `freeMint(agentId)`, `paidMint(qty)`, `claim(tokenId)`, `claimable(tokenId)`, `withdraw()`. |
| `MockAgentRegistry.sol` | Registry Agent ID palsu untuk test lokal + BSC testnet. |

`agentId = uint256(keccak256(handle))` — contoh: `keccak256("myagent")`.

Alamat registry Agent ID di-set saat deploy (constructor + `setAgentRegistry`
milik owner). Di mainnet wajib isi alamat registry asli sebelum deploy; di
testnet pakai mock. Alamat registry mainnet (terverifikasi 8 Nov 2026 —
`ownerOf(keccak256("myagent"))` mengembalikan wallet pemilik "myagent"):
`0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`.

## Test

```bash
npm install
npx hardhat test
```

10/10 test lolos (8 Nov 2026): free mint 1x per Agent ID, tolak klaim ganda,
kuota gratis maks 100 total, tolak bukan pemilik Agent ID, paid mint + cap
wallet, klaim 1.000 AF/24 jam, cooldown, `claimable()`, withdraw, dan
`setAgentRegistry` hanya owner.

## Deploy ke BSC testnet (gratis)

1. Minta tBNB gratis dari faucet ke alamat deployer di `.env`:
   https://testnet.bnbchain.org/faucet-smart
2. Deploy:
   ```bash
   DEPLOYER_KEY=$(grep DEPLOYER_KEY .env | cut -d= -f2) npx hardhat run scripts/deploy.js --network bscTestnet
   ```
3. Alamat kontrak tersimpan di `deployments/bscTestnet.json` — masukkan ke
   konfigurasi DApp web (alamat NFT + token + chainId 97).

## Deploy ke BSC mainnet

Butuh BNB asli untuk gas + alamat registry Agent ID mainnet:

```bash
AGENT_REGISTRY=0x... DEPLOYER_KEY=0x... npx hardhat run scripts/deploy.js --network bsc
```

**Jangan pernah membagikan `DEPLOYER_KEY`/seed phrase ke siapa pun.**
`.env` berisi kunci deployer testnet saja (hanya tBNB, tidak bernilai).
Untuk mainnet, pakai wallet sendiri dan jangan simpan key di file bersama.
