# FastPay Smart Contracts (Hardhat)

A minimal-viable implementation of Facebook/Meta **FastPay** adapted for the Etherlink (EVM) rollup.

This folder now uses **Hardhat + TypeScript** (no more Foundry) for development, testing and deployment.

---

## 1. Quick Start

```bash
# clone the project (if you haven't)
$ git clone https://github.com/your-org/mininet-web.git
$ cd mininet-web/smart-contract

# install dependencies
$ npm install

# copy env and fill in PRIVATE_KEY, RPC URLs, etc.
$ cp env.example .env && $EDITOR .env

# compile & generate typings
$ npx hardhat compile

# run the full test-suite with gas report
$ npm test            # alias for: npx hardhat test

# deploy to Etherlink Ghostnet (testnet)
$ npx hardhat run scripts/deploy.ts --network etherlink_testnet
# verify (optional)
$ npx hardhat verify --network etherlink_testnet <DEPLOYED_ADDRESS>
```

---

## 2. Scripts

| npm script            | description                                   |
|-----------------------|-----------------------------------------------|
| `npm run build`       | `hardhat compile` & TypeChain generation      |
| `npm test`            | execute Hardhat tests                         |
| `npm run test:gas`    | tests with gas reporter                       |
| `npm run coverage`    | solidity-coverage                             |
| `npm run deploy:local`| deploy to local Hardhat node                  |
| `npm run deploy:testnet` | deploy to Etherlink Ghostnet               |

Scripts live in `scripts/*.ts` and are written in TypeScript.

---

## 3. Configuration

* `hardhat.config.ts` – networks, compiler (0.8.24), plugins (typechain, gas-reporter, contract-sizer).
* `.env`               – sensitive data (private key, RPC URLs, explorer API key).

```env
ETHERLINK_TESTNET_RPC_URL=https://node.ghostnet.etherlink.com
DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
ETHERSCAN_API_KEY=YOUR_EXPLORER_KEY   # optional verification
```

---

## 4. Contract Overview

* **FastPayMVP.sol**  — core FastPay logic (account registration, funding, certificates, redemption).
* **FastPayAuthorityManager.sol** — authority registry (optional helper).
* **MockERC20.sol** (tests) — simple ERC-20.

All contracts are in `contracts/` and are compiled with IR-optimiser (200 runs).

---

## 5. Directory Layout

```
smart-contract/
├── contracts/          # Solidity sources
├── scripts/            # deploy & verify TS scripts
├── test/               # Hardhat/Chai tests in TS
├── typechain-types/    # generated (git-ignored)
└── hardhat.config.ts
```

---

## 6. Troubleshooting

* **Typings missing?**  Run `npx hardhat compile` to regenerate `typechain-types`.
* **`tsconfig-paths` error?**  `npm install tsconfig-paths` (already in devDeps).

---

### License
MIT 