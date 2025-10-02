# 🧪 合约功能测试指南

## 📋 测试准备

### 已部署合约地址
```
MockPriceFeed:        0x4Ef2efb6567EF780F10e943fd9364d08e4c50BC3
MockERC20:            0x63cd19828A547326EF38d6Fdca95d0A1494B0cd4
AuctionNFT:           0x3d4dF05cD2aF50682fe819Aef81B14CFF2F3dfc7
NFTAuction:           0x2c192761D128Ceb6C2d469cfd1846A197a5F2B06
AuctionFactorySimple: 0x5ACcF55A8D2b324f4f388e84069dA7353Fe63CcF
```

### 测试工具
- Remix IDE（通过remixd连接）
- MetaMask钱包（Sepolia测试网）
- Sepolia测试币

---

## 🎯 测试流程概览

```
第一阶段：基础功能测试
├── 1. 测试价格预言机 (MockPriceFeed)
├── 2. 测试ERC20代币 (MockERC20)
└── 3. 测试NFT铸造 (AuctionNFT)

第二阶段：拍卖核心功能测试
├── 4. 创建拍卖
├── 5. 使用ETH出价
├── 6. 使用ERC20出价
├── 7. 结束拍卖
└── 8. 领取拍卖结果

第三阶段：工厂合约测试
└── 9. 使用Factory创建拍卖
```

---

## 📝 详细测试步骤

### 测试前准备：在Remix中加载合约

对每个合约执行以下操作：

1. 在Remix的 **Deploy & Run Transactions** 页面
2. 确保连接到 **Sepolia测试网** (Injected Provider)
3. 在合约下拉框中选择合约名称
4. 在 **"At Address"** 输入框中粘贴合约地址
5. 点击 **"At Address"** 按钮
6. 合约会出现在 "Deployed Contracts" 区域

---

## 第一阶段：基础功能测试

### ✅ 测试 1: 查看价格预言机

**合约**: MockPriceFeed (`0x4Ef2efb6567EF780F10e943fd9364d08e4c50BC3`)

#### 1.1 读取当前价格
```
函数: getPrice()
操作: 点击蓝色按钮
预期结果: 200000000000 (表示$2000，8位小数)
```

#### 1.2 读取价格详情
```
函数: latestRoundData()
操作: 点击蓝色按钮
预期结果:
  roundId: 1
  answer: 200000000000
  startedAt: [时间戳]
  updatedAt: [时间戳]
  answeredInRound: 1
```

#### 1.3 更新价格（可选测试）
```
函数: updatePrice(int256 _newPrice)
参数: 250000000000
操作: 点击橙色按钮
预期结果: 价格更新为$2500
验证: 再次调用 getPrice() 查看
```

**✅ 通过标准**: 能读取价格，价格合理

---

### ✅ 测试 2: ERC20代币功能

**合约**: MockERC20 (`0x63cd19828A547326EF38d6Fdca95d0A1494B0cd4`)

#### 2.1 查看代币信息
```
函数: name()
预期结果: "TestUSDT"

函数: symbol()
预期结果: "tUSDT"

函数: decimals()
预期结果: 6

函数: totalSupply()
预期结果: 10000000000 (10000个代币，6位小数)
```

#### 2.2 查看你的余额
```
函数: balanceOf(address account)
参数: [你的钱包地址]
预期结果: 10000000000 (你拥有全部10000个代币)
```

#### 2.3 铸造更多代币（可选）
```
函数: mint(address to, uint256 amount)
参数:
  to: [你的钱包地址]
  amount: 5000000000 (5000个代币)
操作: 点击橙色按钮，确认交易
验证: 再次查看 balanceOf()
预期结果: 15000000000
```

**✅ 通过标准**: 代币信息正确，余额显示正确

---

### ✅ 测试 3: NFT铸造

**合约**: AuctionNFT (`0x3d4dF05cD2aF50682fe819Aef81B14CFF2F3dfc7`)

#### 3.1 查看NFT信息
```
函数: name()
预期结果: "TestNFT"

函数: symbol()
预期结果: "TNFT"

函数: totalSupply()
预期结果: 0 (还没铸造)
```

#### 3.2 铸造第一个NFT 🎨
```
函数: mint(address to, string memory _tokenURI)
参数:
  to: [你的钱包地址]
  _tokenURI: "ipfs://QmTest123456" (或任何URI)

操作: 点击橙色按钮，确认交易
```

#### 3.3 验证铸造成功
```
函数: totalSupply()
预期结果: 1

函数: ownerOf(uint256 tokenId)
参数: 0
预期结果: [你的钱包地址]

函数: tokenURI(uint256 tokenId)
参数: 0
预期结果: "ipfs://QmTest123456"
```

#### 3.4 铸造第二个NFT（用于测试）
```
函数: mint(address to, string memory _tokenURI)
参数:
  to: [你的钱包地址]
  _tokenURI: "ipfs://QmTest789"

验证: totalSupply() 应该为 2
```

**✅ 通过标准**: 成功铸造NFT，可以查询所有者和URI

---

## 第二阶段：拍卖核心功能测试

### ✅ 测试 4: 创建拍卖

**合约**: NFTAuction (`0x2c192761D128Ceb6C2d469cfd1846A197a5F2B06`)

#### 4.1 授权NFT给拍卖合约
```
合约: AuctionNFT
函数: approve(address to, uint256 tokenId)
参数:
  to: 0x2c192761D128Ceb6C2d469cfd1846A197a5F2B06
  tokenId: 0

操作: 点击橙色按钮，确认交易
说明: 必须先授权，否则创建拍卖会失败
```

#### 4.2 创建拍卖
```
合约: NFTAuction
函数: createAuction(address nftContract, uint256 tokenId, uint256 startPriceUSD, uint256 duration)
参数:
  nftContract: 0x3d4dF05cD2aF50682fe819Aef81B14CFF2F3dfc7
  tokenId: 0
  startPriceUSD: 1000000000000000000 (1 USD，18位小数)
  duration: 86400 (1天 = 86400秒)

操作: 点击橙色按钮，确认交易
```

#### 4.3 验证拍卖创建成功
```
函数: auctionCounter()
预期结果: 1 (第一个拍卖)

函数: getAuction(uint256 auctionId)
参数: 0
预期结果:
  seller: [你的地址]
  nftContract: 0x3d4d...
  tokenId: 0
  startPrice: 1000000000000000000
  endTime: [当前时间 + 86400]
  highestBidder: 0x0000...
  highestBidUSD: 0
  bidToken: 0x0000...
  bidAmount: 0
  ended: false
  claimed: false
```

#### 4.4 验证NFT已转移
```
合约: AuctionNFT
函数: ownerOf(uint256 tokenId)
参数: 0
预期结果: 0x2c192761D128Ceb6C2d469cfd1846A197a5F2B06 (拍卖合约地址)
```

**✅ 通过标准**: 拍卖创建成功，NFT已托管到拍卖合约

---

### ✅ 测试 5: 使用ETH出价

**重要**: 需要使用另一个账户测试！卖家不能给自己的拍卖出价。

#### 方法A: 切换MetaMask账户（推荐）
1. 在MetaMask中切换到另一个账户
2. 确保该账户有Sepolia测试币
3. 刷新Remix页面

#### 方法B: 使用模拟账户
如果只有一个账户，可以先测试其他功能，这个可以暂时跳过。

#### 5.1 出价（使用账户B）
```
合约: NFTAuction
函数: bidWithETH(uint256 auctionId)
参数: 0
VALUE: 0.001 (在函数上方的 VALUE 输入框中输入)

操作: 
1. 在参数框输入: 0
2. 在 VALUE 输入框输入: 0.001
3. 选择单位: Ether
4. 点击橙色按钮，确认交易
```

#### 5.2 验证出价成功
```
函数: getAuction(uint256 auctionId)
参数: 0
预期结果:
  highestBidder: [账户B的地址]
  highestBidUSD: [大于startPrice]
  bidToken: 0x0000... (ETH)
  bidAmount: 1000000000000000 (0.001 ETH)
```

#### 5.3 查看ETH的USD价值
```
函数: getTokenPriceInUSD(address token, uint256 amount)
参数:
  token: 0x0000000000000000000000000000000000000000
  amount: 1000000000000000 (0.001 ETH)
预期结果: 约 2000000000000000 ($2，如果ETH价格是$2000)
```

**✅ 通过标准**: 成功出价，价格正确计算

---

### ✅ 测试 6: 使用ERC20代币出价

#### 6.1 准备：转移一些tUSDT给账户B（如果有第二个账户）
```
合约: MockERC20
函数: transfer(address to, uint256 amount)
参数:
  to: [账户B地址]
  amount: 1000000000 (1000 tUSDT)
```

#### 6.2 授权代币给拍卖合约（使用账户B）
```
合约: MockERC20
函数: approve(address spender, uint256 amount)
参数:
  spender: 0x2c192761D128Ceb6C2d469cfd1846A197a5F2B06
  amount: 2000000000 (2000 tUSDT)

操作: 确认交易
```

#### 6.3 使用tUSDT出价（更高的价格）
```
合约: NFTAuction
函数: bidWithToken(uint256 auctionId, address token, uint256 amount)
参数:
  auctionId: 0
  token: 0x63cd19828A547326EF38d6Fdca95d0A1494B0cd4
  amount: 1500000000 (1500 tUSDT)

操作: 确认交易
```

#### 6.4 验证新的最高出价
```
函数: getAuction(uint256 auctionId)
参数: 0
预期结果:
  highestBidder: [当前出价账户]
  highestBidUSD: 约 1500000000000000000 ($1500)
  bidToken: 0x63cd19... (MockERC20地址)
  bidAmount: 1500000000
```

#### 6.5 验证之前的ETH出价已退还
检查账户B的ETH余额，之前的0.001 ETH应该已退还。

**✅ 通过标准**: 成功用ERC20出价，之前出价已退还

---

### ✅ 测试 7: 结束拍卖

**注意**: 需要等到拍卖结束时间后才能结束拍卖。

#### 7.1 检查拍卖状态
```
函数: getAuction(uint256 auctionId)
参数: 0
查看: endTime 字段
```

#### 方法A: 快速测试 - 创建一个短时拍卖
```
创建新拍卖时使用:
duration: 60 (1分钟)
然后等待1分钟后测试
```

#### 方法B: 使用原有拍卖
如果你设置的是86400秒（1天），需要等待1天。

#### 7.2 结束拍卖
```
函数: endAuction(uint256 auctionId)
参数: 0
操作: 任何人都可以调用，确认交易
```

#### 7.3 验证拍卖已结束
```
函数: getAuction(uint256 auctionId)
参数: 0
预期结果:
  ended: true
  claimed: false
```

**✅ 通过标准**: 拍卖成功结束

---

### ✅ 测试 8: 领取拍卖结果

#### 8.1 卖家或买家领取
```
函数: claimAuction(uint256 auctionId)
参数: 0
操作: 
  - 可以用卖家账户调用
  - 也可以用最高出价者账户调用
  - 确认交易
```

#### 8.2 验证NFT转移
```
合约: AuctionNFT
函数: ownerOf(uint256 tokenId)
参数: 0
预期结果: [最高出价者地址]
```

#### 8.3 验证资金转移
卖家应该收到：
- bidAmount - 平台手续费(2.5%)
- 例如: 1500 tUSDT - 37.5 tUSDT = 1462.5 tUSDT

平台（你的费用接收地址）应该收到：
- 37.5 tUSDT

```
合约: MockERC20
函数: balanceOf(address account)
参数: [卖家地址]
验证余额变化
```

#### 8.4 验证拍卖已领取
```
合约: NFTAuction
函数: getAuction(uint256 auctionId)
参数: 0
预期结果:
  ended: true
  claimed: true
```

**✅ 通过标准**: NFT转移成功，资金正确分配，手续费正确扣除

---

## 第三阶段：工厂合约测试（可选）

### ✅ 测试 9: 使用Factory创建拍卖

**合约**: AuctionFactorySimple (`0x5ACcF55A8D2b324f4f388e84069dA7353Fe63CcF`)

#### 9.1 查看当前拍卖数量
```
函数: allAuctionsLength()
预期结果: 0 (还没通过factory创建过)
```

#### 9.2 通过Factory创建拍卖合约
```
函数: createAuction(address nftContract, uint256 tokenId)
参数:
  nftContract: 0x3d4dF05cD2aF50682fe819Aef81B14CFF2F3dfc7
  tokenId: 1 (使用之前铸造的第二个NFT)

操作: 确认交易
```

#### 9.3 查看创建的拍卖合约地址
```
函数: getAuction(address, uint256)
参数:
  param1: 0x3d4dF05cD2aF50682fe819Aef81B14CFF2F3dfc7
  param2: 1
预期结果: [新创建的NFTAuction合约地址]
```

#### 9.4 验证拍卖数量增加
```
函数: allAuctionsLength()
预期结果: 1
```

**✅ 通过标准**: Factory成功创建新的拍卖合约

---

## 📊 测试结果记录表

| 测试项 | 功能 | 状态 | 备注 |
|-------|------|------|------|
| 1 | 价格预言机 | ⬜ | |
| 2 | ERC20代币 | ⬜ | |
| 3 | NFT铸造 | ⬜ | |
| 4 | 创建拍卖 | ⬜ | |
| 5 | ETH出价 | ⬜ | 需要第二个账户 |
| 6 | ERC20出价 | ⬜ | 需要第二个账户 |
| 7 | 结束拍卖 | ⬜ | 需要等待时间 |
| 8 | 领取结果 | ⬜ | |
| 9 | Factory创建 | ⬜ | 可选 |

---

## 🎯 快速测试流程（最小化版本）

如果只想快速验证核心功能：

### 简化测试流程
```
1. 铸造NFT (AuctionNFT.mint)
2. 授权NFT (AuctionNFT.approve)
3. 创建拍卖 (NFTAuction.createAuction) - duration设为60秒
4. 等待1分钟
5. 结束拍卖 (NFTAuction.endAuction)
6. 领取NFT (NFTAuction.claimAuction)
7. 验证NFT回到卖家手中（因为没有出价）
```

这个流程可以用单个账户完成，测试无人出价的情况。

---

## ⚠️ 常见问题

**Q: "Not NFT owner" 错误**
A: 确保你是NFT的所有者，或者NFT还没有被转移

**Q: "Contract not approved" 错误**
A: 需要先调用 `approve()` 授权NFT给拍卖合约

**Q: "Seller cannot bid" 错误**
A: 卖家不能给自己的拍卖出价，需要切换到另一个账户

**Q: "Auction not yet ended" 错误**
A: 需要等到拍卖结束时间后才能调用 `endAuction()`

**Q: "Bid not high enough" 错误**
A: 新的出价必须高于当前最高出价

---

## 🎉 测试完成检查清单

- [ ] 所有基础功能测试通过
- [ ] 创建拍卖成功
- [ ] 至少完成一次完整的拍卖流程
- [ ] 验证资金和NFT正确转移
- [ ] 验证手续费正确扣除
- [ ] (可选) Factory功能正常

---

**准备好开始测试了吗？从测试1开始，一步步完成所有测试！** 🚀

