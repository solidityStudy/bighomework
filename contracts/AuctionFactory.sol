// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./NFTAuction.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title AuctionFactory
 * @dev 拍卖工厂合约，使用类似Uniswap V2的工厂模式管理拍卖合约
 * 支持UUPS代理升级模式
 */
contract AuctionFactory is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    
    // 拍卖合约信息
    struct AuctionInfo {
        address auctionContract;
        address creator;
        uint256 createdAt;
        bool active;
    }
    
    // 状态变量
    mapping(address => mapping(uint256 => address)) public getAuction; // NFT合约 => tokenId => 拍卖合约
    mapping(address => AuctionInfo) public auctionInfo; // 拍卖合约地址 => 拍卖信息
    address[] public allAuctions; // 所有拍卖合约地址
    
    address public feeRecipient;
    uint256 public platformFeeRate;
    mapping(address => address) public priceFeeds; // 代币价格预言机映射
    
    // 事件
    event AuctionCreated(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed auctionContract,
        address creator,
        uint256 auctionLength
    );
    
    event AuctionDeactivated(address indexed auctionContract);
    event PriceFeedUpdated(address indexed token, address indexed priceFeed);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev 初始化函数
     */
    function initialize(address _feeRecipient, uint256 _platformFeeRate) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        
        require(_feeRecipient != address(0), "Invalid fee recipient");
        require(_platformFeeRate <= 1000, "Fee rate too high"); // 最高10%
        
        feeRecipient = _feeRecipient;
        platformFeeRate = _platformFeeRate;
    }
    
    /**
     * @dev 创建新的拍卖合约
     * @param nftContract NFT合约地址
     * @param tokenId NFT token ID
     * @return auctionContract 新创建的拍卖合约地址
     */
    function createAuction(
        address nftContract,
        uint256 tokenId
    ) external returns (address auctionContract) {
        require(nftContract != address(0), "Invalid NFT contract");
        require(getAuction[nftContract][tokenId] == address(0), "Auction already exists");
        
        // 创建新的拍卖合约
        NFTAuction auction = new NFTAuction(feeRecipient);
        auctionContract = address(auction);
        
        // 设置价格预言机
        _setupPriceFeeds(auctionContract);
        
        // 记录拍卖信息
        getAuction[nftContract][tokenId] = auctionContract;
        auctionInfo[auctionContract] = AuctionInfo({
            auctionContract: auctionContract,
            creator: msg.sender,
            createdAt: block.timestamp,
            active: true
        });
        allAuctions.push(auctionContract);
        
        emit AuctionCreated(nftContract, tokenId, auctionContract, msg.sender, allAuctions.length);
    }
    
    /**
     * @dev 为拍卖合约设置价格预言机
     */
    function _setupPriceFeeds(address auctionContract) internal {
        NFTAuction auction = NFTAuction(auctionContract);
        
        // 设置所有已配置的价格预言机
        for (uint256 i = 0; i < getAllTokens().length; i++) {
            address token = getAllTokens()[i];
            if (priceFeeds[token] != address(0)) {
                auction.setPriceFeed(token, priceFeeds[token]);
            }
        }
    }
    
    /**
     * @dev 停用拍卖合约
     * @param auctionContract 拍卖合约地址
     */
    function deactivateAuction(address auctionContract) external onlyOwner {
        require(auctionInfo[auctionContract].active, "Auction not active");
        auctionInfo[auctionContract].active = false;
        
        emit AuctionDeactivated(auctionContract);
    }
    
    /**
     * @dev 设置价格预言机
     * @param token 代币地址（address(0)表示ETH）
     * @param priceFeed Chainlink价格预言机地址
     */
    function setPriceFeed(address token, address priceFeed) external onlyOwner {
        priceFeeds[token] = priceFeed;
        
        // 为所有活跃的拍卖合约设置价格预言机
        for (uint256 i = 0; i < allAuctions.length; i++) {
            if (auctionInfo[allAuctions[i]].active) {
                NFTAuction(allAuctions[i]).setPriceFeed(token, priceFeed);
            }
        }
        
        emit PriceFeedUpdated(token, priceFeed);
    }
    
    /**
     * @dev 批量设置价格预言机
     */
    function setPriceFeeds(
        address[] calldata tokens,
        address[] calldata priceFeedAddresses
    ) external onlyOwner {
        require(tokens.length == priceFeedAddresses.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < tokens.length; i++) {
            this.setPriceFeed(tokens[i], priceFeedAddresses[i]);
        }
    }
    
    /**
     * @dev 获取所有拍卖合约数量
     */
    function allAuctionsLength() external view returns (uint256) {
        return allAuctions.length;
    }
    
    /**
     * @dev 获取活跃的拍卖合约
     */
    function getActiveAuctions() external view returns (address[] memory) {
        uint256 activeCount = 0;
        
        // 计算活跃拍卖数量
        for (uint256 i = 0; i < allAuctions.length; i++) {
            if (auctionInfo[allAuctions[i]].active) {
                activeCount++;
            }
        }
        
        // 创建活跃拍卖数组
        address[] memory activeAuctions = new address[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allAuctions.length; i++) {
            if (auctionInfo[allAuctions[i]].active) {
                activeAuctions[index] = allAuctions[i];
                index++;
            }
        }
        
        return activeAuctions;
    }
    
    /**
     * @dev 获取用户创建的拍卖合约
     */
    function getUserAuctions(address user) external view returns (address[] memory) {
        uint256 userAuctionCount = 0;
        
        // 计算用户拍卖数量
        for (uint256 i = 0; i < allAuctions.length; i++) {
            if (auctionInfo[allAuctions[i]].creator == user) {
                userAuctionCount++;
            }
        }
        
        // 创建用户拍卖数组
        address[] memory userAuctions = new address[](userAuctionCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allAuctions.length; i++) {
            if (auctionInfo[allAuctions[i]].creator == user) {
                userAuctions[index] = allAuctions[i];
                index++;
            }
        }
        
        return userAuctions;
    }
    
    /**
     * @dev 获取所有已配置的代币（内部函数，实际实现中需要维护代币列表）
     */
    function getAllTokens() internal pure returns (address[] memory) {
        // 这里简化处理，实际应该维护一个代币列表
        address[] memory tokens = new address[](2);
        tokens[0] = address(0); // ETH
        tokens[1] = 0xa0B86A33E6441b8e5C3f4f5C5e6B5b5E5C3F4F5c; // 示例ERC20代币
        return tokens;
    }
    
    /**
     * @dev 设置平台手续费率
     */
    function setPlatformFeeRate(uint256 _feeRate) external onlyOwner {
        require(_feeRate <= 1000, "Fee rate too high"); // 最高10%
        platformFeeRate = _feeRate;
        
        // 更新所有活跃拍卖合约的手续费率
        for (uint256 i = 0; i < allAuctions.length; i++) {
            if (auctionInfo[allAuctions[i]].active) {
                NFTAuction(allAuctions[i]).setPlatformFeeRate(_feeRate);
            }
        }
    }
    
    /**
     * @dev 设置手续费接收地址
     */
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
        
        // 更新所有活跃拍卖合约的手续费接收地址
        for (uint256 i = 0; i < allAuctions.length; i++) {
            if (auctionInfo[allAuctions[i]].active) {
                NFTAuction(allAuctions[i]).setFeeRecipient(_feeRecipient);
            }
        }
    }
    
    /**
     * @dev UUPS升级授权
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    /**
     * @dev 获取合约版本
     */
    function version() external pure returns (string memory) {
        return "1.0.0";
    }
}
