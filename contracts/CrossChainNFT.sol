// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/LinkTokenInterface.sol";

/**
 * @title CrossChainNFT
 * @dev 支持跨链传输的 NFT 合约
 * 使用 Chainlink CCIP 概念实现 NFT 跨链功能
 */
contract CrossChainNFT is ERC721, ERC721URIStorage, AccessControl, ReentrancyGuard {
    
    // 角色定义
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BRIDGE_ROLE = keccak256("BRIDGE_ROLE");
    
    // 状态变量
    uint256 private _tokenIdCounter;
    LinkTokenInterface public linkToken;
    address public ccipRouter;
    
    // 跨链配置
    mapping(uint64 => address) public trustedRemotes; // 目标链ID => 目标合约地址
    mapping(uint256 => bool) public lockedTokens; // 被锁定的代币（已发送到其他链）
    mapping(bytes32 => bool) public processedMessages; // 已处理的跨链消息
    
    // 跨链消息结构
    struct CrossChainMessage {
        address to;
        uint256 tokenId;
        string tokenURI;
        uint64 sourceChain;
        bytes32 messageId;
    }
    
    // 事件
    event TokenSentCrossChain(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        uint64 destinationChainSelector,
        bytes32 messageId
    );
    
    event TokenReceivedCrossChain(
        uint256 indexed tokenId,
        address indexed to,
        uint64 sourceChainSelector,
        bytes32 messageId
    );
    
    event TrustedRemoteSet(uint64 indexed chainSelector, address indexed remoteContract);
    event CCIPRouterUpdated(address indexed oldRouter, address indexed newRouter);
    
    // 错误定义
    error NotEnoughBalance(uint256 currentBalance, uint256 calculatedFees);
    error NothingToWithdraw();
    error FailedToWithdrawEth(address owner, address target, uint256 value);
    error TokenLocked(uint256 tokenId);
    error TokenNotLocked(uint256 tokenId);
    error UntrustedChain(uint64 chainSelector);
    error InvalidTokenId(uint256 tokenId);
    error MessageAlreadyProcessed(bytes32 messageId);
    error OnlyRouter();
    
    modifier onlyRouter() {
        if (msg.sender != ccipRouter) revert OnlyRouter();
        _;
    }
    
    constructor(
        string memory name,
        string memory symbol,
        address _router,
        address _linkToken
    ) ERC721(name, symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BRIDGE_ROLE, msg.sender);
        
        ccipRouter = _router;
        linkToken = LinkTokenInterface(_linkToken);
    }
    
    /**
     * @dev 铸造 NFT
     */
    function mint(address to, string memory uri) public onlyRole(MINTER_ROLE) returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        
        return tokenId;
    }
    
    /**
     * @dev 批量铸造 NFT
     */
    function batchMint(
        address to, 
        string[] memory uris
    ) public onlyRole(MINTER_ROLE) returns (uint256[] memory) {
        uint256[] memory tokenIds = new uint256[](uris.length);
        
        for (uint256 i = 0; i < uris.length; i++) {
            tokenIds[i] = mint(to, uris[i]);
        }
        
        return tokenIds;
    }
    
    /**
     * @dev 设置 CCIP 路由器地址
     */
    function setCCIPRouter(address _router) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldRouter = ccipRouter;
        ccipRouter = _router;
        emit CCIPRouterUpdated(oldRouter, _router);
    }
    
    /**
     * @dev 设置信任的远程合约
     */
    function setTrustedRemote(
        uint64 chainSelector, 
        address remoteContract
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        trustedRemotes[chainSelector] = remoteContract;
        emit TrustedRemoteSet(chainSelector, remoteContract);
    }
    
    /**
     * @dev 跨链发送 NFT
     * 注意：这是一个简化版本，实际实现需要集成真正的 CCIP 路由器
     */
    function sendNFTCrossChain(
        uint64 destinationChainSelector,
        address to,
        uint256 tokenId
    ) external payable nonReentrant returns (bytes32 messageId) {
        // 验证
        if (ownerOf(tokenId) != msg.sender) revert InvalidTokenId(tokenId);
        if (lockedTokens[tokenId]) revert TokenLocked(tokenId);
        if (trustedRemotes[destinationChainSelector] == address(0)) revert UntrustedChain(destinationChainSelector);
        
        // 锁定 NFT
        lockedTokens[tokenId] = true;
        
        // 生成消息 ID（实际实现中由 CCIP 路由器生成）
        messageId = keccak256(abi.encodePacked(
            block.timestamp,
            block.number,
            msg.sender,
            tokenId,
            destinationChainSelector
        ));
        
        // 准备跨链消息
        string memory uri = tokenURI(tokenId);
        
        // 在实际实现中，这里会调用 CCIP 路由器发送消息
        // 现在我们只是发出事件来模拟
        emit TokenSentCrossChain(tokenId, msg.sender, to, destinationChainSelector, messageId);
        
        return messageId;
    }
    
    /**
     * @dev 接收跨链消息（由 CCIP 路由器调用）
     * 注意：这是一个简化版本，实际实现需要由 CCIP 路由器调用
     */
    function receiveNFTCrossChain(
        uint64 sourceChainSelector,
        address sender,
        CrossChainMessage memory message
    ) external onlyRouter {
        // 验证发送者是否为信任的远程合约
        if (trustedRemotes[sourceChainSelector] != sender) revert UntrustedChain(sourceChainSelector);
        
        // 防止重复处理
        if (processedMessages[message.messageId]) revert MessageAlreadyProcessed(message.messageId);
        processedMessages[message.messageId] = true;
        
        // 铸造 NFT 给接收者
        _safeMint(message.to, message.tokenId);
        _setTokenURI(message.tokenId, message.tokenURI);
        
        emit TokenReceivedCrossChain(
            message.tokenId, 
            message.to, 
            sourceChainSelector, 
            message.messageId
        );
    }
    
    /**
     * @dev 解锁代币（如果跨链传输失败）
     */
    function unlockToken(uint256 tokenId) external onlyRole(BRIDGE_ROLE) {
        if (!lockedTokens[tokenId]) revert TokenNotLocked(tokenId);
        lockedTokens[tokenId] = false;
    }
    
    /**
     * @dev 获取跨链传输费用估算（模拟）
     */
    function getTransferFee(
        uint64 destinationChainSelector,
        address to,
        uint256 tokenId
    ) external view returns (uint256 fee) {
        if (trustedRemotes[destinationChainSelector] == address(0)) revert UntrustedChain(destinationChainSelector);
        
        // 模拟费用计算（实际实现中由 CCIP 路由器计算）
        return 0.001 ether; // 固定费用用于演示
    }
    
    /**
     * @dev 提取 LINK 代币
     */
    function withdrawLink(address to) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 balance = linkToken.balanceOf(address(this));
        if (balance == 0) revert NothingToWithdraw();
        linkToken.transfer(to, balance);
    }
    
    /**
     * @dev 提取 ETH
     */
    function withdrawEth(address to) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 balance = address(this).balance;
        if (balance == 0) revert NothingToWithdraw();
        
        (bool success, ) = payable(to).call{value: balance}("");
        if (!success) revert FailedToWithdrawEth(msg.sender, to, balance);
    }
    
    /**
     * @dev 存入 LINK 代币用于支付跨链费用
     */
    function depositLink(uint256 amount) external {
        linkToken.transferFrom(msg.sender, address(this), amount);
    }
    
    /**
     * @dev 检查代币是否被锁定
     */
    function isTokenLocked(uint256 tokenId) external view returns (bool) {
        return lockedTokens[tokenId];
    }
    
    /**
     * @dev 获取下一个代币 ID
     */
    function getNextTokenId() external view returns (uint256) {
        return _tokenIdCounter;
    }
    
    /**
     * @dev 检查消息是否已处理
     */
    function isMessageProcessed(bytes32 messageId) external view returns (bool) {
        return processedMessages[messageId];
    }
    
    /**
     * @dev 重写 tokenURI 函数
     */
    function tokenURI(uint256 tokenId) 
        public view override(ERC721, ERC721URIStorage) 
        returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    /**
     * @dev 重写 supportsInterface 函数
     */
    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721URIStorage, AccessControl)
        returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    
    /**
     * @dev 重写 _update 函数，防止转移被锁定的代币
     */
    function _update(address to, uint256 tokenId, address auth)
        internal override returns (address) {
        if (lockedTokens[tokenId] && to != address(0)) {
            revert TokenLocked(tokenId);
        }
        return super._update(to, tokenId, auth);
    }
    
    /**
     * @dev 接收 ETH
     */
    receive() external payable {}
}
