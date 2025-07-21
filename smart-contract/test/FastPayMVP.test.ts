import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { FastPayMVP, FastPayAuthorityManager, MockERC20 } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("FastPayMVP", function () {
  let fastPay: FastPayMVP;
  let authorityManager: FastPayAuthorityManager;
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
    const FastPayMVPFactory = await ethers.getContractFactory("FastPayMVP");
    fastPay = await FastPayMVPFactory.deploy();
    await fastPay.waitForDeployment();

    const FastPayAuthorityManagerFactory = await ethers.getContractFactory("FastPayAuthorityManager");
    authorityManager = await FastPayAuthorityManagerFactory.deploy();
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

  describe("Account Registration", function () {
    it("should allow account registration", async function () {
      await expect(fastPay.connect(account1).registerAccount())
        .to.emit(fastPay, "AccountRegistered")
        .withArgs(account1.address, anyValue);

      expect(await fastPay.isAccountRegistered(account1.address)).to.be.true;
      expect(await fastPay.totalAccounts()).to.equal(1);
    });

    it("should prevent double registration", async function () {
      await fastPay.connect(account1).registerAccount();
      
      await expect(fastPay.connect(account1).registerAccount())
        .to.be.revertedWith("Account already registered");
    });

    it("should track registration time", async function () {
      const tx = await fastPay.connect(account1).registerAccount();
      const receipt = await tx.wait();
      const timestamp = await time.latest();

      const accountInfo = await fastPay.getAccountInfo(account1.address);
      expect(accountInfo.registrationTime).to.be.closeTo(timestamp, 5);
    });
  });

  describe("Funding Transactions", function () {
    beforeEach(async function () {
      await fastPay.connect(account1).registerAccount();
      await token.connect(account1).approve(await fastPay.getAddress(), INITIAL_BALANCE);
    });

    it("should handle funding transactions", async function () {
      const fundAmount = ethers.parseEther("100");

      await expect(fastPay.connect(account1).handleFundingTransaction(await token.getAddress(), fundAmount))
        .to.emit(fastPay, "FundingTransactionProcessed")
        .withArgs(account1.address, await token.getAddress(), fundAmount, anyValue, anyValue);

      expect(await fastPay.getAccountBalance(account1.address, await token.getAddress())).to.equal(fundAmount);
      expect(await fastPay.totalBalance(await token.getAddress())).to.equal(fundAmount);
    });

    it("should prevent funding unregistered accounts", async function () {
      const fundAmount = ethers.parseEther("100");

      await expect(fastPay.connect(account2).handleFundingTransaction(await token.getAddress(), fundAmount))
        .to.be.revertedWith("Account not registered");
    });

    it("should prevent funding with zero amount", async function () {
      await expect(fastPay.connect(account1).handleFundingTransaction(await token.getAddress(), 0))
        .to.be.revertedWith("Amount must be greater than zero");
    });

    it("should handle multiple funding transactions", async function () {
      const fundAmount1 = ethers.parseEther("100");
      const fundAmount2 = ethers.parseEther("50");

      await fastPay.connect(account1).handleFundingTransaction(await token.getAddress(), fundAmount1);
      await fastPay.connect(account1).handleFundingTransaction(await token.getAddress(), fundAmount2);

      expect(await fastPay.getAccountBalance(account1.address, await token.getAddress()))
        .to.equal(fundAmount1 + fundAmount2);
    });
  });

  describe("Transfer Certificates", function () {
    beforeEach(async function () {
      await fastPay.connect(account1).registerAccount();
      await fastPay.connect(account2).registerAccount();
      await token.connect(account1).approve(await fastPay.getAddress(), INITIAL_BALANCE);
      await fastPay.connect(account1).handleFundingTransaction(await token.getAddress(), ethers.parseEther("500"));
    });

    it("should create transfer certificates", async function () {
      const transferAmount = ethers.parseEther("100");
      const sequenceNumber = 1;

      await expect(fastPay.connect(account1).createTransferCertificate(
        account2.address,
        await token.getAddress(),
        transferAmount,
        sequenceNumber
      ))
        .to.emit(fastPay, "TransferCertificateCreated")
        .withArgs(account1.address, account2.address, await token.getAddress(), transferAmount, sequenceNumber, anyValue);
    });

    it("should prevent invalid sequence numbers", async function () {
      const transferAmount = ethers.parseEther("100");
      const invalidSequence = 0;

      await expect(fastPay.connect(account1).createTransferCertificate(
        account2.address,
        await token.getAddress(),
        transferAmount,
        invalidSequence
      )).to.be.revertedWith("Invalid sequence number");
    });

    it("should prevent insufficient balance", async function () {
      const transferAmount = ethers.parseEther("1000"); // More than available
      const sequenceNumber = 1;

      await expect(fastPay.connect(account1).createTransferCertificate(
        account2.address,
        await token.getAddress(),
        transferAmount,
        sequenceNumber
      )).to.be.revertedWith("Insufficient balance");
    });

    it("should prevent self-transfers", async function () {
      const transferAmount = ethers.parseEther("100");
      const sequenceNumber = 1;

      await expect(fastPay.connect(account1).createTransferCertificate(
        account1.address,
        await token.getAddress(),
        transferAmount,
        sequenceNumber
      )).to.be.revertedWith("Cannot transfer to self");
    });
  });

  describe("Redemption Transactions", function () {
    beforeEach(async function () {
      await fastPay.connect(account1).registerAccount();
      await fastPay.connect(account2).registerAccount();
      await token.connect(account1).approve(await fastPay.getAddress(), INITIAL_BALANCE);
      await fastPay.connect(account1).handleFundingTransaction(await token.getAddress(), ethers.parseEther("500"));
    });

    it("should handle redemption transactions", async function () {
      const transferAmount = ethers.parseEther("100");
      const sequenceNumber = 1;

      // Create certificate
      await fastPay.connect(account1).createTransferCertificate(
        account2.address,
        await token.getAddress(),
        transferAmount,
        sequenceNumber
      );

      // Create redemption transaction
      const redeemTx = {
        transferCertificate: {
          sender: account1.address,
          recipient: account2.address,
          token: await token.getAddress(),
          amount: transferAmount,
          sequenceNumber: sequenceNumber,
          timestamp: await time.latest(),
        },
        signature: "0x", // Empty signature for MVP
      };

      await expect(fastPay.connect(account2).handleRedeemTransaction(redeemTx))
        .to.emit(fastPay, "RedeemTransactionProcessed")
        .withArgs(
          account1.address,
          account2.address,
          await token.getAddress(),
          transferAmount,
          sequenceNumber,
          anyValue
        );

      expect(await fastPay.getLastRedeemedSequence(account1.address)).to.equal(sequenceNumber);
      expect(await token.balanceOf(account2.address)).to.equal(INITIAL_BALANCE + transferAmount);
    });

    it("should prevent double redemption", async function () {
      const transferAmount = ethers.parseEther("100");
      const sequenceNumber = 1;

      // Create certificate
      await fastPay.connect(account1).createTransferCertificate(
        account2.address,
        await token.getAddress(),
        transferAmount,
        sequenceNumber
      );

      const redeemTx = {
        transferCertificate: {
          sender: account1.address,
          recipient: account2.address,
          token: await token.getAddress(),
          amount: transferAmount,
          sequenceNumber: sequenceNumber,
          timestamp: await time.latest(),
        },
        signature: "0x",
      };

      // First redemption should succeed
      await fastPay.connect(account2).handleRedeemTransaction(redeemTx);

      // Second redemption should fail
      await expect(fastPay.connect(account2).handleRedeemTransaction(redeemTx))
        .to.be.revertedWith("Certificate already redeemed or invalid sequence");
    });

    it("should prevent expired certificates", async function () {
      const transferAmount = ethers.parseEther("100");
      const sequenceNumber = 1;

      // Create certificate
      await fastPay.connect(account1).createTransferCertificate(
        account2.address,
        await token.getAddress(),
        transferAmount,
        sequenceNumber
      );

      // Fast forward time by more than 24 hours
      await time.increase(25 * 60 * 60); // 25 hours

      const redeemTx = {
        transferCertificate: {
          sender: account1.address,
          recipient: account2.address,
          token: await token.getAddress(),
          amount: transferAmount,
          sequenceNumber: sequenceNumber,
          timestamp: (await time.latest()) - (25 * 60 * 60), // Old timestamp
        },
        signature: "0x",
      };

      await expect(fastPay.connect(account2).handleRedeemTransaction(redeemTx))
        .to.be.revertedWith("Certificate expired");
    });
  });

  describe("Balance Management", function () {
    beforeEach(async function () {
      await fastPay.connect(account1).registerAccount();
      await fastPay.connect(account2).registerAccount();
      await token.connect(account1).approve(await fastPay.getAddress(), INITIAL_BALANCE);
    });

    it("should track balances correctly", async function () {
      const fundAmount = ethers.parseEther("200");
      
      await fastPay.connect(account1).handleFundingTransaction(await token.getAddress(), fundAmount);

      expect(await fastPay.getAccountBalance(account1.address, await token.getAddress())).to.equal(fundAmount);
      expect(await fastPay.totalBalance(await token.getAddress())).to.equal(fundAmount);
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
    it("should allow only registered accounts to create certificates", async function () {
      await fastPay.connect(account1).registerAccount();
      
      await expect(fastPay.connect(account2).createTransferCertificate(
        account1.address,
        await token.getAddress(),
        ethers.parseEther("100"),
        1
      )).to.be.revertedWith("Account not registered");
    });

    it("should allow anyone to register accounts", async function () {
      await expect(fastPay.connect(account1).registerAccount()).to.not.be.reverted;
      await expect(fastPay.connect(account2).registerAccount()).to.not.be.reverted;
    });
  });

  describe("Gas Optimization", function () {
    it("should use reasonable gas for registration", async function () {
      const tx = await fastPay.connect(account1).registerAccount();
      const receipt = await tx.wait();
      
      expect(receipt!.gasUsed).to.be.lessThan(100000);
    });

    it("should use reasonable gas for funding", async function () {
      await fastPay.connect(account1).registerAccount();
      await token.connect(account1).approve(await fastPay.getAddress(), INITIAL_BALANCE);
      
      const tx = await fastPay.connect(account1).handleFundingTransaction(
        await token.getAddress(),
        ethers.parseEther("100")
      );
      const receipt = await tx.wait();
      
      expect(receipt!.gasUsed).to.be.lessThan(150000);
    });
  });
}); 