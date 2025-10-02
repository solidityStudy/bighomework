// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./NFTAuction.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title AuctionFactoryOptimized
 * @dev 优化后的拍卖工厂合约，减小代码大小
 */
contract AuctionFactoryOptimized is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    
    struct AuctionInfo {
        address auctionContract;
        address creator;
        uint256 createdAt;
        bool active;
    }
    
    mapping(address => mapping(uint256 => address)) public getAuction;
    mapping(address => AuctionInfo) public auctionInfo;
    address[] public allAuctions;
    
    address public feeRecipient;
    uint256 public platformFeeRate;
    mapping(address => address) public priceFeeds;
    
    event AuctionCreated(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed auctionContract,
        address creator
    );
    
    event PriceFeedUpdated(address indexed token, address indexed priceFeed);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(address _feeRecipient, uint256 _platformFeeRate) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        
        require(_feeRecipient != address(0), "Invalid fee recipient");
        require(_platformFeeRate <= 1000, "Fee rate too high");
        
        feeRecipient = _feeRecipient;
        platformFeeRate = _platformFeeRate;
    }
    
    function createAuction(
        address nftContract,
        uint256 tokenId
    ) external returns (address auctionContract) {
        require(nftContract != address(0), "Invalid NFT contract");
        require(getAuction[nftContract][tokenId] == address(0), "Auction exists");
        
        NFTAuction auction = new NFTAuction(feeRecipient);
        auctionContract = address(auction);
        
        // 设置ETH价格预言机
        if (priceFeeds[address(0)] != address(0)) {
            auction.setPriceFeed(address(0), priceFeeds[address(0)]);
        }
        
        getAuction[nftContract][tokenId] = auctionContract;
        auctionInfo[auctionContract] = AuctionInfo({
            auctionContract: auctionContract,
            creator: msg.sender,
            createdAt: block.timestamp,
            active: true
        });
        allAuctions.push(auctionContract);
        
        emit AuctionCreated(nftContract, tokenId, auctionContract, msg.sender);
    }
    
    function setPriceFeed(address token, address priceFeed) external onlyOwner {
        priceFeeds[token] = priceFeed;
        
        // 为所有活跃拍卖设置
        for (uint256 i = 0; i < allAuctions.length; i++) {
            if (auctionInfo[allAuctions[i]].active) {
                NFTAuction(allAuctions[i]).setPriceFeed(token, priceFeed);
            }
        }
        
        emit PriceFeedUpdated(token, priceFeed);
    }
    
    function allAuctionsLength() external view returns (uint256) {
        return allAuctions.length;
    }
    
    function setPlatformFeeRate(uint256 _feeRate) external onlyOwner {
        require(_feeRate <= 1000, "Fee rate too high");
        platformFeeRate = _feeRate;
        
        for (uint256 i = 0; i < allAuctions.length; i++) {
            if (auctionInfo[allAuctions[i]].active) {
                NFTAuction(allAuctions[i]).setPlatformFeeRate(_feeRate);
            }
        }
    }
    
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
        
        for (uint256 i = 0; i < allAuctions.length; i++) {
            if (auctionInfo[allAuctions[i]].active) {
                NFTAuction(allAuctions[i]).setFeeRecipient(_feeRecipient);
            }
        }
    }
    
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    function version() external pure returns (string memory) {
        return "1.0.0";
    }
}

