# 🎨 NFT拍卖系统

基于区块链的NFT拍卖平台，集成Chainlink价格预言机和跨链功能。

## 🌟 项目特点

- ✅ **NFT拍卖**: 支持ETH和ERC20代币出价
- ✅ **USD计价**: 集成Chainlink价格预言机，所有出价以USD计价
- ✅ **工厂模式**: 类似Uniswap V2的工厂模式管理拍卖
- ✅ **可升级合约**: 支持UUPS代理升级
- ✅ **跨链功能**: 使用Chainlink CCIP进行跨链NFT转移
- ✅ **完整测试**: 包含单元测试和集成测试
- ✅ **已部署验证**: 部署到Sepolia测试网并验证源码

## 📋 合约架构

```
contracts/
├── NFTAuction.sol           # 核心拍卖合约
├── AuctionFactory.sol       # 工厂合约（可升级）
├── AuctionFactorySimple.sol # 简化版工厂合约
├── AuctionNFT.sol          # ERC721 NFT合约
├── MockPriceFeed.sol       # 价格预言机模拟
├── MockERC20.sol           # ERC20代币模拟
└── CrossChainNFT.sol       # 跨链NFT合约
```

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 编译合约

```bash
npx hardhat compile
```

### 运行测试

```bash
npx hardhat test
```

### 部署到测试网

```bash
# 部署到Sepolia
npx hardhat run scripts/deploy-sepolia-simple.ts --network sepolia
```

## 📦 已部署合约（Sepolia测试网）

| 合约 | 地址 | 功能 |
|------|------|------|
| MockPriceFeed | `0x4Ef2efb6567EF780F10e943fd9364d08e4c50BC3` | 价格预言机 |
| MockERC20 | `0x63cd19828A547326EF38d6Fdca95d0A1494B0cd4` | 测试USDT |
| AuctionNFT | `0x3d4dF05cD2aF50682fe819Aef81B14CFF2F3dfc7` | NFT合约 |
| NFTAuction | `0x2c192761D128Ceb6C2d469cfd1846A197a5F2B06` | 拍卖合约 |
| AuctionFactorySimple | `0x5ACcF55A8D2b324f4f388e84069dA7353Fe63CcF` | 工厂合约 |

**浏览器查看**: 
- Etherscan: https://sepolia.etherscan.io/
- Routescan: https://testnet.routescan.io/

## 💡 核心功能

### 1. 创建拍卖

```solidity
function createAuction(
    address nftContract,
    uint256 tokenId,
    uint256 startPriceUSD,
    uint256 duration
) external returns (uint256)
```

### 2. 使用ETH出价

```solidity
function bidWithETH(uint256 auctionId) external payable
```

### 3. 使用ERC20代币出价

```solidity
function bidWithToken(
    uint256 auctionId,
    address token,
    uint256 amount
) external
```

### 4. 结束拍卖

```solidity
function endAuction(uint256 auctionId) external
```

### 5. 领取结果

```solidity
function claimAuction(uint256 auctionId) external
```

## 🧪 测试指南

详细测试步骤请参考:
- [Remix测试指南](TESTING-GUIDE.md)
- [Routescan测试指南](ROUTESCAN-TESTING.md)

## 📖 文档

- [项目概览](PROJECT_OVERVIEW.md)
- [部署指南](DEPLOYMENT_GUIDE.md)
- [部署总结](DEPLOYMENT-SUMMARY.md)
- [源码验证指南](verification-guide.md)
- [跨链功能说明](CROSSCHAIN_FEATURE.md)

## 🔧 技术栈

- **智能合约**: Solidity ^0.8.28
- **开发框架**: Hardhat
- **测试**: Hardhat + Viem
- **预言机**: Chainlink Price Feeds
- **跨链**: Chainlink CCIP
- **标准**: ERC721, ERC20, UUPS Proxy

## 📊 合约功能

### NFTAuction (拍卖合约)

- ✅ 支持ETH和ERC20代币出价
- ✅ USD计价（通过Chainlink价格预言机）
- ✅ 自动退还被超越的出价
- ✅ 平台手续费（2.5%）
- ✅ 防重入攻击
- ✅ 完整的事件日志

### AuctionFactory (工厂合约)

- ✅ 统一管理所有拍卖
- ✅ 自动配置价格预言机
- ✅ 批量管理手续费率
- ✅ UUPS可升级模式

### CrossChainNFT (跨链合约)

- ✅ 支持跨链转移NFT
- ✅ 使用Chainlink CCIP
- ✅ 支持多链部署

## 🎯 使用场景

1. **NFT艺术品拍卖**: 艺术家可以拍卖自己的NFT作品
2. **游戏道具拍卖**: 游戏NFT道具的二级市场
3. **收藏品交易**: 稀有NFT收藏品的拍卖
4. **跨链资产转移**: 在不同区块链间转移NFT

## 🔐 安全特性

- ✅ ReentrancyGuard 防重入
- ✅ Ownable 权限控制
- ✅ SafeTransfer 安全转账
- ✅ 价格验证
- ✅ 时间锁定
- ✅ 代理模式升级

## 📈 Gas优化

- ✅ 使用uint256减少类型转换
- ✅ 批量操作减少交易次数
- ✅ 事件代替存储
- ✅ 优化循环
- ✅ 200次编译优化

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

## 👥 作者

区块链开发者

## 🔗 相关链接

- [Chainlink文档](https://docs.chain.link/)
- [OpenZeppelin](https://docs.openzeppelin.com/)
- [Hardhat](https://hardhat.org/)
- [Sepolia测试网](https://sepolia.dev/)

---

**部署时间**: 2025-10-02
**测试网络**: Sepolia
**状态**: ✅ 已部署并验证

