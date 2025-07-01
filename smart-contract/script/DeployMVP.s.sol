// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/FastPayMVP.sol";

/**
 * @title DeployMVP
 * @dev Deployment script for FastPay MVP contract
 * Based on the original FastPay design by Facebook/Meta
 */
contract DeployMVP is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("========================================");
        console.log("FastPay MVP Deployment");
        console.log("========================================");
        console.log("Deployer:", deployer);
        console.log("Deployer balance:", deployer.balance);
        console.log("Chain ID:", block.chainid);
        console.log("Block number:", block.number);
        
        vm.startBroadcast(deployerPrivateKey);

        // Deploy FastPay MVP contract
        FastPayMVP fastPay = new FastPayMVP();

        vm.stopBroadcast();

        console.log("========================================");
        console.log("Deployment Successful!");
        console.log("========================================");
        console.log("FastPay MVP Contract:", address(fastPay));
        console.log("Total Accounts:", fastPay.totalAccounts());
        console.log("Last Transaction Index:", fastPay.lastTransactionIndex());
        console.log("");
        console.log("Next Steps:");
        console.log("1. Register accounts with: fastPay.registerAccount()");
        console.log("2. Fund accounts with: fastPay.handleFundingTransaction(token, amount)");
        console.log("3. Create certificates with: fastPay.createTransferCertificate(...)");
        console.log("4. Redeem transfers with: fastPay.handleRedeemTransaction(...)");
        console.log("");
        console.log("FastPay System ready for offline payments!");
        console.log("========================================");
    }
} 