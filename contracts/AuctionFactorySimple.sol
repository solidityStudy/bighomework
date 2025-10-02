// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./NFTAuction.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AuctionFactorySimple
 * @dev 精简版拍卖工厂合约（非可升级）
 */
contract AuctionFactorySimple is Ownable {
    
    struct AuctionInfo {
        address creator;
        uint256 createdAt;
        bool active;
    }
    
    mapping(address => mapping(uint256 => address)) public getAuction;
    mapping(address => AuctionInfo) public auctionInfo;
    address[] public allAuctions;
    
    address public feeRecipient;
    uint256 public platformFeeRate;
    address public ethPriceFeed;
    
    event AuctionCreated(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed auctionContract
    );
    
    constructor(address _feeRecipient, uint256 _platformFeeRate) Ownable(msg.sender) {
        require(_feeRecipient != address(0), "Invalid recipient");
        require(_platformFeeRate <= 1000, "Fee too high");
        
        feeRecipient = _feeRecipient;
        platformFeeRate = _platformFeeRate;
    }
    
    function createAuction(
        address nftContract,
        uint256 tokenId
    ) external returns (address) {
        require(nftContract != address(0), "Invalid NFT");
        require(getAuction[nftContract][tokenId] == address(0), "Exists");
        
        NFTAuction auction = new NFTAuction(feeRecipient);
        address auctionContract = address(auction);
        
        if (ethPriceFeed != address(0)) {
            auction.setPriceFeed(address(0), ethPriceFeed);
        }
        
        getAuction[nftContract][tokenId] = auctionContract;
        auctionInfo[auctionContract] = AuctionInfo(msg.sender, block.timestamp, true);
        allAuctions.push(auctionContract);
        
        emit AuctionCreated(nftContract, tokenId, auctionContract);
        return auctionContract;
    }
    
    function setEthPriceFeed(address priceFeed) external onlyOwner {
        ethPriceFeed = priceFeed;
        
        for (uint256 i = 0; i < allAuctions.length; i++) {
            if (auctionInfo[allAuctions[i]].active) {
                NFTAuction(allAuctions[i]).setPriceFeed(address(0), priceFeed);
            }
        }
    }
    
    function allAuctionsLength() external view returns (uint256) {
        return allAuctions.length;
    }
}

