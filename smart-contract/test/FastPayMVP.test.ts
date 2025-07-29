import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { MeshPayMVP, MeshPayAuthorityManager, MockERC20 } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("MeshPayMVP", function () {
  let fastPay: MeshPayMVP;
  let authorityManager: MeshPayAuthorityManager;
  let token: MockERC20;
  let deployer: SignerWithAddress;
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;
  let account3: SignerWithAddress;

  const INITIAL_BALANCE = ethers.parseEther("1000");
  const INITIAL_ETH = ethers.parseEther("1000");

  beforeEach(async function () {
    // Get signers
    [deployer, account1, account2, account3] = await ethers.getSigners();

    // Deploy contracts
    const MeshPayMVPFactory = await ethers.getContractFactory("MeshPayMVP");
    fastPay = await MeshPayMVPFactory.deploy();
    await fastPay.waitForDeployment();

    const MeshPayAuthorityManagerFactory = await ethers.getContractFactory("MeshPayAuthorityManager");
    authorityManager = await MeshPayAuthorityManagerFactory.deploy();
    await authorityManager.waitForDeployment();

    // Deploy mock token
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    token = await MockERC20Factory.deploy("TestToken", "TEST");
    await token.waitForDeployment();

    // Mint tokens to accounts
    await token.mint(account1.address, INITIAL_BALANCE);
    await token.mint(account2.address, INITIAL_BALANCE);
    await token.mint(account3.address, INITIAL_BALANCE);

    // Set up ETH balances (already done by Hardhat)
    // await network.provider.send("hardhat_setBalance", [account1.address, INITIAL_ETH.toString()]);
  });

  describe("Funding Transactions", function () {
    beforeEach(async function () {
      // Registration happens automatically during funding
      await token.connect(account1).approve(await fastPay.getAddress(), INITIAL_BALANCE);
    });

    it("should handle funding transactions", async function () {
      const fundAmount = ethers.parseEther("100");

      await expect(fastPay.connect(account1).handleFundingTransaction(await token.getAddress(), fundAmount))
        .to.emit(fastPay, "FundingCompleted")
        .withArgs(account1.address, await token.getAddress(), fundAmount, anyValue);

      expect(await fastPay.getAccountBalance(account1.address, await token.getAddress())).to.equal(fundAmount);
    });


    it("should prevent funding with zero amount", async function () {
      await expect(fastPay.connect(account1).handleFundingTransaction(await token.getAddress(), 0))
        .to.be.revertedWithCustomError(fastPay, "InvalidAmount");
    });

    it("should handle multiple funding transactions", async function () {
      const fundAmount1 = ethers.parseEther("100");
      const fundAmount2 = ethers.parseEther("50");

      await fastPay.connect(account1).handleFundingTransaction(await token.getAddress(), fundAmount1);
      await fastPay.connect(account1).handleFundingTransaction(await token.getAddress(), fundAmount2);

      expect(await fastPay.getAccountBalance(account1.address, await token.getAddress()))
        .to.equal(fundAmount1 + fundAmount2);
    });

    it("should prevent using native token address in ERC20 funding", async function () {
      const fundAmount = ethers.parseEther("100");
      const nativeToken = await fastPay.NATIVE_TOKEN();

      await expect(fastPay.connect(account1).handleFundingTransaction(nativeToken, fundAmount))
        .to.be.revertedWith("Use handleNativeFundingTransaction for XTZ");
    });
  });

  describe("Native XTZ Funding Transactions", function () {
    beforeEach(async function () {
      // Registration happens automatically during funding
    });

    it("should handle native XTZ funding transactions", async function () {
      const fundAmount = ethers.parseEther("100");
      const nativeToken = await fastPay.NATIVE_TOKEN();

      await expect(fastPay.connect(account1).handleNativeFundingTransaction({ value: fundAmount }))
        .to.emit(fastPay, "FundingCompleted")
        .withArgs(account1.address, nativeToken, fundAmount, anyValue);

      expect(await fastPay.getAccountBalance(account1.address, nativeToken)).to.equal(fundAmount);
    });


    it("should prevent native funding with zero amount", async function () {
      await expect(fastPay.connect(account1).handleNativeFundingTransaction({ value: 0 }))
        .to.be.revertedWithCustomError(fastPay, "InvalidAmount");
    });

    it("should handle multiple native funding transactions", async function () {
      const fundAmount1 = ethers.parseEther("100");
      const fundAmount2 = ethers.parseEther("50");
      const nativeToken = await fastPay.NATIVE_TOKEN();

      await fastPay.connect(account1).handleNativeFundingTransaction({ value: fundAmount1 });
      await fastPay.connect(account1).handleNativeFundingTransaction({ value: fundAmount2 });

      expect(await fastPay.getAccountBalance(account1.address, nativeToken))
        .to.equal(fundAmount1 + fundAmount2);
    });

    it("should correctly identify native token", async function () {
      const nativeToken = await fastPay.NATIVE_TOKEN();
      expect(await fastPay.isNativeToken(nativeToken)).to.be.true;
      expect(await fastPay.isNativeToken(await token.getAddress())).to.be.false;
    });
  });


  describe("Redemption Transactions", function () {
    beforeEach(async function () {
      // Registration happens automatically during funding
      await token.connect(account1).approve(await fastPay.getAddress(), INITIAL_BALANCE);
      await fastPay.connect(account1).handleFundingTransaction(await token.getAddress(), ethers.parseEther("500"));
    });

    it("should handle redemption transactions", async function () {
      const transferAmount = ethers.parseEther("100");
      const sequenceNumber = 1;

      // Create redemption transaction
      const redeemTx = {
        transferCertificate: {
          sender: account1.address,
          recipient: account2.address,
          token: await token.getAddress(),
          amount: transferAmount,
          sequenceNumber: sequenceNumber,
        },
        signature: "0x", // Empty signature for MVP
      };

      await expect(fastPay.connect(account2).handleRedeemTransaction(redeemTx))
        .to.emit(fastPay, "RedemptionCompleted")
        .withArgs(
          account1.address,
          account2.address,
          await token.getAddress(),
          transferAmount,
          sequenceNumber,
          anyValue,
          "0x"
        );

      expect(await fastPay.getLastRedeemedSequence(account1.address)).to.equal(sequenceNumber);
      expect(await token.balanceOf(account2.address)).to.equal(INITIAL_BALANCE + transferAmount);
    });

    it("should handle native XTZ redemption transactions", async function () {
      const fundAmount = ethers.parseEther("500");
      const transferAmount = ethers.parseEther("100");
      const sequenceNumber = 1;
      const nativeToken = await fastPay.NATIVE_TOKEN();

      // Fund with native XTZ first
      await fastPay.connect(account1).handleNativeFundingTransaction({ value: fundAmount });



      const initialBalance = await ethers.provider.getBalance(account2.address);

      // Create redemption transaction
      const redeemTx = {
        transferCertificate: {
          sender: account1.address,
          recipient: account2.address,
          token: nativeToken,
          amount: transferAmount,
          sequenceNumber: sequenceNumber,
        },
        signature: "0x",
      };

      await expect(fastPay.connect(account2).handleRedeemTransaction(redeemTx))
        .to.emit(fastPay, "RedemptionCompleted")
        .withArgs(
          account1.address,
          account2.address,
          nativeToken,
          transferAmount,
          sequenceNumber,
          anyValue,
          "0x"
        );

      expect(await fastPay.getLastRedeemedSequence(account1.address)).to.equal(sequenceNumber);
      // Check that account2 received the native XTZ (allowing for gas costs)
      const finalBalance = await ethers.provider.getBalance(account2.address);
      expect(finalBalance).to.be.closeTo(initialBalance + transferAmount, ethers.parseEther("0.01"));
    });

    it("should prevent double redemption", async function () {
      const transferAmount = ethers.parseEther("100");
      const sequenceNumber = 1;



      const redeemTx = {
        transferCertificate: {
          sender: account1.address,
          recipient: account2.address,
          token: await token.getAddress(),
          amount: transferAmount,
          sequenceNumber: sequenceNumber,
        },
        signature: "0x",
      };

      // First redemption should succeed
      await fastPay.connect(account2).handleRedeemTransaction(redeemTx);

      // Second redemption should fail
      await expect(fastPay.connect(account2).handleRedeemTransaction(redeemTx))
        .to.be.revertedWithCustomError(fastPay, "CertificateAlreadyRedeemed");
    });

  });

  describe("Balance Management", function () {
    beforeEach(async function () {
      // Registration happens automatically during funding
      await token.connect(account1).approve(await fastPay.getAddress(), INITIAL_BALANCE);
    });

    it("should track balances correctly", async function () {
      const fundAmount = ethers.parseEther("200");
      
      await fastPay.connect(account1).handleFundingTransaction(await token.getAddress(), fundAmount);

      expect(await fastPay.getAccountBalance(account1.address, await token.getAddress())).to.equal(fundAmount);
    });

    it("should handle multiple token types", async function () {
      // Deploy second token
      const MockERC20Factory = await ethers.getContractFactory("MockERC20");
      const token2: MockERC20 = await MockERC20Factory.deploy("TestToken2", "TEST2");
      await token2.waitForDeployment();
      await token2.mint(account1.address, INITIAL_BALANCE);
      await token2.connect(account1).approve(await fastPay.getAddress(), INITIAL_BALANCE);

      const fundAmount1 = ethers.parseEther("100");
      const fundAmount2 = ethers.parseEther("200");

      await fastPay.connect(account1).handleFundingTransaction(await token.getAddress(), fundAmount1);
      await fastPay.connect(account1).handleFundingTransaction(await token2.getAddress(), fundAmount2);

      expect(await fastPay.getAccountBalance(account1.address, await token.getAddress())).to.equal(fundAmount1);
      expect(await fastPay.getAccountBalance(account1.address, await token2.getAddress())).to.equal(fundAmount2);
    });
  });

  describe("Access Control", function () {
    it("should allow anyone to register accounts", async function () {
      // Test registration via funding
      await token.connect(account1).approve(await fastPay.getAddress(), INITIAL_BALANCE);
      await token.connect(account2).approve(await fastPay.getAddress(), INITIAL_BALANCE);
      await expect(fastPay.connect(account1).handleFundingTransaction(await token.getAddress(), ethers.parseEther("100"))).to.not.be.reverted;
      await expect(fastPay.connect(account2).handleFundingTransaction(await token.getAddress(), ethers.parseEther("100"))).to.not.be.reverted;
    });

    it("should return all registered accounts", async function () {
      // Register multiple accounts via funding
      await token.connect(account1).approve(await fastPay.getAddress(), INITIAL_BALANCE);
      await token.connect(account2).approve(await fastPay.getAddress(), INITIAL_BALANCE);
      await token.connect(account3).approve(await fastPay.getAddress(), INITIAL_BALANCE);
      
      await fastPay.connect(account1).handleFundingTransaction(await token.getAddress(), ethers.parseEther("100"));
      await fastPay.connect(account2).handleFundingTransaction(await token.getAddress(), ethers.parseEther("100"));
      await fastPay.connect(account3).handleFundingTransaction(await token.getAddress(), ethers.parseEther("100"));
      
      const registeredAccounts = await fastPay.getRegisteredAccounts();
      expect(registeredAccounts.length).to.equal(3);
      expect(registeredAccounts).to.include(account1.address);
      expect(registeredAccounts).to.include(account2.address);
      expect(registeredAccounts).to.include(account3.address);
    });
  });

  describe("Gas Optimization", function () {
    it("should use reasonable gas for registration", async function () {
      await token.connect(account1).approve(await fastPay.getAddress(), INITIAL_BALANCE);
      const tx = await fastPay.connect(account1).handleFundingTransaction(await token.getAddress(), ethers.parseEther("100"));
      const receipt = await tx.wait();
      
      expect(receipt!.gasUsed).to.be.lessThan(500000);
    });

    it("should use reasonable gas for funding", async function () {
      // Registration happens automatically during funding
      await token.connect(account1).approve(await fastPay.getAddress(), INITIAL_BALANCE);
      
      const tx = await fastPay.connect(account1).handleFundingTransaction(
        await token.getAddress(),
        ethers.parseEther("100")
      );
      const receipt = await tx.wait();
      
      expect(receipt!.gasUsed).to.be.lessThan(500000);
    });
  });
}); 