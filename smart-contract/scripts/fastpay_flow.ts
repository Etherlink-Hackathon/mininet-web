import { ethers, network } from "hardhat";
// We use require() here instead of import to avoid TypeScript declaration issues
// with the yargs module when no @types/yargs is installed in the repo.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const yargs = require("yargs/yargs");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { hideBin } = require("yargs/helpers");

import { MeshPayMVP } from "../typechain-types";

/**
 * MeshPay end-to-end demo script.
 *
 * Usage example:
 *   npx hardhat run scripts/meshpay_flow.ts --network sepolia \
 *     --meshpay 0xMeshPayAddress \
 *     --token 0xTokenAddress \
 *     --senderKey <PRIVATE_KEY_1> \
 *     --recipientKey <PRIVATE_KEY_2> \
 *     --fund 500 --transfer 100 --seq 1
 *
 * For native XTZ:
 *   npx hardhat run scripts/meshpay_flow.ts --network sepolia \
 *     --meshpay 0xMeshPayAddress \
 *     --native \
 *     --senderKey <PRIVATE_KEY_1> \
 *     --recipientKey <PRIVATE_KEY_2> \
 *     --fund 500 --transfer 100 --seq 1
 *
 * Options:
 *   --meshpay       MeshPayMVP contract address (required)
 *   --token         ERC-20 token address (required)
 *   --senderKey     Sender's private key (required)
 *   --recipientKey  Recipient's private key (required)
 *   --fund          Amount to deposit into MeshPay (in human units, e.g. "500")
 *   --transfer      Amount to transfer (certificate amount, e.g. "100")
 *   --seq           Sequence number (default = 1)
 *   --native        Use native XTZ instead of ERC-20 token
 */

async function main(): Promise<void> {
  /* ----------------------------- CLI Arguments ----------------------------- */
  const argv = await yargs(hideBin(process.argv))
    .option("meshpay", { type: "string", demandOption: true, desc: "MeshPayMVP contract address" })
    .option("token", { type: "string", desc: "ERC-20 token address (not needed if --native)" })
    .option("native", { type: "boolean", default: false, desc: "Use native XTZ token" })
    .option("senderKey", { type: "string", demandOption: true, desc: "Sender private key" })
    .option("recipientKey", { type: "string", demandOption: true, desc: "Recipient private key" })
    .option("fund", { type: "string", demandOption: true, desc: "Amount to fund (human-readable)" })
    .option("transfer", { type: "string", demandOption: true, desc: "Amount to transfer (human-readable)" })
    .option("seq", { type: "number", default: 1, desc: "Transfer sequence number" })
    .check((argv: any) => {
      if (!argv.native && !argv.token) {
        throw new Error("Either --token or --native must be specified");
      }
      return true;
    })
    .help()
    .alias("help", "h").argv;

  /* ----------------------------- Setup Signers ---------------------------- */
  const provider = ethers.provider;
  const sender = new ethers.Wallet(argv.senderKey as string, provider);
  const recipient = new ethers.Wallet(argv.recipientKey as string, provider);

  const isNative = argv.native as boolean;
  const tokenAddress = isNative ? "0x0000000000000000000000000000000000000000" : (argv.token as string);

  console.log("\n========= MeshPay Flow =========");
  console.log("Network:", network.name);
  console.log("Sender:", sender.address);
  console.log("Recipient:", recipient.address);
  console.log("MeshPay Contract:", argv.meshpay);
  console.log("Token:", isNative ? "Native XTZ" : tokenAddress);
  console.log("================================\n");

  /* --------------------------- Contract Instances ------------------------- */
  const fastPay: MeshPayMVP = await ethers.getContractAt("MeshPayMVP", argv.meshpay as string, sender);
  const token = isNative ? null : await ethers.getContractAt("IERC20", tokenAddress, sender);

  /* ---------------------------- Register Users --------------------------- */
  if (!(await fastPay.isAccountRegistered(sender.address))) {
    console.log("Registering sender account …");
    const tx = await fastPay.registerAccount();
    await tx.wait();
  }
  if (!(await fastPay.isAccountRegistered(recipient.address))) {
    console.log("Registering recipient account …");
    const tx = await fastPay.connect(recipient).registerAccount();
    await tx.wait();
  }

  /* ------------------------------ Funding -------------------------------- */
  const fundAmount = ethers.parseEther(argv.fund as string);
  if (isNative) {
    console.log(`Funding MeshPay with ${argv.fund} XTZ …`);
    const fundTx = await fastPay.handleNativeFundingTransaction({ value: fundAmount });
    await fundTx.wait();
  } else {
    console.log(`Funding MeshPay with ${argv.fund} tokens …`);
    const approveTx = await token!.approve(argv.meshpay as string, fundAmount);
    await approveTx.wait();
    const fundTx = await fastPay.handleFundingTransaction(tokenAddress, fundAmount);
    await fundTx.wait();
  }

  /* --------------------------- Create Certificate ------------------------- */
  const transferAmount = ethers.parseEther(argv.transfer as string);
  console.log(`Creating certificate for ${argv.transfer} ${isNative ? "XTZ" : "tokens"} …`);
  const certTx = await fastPay.createTransferCertificate(
    recipient.address,
    tokenAddress,
    transferAmount,
    argv.seq as number
  );
  const certReceipt = await certTx.wait();

  //   Retrieve block timestamp to fill the certificate
  const block = await provider.getBlock(certReceipt!.blockNumber!);
  const timestamp = block!.timestamp;

  /* ------------------------------ Redeem ---------------------------------- */
  console.log("Redeeming certificate …");
  const redeemStruct = {
    transferCertificate: {
      sender: sender.address,
      recipient: recipient.address,
      token: tokenAddress,
      amount: transferAmount,
      sequenceNumber: argv.seq as number,
      timestamp,
    },
    signature: "0x", // MVP: no committee yet
  };
  const redeemTx = await fastPay.connect(recipient).handleRedeemTransaction(redeemStruct);
  await redeemTx.wait();

  /* --------------------------- Final Balances ---------------------------- */
  let senderBal: bigint;
  let recipientBal: bigint;

  if (isNative) {
    senderBal = await provider.getBalance(sender.address);
    recipientBal = await provider.getBalance(recipient.address);
  } else {
    senderBal = await token!.balanceOf(sender.address);
    recipientBal = await token!.balanceOf(recipient.address);
  }

  console.log("\n===== Flow Completed =====");
  console.log(`Sender ${isNative ? "XTZ" : "token"} balance:`, ethers.formatEther(senderBal));
  console.log(`Recipient ${isNative ? "XTZ" : "token"} balance:`, ethers.formatEther(recipientBal));
  console.log("==========================\n");
}

main().catch((err: Error) => {
  console.error("MeshPay flow script failed:", err);
  process.exit(1);
}); 