import { ethers, network } from "hardhat";
import { MeshPayMVP } from "../typechain-types";

/**
 * MeshPay end-to-end demo script for Etherlink testnet.
 * 
 * Configuration - Set these variables below:
 * - CONTRACT_ADDRESS: Your deployed MeshPayMVP contract address
 * - SENDER_KEY: Private key of the sender account
 * - RECIPIENT_KEY: Private key of the recipient account
 * - TOKEN_ADDRESS: ERC-20 token address (use NATIVE_TOKEN for XTZ)
 * - FUND_AMOUNT: Amount to deposit (human-readable, e.g., "500")
 * - TRANSFER_AMOUNT: Amount to transfer (human-readable, e.g., "100")
 * - SEQUENCE_NUMBER: Transfer sequence number (default: 1)
 * - DRY_RUN: Set to true to simulate without executing transactions
 */

// ==================== CONFIGURATION ====================
const CONTRACT_ADDRESS = process.env.MESHPAY_CONTRACT_ADDRESS;
const SENDER_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const RECIPIENT_KEY = process.env.AUTHORITY_PRIVATE_KEY;

// Token configuration
const TOKEN_ADDRESS = process.env.WTZ_CONTRACT_ADDRESS;
// const TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000"; // Use this for native XTZ
const NATIVE_TOKEN = "0x0000000000000000000000000000000000000000"; // Use this for native XTZ

// Transaction amounts
const FUND_AMOUNT = "1"; // Amount to deposit (human-readable)
const TRANSFER_AMOUNT = "1"; // Amount to transfer (human-readable)
const SEQUENCE_NUMBER = 1; // Transfer sequence number

// Execution mode
const DRY_RUN = true; // Set to false to execute actual transactions

// ======================================================

async function main(): Promise<void> {
  // Validate configuration
  if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {  
    throw new Error("Please set MESHPAY_CONTRACT_ADDRESS in your .env file");
  }
  if (!SENDER_KEY || SENDER_KEY === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    throw new Error("Please set DEPLOYER_PRIVATE_KEY in your .env file");
  }
  if (!RECIPIENT_KEY || RECIPIENT_KEY === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    throw new Error("Please set AUTHORITY_PRIVATE_KEY in your .env file");
  }
  if (!TOKEN_ADDRESS || TOKEN_ADDRESS === "0x0000000000000000000000000000000000000000") {
    throw new Error("Please set WTZ_CONTRACT_ADDRESS in your .env file");
  }

  /* ----------------------------- Setup Signers ---------------------------- */
  const provider = ethers.provider;
  const sender = new ethers.Wallet(SENDER_KEY as string, provider);
  const recipient = new ethers.Wallet(RECIPIENT_KEY as string, provider);

  const isNative = TOKEN_ADDRESS === NATIVE_TOKEN;
  const tokenAddress = isNative ? NATIVE_TOKEN : TOKEN_ADDRESS;

  console.log("\n========= MeshPay Flow =========");
  console.log("Network:", network.name);
  console.log("Chain ID:", network.config.chainId);
  console.log("Sender:", sender.address);
  console.log("Recipient:", recipient.address);
  console.log("MeshPay Contract:", CONTRACT_ADDRESS);
  console.log("Token:", isNative ? "Native XTZ" : tokenAddress);
  console.log("Dry Run:", DRY_RUN ? "Yes" : "No");
  console.log("================================\n");

  // Validate network configuration
  if (network.name !== "etherlink_testnet" || network.config.chainId !== 128123) {
    console.warn("⚠️  Warning: Expected chain ID 128123 for Etherlink testnet");
  }

  /* --------------------------- Contract Instances ------------------------- */
  console.log("Connecting to contracts...");
  
  // Check if MeshPay contract exists
  const meshpayCode = await provider.getCode(CONTRACT_ADDRESS as string);
  if (meshpayCode === "0x") {
    throw new Error(`No contract found at MeshPay address: ${CONTRACT_ADDRESS}`);
  }
  
  const fastPay: MeshPayMVP = await ethers.getContractAt("MeshPayMVP", CONTRACT_ADDRESS as string, sender);
  console.log("✓ Connected to MeshPay contract");
  
  // Check if token contract exists (if not using native XTZ)
  let token = null;
  let tokenDecimals = 18; // Default for native XTZ
  
  if (!isNative) {
    const tokenCode = await provider.getCode(tokenAddress as string);
    if (tokenCode === "0x") {
      throw new Error(`No contract found at token address: ${tokenAddress}`);
    }
    // Use IERC20Metadata interface which includes decimals()
    token = await ethers.getContractAt("IERC20Metadata", tokenAddress as string, sender);
    tokenDecimals = Number(await token.decimals());
    console.log("✓ Connected to token contract");
    console.log(`✓ Token decimals: ${tokenDecimals}`);
  } else {
    console.log("✓ Using native XTZ");
  }

  /* ------------------------------ Funding -------------------------------- */
  // Get token decimals for proper amount parsing
  let fundAmount: bigint;
  let transferAmount: bigint;
  
  if (isNative) {
    // For native XTZ, use 18 decimals
    fundAmount = ethers.parseEther(FUND_AMOUNT);
    transferAmount = ethers.parseEther(TRANSFER_AMOUNT);
  } else {
    // For ERC20 tokens, use the actual decimals
    fundAmount = ethers.parseUnits(FUND_AMOUNT, tokenDecimals);
    transferAmount = ethers.parseUnits(TRANSFER_AMOUNT, tokenDecimals);
  }
  
  if (DRY_RUN) {
    console.log(`Dry run: Funding MeshPay with ${FUND_AMOUNT} ${isNative ? "XTZ" : "tokens"} (simulated)`);
  } else {
    if (isNative) {
      console.log(`Funding MeshPay with ${FUND_AMOUNT} XTZ …`);
      const fundTx = await fastPay.handleNativeFundingTransaction({ value: fundAmount });
      await fundTx.wait();
    } else {
      console.log(`Funding MeshPay with ${FUND_AMOUNT} tokens …`);
      
      // Additional debugging
      console.log(`\n=== Funding Transaction Details ===`);
      console.log(`Sender: ${sender.address}`);
      console.log(`Token: ${tokenAddress}`);
      console.log(`Amount: ${ethers.formatUnits(fundAmount, tokenDecimals)} (${fundAmount.toString()})`);
      console.log(`Contract: ${CONTRACT_ADDRESS}`);
      console.log(`Token balance: ${ethers.formatUnits(await token!.balanceOf(sender.address), tokenDecimals)}`);
      console.log(`Allowance: ${ethers.formatUnits(await token!.allowance(sender.address, CONTRACT_ADDRESS as string), tokenDecimals)}`);
      console.log(`=====================================\n`);
      
      console.log(`Approving ${ethers.formatUnits(fundAmount, tokenDecimals)} tokens...`);
      const approveTx = await token!.approve(CONTRACT_ADDRESS as string, fundAmount);
      await approveTx.wait();
      console.log(`Approval successful`);

      
      console.log(`Funding MeshPay contract...`);
      const fundTx = await fastPay.handleFundingTransaction(tokenAddress as string, fundAmount);
      await fundTx.wait();
      console.log(`Funding successful`);
    }
  }

  // /* --------------------------- Create Certificate ------------------------- */
  // // transferAmount is already calculated above

  //   /* ------------------------------ Redeem ---------------------------------- */
  //   console.log("Redeeming certificate …");
  //   const redeemStruct = {
  //     transferCertificate: {
  //       sender: sender.address,
  //       recipient: recipient.address,
  //       token: tokenAddress as string,
  //       amount: transferAmount,
  //       sequenceNumber: SEQUENCE_NUMBER,
  //     },
  //     signature: "0x", // MVP: no committee yet
  //   };
  //   const redeemTx = await fastPay.connect(recipient).handleRedeemTransaction(redeemStruct);
  //   await redeemTx.wait();
  

  /* --------------------------- Test updateBalanceFromConfirmation ------------------------- */
  console.log("\n🧪 Testing updateBalanceFromConfirmation function...");
  
  // Create a test authority (using sender as authority for testing)
  console.log("Setting up test authority...");
  if (!DRY_RUN) {
    try {
      await fastPay.addAuthority(sender.address, "TestAuthority");
      console.log("✓ Added test authority");
    } catch (error) {
      console.log("ℹ️  Authority already exists or not owner");
    }
  }

  // Test 1: Basic confirmation order test
  console.log("\n📋 Test 1: Basic confirmation order test");
  const testOrderId = "test-order-" + Date.now();
  const testConfirmationOrder = {
    transferOrder: {
      orderId: testOrderId,
      sender: sender.address,
      recipient: recipient.address,
      amount: 1,
      token: tokenAddress as string,
      sequenceNumber: SEQUENCE_NUMBER + 1,
      timestamp: Math.floor(Date.now() / 1000),
      signature: "0x"
    },
    authoritySignatures: ["0x"]
  };

  console.log(`Confirmation order: ${JSON.stringify(testConfirmationOrder, null, 2)}`);

  if (DRY_RUN) {
    console.log("Dry run: Would call updateBalanceFromConfirmation (simulated)");
  } else {
    try {
      const updateTx = await fastPay.connect(sender).updateBalanceFromConfirmation(testConfirmationOrder);
      await updateTx.wait();
      console.log("✅ updateBalanceFromConfirmation executed successfully");
      
      // Check balances after update
      const senderBalanceAfter = await fastPay.getAccountBalance(sender.address, tokenAddress as string);
      const recipientBalanceAfter = await fastPay.getAccountBalance(recipient.address, tokenAddress as string);
      
      console.log(`Sender balance after update: ${ethers.formatUnits(senderBalanceAfter, tokenDecimals)}`);
      console.log(`Recipient balance after update: ${ethers.formatUnits(recipientBalanceAfter, tokenDecimals)}`);
    } catch (error) {
      console.error("❌ updateBalanceFromConfirmation failed:", error);
    }
  }

  // Test 2: Real-world data format test (using your provided format)
  console.log("\n📋 Test 2: Real-world data format test");
  const realWorldOrderId = "ebe9dd91-a566-4efe-b830-1c00230dd447";
  const realWorldSender = "0x6F8c8eB1d40cd2b9918334e7E82db9Bc9df4E8B8";
  const realWorldRecipient = "0x75B128c7AE715Ffe273433DbfF63097FDC10804d";
  const realWorldToken = "0x0000000000000000000000000000000000000000"; // Native XTZ
  const realWorldAmount = 1; // Convert from 0 to 1 XTZ for testing
  const realWorldTimestamp = 1754182187;
  const realWorldSignature = "0x";
  const realWorldAuthoritySignatures: string[] = [];

  const realWorldConfirmationOrder = {
    transferOrder: {
      orderId: realWorldOrderId,
      sender: realWorldSender,
      recipient: realWorldRecipient,
      amount: realWorldAmount,
      token: realWorldToken,
      sequenceNumber: 1,
      timestamp: realWorldTimestamp,
      signature: realWorldSignature
    },
    authoritySignatures: realWorldAuthoritySignatures
  };

  console.log(`Real-world confirmation order: ${JSON.stringify(realWorldConfirmationOrder, null, 2)}`);

  if (DRY_RUN) {
    console.log("Dry run: Would call updateBalanceFromConfirmation with real-world data (simulated)");
  } else {
    try {
      // Fund the real-world sender first (if it's a different address)
      if (realWorldSender !== sender.address) {
        console.log(`Funding real-world sender ${realWorldSender}...`);
        // Note: This would require the real-world sender to have funds
        console.log("⚠️  Note: Real-world sender needs to be funded separately");
      }

      const realWorldUpdateTx = await fastPay.connect(sender).updateBalanceFromConfirmation(realWorldConfirmationOrder);
      await realWorldUpdateTx.wait();
      console.log("✅ Real-world updateBalanceFromConfirmation executed successfully");
    } catch (error) {
      console.error("❌ Real-world updateBalanceFromConfirmation failed:", error);
    }
  }
  console.log("\n🧪 updateBalanceFromConfirmation testing completed!");

  /* --------------------------- Final Balances ---------------------------- */
  let senderBal: bigint;
  let recipientBal: bigint;

  if (DRY_RUN) {
    console.log(`Dry run: Checking final balances (simulated)`);
    senderBal = await provider.getBalance(sender.address);
    recipientBal = await provider.getBalance(recipient.address);
  } else {
    if (isNative) {
      senderBal = await provider.getBalance(sender.address);
      recipientBal = await provider.getBalance(recipient.address);
    } else {
      senderBal = await token!.balanceOf(sender.address);
      recipientBal = await token!.balanceOf(recipient.address);
    }
  }

  console.log("\n===== Flow Completed =====");
  console.log(`Network: ${network.name} (Chain ID: ${network.config.chainId})`);
  if (isNative) {
    console.log(`Sender XTZ balance:`, ethers.formatEther(senderBal));
    console.log(`Recipient XTZ balance:`, ethers.formatEther(recipientBal));
  } else {
    console.log(`Sender token balance:`, ethers.formatUnits(senderBal, tokenDecimals));
    console.log(`Recipient token balance:`, ethers.formatUnits(recipientBal, tokenDecimals));
  }
  
  if (DRY_RUN) {
    console.log("\n🔍 This was a dry run - no actual transactions were executed");
    console.log("To execute the actual flow, set DRY_RUN = false in the script");
  } else {
    console.log("\n✅ All transactions completed successfully!");
  }
  
  console.log("==========================\n");
}

main().catch((err: Error) => {
  console.error("MeshPay flow script failed:", err);
  process.exit(1);
}); 