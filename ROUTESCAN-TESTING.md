# 🌐 Routescan 测试指南

在 testnet.routescan.io 上测试你的NFT拍卖系统

---

## 📋 合约链接（直接可点击）

### 主要合约
```
MockPriceFeed (价格预言机):
https://testnet.routescan.io/address/0x4Ef2efb6567EF780F10e943fd9364d08e4c50BC3

MockERC20 (测试USDT):
https://testnet.routescan.io/address/0x63cd19828A547326EF38d6Fdca95d0A1494B0cd4

AuctionNFT (NFT合约):
https://testnet.routescan.io/address/0x3d4dF05cD2aF50682fe819Aef81B14CFF2F3dfc7

NFTAuction (拍卖合约):
https://testnet.routescan.io/address/0x2c192761D128Ceb6C2d469cfd1846A197a5F2B06

AuctionFactorySimple (工厂合约):
https://testnet.routescan.io/address/0x5ACcF55A8D2b324f4f388e84069dA7353Fe63CcF
```

---

## 🎯 Routescan 界面说明

访问任何合约链接后，你会看到以下标签页：

### 📑 标签页说明
- **Transactions**: 查看合约的所有交易记录
- **Contract**: 查看合约源码（已验证）
- **Read Contract**: 读取合约数据（无需gas）
- **Write Contract**: 执行合约函数（需要连接钱包）
- **Events**: 查看合约事件日志

---

## 🚀 测试流程

---

## 第一阶段：基础功能测试

### ✅ 测试 1: 查看价格预言机

**链接**: https://testnet.routescan.io/address/0x4Ef2efb6567EF780F10e943fd9364d08e4c50BC3

#### 步骤：
1. 访问上面的链接
2. 点击 **"Read Contract"** 标签
3. 找到以下函数并查看结果：

**1.1 查看当前价格**
```
函数: getPrice
点击 "Query" 按钮
预期结果: 200000000000
说明: 表示 $2000（8位小数）
```

**1.2 查看小数位数**
```
函数: decimals
点击 "Query" 按钮
预期结果: 8
```

**1.3 查看描述**
```
函数: description
点击 "Query" 按钮
预期结果: "ETH/USD"
```

**1.4 查看最新价格数据**
```
函数: latestRoundData
点击 "Query" 按钮
预期结果:
  roundId: 1
  answer: 200000000000
  startedAt: [时间戳]
  updatedAt: [时间戳]
  answeredInRound: 1
```

✅ **通过标准**: 所有数据正确显示

---

### ✅ 测试 2: 查看 ERC20 代币信息

**链接**: https://testnet.routescan.io/address/0x63cd19828A547326EF38d6Fdca95d0A1494B0cd4

#### 步骤：
1. 访问链接
2. 点击 **"Read Contract"** 标签

**2.1 基本信息**
```
函数: name
结果: "TestUSDT"

函数: symbol
结果: "tUSDT"

函数: decimals
结果: 6

函数: totalSupply
结果: 10000000000
说明: 10,000个代币（6位小数）
```

**2.2 查看你的余额**
```
函数: balanceOf
参数: [输入你的钱包地址]
点击 "Query"
预期结果: 10000000000 (你拥有所有代币)
```

✅ **通过标准**: 代币信息正确，你拥有初始供应量

---

### ✅ 测试 3: 铸造你的第一个 NFT 🎨

**链接**: https://testnet.routescan.io/address/0x3d4dF05cD2aF50682fe819Aef81B14CFF2F3dfc7

#### 步骤：

**3.1 先查看当前状态 (Read Contract)**
```
函数: name
结果: "TestNFT"

函数: symbol
结果: "TNFT"

函数: totalSupply
结果: 0 (还没铸造任何NFT)
```

**3.2 连接钱包准备铸造 (Write Contract)**
1. 点击 **"Write Contract"** 标签
2. 点击 **"Connect Wallet"** 按钮
3. 选择 **MetaMask**
4. 确认连接（确保在 Sepolia 测试网）

**3.3 铸造第一个NFT**
```
函数: mint

参数:
  to (address): [你的钱包地址]
  _tokenURI (string): ipfs://QmTestNFT001

操作:
1. 填写参数
2. 点击 "Write" 按钮
3. MetaMask会弹出，确认交易
4. 等待交易确认（通常10-30秒）
```

**3.4 验证铸造成功 (回到 Read Contract)**
```
函数: totalSupply
结果: 1

函数: ownerOf
参数: 0
结果: [你的钱包地址]

函数: tokenURI
参数: 0
结果: "ipfs://QmTestNFT001"
```

**3.5 铸造第二个NFT（用于后续测试）**
```
函数: mint
参数:
  to: [你的钱包地址]
  _tokenURI: ipfs://QmTestNFT002

再次确认交易
验证: totalSupply 应该变成 2
```

✅ **通过标准**: 成功铸造NFT，可以查询所有者和URI

---

## 第二阶段：拍卖功能测试

### ✅ 测试 4: 创建你的第一个拍卖 🎯

**涉及合约**: AuctionNFT + NFTAuction

#### 步骤：

**4.1 授权 NFT 给拍卖合约 (AuctionNFT)**

访问: https://testnet.routescan.io/address/0x3d4dF05cD2aF50682fe819Aef81B14CFF2F3dfc7

1. 点击 **"Write Contract"** 标签
2. 确保钱包已连接

```
函数: approve

参数:
  to (address): 0x2c192761D128Ceb6C2d469cfd1846A197a5F2B06
  tokenId (uint256): 0

操作:
1. 填写参数
2. 点击 "Write"
3. 确认 MetaMask 交易
4. 等待确认

说明: 这一步授权拍卖合约可以转移你的NFT
```

**4.2 验证授权成功 (Read Contract)**
```
函数: getApproved
参数: 0
预期结果: 0x2c192761D128Ceb6C2d469cfd1846A197a5F2B06
```

**4.3 创建拍卖 (NFTAuction)**

访问: https://testnet.routescan.io/address/0x2c192761D128Ceb6C2d469cfd1846A197a5F2B06

1. 点击 **"Write Contract"** 标签

```
函数: createAuction

参数:
  nftContract (address): 0x3d4dF05cD2aF50682fe819Aef81B14CFF2F3dfc7
  tokenId (uint256): 0
  startPriceUSD (uint256): 1000000000000000000
  duration (uint256): 300

参数说明:
  - nftContract: AuctionNFT合约地址
  - tokenId: 要拍卖的NFT ID
  - startPriceUSD: 1 USD（18位小数）
  - duration: 300秒 = 5分钟（方便测试）

操作:
1. 填写所有参数
2. 点击 "Write"
3. 确认交易（这个交易会贵一些，因为涉及NFT转移）
4. 等待确认
```

**4.4 验证拍卖创建成功 (Read Contract)**

切换到 **"Read Contract"** 标签

```
函数: auctionCounter
结果: 1 (创建了第一个拍卖)

函数: getAuction
参数: 0
结果:
  seller: [你的地址]
  nftContract: 0x3d4dF05cD2aF50682fe819Aef81B14CFF2F3dfc7
  tokenId: 0
  startPrice: 1000000000000000000
  endTime: [当前时间 + 300秒]
  highestBidder: 0x0000000000000000000000000000000000000000
  highestBidUSD: 0
  bidToken: 0x0000000000000000000000000000000000000000
  bidAmount: 0
  ended: false
  claimed: false
```

**4.5 验证NFT已托管**

访问 AuctionNFT 的 Read Contract:
```
函数: ownerOf
参数: 0
结果: 0x2c192761D128Ceb6C2d469cfd1846A197a5F2B06
说明: NFT现在由拍卖合约持有
```

✅ **通过标准**: 拍卖创建成功，NFT已托管

---

### ✅ 测试 5: 使用 ETH 出价（需要第二个账户）

**重要**: 卖家不能给自己的拍卖出价！

#### 如果你有第二个 MetaMask 账户：

**5.1 切换到账户 B**
1. 在 MetaMask 中切换账户
2. 确保有 Sepolia 测试币
3. 刷新 Routescan 页面
4. 重新连接钱包

**5.2 使用 ETH 出价**

访问: https://testnet.routescan.io/address/0x2c192761D128Ceb6C2d469cfd1846A197a5F2B06

1. 确保使用账户 B 连接
2. 点击 **"Write Contract"** 标签

```
函数: bidWithETH

参数:
  auctionId (uint256): 0
  
在 "payableAmount" 输入框中:
  输入: 0.001
  单位: Ether

操作:
1. 填写 auctionId = 0
2. 在金额框输入 0.001 ETH
3. 点击 "Write"
4. 确认交易（会发送 0.001 ETH）
```

**5.3 验证出价成功 (Read Contract)**
```
函数: getAuction
参数: 0
检查:
  highestBidder: [账户B地址]
  highestBidUSD: 约 2000000000000000 ($2)
  bidToken: 0x0000000000000000000000000000000000000000
  bidAmount: 1000000000000000 (0.001 ETH)
```

#### 如果只有一个账户：
暂时跳过这个测试，直接进行测试 7（等待拍卖结束）

✅ **通过标准**: 成功出价，价格正确计算

---

### ✅ 测试 6: 使用 ERC20 代币出价（可选）

如果你想测试用 tUSDT 出价：

**6.1 授权代币给拍卖合约**

访问 MockERC20: https://testnet.routescan.io/address/0x63cd19828A547326EF38d6Fdca95d0A1494B0cd4

```
函数: approve
参数:
  spender: 0x2c192761D128Ceb6C2d469cfd1846A197a5F2B06
  amount: 2000000000

确认交易
```

**6.2 使用 tUSDT 出价**

访问 NFTAuction 合约

```
函数: bidWithToken
参数:
  auctionId: 0
  token: 0x63cd19828A547326EF38d6Fdca95d0A1494B0cd4
  amount: 1500000000

说明: 出价 1500 tUSDT
确认交易
```

**6.3 验证新的最高出价**
```
函数: getAuction
参数: 0
检查:
  bidToken: 0x63cd19... (MockERC20地址)
  bidAmount: 1500000000
```

✅ **通过标准**: ERC20出价成功，之前的ETH已退还

---

### ✅ 测试 7: 结束拍卖 ⏰

**等待拍卖时间结束！**

如果你的拍卖设置了 300 秒（5分钟），等待 5 分钟后：

#### 步骤：

**7.1 检查是否可以结束**

访问: https://testnet.routescan.io/address/0x2c192761D128Ceb6C2d469cfd1846A197a5F2B06

Read Contract:
```
函数: getAuction
参数: 0
查看: endTime 字段，确保当前时间已超过
```

**7.2 结束拍卖**

Write Contract:
```
函数: endAuction
参数: 0

操作:
1. 任何人都可以调用这个函数
2. 点击 "Write"
3. 确认交易
```

**7.3 验证拍卖已结束**

Read Contract:
```
函数: getAuction
参数: 0
检查:
  ended: true
  claimed: false
```

✅ **通过标准**: 拍卖成功结束

---

### ✅ 测试 8: 领取拍卖结果 🎁

**最后一步！**

#### 步骤：

**8.1 领取**

Write Contract:
```
函数: claimAuction
参数: 0

操作:
1. 可以用卖家或买家账户调用
2. 点击 "Write"
3. 确认交易
```

**8.2 验证结果**

**如果有出价者:**

检查 AuctionNFT:
```
函数: ownerOf
参数: 0
结果: [最高出价者地址]
```

检查 MockERC20 (如果用tUSDT出价):
```
函数: balanceOf
参数: [卖家地址]
检查余额增加（扣除2.5%手续费）
```

**如果无人出价:**

检查 AuctionNFT:
```
函数: ownerOf
参数: 0
结果: [卖家地址] (NFT退还给卖家)
```

**8.3 验证拍卖已领取**
```
函数: getAuction
参数: 0
检查:
  ended: true
  claimed: true
```

✅ **通过标准**: 资产正确转移，拍卖完成

---

## 📊 快速测试清单

### 🚀 5分钟快速测试（单账户）

```
✅ 1. 查看价格预言机 (Read Contract)
✅ 2. 铸造1个NFT (Write Contract)
✅ 3. 授权NFT (Write Contract)
✅ 4. 创建5分钟拍卖 (Write Contract)
⏰ 5. 等待5分钟
✅ 6. 结束拍卖 (Write Contract)
✅ 7. 领取NFT回来 (Write Contract)
```

### 🎯 完整测试（双账户，15分钟）

```
账户A:
✅ 1-4. 同上，创建拍卖

账户B:
✅ 5. 用ETH出价

账户A或B:
⏰ 6. 等待5分钟
✅ 7. 结束拍卖
✅ 8. 领取（NFT给B，资金给A）
```

---

## 🎥 查看交易历史

完成测试后，你可以：

### 查看合约交易记录
1. 访问任何合约页面
2. 点击 **"Transactions"** 标签
3. 查看所有交易历史

### 查看事件日志
1. 点击 **"Events"** 标签
2. 查看：
   - `NFTMinted` - NFT铸造事件
   - `AuctionCreated` - 拍卖创建事件
   - `BidPlaced` - 出价事件
   - `AuctionEnded` - 拍卖结束事件
   - `AuctionClaimed` - 领取事件

---

## 💡 Routescan 使用技巧

### 技巧 1: 查看交易详情
- 点击任何交易哈希
- 查看详细的输入数据、事件日志、gas消耗

### 技巧 2: 复制地址
- 点击地址旁的复制按钮
- 快速复制合约或账户地址

### 技巧 3: 查看源码
- 在 Contract 标签页可以阅读完整源码
- 已验证的合约会显示绿色勾号

### 技巧 4: 监控余额
- 在 Read Contract 中查看实时余额
- 每次交易后刷新查看变化

---

## ⚠️ 常见错误处理

### 错误 1: "execution reverted: Not NFT owner"
**原因**: 你不是NFT的所有者
**解决**: 确保使用正确的账户

### 错误 2: "execution reverted: Contract not approved"
**原因**: 没有授权NFT给拍卖合约
**解决**: 先调用 `approve()` 函数

### 错误 3: "execution reverted: Seller cannot bid"
**原因**: 卖家不能给自己的拍卖出价
**解决**: 切换到另一个账户

### 错误 4: "execution reverted: Auction not yet ended"
**原因**: 拍卖时间还没到
**解决**: 等待拍卖结束时间

### 错误 5: "insufficient funds for gas"
**原因**: 账户没有足够的Sepolia ETH
**解决**: 从水龙头获取测试币

---

## 📈 测试结果记录

| 测试项 | 状态 | 交易哈希 | 备注 |
|-------|------|---------|------|
| 价格预言机读取 | ⬜ | - | 无需交易 |
| ERC20信息读取 | ⬜ | - | 无需交易 |
| 铸造NFT #0 | ⬜ | 0x... | |
| 铸造NFT #1 | ⬜ | 0x... | |
| 授权NFT | ⬜ | 0x... | |
| 创建拍卖 | ⬜ | 0x... | |
| ETH出价 | ⬜ | 0x... | 可选 |
| ERC20出价 | ⬜ | 0x... | 可选 |
| 结束拍卖 | ⬜ | 0x... | |
| 领取结果 | ⬜ | 0x... | |

---

## 🎉 测试完成！

完成所有测试后，你将验证：
- ✅ NFT系统正常工作
- ✅ 拍卖创建和管理功能正常
- ✅ 价格预言机集成正确
- ✅ 资金和NFT转移安全
- ✅ 手续费计算正确

---

**准备好开始了吗？从铸造你的第一个NFT开始！** 🎨

立即访问: https://testnet.routescan.io/address/0x3d4dF05cD2aF50682fe819Aef81B14CFF2F3dfc7

