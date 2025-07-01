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
     * @dev Create a transfer certificate for off-chain FastPay payment
     * This represents an intention to transfer funds within FastPay system
     * @param recipient The payment recipient
     * @param token The token being transferred
     * @param amount The payment amount
     * @param sequenceNumber The sequence number for this transfer
     * @return certificateHash The generated certificate hash
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
        returns (bytes32 certificateHash) 
    {
        // Check sufficient balance for the transfer
        if (accounts[msg.sender].balances[token] < amount) {
            revert InsufficientBalance();
        }

        // Create transfer certificate
        TransferCertificate memory cert = TransferCertificate({
            sender: msg.sender,
            recipient: recipient,
            token: token,
            amount: amount,
            sequenceNumber: sequenceNumber,
            timestamp: block.timestamp
        });

        certificateHash = _hashTransferCertificate(cert);

        emit TransferCertificateCreated(msg.sender, recipient, certificateHash);
    }

    /**
     * @dev Handle redeem transaction from FastPay to Primary
     * This finalizes a transfer from FastPay system back to Primary blockchain
     * @param redeemTx The redemption transaction containing transfer certificate
     */
    function handleRedeemTransaction(RedeemTransaction calldata redeemTx) external nonReentrant {
        TransferCertificate memory cert = redeemTx.transferCertificate;
        bytes32 certHash = _hashTransferCertificate(cert);
        
        // Check if certificate was already redeemed
        if (processedRedemptions[certHash]) {
            revert CertificateAlreadyRedeemed();
        }

        // Validate the transfer certificate
        if (!_isValidTransferCertificate(cert)) {
            revert InvalidTransferCertificate();
        }

        // Check that sequence number is increasing
        AccountOnchainState storage senderAccount = accounts[cert.sender];
        if (cert.sequenceNumber <= senderAccount.lastRedeemedSequence) {
            revert InvalidSequenceNumber();
        }

        // Check sufficient balance in the system
        if (totalBalance[cert.token] < cert.amount) {
            revert InsufficientBalance();
        }

        // Check sender has sufficient FastPay balance
        if (senderAccount.balances[cert.token] < cert.amount) {
            revert InsufficientBalance();
        }

        // Update sender's FastPay balance
        senderAccount.balances[cert.token] -= cert.amount;
        senderAccount.lastRedeemedSequence = cert.sequenceNumber;
        
        // Update total system balance
        totalBalance[cert.token] -= cert.amount;
        
        // Transfer tokens from FastPay system to recipient on Primary
        if (accounts[cert.recipient].registered) {
            // If recipient has FastPay account, credit their balance
            accounts[cert.recipient].balances[cert.token] += cert.amount;
        } else {
            // If recipient doesn't have FastPay account, transfer directly on Primary
            IERC20(cert.token).safeTransfer(cert.recipient, cert.amount);
        }

        // Mark certificate as processed
        processedRedemptions[certHash] = true;

        emit RedemptionCompleted(cert.sender, cert.recipient, cert.token, cert.amount, cert.sequenceNumber);
    }

    /// @dev View functions
    function getAccountBalance(address account, address token) external view returns (uint256) {
        return accounts[account].balances[token];
    }

    function isAccountRegistered(address account) external view returns (bool) {
        return accounts[account].registered;
    }

    function getLastRedeemedSequence(address account) external view returns (uint256) {
        return accounts[account].lastRedeemedSequence;
    }

    function getAccountInfo(address account) external view returns (
        bool registered,
        uint256 registrationTime,
        uint256 lastRedeemedSequence
    ) {
        AccountOnchainState storage accountInfo = accounts[account];
        return (
            accountInfo.registered,
            accountInfo.registrationTime,
            accountInfo.lastRedeemedSequence
        );
    }

    function isCertificateRedeemed(bytes32 certificateHash) external view returns (bool) {
        return processedRedemptions[certificateHash];
    }

    function getFundingTransaction(uint256 index) external view returns (FundingTransaction memory) {
        require(index < blockchain.length, "Transaction index out of bounds");
        return blockchain[index];
    }

    /// @dev Internal functions
    function _hashTransferCertificate(TransferCertificate memory cert) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            cert.sender,
            cert.recipient,
            cert.token,
            cert.amount,
            cert.sequenceNumber,
            cert.timestamp
        ));
    }

    function _isValidTransferCertificate(TransferCertificate memory cert) internal view returns (bool) {
        // Basic validation
        if (cert.sender == address(0) || cert.recipient == address(0) || cert.token == address(0)) {
            return false;
        }
        
        if (cert.amount == 0) {
            return false;
        }

        // Check if sender is registered
        if (!accounts[cert.sender].registered) {
            return false;
        }

        // Check sequence number is valid (greater than last redeemed)
        if (cert.sequenceNumber <= accounts[cert.sender].lastRedeemedSequence) {
            return false;
        }

        // Certificate should not be too old (24 hours)
        if (block.timestamp - cert.timestamp > 24 hours) {
            return false;
        }

        return true;
    }
} 