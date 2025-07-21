import { ethers, network } from "hardhat";
import { FastPayMVP, FastPayAuthorityManager } from "../typechain-types";

async function main(): Promise<void> {
  console.log("========================================");
  console.log("FastPay MVP Deployment");
  console.log("========================================");

  const [deployer] = await ethers.getSigners();

  console.log("Deployer:", deployer.address);
  console.log("Deployer balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)));
  console.log("Network:", network.name);
  console.log("Chain ID:", network.config.chainId);

  // Deploy FastPay MVP contract
  console.log("\nDeploying FastPay MVP contract...");
  const FastPayMVPFactory = await ethers.getContractFactory("FastPayMVP");
  const fastPay: FastPayMVP = await FastPayMVPFactory.deploy();
  await fastPay.waitForDeployment();

  const fastPayAddress = await fastPay.getAddress();
  console.log("FastPay MVP deployed to:", fastPayAddress);

  // Deploy FastPay Authority Manager contract
  console.log("\nDeploying FastPay Authority Manager contract...");
  const FastPayAuthorityManagerFactory = await ethers.getContractFactory("FastPayAuthorityManager");
  const authorityManager: FastPayAuthorityManager = await FastPayAuthorityManagerFactory.deploy();
  await authorityManager.waitForDeployment();

  const authorityManagerAddress = await authorityManager.getAddress();
  console.log("FastPay Authority Manager deployed to:", authorityManagerAddress);

  // Get initial contract state
  const totalAccounts = await fastPay.totalAccounts();
  const lastTransactionIndex = await fastPay.lastTransactionIndex();

  console.log("========================================");
  console.log("Deployment Successful!");
  console.log("========================================");
  console.log("FastPay MVP Contract:", fastPayAddress);
  console.log("Authority Manager Contract:", authorityManagerAddress);
  console.log("Total Accounts:", totalAccounts.toString());
  console.log("Last Transaction Index:", lastTransactionIndex.toString());
  console.log("");
  console.log("Contract Verification:");
  console.log(`npx hardhat verify --network ${network.name} ${fastPayAddress}`);
  console.log(`npx hardhat verify --network ${network.name} ${authorityManagerAddress}`);
  console.log("");
  console.log("Next Steps:");
  console.log("1. Register accounts with: fastPay.registerAccount()");
  console.log("2. Fund accounts with: fastPay.handleFundingTransaction(token, amount)");
  console.log("3. Create certificates with: fastPay.createTransferCertificate(...)");
  console.log("4. Redeem transfers with: fastPay.handleRedeemTransaction(...)");
  console.log("");
  console.log("FastPay System ready for offline payments!");
  console.log("========================================");

  // Save deployment addresses to a file for easy access
  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId,
    deployer: deployer.address,
    contracts: {
      FastPayMVP: fastPayAddress,
      FastPayAuthorityManager: authorityManagerAddress,
    },
    timestamp: new Date().toISOString(),
  };

  console.log("\nDeployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  }); 