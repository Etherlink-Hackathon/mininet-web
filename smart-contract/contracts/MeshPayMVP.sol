// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MeshPayMVP
 * @dev Minimal viable MeshPay smart contract for Primary blockchain
 * Based on the original MeshPay design by Facebook/Meta
 * @author MeshPay Team
 */
contract MeshPayMVP is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @dev Address used to represent native XTZ token
    address public constant NATIVE_TOKEN = address(0);

    /// @dev Account state on Primary blockchain
    struct AccountOnchainState {
        bool registered;
        uint256 registrationTime;
        /// Prevent spending actions from this account to Primary to be redeemed more than once
        /// Last sequence number that was successfully redeemed to Primary
        uint256 lastRedeemedSequence;
        /// MeshPay account balance (funded from Primary)
        mapping(address => uint256) balances; // token => balance
    }

    /// @dev Funding transaction from Primary to MeshPay
    struct FundingTransaction {
        address sender;
        address token;
        uint256 amount;
        uint256 timestamp;
        uint256 transactionIndex;
    }

    /// @dev Transfer certificate for off-chain MeshPay payments
    struct TransferCertificate {
        address sender;
        address recipient;
        address token;
        uint256 amount;
        uint256 sequenceNumber;
    }

    /// @dev Redeem transaction from MeshPay to Primary
    struct RedeemTransaction {
        TransferCertificate transferCertificate;
        bytes signature; // For future committee validation
    }

    /// @dev Authority information
    struct Authority {
        string name;
        address authorityAddress;
        bool isActive;
        uint256 registrationTime;
        uint256 lastActivity;
    }

    /// @dev Transfer order for off-chain MeshPay payments
    struct TransferOrder {
        string orderId;
        address sender;
        address recipient;
        uint256 amount;
        address token;
        uint256 sequenceNumber;
        uint256 timestamp;
        string signature;
    }

    /// @dev Confirmation order from authorities
    struct ConfirmationOrder {
        TransferOrder transferOrder;
        string[] authoritySignatures;
    }

    /// @dev State variables
    mapping(address => AccountOnchainState) private accounts;
    mapping(bytes32 => bool) private processedRedemptions;
    
    /// Authority management
    mapping(address => Authority) private authorities;
    address[] private authorityAddresses;
    address public owner;
    
    /// The latest transaction index included in the blockchain
    uint256 public lastTransactionIndex;
    
    /// Record of funding transactions
    FundingTransaction[] public blockchain;
    
    /// Array to track all registered account addresses
    address[] private registeredAccounts;
    
    /// @dev Events matching original MeshPay design
    event AccountRegistered(address indexed account, uint256 timestamp);
    event FundingCompleted(address indexed sender, address indexed token, uint256 amount, uint256 transactionIndex);
    event RedemptionCompleted(
        address indexed sender,
        address indexed recipient,
        address indexed token,
        uint256 amount,
        uint256 sequenceNumber,
        uint256 timestamp,
        bytes signature
    );
    event TransferCertificateCreated(address indexed sender, address indexed recipient, bytes32 certificateHash);
    
    /// @dev Authority management events
    event AuthorityAdded(address indexed authority, string name, uint256 timestamp);
    event AuthorityRemoved(address indexed authority, uint256 timestamp);
    event AuthorityDeactivated(address indexed authority, uint256 timestamp);
    event BalanceUpdated(
        address indexed sender,
        address indexed recipient,
        address indexed token,
        uint256 amount,
        uint256 sequenceNumber,
        string orderId
    );

    /// @dev Custom errors
    error AccountNotRegistered();
    error AccountAlreadyRegistered();
    error InsufficientBalance();
    error InvalidAmount();
    error InvalidAddress();
    error CertificateAlreadyRedeemed();
    error InvalidSequenceNumber();
    error InvalidTransferCertificate();
    error NotAuthority();
    error AuthorityNotActive();
    error OnlyOwner();
    error AuthorityAlreadyExists();
    error AuthorityNotFound();

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

    modifier validTokenAddress(address addr) {
        // Allow NATIVE_TOKEN (address(0)) as a valid token address
        _;
    }

    modifier onlyAuthority() {
        if (!authorities[msg.sender].isActive) revert NotAuthority();
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    /// @dev Constructor
    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Registers an account if it's not already registered.
     * @param user The address of the user to register.
     */
    function _registerIfNeeded(address user) internal {
        if (!accounts[user].registered) {
            accounts[user].registered = true;
            accounts[user].registrationTime = block.timestamp;
            accounts[user].lastRedeemedSequence = 0;
            
            // Add to registered accounts array
            registeredAccounts.push(user);
            
            emit AccountRegistered(user, block.timestamp);
        }
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
     * @return balance The account's MeshPay balance for the token
     */
    function getAccountBalance(address account, address token) external view returns (uint256) {
        return accounts[account].balances[token];
    }

    /**
     * @dev Handle funding transaction from Primary to MeshPay (ERC20 tokens)
     * This represents transferring tokens from Primary blockchain to MeshPay system
     * @param token The ERC20 token address
     * @param amount The amount to fund
     */
    function handleFundingTransaction(
        address token,
        uint256 amount
    ) 
        external 
        nonReentrant
        validAmount(amount)
    {
        _registerIfNeeded(msg.sender);
        require(token != NATIVE_TOKEN, "Use handleNativeFundingTransaction for XTZ");
        
        // Transfer tokens from Primary (msg.sender) to MeshPay system (this contract)
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        // Update account balance in MeshPay system
        accounts[msg.sender].balances[token] += amount;
        
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
     * @dev Handle native XTZ funding transaction from Primary to MeshPay
     * This represents transferring native XTZ from Primary blockchain to MeshPay system
     */
    function handleNativeFundingTransaction() 
        external 
        payable
        nonReentrant
        validAmount(msg.value)
    {
        _registerIfNeeded(msg.sender);
        // Update account balance in MeshPay system (using NATIVE_TOKEN as key)
        accounts[msg.sender].balances[NATIVE_TOKEN] += msg.value;
        
        // Record the funding transaction
        lastTransactionIndex++;
        blockchain.push(FundingTransaction({
            sender: msg.sender,
            token: NATIVE_TOKEN,
            amount: msg.value,
            timestamp: block.timestamp,
            transactionIndex: lastTransactionIndex
        }));

        emit FundingCompleted(msg.sender, NATIVE_TOKEN, msg.value, lastTransactionIndex);
    }

    /**
     * @dev Handle redeem transaction from MeshPay to Primary
     * @param redeemTx The redeem transaction data
     */
    function handleRedeemTransaction(RedeemTransaction calldata redeemTx) 
        external 
        nonReentrant
    {
        TransferCertificate memory cert = redeemTx.transferCertificate;

        // Generate certificate hash for verification
        bytes32 certHash = keccak256(abi.encode(cert));

        // Check if already processed
        if (processedRedemptions[certHash]) revert CertificateAlreadyRedeemed();

        // Validate sequence number AFTER ensuring not previously redeemed
        if (cert.sequenceNumber <= accounts[cert.sender].lastRedeemedSequence) {
            revert InvalidSequenceNumber();
        }

        // Mark as processed and update last redeemed sequence
        processedRedemptions[certHash] = true;
        accounts[cert.sender].lastRedeemedSequence = cert.sequenceNumber;

        // Update balances
        accounts[cert.sender].balances[cert.token] -= cert.amount;

        // Transfer tokens or native XTZ from MeshPay system to recipient
        if (cert.token == NATIVE_TOKEN) {
            // Handle native XTZ transfer
            require(address(this).balance >= cert.amount, "Insufficient native balance");
            payable(cert.recipient).transfer(cert.amount);
        } else {
            // Handle ERC20 token transfer
            IERC20(cert.token).safeTransfer(cert.recipient, cert.amount);
        }

        emit RedemptionCompleted(
            cert.sender,
            cert.recipient,
            cert.token,
            cert.amount,
            cert.sequenceNumber,
            block.timestamp,
            redeemTx.signature
        );
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
     * @dev Get the last redeemed sequence number for an account
     * @param account The account address
     * @return uint256 The last redeemed sequence number
     */
    function getLastRedeemedSequence(address account) external view returns (uint256) {
        return accounts[account].lastRedeemedSequence;
    }

    /**
     * @dev Check if a certificate has been redeemed
     * @param certificateHash The certificate hash
     * @return bool Whether the certificate has been redeemed
     */
    function isCertificateRedeemed(bytes32 certificateHash) external view returns (bool) {
        return processedRedemptions[certificateHash];
    }

    /**
     * @dev Check if a token is the native XTZ token
     * @param token The token address to check
     * @return bool Whether the token is native XTZ
     */
    function isNativeToken(address token) external pure returns (bool) {
        return token == NATIVE_TOKEN;
    }

    
    /**
     * @dev Get all registered account addresses
     * @return address[] Array of all registered account addresses
     */
    function getRegisteredAccounts() external view returns (address[] memory) {
        return registeredAccounts;
    }

    /**
     * @dev Authority management functions
     * @dev Add a new authority (only owner can call)
     * @param authorityAddress The address of the authority
     * @param name The name of the authority
     */
    function addAuthority(address authorityAddress, string memory name) 
        external 
        onlyOwner 
        validAddress(authorityAddress) 
    {
        if (authorities[authorityAddress].isActive) revert AuthorityAlreadyExists();
        
        authorities[authorityAddress] = Authority({
            name: name,
            authorityAddress: authorityAddress,
            isActive: true,
            registrationTime: block.timestamp,
            lastActivity: block.timestamp
        });
        
        authorityAddresses.push(authorityAddress);
        
        emit AuthorityAdded(authorityAddress, name, block.timestamp);
    }

    /**
     * @dev Remove an authority (only owner can call)
     * @param authorityAddress The address of the authority to remove
     */
    function removeAuthority(address authorityAddress) 
        external 
        onlyOwner 
        validAddress(authorityAddress) 
    {
        if (!authorities[authorityAddress].isActive) revert AuthorityNotFound();
        
        authorities[authorityAddress].isActive = false;
        
        emit AuthorityRemoved(authorityAddress, block.timestamp);
    }

    /**
     * @dev Get authority information
     * @param authorityAddress The address of the authority
     * @return name The name of the authority
     * @return authorityAddr The address of the authority
     * @return isActive Whether the authority is active
     * @return registrationTime When the authority was registered
     * @return lastActivity Last activity timestamp
     */
    function getAuthorityInfo(address authorityAddress) 
        external 
        view 
        returns (
            string memory name,
            address authorityAddr,
            bool isActive,
            uint256 registrationTime,
            uint256 lastActivity
        ) 
    {
        Authority storage auth = authorities[authorityAddress];
        return (
            auth.name,
            auth.authorityAddress,
            auth.isActive,
            auth.registrationTime,
            auth.lastActivity
        );
    }

    /**
     * @dev Get all authority addresses
     * @return Array of all authority addresses
     */
    function getAuthorityAddresses() external view returns (address[] memory) {
        return authorityAddresses;
    }

    /**
     * @dev Check if an address is an active authority
     * @param authorityAddress The address to check
     * @return bool Whether the address is an active authority
     */
    function isAuthority(address authorityAddress) external view returns (bool) {
        return authorities[authorityAddress].isActive;
    }

    /**
     * @dev Update account balances based on confirmation order (only authorities can call)
     * @param confirmationOrder The confirmation order containing transfer details
     */
    function updateBalanceFromConfirmation(ConfirmationOrder calldata confirmationOrder) 
        external 
        onlyAuthority 
        nonReentrant 
    {
        TransferOrder memory transferOrder = confirmationOrder.transferOrder;
        
        // Validate transfer order
        if (transferOrder.sender == address(0)) revert InvalidAddress();
        if (transferOrder.recipient == address(0)) revert InvalidAddress();
        if (transferOrder.amount == 0) revert InvalidAmount();
        // Allow NATIVE_TOKEN (address(0)) as a valid token address
        
        // Check if sender is registered
        if (!accounts[transferOrder.sender].registered) {
            _registerIfNeeded(transferOrder.sender);
        }
        
        // Check if recipient is registered
        if (!accounts[transferOrder.recipient].registered) {
            _registerIfNeeded(transferOrder.recipient);
        }
        
        // Check if sender has sufficient balance
        if (accounts[transferOrder.sender].balances[transferOrder.token] < transferOrder.amount) {
            revert InsufficientBalance();
        }
        
        // Update balances
        accounts[transferOrder.sender].balances[transferOrder.token] -= transferOrder.amount;
        accounts[transferOrder.recipient].balances[transferOrder.token] += transferOrder.amount;
        
        // Update authority activity
        authorities[msg.sender].lastActivity = block.timestamp;
        
        // Emit event
        emit BalanceUpdated(
            transferOrder.sender,
            transferOrder.recipient,
            transferOrder.token,
            transferOrder.amount,
            transferOrder.sequenceNumber,
            transferOrder.orderId
        );
    }

    /**
     * @dev Receive function to accept native XTZ deposits
     * Note: Direct transfers are not tracked. Use handleNativeFundingTransaction instead.
     */
    receive() external payable {
        // Allow contract to receive native XTZ
        // Note: These are not tracked as MeshPay funding transactions
    }
} 