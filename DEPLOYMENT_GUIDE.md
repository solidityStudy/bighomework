# NFT拍卖系统 - Sepolia测试网部署指南

## 🆕 最新改进

### v2.0 更新内容
- ✅ **修复了所有 TypeScript 类型错误**
- ✅ **添加了便捷的 npm 脚本命令**
- ✅ **优化了部署流程，支持一键部署**
- ✅ **增强了错误处理和调试信息**
- ✅ **完善了部署后自动配置**
- ✅ **改进了合约验证流程**

## 🚀 快速开始

### 1. 环境准备

#### 1.1 配置环境变量
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入以下信息:
# - SEPOLIA_RPC_URL: Sepolia RPC节点地址
# - SEPOLIA_PRIVATE_KEY: 部署账户私钥（不含0x前缀）
```

#### 1.2 获取测试ETH
- 访问 [Sepolia Faucet](https://sepoliafaucet.com/) 获取测试ETH
- 建议账户至少有 0.05 ETH 用于部署

#### 1.3 获取RPC节点
选择以下任一服务商获取Sepolia RPC URL：
- [Alchemy](https://dashboard.alchemy.com/) - 推荐
- [Infura](https://infura.io/)
- [QuickNode](https://www.quicknode.com/)

### 2. 部署前检查

```bash
# 编译合约
npm run compile

# 运行部署前检查
npm run deploy:check
```

### 3. 执行部署

**方式一：一键完整部署（推荐）**
```bash
# 完整部署流程（检查 + 部署 + 配置）
npm run deploy:full
```

**方式二：分步部署**
```bash
# 仅部署合约
npm run deploy:sepolia

# 部署后配置
npm run deploy:setup
```

## 📋 部署内容

部署脚本将创建以下合约：

### 核心合约
1. **AuctionNFT** - ERC721 NFT合约
   - 支持铸造和批量铸造
   - 包含元数据URI支持

2. **NFTAuction** - 拍卖核心合约
   - 支持ETH和ERC20代币出价
   - 集成Chainlink价格预言机
   - 包含重入保护和访问控制

### 测试合约
3. **MockERC20** - 测试代币
   - 用于测试代币出价功能
   - 初始供应量: 1,000,000 代币

4. **MockPriceFeed** - 价格预言机模拟
   - ETH/USD: $2,000
   - TEST/USD: $1

## 🔧 部署后操作

### 1. 验证部署
```bash
# 检查合约状态和交互
npm run deploy:interact
```

### 2. 在Etherscan上验证合约
```bash
# 自动验证所有合约（需要ETHERSCAN_API_KEY）
npm run deploy:verify

# 或手动验证单个合约
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

### 3. 清理和重新部署
```bash
# 清理编译产物
npm run clean

# 重新编译
npm run compile
```

### 4. 测试功能

#### 4.1 铸造NFT
```typescript
// 连接到NFT合约
const nftContract = await hre.viem.getContractAt("AuctionNFT", NFT_ADDRESS);

// 铸造NFT
await nftContract.write.mint([
  userAddress, 
  "https://your-metadata-url.json"
]);
```

#### 4.2 创建拍卖
```typescript
// 授权拍卖合约
await nftContract.write.approve([AUCTION_ADDRESS, tokenId]);

// 创建拍卖
await auctionContract.write.createAuction([
  NFT_ADDRESS,
  tokenId,
  startPriceUSD, // 18位小数
  duration // 秒
]);
```

#### 4.3 参与拍卖
```typescript
// ETH出价
await auctionContract.write.bidWithETH([auctionId], {
  value: ethAmount
});

// 代币出价
await tokenContract.write.approve([AUCTION_ADDRESS, tokenAmount]);
await auctionContract.write.bidWithToken([
  auctionId,
  TOKEN_ADDRESS,
  tokenAmount
]);
```

## 📊 Gas费用估算

| 操作 | 预估Gas | 备注 |
|------|---------|------|
| 部署AuctionNFT | ~1,200,000 | 包含ERC721功能 |
| 部署NFTAuction | ~1,500,000 | 包含拍卖逻辑 |
| 部署MockERC20 | ~800,000 | 标准ERC20 |
| 部署MockPriceFeed | ~300,000 | 简单预言机 |
| 铸造NFT | ~100,000 | 每个NFT |
| 创建拍卖 | ~200,000 | 每个拍卖 |
| 出价 | ~150,000 | 每次出价 |

**总部署成本**: 约 0.02-0.05 ETH（取决于Gas价格）

## 🔍 故障排除

### 常见问题

#### 1. "insufficient funds" 错误
- 检查账户ETH余额
- 确保有足够的ETH支付Gas费用

#### 2. "nonce too low" 错误
- 重置MetaMask账户nonce
- 或等待几分钟后重试

#### 3. 合约创建代码存储超出gas限制错误
- 合约太大，需要启用优化器
- 在hardhat.config.ts中设置optimizer
- 注意：AuctionFactory合约较大，建议使用生产配置编译

#### 4. TypeScript类型错误
- 已在脚本中使用类型断言解决
- 如遇到新的类型问题，使用 `as any` 临时解决

#### 5. RPC连接问题
- 检查SEPOLIA_RPC_URL是否正确
- 尝试更换RPC提供商

### 调试技巧

1. **查看交易详情**
   ```bash
   # 在Etherscan上查看交易
   https://sepolia.etherscan.io/tx/<TRANSACTION_HASH>
   ```

2. **检查合约状态**
   ```bash
   # 运行交互脚本
   npm run deploy:interact
   ```

3. **查看事件日志**
   ```typescript
   // 监听合约事件
   const logs = await publicClient.getLogs({
     address: contractAddress,
     fromBlock: 'earliest',
     toBlock: 'latest'
   });
   ```

## 🔗 有用链接

- [Sepolia Etherscan](https://sepolia.etherscan.io/)
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Alchemy Dashboard](https://dashboard.alchemy.com/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

## 🎯 下一步

部署成功后，你可以：

1. **开发前端界面**
   - 使用Web3.js或Ethers.js连接合约
   - 创建用户友好的拍卖界面

2. **集成真实价格预言机**
   - 替换Mock价格预言机
   - 使用Chainlink Price Feeds

3. **添加更多功能**
   - 拍卖历史记录
   - 用户评级系统
   - 高级搜索功能

4. **准备主网部署**
   - 进行安全审计
   - 优化Gas使用
   - 准备治理机制

---

🎉 **恭喜！你的NFT拍卖系统已成功部署到Sepolia测试网！**
