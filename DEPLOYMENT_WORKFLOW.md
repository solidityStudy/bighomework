# 🚀 NFT拍卖系统 - 完整部署流程

## 📋 部署清单

### 前置准备 ✅
- [ ] Node.js 18+ 已安装
- [ ] Git 已安装
- [ ] 获得 Sepolia 测试网 ETH (至少 0.05 ETH)
- [ ] 获得 RPC 节点 URL (Alchemy/Infura/QuickNode)
- [ ] 获得 Etherscan API Key (可选，用于验证)

### 环境配置 ⚙️
- [ ] 克隆项目仓库
- [ ] 安装依赖包
- [ ] 配置环境变量
- [ ] 编译合约

### 部署执行 🚀
- [ ] 运行部署前检查
- [ ] 执行合约部署
- [ ] 运行部署后配置
- [ ] 验证合约代码

---

## 🔧 详细步骤

### 第一步：环境准备

#### 1.1 克隆项目
```bash
git clone <your-repo-url>
cd bighomework
```

#### 1.2 安装依赖
```bash
npm install
```

#### 1.3 配置环境变量
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件
nano .env
```

在 `.env` 文件中填入：
```bash
# Sepolia RPC URL
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# 部署账户私钥（不含0x前缀）
SEPOLIA_PRIVATE_KEY=your_private_key_here

# Etherscan API Key（可选）
ETHERSCAN_API_KEY=your_etherscan_api_key
```

#### 1.4 编译合约
```bash
npm run compile
```

### 第二步：部署前检查

运行自动检查脚本：
```bash
npm run deploy:check
```

检查项目包括：
- ✅ 网络配置正确
- ✅ 环境变量已设置
- ✅ 账户余额充足
- ✅ 合约已编译
- ✅ Gas 费用估算

### 第三步：执行部署

**方式一：一键完整部署（推荐）**
```bash
npm run deploy:full
```

**方式二：分步部署**
```bash
# 仅部署合约
npm run deploy:sepolia

# 部署后配置
npm run deploy:setup
```

部署过程将：
1. 🎨 部署 AuctionNFT 合约
2. 🪙 部署 MockERC20 测试代币
3. 📊 部署价格预言机合约
4. 🏛️ 部署 NFTAuction 主合约
5. ⚙️ 配置价格预言机
6. 🎭 铸造测试 NFT
7. 🔨 创建示例拍卖
8. 💾 保存部署信息
9. 🪙 分发测试代币
10. 💰 设置平台手续费率
11. 📝 更新交互脚本配置

### 第四步：验证合约（可选）

```bash
npm run deploy:verify
```

验证所有合约：
- ✅ AuctionNFT
- ✅ NFTAuction  
- ✅ MockERC20
- ✅ MockPriceFeed (ETH/USD)
- ✅ MockPriceFeed (TOKEN/USD)

---

## 📊 部署成本估算

| 合约 | 预估 Gas | 成本 (20 Gwei) |
|------|----------|----------------|
| AuctionNFT | ~1,200,000 | ~0.024 ETH |
| NFTAuction | ~1,500,000 | ~0.030 ETH |
| MockERC20 | ~800,000 | ~0.016 ETH |
| MockPriceFeed (x2) | ~600,000 | ~0.012 ETH |
| 配置交易 | ~500,000 | ~0.010 ETH |
| **总计** | **~4,600,000** | **~0.092 ETH** |

> 💡 实际成本取决于网络拥堵情况

---

## 🔍 验证部署成功

### 自动验证
```bash
npm run deploy:interact
```

### 手动验证
1. **检查合约地址**
   - 所有合约都有有效地址
   - 在 Etherscan 上可以查看

2. **验证功能**
   - NFT 可以铸造
   - 拍卖可以创建
   - 出价功能正常

3. **检查配置**
   - 价格预言机已设置
   - 平台手续费率正确
   - 测试代币已分发

---

## 🚨 故障排除

### 常见错误及解决方案

#### 1. "insufficient funds for gas"
**原因**: 账户 ETH 余额不足
**解决**: 
- 访问 [Sepolia Faucet](https://sepoliafaucet.com/) 获取测试 ETH
- 确保账户至少有 0.1 ETH

#### 2. "nonce too high"
**原因**: 交易 nonce 冲突
**解决**:
- 重置 MetaMask 账户
- 等待几分钟后重试

#### 3. "contract creation code storage out of gas"
**原因**: 合约太大，超过 gas 限制
**解决**:
- 启用 Solidity 优化器
- 检查合约大小是否超过 24KB

#### 4. "replacement transaction underpriced"
**原因**: Gas 价格设置过低
**解决**:
- 增加 gas 价格
- 等待网络拥堵缓解

#### 5. RPC 连接超时
**原因**: RPC 节点响应慢或不稳定
**解决**:
- 更换 RPC 提供商
- 检查网络连接
- 增加超时时间

---

## 📈 部署后操作

### 1. 测试合约功能
```bash
# 基本功能测试和交互
npm run deploy:interact

# 验证合约代码
npm run deploy:verify

# 清理和重新编译（如需要）
npm run clean && npm run compile
```

### 2. 监控合约状态
- 定期检查拍卖状态
- 监控平台手续费收入
- 观察用户交互情况

### 3. 准备前端集成
- 使用部署的合约地址
- 配置 Web3 连接
- 测试用户界面

### 4. 文档更新
- 更新 README.md
- 记录已知问题
- 准备用户指南

---

## 🎯 下一步计划

### 短期目标 (1-2 周)
- [ ] 完成前端界面开发
- [ ] 集成真实的 Chainlink 价格预言机
- [ ] 添加更多 NFT 元数据示例
- [ ] 优化 gas 使用效率

### 中期目标 (1-2 月)
- [ ] 进行安全审计
- [ ] 添加治理功能
- [ ] 实现拍卖历史记录
- [ ] 添加用户评级系统

### 长期目标 (3-6 月)
- [ ] 准备主网部署
- [ ] 建立社区治理
- [ ] 扩展到其他区块链
- [ ] 商业化运营

---

## 📞 支持与帮助

### 技术支持
- 📖 [Hardhat 文档](https://hardhat.org/docs)
- 📖 [OpenZeppelin 文档](https://docs.openzeppelin.com/)
- 📖 [Viem 文档](https://viem.sh/)

### 社区资源
- 💬 [Ethereum Stack Exchange](https://ethereum.stackexchange.com/)
- 💬 [Hardhat Discord](https://discord.gg/hardhat)
- 💬 [OpenZeppelin Forum](https://forum.openzeppelin.com/)

### 紧急联系
如遇到严重问题，请：
1. 保存错误日志
2. 记录操作步骤
3. 检查交易哈希
4. 寻求社区帮助

---

**🎉 恭喜！你已经成功完成了 NFT 拍卖系统的部署！**
