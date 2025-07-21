import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "hardhat-contract-sizer";
import * as dotenv from "dotenv";
import "@typechain/hardhat";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: false,
    },
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: false,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    etherlink_testnet: {
      url: process.env.ETHERLINK_TESTNET_RPC_URL || "https://node.ghostnet.etherlink.com",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 128123,
      gasPrice: 1000000000, // 1 gwei
    },
    etherlink_mainnet: {
      url: process.env.ETHERLINK_MAINNET_RPC_URL || "https://node.mainnet.etherlink.com",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 42793,
      gasPrice: 1000000000, // 1 gwei
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    gasPrice: 1, // 1 gwei for Etherlink
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    token: "ETH",
    showTimeSpent: true,
  },
  etherscan: {
    apiKey: {
      etherlink_testnet: process.env.ETHERSCAN_API_KEY || "dummy",
      etherlink_mainnet: process.env.ETHERSCAN_API_KEY || "dummy",
    },
    customChains: [
      {
        network: "etherlink_testnet",
        chainId: 128123,
        urls: {
          apiURL: "https://testnet.explorer.etherlink.com/api",
          browserURL: "https://testnet.explorer.etherlink.com",
        },
      },
      {
        network: "etherlink_mainnet",
        chainId: 42793,
        urls: {
          apiURL: "https://explorer.etherlink.com/api",
          browserURL: "https://explorer.etherlink.com",
        },
      },
    ],
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
    only: ["FastPay"],
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
    alwaysGenerateOverloads: false,
    externalArtifacts: ["externalArtifacts/*.json"],
    dontOverrideCompile: false,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
  },
};

export default config; 