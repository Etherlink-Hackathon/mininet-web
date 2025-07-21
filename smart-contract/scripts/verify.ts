import { run, network } from "hardhat";

async function main(): Promise<void> {
  const contractAddress = process.argv[2];
  const constructorArgs = process.argv.slice(3);

  if (!contractAddress) {
    console.error("Please provide contract address as first argument");
    console.error("Usage: npx hardhat run scripts/verify.ts -- <CONTRACT_ADDRESS> [CONSTRUCTOR_ARGS...]");
    process.exit(1);
  }

  console.log("========================================");
  console.log("Contract Verification");
  console.log("========================================");
  console.log("Network:", network.name);
  console.log("Contract Address:", contractAddress);
  console.log("Constructor Args:", constructorArgs);

  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: constructorArgs,
    });

    console.log("✅ Contract verification successful!");
  } catch (error: any) {
    if (error.message.toLowerCase().includes("already verified")) {
      console.log("✅ Contract already verified!");
    } else {
      console.error("❌ Verification failed:", error.message);
      throw error;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error("Verification failed:", error);
    process.exit(1);
  }); 