// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "hardhat/console.sol";

/**
 * @title MemoiraiMVPBalanced - 平衡版INJ奖励发放合约
 * @dev 结合简单性和安全性的最佳实践
 */
contract MemoiraiMVPBalanced {
    address public owner;
    bool public paused = false;

    // 奖励金额常量
    uint256 public constant DAILY_REWARD = 0.001 ether;
    uint256 public constant WEEK_REWARD = 0.005 ether;
    uint256 public constant TWO_WEEK_REWARD = 0.01 ether;
    uint256 public constant MONTH_REWARD = 0.05 ether;

    // 奖励类型枚举
    enum RewardType {
        DAILY,      // 0: 每日签到
        WEEK,       // 1: 连续7天
        TWO_WEEK,   // 2: 连续14天
        MONTH       // 3: 连续30天
    }

    // 防重复发放映射
    mapping(address => mapping(RewardType => mapping(uint256 => bool))) public claimedRewards;
    
    // 重入保护
    bool private locked;

    // 自定义错误 (节省gas)
    error Unauthorized();
    error ContractPaused();
    error InvalidAmount();
    error InsufficientBalance();
    error RewardAlreadyClaimed();
    error TransferFailed();
    error ZeroAddress();
    error ReentrantCall();

    // 事件
    event RewardPaid(address indexed user, RewardType indexed rewardType, uint256 amount, uint256 indexed streakId);
    event ContractFunded(address indexed funder, uint256 amount);
    event Paused(address account);
    event Unpaused(address account);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    modifier nonReentrant() {
        if (locked) revert ReentrantCall();
        locked = true;
        _;
        locked = false;
    }

    modifier validAddress(address addr) {
        if (addr == address(0)) revert ZeroAddress();
        _;
    }

    /**
     * @dev 暂停/恢复合约
     */
    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }

    /**
     * @dev 资助合约
     */
    function fundContract() external payable {
        if (msg.value == 0) revert InvalidAmount();
        emit ContractFunded(msg.sender, msg.value);
    }

    /**
     * @dev 统一的奖励发放函数
     */
    function payReward(
        address userAddress, 
        RewardType rewardType, 
        uint256 streakId
    ) external onlyOwner whenNotPaused validAddress(userAddress) nonReentrant {
        _payReward(userAddress, rewardType, streakId);
    }

    /**
     * @dev 批量发放奖励
     */
    function payBatchRewards(
        address[] calldata userAddresses,
        RewardType[] calldata rewardTypes,
        uint256[] calldata streakIds
    ) external onlyOwner whenNotPaused nonReentrant {
        uint256 length = userAddresses.length;
        if (length != rewardTypes.length || length != streakIds.length) {
            revert InvalidAmount(); // 复用错误类型
        }

        for (uint256 i = 0; i < length; i++) {
            address userAddress = userAddresses[i];
            RewardType rewardType = rewardTypes[i];
            uint256 streakId = streakIds[i];

            // 跳过无效地址或已发放的奖励
            if (userAddress == address(0) || 
                claimedRewards[userAddress][rewardType][streakId]) {
                continue;
            }

            uint256 rewardAmount = getRewardAmount(rewardType);
            if (address(this).balance < rewardAmount) {
                continue; // 余额不足时跳过
            }

            // 更新状态
            claimedRewards[userAddress][rewardType][streakId] = true;

            // 安全转账
            (bool success, ) = payable(userAddress).call{value: rewardAmount}("");
            if (success) {
                emit RewardPaid(userAddress, rewardType, rewardAmount, streakId);
            }
        }
    }

    /**
     * @dev 获取奖励金额
     */
    function getRewardAmount(RewardType rewardType) public pure returns (uint256) {
        if (rewardType == RewardType.DAILY) return DAILY_REWARD;
        if (rewardType == RewardType.WEEK) return WEEK_REWARD;
        if (rewardType == RewardType.TWO_WEEK) return TWO_WEEK_REWARD;
        if (rewardType == RewardType.MONTH) return MONTH_REWARD;
        return 0;
    }

    /**
     * @dev 检查奖励是否已发放
     */
    function isRewardClaimed(
        address userAddress, 
        RewardType rewardType, 
        uint256 streakId
    ) external view returns (bool) {
        return claimedRewards[userAddress][rewardType][streakId];
    }

    /**
     * @dev 获取合约余额
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev 安全提取
     */
    function withdraw(uint256 amount) external onlyOwner nonReentrant {
        if (amount > address(this).balance) revert InsufficientBalance();
        
        (bool success, ) = payable(owner).call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    /**
     * @dev 提取全部余额
     */
    function withdrawAll() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        if (balance == 0) revert InvalidAmount();
        
        (bool success, ) = payable(owner).call{value: balance}("");
        if (!success) revert TransferFailed();
    }

    /**
     * @dev 转移所有权
     */
    function transferOwnership(address newOwner) external onlyOwner validAddress(newOwner) {
        owner = newOwner;
    }

    /**
     * @dev 接收INJ
     */
    receive() external payable {
        emit ContractFunded(msg.sender, msg.value);
    }

    // ===== 兼容性函数 (保持与原版API兼容) =====
    
    function payDailyReward(address userAddress, uint256 dayId) external onlyOwner whenNotPaused validAddress(userAddress) nonReentrant {
        _payReward(userAddress, RewardType.DAILY, dayId);
    }

    function payWeekReward(address userAddress, uint256 streakId) external onlyOwner whenNotPaused validAddress(userAddress) nonReentrant {
        _payReward(userAddress, RewardType.WEEK, streakId);
    }

    function payTwoWeekReward(address userAddress, uint256 streakId) external onlyOwner whenNotPaused validAddress(userAddress) nonReentrant {
        _payReward(userAddress, RewardType.TWO_WEEK, streakId);
    }

    function payMonthReward(address userAddress, uint256 streakId) external onlyOwner whenNotPaused validAddress(userAddress) nonReentrant {
        _payReward(userAddress, RewardType.MONTH, streakId);
    }

    /**
     * @dev 内部奖励发放函数
     */
    function _payReward(address userAddress, RewardType rewardType, uint256 streakId) internal {
        if (claimedRewards[userAddress][rewardType][streakId]) {
            revert RewardAlreadyClaimed();
        }

        uint256 rewardAmount = getRewardAmount(rewardType);
        if (address(this).balance < rewardAmount) {
            revert InsufficientBalance();
        }

        // 先更新状态再转账 (CEI模式)
        claimedRewards[userAddress][rewardType][streakId] = true;

        // 使用call进行安全转账
        (bool success, ) = payable(userAddress).call{value: rewardAmount}("");
        if (!success) revert TransferFailed();
        
        emit RewardPaid(userAddress, rewardType, rewardAmount, streakId);
    }
}
