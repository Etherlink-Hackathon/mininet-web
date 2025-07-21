// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FastPayAuthorityManager
 * @dev Authority staking and rewards management for FastPay network
 * Companion contract to FastPayMVP for authority operations
 * @author FastPay Team
 */
contract FastPayAuthorityManager is ReentrancyGuard, Ownable {

    /// @dev Authority information and staking
    struct AuthorityInfo {
        bool isActive;
        uint256 stakedAmount;
        uint256 stakingTime;
        uint256 lockDuration; // in seconds
        uint256 rewardsClaimed;
        uint256 transactionsProcessed;
        uint256 validatorScore; // 0-10000 (for 0-100.00%)
        uint256 uptime; // 0-10000 (for 0-100.00%)
        string networkInfo; // JSON string with host, port, etc.
        uint256 lastRewardClaim;
        uint256 lastActiveTime;
        bool isSlashed;
    }

    /// @dev Authority performance metrics
    struct AuthorityMetrics {
        uint256 dailyRewards;
        uint256 weeklyRewards;
        uint256 monthlyRewards;
        uint256 totalEarnings;
        uint256 authorityRank;
        uint256 connectedPeers;
    }

    /// @dev State variables
    mapping(address => AuthorityInfo) public authorities;
    mapping(address => AuthorityMetrics) public authorityMetrics;
    
    /// Authority management
    address[] public authorityList;
    mapping(address => uint256) private authorityIndex; // 1-based index, 0 means not in list
    uint256 public constant MINIMUM_STAKE = 100 ether; // 100 XTZ minimum stake
    uint256 public constant MAXIMUM_STAKE = 10000 ether; // 10,000 XTZ maximum stake
    uint256 public constant MINIMUM_LOCK_DURATION = 7 days;
    uint256 public constant MAXIMUM_LOCK_DURATION = 365 days;
    
    /// Reward system
    uint256 public constant BASE_APY = 1000; // 10.00% base APY (basis points)
    uint256 public constant PERFORMANCE_BONUS = 200; // 2.00% max performance bonus
    uint256 public totalStakedAmount;
    uint256 public lastRewardDistribution;

    /// @dev Events
    event AuthorityStaked(address indexed authority, uint256 amount, uint256 duration);
    event AuthorityUnstaked(address indexed authority, uint256 amount, uint256 rewards);
    event AuthoritySlashed(address indexed authority, uint256 slashedAmount, string reason);
    event RewardsClaimed(address indexed authority, uint256 amount);
    event AuthorityMetricsUpdated(address indexed authority, uint256 validatorScore, uint256 uptime);

    /// @dev Custom errors
    error AuthorityAlreadyExists();
    error AuthorityNotFound();
    error InsufficientStake();
    error StakingPeriodNotEnded();
    error InvalidLockDuration();
    error NoRewardsToClaim();

    /// @dev Modifiers
    modifier onlyActiveAuthority() {
        require(authorities[msg.sender].isActive, "Authority not active");
        require(!authorities[msg.sender].isSlashed, "Authority slashed");
        _;
    }

    constructor() Ownable(msg.sender) {
        lastRewardDistribution = block.timestamp;
    }

    /**
     * @dev Stake tokens to become a FastPay authority
     * @param lockDuration Duration to lock the stake (in seconds)
     * @param networkInfo JSON string with network configuration
     */
    function stakeToBecomaAuthority(
        uint256 lockDuration,
        string calldata networkInfo
    ) 
        external 
        payable
        nonReentrant
    {
        require(!authorities[msg.sender].isActive, "Authority already exists");
        require(msg.value >= MINIMUM_STAKE && msg.value <= MAXIMUM_STAKE, "Invalid stake amount");
        require(lockDuration >= MINIMUM_LOCK_DURATION && lockDuration <= MAXIMUM_LOCK_DURATION, "Invalid lock duration");

        // Initialize authority info
        authorities[msg.sender] = AuthorityInfo({
            isActive: true,
            stakedAmount: msg.value,
            stakingTime: block.timestamp,
            lockDuration: lockDuration,
            rewardsClaimed: 0,
            transactionsProcessed: 0,
            validatorScore: 7500, // Start with 75% score
            uptime: 10000, // Start with 100% uptime
            networkInfo: networkInfo,
            lastRewardClaim: block.timestamp,
            lastActiveTime: block.timestamp,
            isSlashed: false
        });

        // Initialize metrics
        authorityMetrics[msg.sender] = AuthorityMetrics({
            dailyRewards: 0,
            weeklyRewards: 0,
            monthlyRewards: 0,
            totalEarnings: 0,
            authorityRank: 0,
            connectedPeers: 0
        });

        // Add to authority list
        authorityList.push(msg.sender);
        authorityIndex[msg.sender] = authorityList.length;
        
        totalStakedAmount += msg.value;

        emit AuthorityStaked(msg.sender, msg.value, lockDuration);
    }

    /**
     * @dev Unstake tokens and stop being an authority
     */
    function unstakeAuthority() external nonReentrant onlyActiveAuthority {
        AuthorityInfo storage auth = authorities[msg.sender];
        
        // Check if lock period has ended
        require(block.timestamp >= auth.stakingTime + auth.lockDuration, "Staking period not ended");

        uint256 stakedAmount = auth.stakedAmount;
        uint256 rewards = calculateRewards(msg.sender);
        
        // Mark as inactive
        auth.isActive = false;
        totalStakedAmount -= stakedAmount;
        
        // Remove from authority list
        _removeFromAuthorityList(msg.sender);
        
        // Transfer staked amount + rewards back to authority
        uint256 totalReturn = stakedAmount + rewards;
        require(address(this).balance >= totalReturn, "Insufficient contract balance");
        
        payable(msg.sender).transfer(totalReturn);

        emit AuthorityUnstaked(msg.sender, stakedAmount, rewards);
    }

    /**
     * @dev Check if an address is an active authority
     * @param authority The address to check
     * @return bool Whether the address is an active authority
     */
    function isAuthority(address authority) external view returns (bool) {
        return authorities[authority].isActive && !authorities[authority].isSlashed;
    }

    /**
     * @dev Get authority information
     * @param authority The authority address
     * @return AuthorityInfo struct with all authority data
     */
    function getAuthorityInfo(address authority) external view returns (AuthorityInfo memory) {
        return authorities[authority];
    }

    /**
     * @dev Get authority metrics
     * @param authority The authority address
     * @return AuthorityMetrics struct with performance data
     */
    function getAuthorityMetrics(address authority) external view returns (AuthorityMetrics memory) {
        return authorityMetrics[authority];
    }

    /**
     * @dev Get list of all active authorities
     * @return address[] List of active authority addresses
     */
    function getActiveAuthorities() external view returns (address[] memory) {
        uint256 activeCount = 0;
        
        // Count active authorities
        for (uint256 i = 0; i < authorityList.length; i++) {
            if (authorities[authorityList[i]].isActive && !authorities[authorityList[i]].isSlashed) {
                activeCount++;
            }
        }
        
        // Create array of active authorities
        address[] memory activeAuthorities = new address[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < authorityList.length; i++) {
            address auth = authorityList[i];
            if (authorities[auth].isActive && !authorities[auth].isSlashed) {
                activeAuthorities[index] = auth;
                index++;
            }
        }
        
        return activeAuthorities;
    }

    /**
     * @dev Update authority performance metrics (only callable by owner)
     * @param authority The authority address
     * @param validatorScore New validator score (0-10000)
     * @param uptime New uptime percentage (0-10000)
     * @param transactionsProcessed Number of transactions processed
     * @param connectedPeers Number of connected peers
     */
    function updateAuthorityMetrics(
        address authority,
        uint256 validatorScore,
        uint256 uptime,
        uint256 transactionsProcessed,
        uint256 connectedPeers
    ) external onlyOwner {
        require(authorities[authority].isActive, "Authority not found");
        
        authorities[authority].validatorScore = validatorScore;
        authorities[authority].uptime = uptime;
        authorities[authority].transactionsProcessed = transactionsProcessed;
        authorities[authority].lastActiveTime = block.timestamp;
        
        authorityMetrics[authority].connectedPeers = connectedPeers;
        
        emit AuthorityMetricsUpdated(authority, validatorScore, uptime);
    }

    /**
     * @dev Claim accumulated rewards for an authority
     */
    function claimRewards() external nonReentrant onlyActiveAuthority {
        uint256 rewards = calculateRewards(msg.sender);
        require(rewards > 0, "No rewards to claim");
        
        AuthorityInfo storage auth = authorities[msg.sender];
        AuthorityMetrics storage metrics = authorityMetrics[msg.sender];
        
        auth.rewardsClaimed += rewards;
        auth.lastRewardClaim = block.timestamp;
        metrics.totalEarnings += rewards;
        
        // Update daily/weekly/monthly rewards (simplified)
        metrics.dailyRewards = rewards;
        metrics.weeklyRewards += rewards;
        metrics.monthlyRewards += rewards;
        
        require(address(this).balance >= rewards, "Insufficient contract balance");
        payable(msg.sender).transfer(rewards);
        
        emit RewardsClaimed(msg.sender, rewards);
    }

    /**
     * @dev Calculate rewards for an authority
     * @param authority The authority address
     * @return uint256 The calculated reward amount
     */
    function calculateRewards(address authority) public view returns (uint256) {
        AuthorityInfo storage auth = authorities[authority];
        if (!auth.isActive || auth.isSlashed) return 0;
        
        uint256 timeSinceLastClaim = block.timestamp - auth.lastRewardClaim;
        uint256 baseReward = (auth.stakedAmount * BASE_APY * timeSinceLastClaim) / (365 days * 10000);
        
        // Apply performance bonus based on validator score and uptime
        uint256 performanceMultiplier = (auth.validatorScore + auth.uptime) / 2;
        uint256 performanceBonus = (baseReward * PERFORMANCE_BONUS * performanceMultiplier) / (10000 * 10000);
        
        return baseReward + performanceBonus;
    }

    /**
     * @dev Remove authority from the list (internal function)
     * @param authority The authority address to remove
     */
    function _removeFromAuthorityList(address authority) internal {
        uint256 index = authorityIndex[authority];
        if (index == 0) return; // Not in list
        
        // Move last element to the position of the element to remove
        uint256 arrayIndex = index - 1; // Convert to 0-based
        uint256 lastIndex = authorityList.length - 1;
        
        if (arrayIndex != lastIndex) {
            address lastAuthority = authorityList[lastIndex];
            authorityList[arrayIndex] = lastAuthority;
            authorityIndex[lastAuthority] = index; // Update index mapping
        }
        
        authorityList.pop();
        delete authorityIndex[authority];
    }

    /**
     * @dev Slash an authority for misbehavior (only callable by owner)
     * @param authority The authority address to slash
     * @param reason The reason for slashing
     */
    function slashAuthority(address authority, string calldata reason) external onlyOwner {
        require(authorities[authority].isActive, "Authority not found");
        
        AuthorityInfo storage auth = authorities[authority];
        auth.isSlashed = true;
        
        uint256 slashedAmount = auth.stakedAmount / 2; // Slash 50%
        auth.stakedAmount -= slashedAmount;
        totalStakedAmount -= slashedAmount;
        
        emit AuthoritySlashed(authority, slashedAmount, reason);
    }

    /**
     * @dev Get total number of authorities
     * @return uint256 Total number of authorities ever staked
     */
    function getTotalAuthorities() external view returns (uint256) {
        return authorityList.length;
    }

    /**
     * @dev Get number of active authorities
     * @return uint256 Number of currently active authorities
     */
    function getActiveAuthorityCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < authorityList.length; i++) {
            if (authorities[authorityList[i]].isActive && !authorities[authorityList[i]].isSlashed) {
                count++;
            }
        }
        return count;
    }

    /**
     * @dev Emergency withdrawal function (only callable by owner)
     * @param amount The amount to withdraw
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient balance");
        payable(owner()).transfer(amount);
    }

    /**
     * @dev Receive function to accept native token deposits for rewards
     */
    receive() external payable {
        // Allow contract to receive native tokens for reward distribution
    }
} 