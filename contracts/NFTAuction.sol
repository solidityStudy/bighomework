// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title NFTAuction
 * @dev NFT拍卖合约，支持ETH和ERC20代币出价，集成Chainlink价格预言机
 */
contract NFTAuction is ReentrancyGuard, Ownable {
    
    struct Auction {
        address seller;           // 卖家地址
        address nftContract;      // NFT合约地址
        uint256 tokenId;          // NFT token ID
        uint256 startPrice;       // 起拍价（USD，18位小数）
        uint256 endTime;          // 拍卖结束时间
        address highestBidder;    // 最高出价者
        uint256 highestBidUSD;    // 最高出价（USD，18位小数）
        address bidToken;         // 出价代币地址（address(0)表示ETH）
        uint256 bidAmount;        // 出价金额（原始代币单位）
        bool ended;               // 拍卖是否结束
        bool claimed;             // 是否已领取
    }
    
    // 状态变量
    mapping(uint256 => Auction) public auctions;
    mapping(address => AggregatorV3Interface) public priceFeeds; // 代币价格预言机
    mapping(uint256 => mapping(address => uint256)) public bids; // 拍卖ID => 出价者 => 出价金额
    
    uint256 public auctionCounter;
    uint256 public constant AUCTION_DURATION = 7 days; // 默认拍卖时长
    uint256 public platformFeeRate = 250; // 平台手续费 2.5% (250/10000)
    address public feeRecipient;
    
    // 事件
    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed seller,
        address indexed nftContract,
        uint256 tokenId,
        uint256 startPrice,
        uint256 endTime
    );
    
    event BidPlaced(
        uint256 indexed auctionId,
        address indexed bidder,
        address bidToken,
        uint256 bidAmount,
        uint256 bidUSD
    );
    
    event AuctionEnded(
        uint256 indexed auctionId,
        address indexed winner,
        uint256 winningBidUSD
    );
    
    event AuctionClaimed(
        uint256 indexed auctionId,
        address indexed winner,
        address indexed seller
    );
    
    constructor(address _feeRecipient) Ownable(msg.sender) {
        feeRecipient = _feeRecipient;
    }
    
    /**
     * @dev 设置价格预言机
     * @param token 代币地址（address(0)表示ETH）
     * @param priceFeed Chainlink价格预言机地址
     */
    function setPriceFeed(address token, address priceFeed) external onlyOwner {
        priceFeeds[token] = AggregatorV3Interface(priceFeed);
    }
    
    /**
     * @dev 创建拍卖
     * @param nftContract NFT合约地址
     * @param tokenId NFT token ID
     * @param startPriceUSD 起拍价（USD，18位小数）
     * @param duration 拍卖时长（秒）
     */
    function createAuction(
        address nftContract,
        uint256 tokenId,
        uint256 startPriceUSD,
        uint256 duration
    ) external returns (uint256) {
        require(nftContract != address(0), "Invalid NFT contract");
        require(startPriceUSD > 0, "Start price must be greater than 0");
        require(duration > 0, "Duration must be greater than 0");
        
        // 检查NFT所有权和授权
        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not NFT owner");
        require(
            nft.isApprovedForAll(msg.sender, address(this)) || 
            nft.getApproved(tokenId) == address(this),
            "Contract not approved"
        );
        
        uint256 auctionId = auctionCounter++;
        uint256 endTime = block.timestamp + duration;
        
        auctions[auctionId] = Auction({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            startPrice: startPriceUSD,
            endTime: endTime,
            highestBidder: address(0),
            highestBidUSD: 0,
            bidToken: address(0),
            bidAmount: 0,
            ended: false,
            claimed: false
        });
        
        // 转移NFT到合约
        nft.transferFrom(msg.sender, address(this), tokenId);
        
        emit AuctionCreated(auctionId, msg.sender, nftContract, tokenId, startPriceUSD, endTime);
        return auctionId;
    }
    
    /**
     * @dev 使用ETH出价
     * @param auctionId 拍卖ID
     */
    function bidWithETH(uint256 auctionId) external payable nonReentrant {
        require(msg.value > 0, "Bid amount must be greater than 0");
        
        uint256 bidUSD = getTokenPriceInUSD(address(0), msg.value);
        _placeBid(auctionId, address(0), msg.value, bidUSD);
    }
    
    /**
     * @dev 使用ERC20代币出价
     * @param auctionId 拍卖ID
     * @param token ERC20代币地址
     * @param amount 出价金额
     */
    function bidWithToken(uint256 auctionId, address token, uint256 amount) external nonReentrant {
        require(token != address(0), "Invalid token address");
        require(amount > 0, "Bid amount must be greater than 0");
        require(address(priceFeeds[token]) != address(0), "Price feed not set for token");
        
        // 转移代币到合约
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        
        uint256 bidUSD = getTokenPriceInUSD(token, amount);
        _placeBid(auctionId, token, amount, bidUSD);
    }
    
    /**
     * @dev 内部出价逻辑
     */
    function _placeBid(uint256 auctionId, address bidToken, uint256 bidAmount, uint256 bidUSD) internal {
        Auction storage auction = auctions[auctionId];
        
        require(auction.seller != address(0), "Auction does not exist");
        require(block.timestamp < auction.endTime, "Auction has ended");
        require(!auction.ended, "Auction has been ended");
        require(msg.sender != auction.seller, "Seller cannot bid");
        require(bidUSD >= auction.startPrice, "Bid below start price");
        require(bidUSD > auction.highestBidUSD, "Bid not high enough");
        
        // 退还之前的最高出价
        if (auction.highestBidder != address(0)) {
            _refundBid(auctionId);
        }
        
        // 更新拍卖信息
        auction.highestBidder = msg.sender;
        auction.highestBidUSD = bidUSD;
        auction.bidToken = bidToken;
        auction.bidAmount = bidAmount;
        
        // 记录出价
        bids[auctionId][msg.sender] = bidAmount;
        
        emit BidPlaced(auctionId, msg.sender, bidToken, bidAmount, bidUSD);
    }
    
    /**
     * @dev 结束拍卖
     * @param auctionId 拍卖ID
     */
    function endAuction(uint256 auctionId) external nonReentrant {
        Auction storage auction = auctions[auctionId];
        
        require(auction.seller != address(0), "Auction does not exist");
        require(block.timestamp >= auction.endTime, "Auction not yet ended");
        require(!auction.ended, "Auction already ended");
        
        auction.ended = true;
        
        emit AuctionEnded(auctionId, auction.highestBidder, auction.highestBidUSD);
    }
    
    /**
     * @dev 领取拍卖结果
     * @param auctionId 拍卖ID
     */
    function claimAuction(uint256 auctionId) external nonReentrant {
        Auction storage auction = auctions[auctionId];
        
        require(auction.ended, "Auction not ended");
        require(!auction.claimed, "Auction already claimed");
        require(
            msg.sender == auction.seller || msg.sender == auction.highestBidder,
            "Not authorized to claim"
        );
        
        auction.claimed = true;
        
        if (auction.highestBidder != address(0)) {
            // 有出价者，转移NFT给获胜者
            IERC721(auction.nftContract).transferFrom(
                address(this),
                auction.highestBidder,
                auction.tokenId
            );
            
            // 计算并转移资金给卖家
            uint256 platformFee = (auction.bidAmount * platformFeeRate) / 10000;
            uint256 sellerAmount = auction.bidAmount - platformFee;
            
            if (auction.bidToken == address(0)) {
                // ETH支付
                payable(auction.seller).transfer(sellerAmount);
                payable(feeRecipient).transfer(platformFee);
            } else {
                // ERC20代币支付
                IERC20(auction.bidToken).transfer(auction.seller, sellerAmount);
                IERC20(auction.bidToken).transfer(feeRecipient, platformFee);
            }
        } else {
            // 无出价者，退还NFT给卖家
            IERC721(auction.nftContract).transferFrom(
                address(this),
                auction.seller,
                auction.tokenId
            );
        }
        
        emit AuctionClaimed(auctionId, auction.highestBidder, auction.seller);
    }
    
    /**
     * @dev 退还出价
     */
    function _refundBid(uint256 auctionId) internal {
        Auction storage auction = auctions[auctionId];
        
        if (auction.bidToken == address(0)) {
            // 退还ETH
            payable(auction.highestBidder).transfer(auction.bidAmount);
        } else {
            // 退还ERC20代币
            IERC20(auction.bidToken).transfer(auction.highestBidder, auction.bidAmount);
        }
    }
    
    /**
     * @dev 获取代币的USD价格
     * @param token 代币地址（address(0)表示ETH）
     * @param amount 代币数量
     * @return USD价格（18位小数）
     */
    function getTokenPriceInUSD(address token, uint256 amount) public view returns (uint256) {
        AggregatorV3Interface priceFeed = priceFeeds[token];
        require(address(priceFeed) != address(0), "Price feed not available");
        
        (, int256 price, , , ) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price");
        
        uint8 decimals = priceFeed.decimals();
        
        // 将价格转换为18位小数的USD
        uint256 priceUSD = uint256(price) * (10 ** (18 - decimals));
        
        // 计算总价值
        return (amount * priceUSD) / (10 ** 18);
    }
    
    /**
     * @dev 获取拍卖信息
     */
    function getAuction(uint256 auctionId) external view returns (Auction memory) {
        return auctions[auctionId];
    }
    
    /**
     * @dev 设置平台手续费率
     */
    function setPlatformFeeRate(uint256 _feeRate) external onlyOwner {
        require(_feeRate <= 1000, "Fee rate too high"); // 最高10%
        platformFeeRate = _feeRate;
    }
    
    /**
     * @dev 设置手续费接收地址
     */
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
    }
}
