// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/FastPayMVP.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @dev Simple ERC20 token for testing
 */
contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1000000 * 10**18); // Mint 1M tokens
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/**
 * @title FastPayMVPTest
 * @dev Comprehensive test suite for FastPay MVP contract
 */
contract FastPayMVPTest is Test {
    FastPayMVP public fastPay;
    MockERC20 public token;
    
    address public account1 = address(0x1);
    address public account2 = address(0x2);
    address public account3 = address(0x3);
    
    uint256 public constant INITIAL_BALANCE = 1000 * 10**18;
    
    function setUp() public {
        // Deploy contracts
        fastPay = new FastPayMVP();
        token = new MockERC20("TestToken", "TEST");
        
        // Setup accounts with tokens
        token.mint(account1, INITIAL_BALANCE);
        token.mint(account2, INITIAL_BALANCE);
        token.mint(account3, INITIAL_BALANCE);
    }
    
    function testAccountRegistration() public {
        // Test registration
        vm.prank(account1);
        fastPay.registerAccount();
        
        assertTrue(fastPay.isAccountRegistered(account1));
        assertEq(fastPay.totalAccounts(), 1);
        
        (bool registered, uint256 regTime, uint256 lastSequence) = fastPay.getAccountInfo(account1);
        assertTrue(registered);
        assertGt(regTime, 0);
        assertEq(lastSequence, 0);
    }
    
    function testCannotRegisterTwice() public {
        vm.prank(account1);
        fastPay.registerAccount();
        
        vm.prank(account1);
        vm.expectRevert(FastPayMVP.AccountAlreadyRegistered.selector);
        fastPay.registerAccount();
    }
    
    function testFundingTransaction() public {
        // Register account
        vm.prank(account1);
        fastPay.registerAccount();
        
        // Approve and fund tokens
        uint256 fundAmount = 100 * 10**18;
        
        vm.prank(account1);
        token.approve(address(fastPay), fundAmount);
        
        vm.prank(account1);
        fastPay.handleFundingTransaction(address(token), fundAmount);
        
        // Check balances
        assertEq(fastPay.getAccountBalance(account1, address(token)), fundAmount);
        assertEq(fastPay.totalBalance(address(token)), fundAmount);
        assertEq(token.balanceOf(address(fastPay)), fundAmount);
        assertEq(fastPay.lastTransactionIndex(), 1);
    }
    
    function testCannotFundWithoutRegistration() public {
        uint256 fundAmount = 100 * 10**18;
        
        vm.prank(account1);
        token.approve(address(fastPay), fundAmount);
        
        vm.prank(account1);
        vm.expectRevert(FastPayMVP.AccountNotRegistered.selector);
        fastPay.handleFundingTransaction(address(token), fundAmount);
    }
    
    function testTransferCertificateCreation() public {
        // Register accounts and fund
        vm.prank(account1);
        fastPay.registerAccount();
        
        vm.prank(account2);
        fastPay.registerAccount();
        
        uint256 fundAmount = 100 * 10**18;
        vm.prank(account1);
        token.approve(address(fastPay), fundAmount);
        
        vm.prank(account1);
        fastPay.handleFundingTransaction(address(token), fundAmount);
        
        // Create transfer certificate
        uint256 transferAmount = 50 * 10**18;
        uint256 sequenceNumber = 1;
        
        vm.prank(account1);
        bytes32 certHash = fastPay.createTransferCertificate(
            account2, 
            address(token), 
            transferAmount, 
            sequenceNumber
        );
        
        // Check certificate was created
        assertTrue(certHash != bytes32(0));
    }
    
    function testCannotCreateCertificateWithInsufficientBalance() public {
        // Register account
        vm.prank(account1);
        fastPay.registerAccount();
        
        // Try to create certificate without funding
        vm.prank(account1);
        vm.expectRevert(FastPayMVP.InsufficientBalance.selector);
        fastPay.createTransferCertificate(account2, address(token), 100 * 10**18, 1);
    }
    
    function testRedeemTransaction() public {
        // Setup: register accounts and fund
        vm.prank(account1);
        fastPay.registerAccount();
        
        vm.prank(account2);
        fastPay.registerAccount();
        
        uint256 fundAmount = 100 * 10**18;
        vm.prank(account1);
        token.approve(address(fastPay), fundAmount);
        
        vm.prank(account1);
        fastPay.handleFundingTransaction(address(token), fundAmount);
        
        // Create and redeem transfer certificate
        uint256 transferAmount = 50 * 10**18;
        uint256 sequenceNumber = 1;
        
        vm.prank(account1);
        bytes32 certHash = fastPay.createTransferCertificate(
            account2, 
            address(token), 
            transferAmount, 
            sequenceNumber
        );
        
        // Create redeem transaction
        FastPayMVP.RedeemTransaction memory redeemTx = FastPayMVP.RedeemTransaction({
            transferCertificate: FastPayMVP.TransferCertificate({
                sender: account1,
                recipient: account2,
                token: address(token),
                amount: transferAmount,
                sequenceNumber: sequenceNumber,
                timestamp: block.timestamp
            }),
            signature: "" // Empty for MVP
        });
        
        fastPay.handleRedeemTransaction(redeemTx);
        
        // Check balances updated
        assertEq(fastPay.getAccountBalance(account1, address(token)), fundAmount - transferAmount);
        assertEq(fastPay.getAccountBalance(account2, address(token)), transferAmount);
        assertEq(fastPay.getLastRedeemedSequence(account1), sequenceNumber);
        assertTrue(fastPay.isCertificateRedeemed(certHash));
    }
    
    function testCannotRedeemCertificateTwice() public {
        // Setup and create certificate
        vm.prank(account1);
        fastPay.registerAccount();
        
        vm.prank(account2);
        fastPay.registerAccount();
        
        uint256 fundAmount = 100 * 10**18;
        vm.prank(account1);
        token.approve(address(fastPay), fundAmount);
        
        vm.prank(account1);
        fastPay.handleFundingTransaction(address(token), fundAmount);
        
        uint256 transferAmount = 50 * 10**18;
        uint256 sequenceNumber = 1;
        
        FastPayMVP.RedeemTransaction memory redeemTx = FastPayMVP.RedeemTransaction({
            transferCertificate: FastPayMVP.TransferCertificate({
                sender: account1,
                recipient: account2,
                token: address(token),
                amount: transferAmount,
                sequenceNumber: sequenceNumber,
                timestamp: block.timestamp
            }),
            signature: ""
        });
        
        // Redeem certificate first time
        fastPay.handleRedeemTransaction(redeemTx);
        
        // Try to redeem again
        vm.expectRevert(FastPayMVP.CertificateAlreadyRedeemed.selector);
        fastPay.handleRedeemTransaction(redeemTx);
    }
    
    function testSequenceNumberValidation() public {
        // Setup
        vm.prank(account1);
        fastPay.registerAccount();
        
        vm.prank(account2);
        fastPay.registerAccount();
        
        uint256 fundAmount = 100 * 10**18;
        vm.prank(account1);
        token.approve(address(fastPay), fundAmount);
        
        vm.prank(account1);
        fastPay.handleFundingTransaction(address(token), fundAmount);
        
        // Redeem with sequence number 2 first
        FastPayMVP.RedeemTransaction memory redeemTx2 = FastPayMVP.RedeemTransaction({
            transferCertificate: FastPayMVP.TransferCertificate({
                sender: account1,
                recipient: account2,
                token: address(token),
                amount: 20 * 10**18,
                sequenceNumber: 2,
                timestamp: block.timestamp
            }),
            signature: ""
        });
        
        fastPay.handleRedeemTransaction(redeemTx2);
        assertEq(fastPay.getLastRedeemedSequence(account1), 2);
        
        // Try to redeem with sequence number 1 (should fail)
        FastPayMVP.RedeemTransaction memory redeemTx1 = FastPayMVP.RedeemTransaction({
            transferCertificate: FastPayMVP.TransferCertificate({
                sender: account1,
                recipient: account2,
                token: address(token),
                amount: 10 * 10**18,
                sequenceNumber: 1,
                timestamp: block.timestamp
            }),
            signature: ""
        });
        
        vm.expectRevert(FastPayMVP.InvalidSequenceNumber.selector);
        fastPay.handleRedeemTransaction(redeemTx1);
    }
    
    function testRedeemToUnregisteredAccount() public {
        // Setup: register sender only
        vm.prank(account1);
        fastPay.registerAccount();
        
        uint256 fundAmount = 100 * 10**18;
        vm.prank(account1);
        token.approve(address(fastPay), fundAmount);
        
        vm.prank(account1);
        fastPay.handleFundingTransaction(address(token), fundAmount);
        
        // Redeem to unregistered account
        uint256 transferAmount = 50 * 10**18;
        uint256 account2InitialBalance = token.balanceOf(account2);
        
        FastPayMVP.RedeemTransaction memory redeemTx = FastPayMVP.RedeemTransaction({
            transferCertificate: FastPayMVP.TransferCertificate({
                sender: account1,
                recipient: account2,
                token: address(token),
                amount: transferAmount,
                sequenceNumber: 1,
                timestamp: block.timestamp
            }),
            signature: ""
        });
        
        fastPay.handleRedeemTransaction(redeemTx);
        
        // Check account2 received tokens directly on Primary
        assertEq(token.balanceOf(account2), account2InitialBalance + transferAmount);
        assertEq(fastPay.getAccountBalance(account2, address(token)), 0); // Not in FastPay balance
    }
    
    function testInvalidCertificateValidation() public {
        vm.prank(account1);
        fastPay.registerAccount();
        
        // Test certificate with invalid sequence number (0)
        FastPayMVP.RedeemTransaction memory redeemTx = FastPayMVP.RedeemTransaction({
            transferCertificate: FastPayMVP.TransferCertificate({
                sender: account1,
                recipient: account2,
                token: address(token),
                amount: 100 * 10**18,
                sequenceNumber: 0, // Invalid - must be > lastRedeemedSequence (which is 0)
                timestamp: block.timestamp
            }),
            signature: ""
        });
        
        vm.expectRevert(FastPayMVP.InvalidTransferCertificate.selector);
        fastPay.handleRedeemTransaction(redeemTx);
    }
    
    function testFundingTransactionRecord() public {
        vm.prank(account1);
        fastPay.registerAccount();
        
        uint256 fundAmount = 100 * 10**18;
        vm.prank(account1);
        token.approve(address(fastPay), fundAmount);
        
        vm.prank(account1);
        fastPay.handleFundingTransaction(address(token), fundAmount);
        
        // Check funding transaction was recorded
        FastPayMVP.FundingTransaction memory fundingTx = fastPay.getFundingTransaction(0);
        assertEq(fundingTx.sender, account1);
        assertEq(fundingTx.token, address(token));
        assertEq(fundingTx.amount, fundAmount);
        assertEq(fundingTx.transactionIndex, 1);
    }
    
    // Fuzz tests
    function testFuzzAccountRegistration(address account) public {
        vm.assume(account != address(0));
        
        vm.prank(account);
        fastPay.registerAccount();
        
        assertTrue(fastPay.isAccountRegistered(account));
    }
    
    function testFuzzFundingTransaction(uint256 amount) public {
        vm.assume(amount > 0 && amount < INITIAL_BALANCE);
        
        vm.prank(account1);
        fastPay.registerAccount();
        
        vm.prank(account1);
        token.approve(address(fastPay), amount);
        
        vm.prank(account1);
        fastPay.handleFundingTransaction(address(token), amount);
        
        assertEq(fastPay.getAccountBalance(account1, address(token)), amount);
        assertEq(fastPay.totalBalance(address(token)), amount);
    }
} 