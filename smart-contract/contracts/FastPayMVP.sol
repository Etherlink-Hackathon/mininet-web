// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FastPayMVP
 * @dev Minimal viable FastPay smart contract for Primary blockchain
 * Based on the original FastPay design by Facebook/Meta
 * @author FastPay Team
 */
contract FastPayMVP is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @dev Account state on Primary blockchain
    struct AccountOnchainState {
        bool registered;
        uint256 registrationTime;
        /// Prevent spending actions from this account to Primary to be redeemed more than once
        /// Last sequence number that was successfully redeemed to Primary
        uint256 lastRedeemedSequence;
        /// FastPay account balance (funded from Primary)
        mapping(address => uint256) balances; // token => balance
    }

    /// @dev Funding transaction from Primary to FastPay
    struct FundingTransaction {
        address sender;
        address token;
        uint256 amount;
        uint256 timestamp;
        uint256 transactionIndex;
    }

    /// @dev Transfer certificate for off-chain FastPay payments
    struct TransferCertificate {
        address sender;
        address recipient;
        address token;
        uint256 amount;
        uint256 sequenceNumber;
        uint256 timestamp;
    }

    /// @dev Redeem transaction from FastPay to Primary
    struct RedeemTransaction {
        TransferCertificate transferCertificate;
        bytes signature; // For future committee validation
    }

    /// @dev State variables
    mapping(address => AccountOnchainState) private accounts;
    mapping(bytes32 => bool) private processedRedemptions;
    
    /// Total balance of tokens in the FastPay system
    mapping(address => uint256) public totalBalance;
    
    /// The latest transaction index included in the blockchain
    uint256 public lastTransactionIndex;
    
    /// Record of funding transactions
    FundingTransaction[] public blockchain;
    
    uint256 public totalAccounts;

    /// @dev Events matching original FastPay design
    event AccountRegistered(address indexed account, uint256 timestamp);
    event FundingCompleted(address indexed sender, address indexed token, uint256 amount, uint256 transactionIndex);
    event RedemptionCompleted(address indexed sender, address indexed recipient, address indexed token, uint256 amount, uint256 sequenceNumber);
    event TransferCertificateCreated(address indexed sender, address indexed recipient, bytes32 certificateHash);

    /// @dev Custom errors
    error AccountNotRegistered();
    error AccountAlreadyRegistered();
    error InsufficientBalance();
    error InvalidAmount();
    error InvalidAddress();
    error CertificateAlreadyRedeemed();
    error InvalidSequenceNumber();
    error InvalidTransferCertificate();

    /// @dev Modifiers
    modifier onlyRegisteredAccount() {
        if (!accounts[msg.sender].registered) revert AccountNotRegistered();
        _;
    }

    modifier validAmount(uint256 amount) {
        if (amount == 0) revert InvalidAmount();
        _;
    }

    modifier validAddress(address addr) {
        if (addr == address(0)) revert InvalidAddress();
        _;
    }

    /**
     * @dev Register a new FastPay account (free registration)
     */
    function registerAccount() external {
        if (accounts[msg.sender].registered) revert AccountAlreadyRegistered();

        accounts[msg.sender].registered = true;
        accounts[msg.sender].registrationTime = block.timestamp;
        accounts[msg.sender].lastRedeemedSequence = 0;
        
        totalAccounts++;

        emit AccountRegistered(msg.sender, block.timestamp);
    }

    /**
     * @dev Check if an account is registered with FastPay
     * @param account The account address to check
     * @return bool Whether the account is registered
     */
    function isAccountRegistered(address account) external view returns (bool) {
        return accounts[account].registered;
    }

    /**
     * @dev Get account information
     * @param account The account address
     * @return registered Whether the account is registered
     * @return registrationTime When the account was registered
     * @return lastRedeemedSequence Last redeemed sequence number
     */
    function getAccountInfo(address account) 
        external 
        view 
        returns (bool registered, uint256 registrationTime, uint256 lastRedeemedSequence) 
    {
        AccountOnchainState storage acc = accounts[account];
        return (acc.registered, acc.registrationTime, acc.lastRedeemedSequence);
    }

    /**
     * @dev Get account balance for a specific token
     * @param account The account address
     * @param token The token address
     * @return balance The account's FastPay balance for the token
     */
    function getAccountBalance(address account, address token) external view returns (uint256) {
        return accounts[account].balances[token];
    }

    /**
     * @dev Handle funding transaction from Primary to FastPay
     * This represents transferring tokens from Primary blockchain to FastPay system
     * @param token The ERC20 token address
     * @param amount The amount to fund
     */
    function handleFundingTransaction(
        address token,
        uint256 amount
    ) 
        external 
        nonReentrant
        onlyRegisteredAccount
        validAddress(token)
        validAmount(amount)
    {
        // Transfer tokens from Primary (msg.sender) to FastPay system (this contract)
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        // Update account balance in FastPay system
        accounts[msg.sender].balances[token] += amount;
        
        // Update total balance in the system
        totalBalance[token] += amount;
        
        // Record the funding transaction
        lastTransactionIndex++;
        blockchain.push(FundingTransaction({
            sender: msg.sender,
            token: token,
            amount: amount,
            timestamp: block.timestamp,
            transactionIndex: lastTransactionIndex
        }));

        emit FundingCompleted(msg.sender, token, amount, lastTransactionIndex);
    }

    /**
     * @dev Create a transfer certificate for off-chain payments
     * @param recipient The recipient address
     * @param token The token address
     * @param amount The transfer amount
     * @param sequenceNumber The sequence number for replay protection
     * @return bytes32 The certificate hash
     */
    function createTransferCertificate(
        address recipient,
        address token,
        uint256 amount,
        uint256 sequenceNumber
    ) 
        external 
        onlyRegisteredAccount
        validAddress(recipient)
        validAddress(token)
        validAmount(amount)
        returns (bytes32)
    {
        // Check sender has sufficient balance
        if (accounts[msg.sender].balances[token] < amount) revert InsufficientBalance();
        
        // Create transfer certificate
        TransferCertificate memory cert = TransferCertificate({
            sender: msg.sender,
            recipient: recipient,
            token: token,
            amount: amount,
            sequenceNumber: sequenceNumber,
            timestamp: block.timestamp
        });
        
        // Generate certificate hash
        bytes32 certHash = keccak256(abi.encode(cert));
        
        emit TransferCertificateCreated(msg.sender, recipient, certHash);
        
        return certHash;
    }

    /**
     * @dev Handle redeem transaction from FastPay to Primary
     * @param redeemTx The redeem transaction data
     */
    function handleRedeemTransaction(RedeemTransaction calldata redeemTx) 
        external 
        nonReentrant
    {
        TransferCertificate memory cert = redeemTx.transferCertificate;
        
        // Validate sequence number
        if (cert.sequenceNumber <= accounts[cert.sender].lastRedeemedSequence) {
            revert InvalidSequenceNumber();
        }
        
        // Generate certificate hash for verification
        bytes32 certHash = keccak256(abi.encode(cert));
        
        // Check if already processed
        if (processedRedemptions[certHash]) revert CertificateAlreadyRedeemed();
        
        // Mark as processed
        processedRedemptions[certHash] = true;
        accounts[cert.sender].lastRedeemedSequence = cert.sequenceNumber;
        
        // Update balances
        accounts[cert.sender].balances[cert.token] -= cert.amount;
        totalBalance[cert.token] -= cert.amount;
        
        // Transfer tokens from FastPay system to recipient
        IERC20(cert.token).safeTransfer(cert.recipient, cert.amount);
        
        emit RedemptionCompleted(cert.sender, cert.recipient, cert.token, cert.amount, cert.sequenceNumber);
    }

    /**
     * @dev Get funding transaction by index
     * @param index The transaction index
     * @return FundingTransaction The funding transaction data
     */
    function getFundingTransaction(uint256 index) external view returns (FundingTransaction memory) {
        require(index < blockchain.length, "Transaction index out of bounds");
        return blockchain[index];
    }

    /**
     * @dev Check if a certificate has been redeemed
     * @param certificateHash The certificate hash
     * @return bool Whether the certificate has been redeemed
     */
    function isCertificateRedeemed(bytes32 certificateHash) external view returns (bool) {
        return processedRedemptions[certificateHash];
    }
} 