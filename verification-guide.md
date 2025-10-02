# Etherscan 源码验证指南

## 📋 待验证合约列表

1. MockPriceFeed: `0x4Ef2efb6567EF780F10e943fd9364d08e4c50BC3`
2. MockERC20: `0x63cd19828A547326EF38d6Fdca95d0A1494B0cd4`
3. AuctionNFT: `0x3d4dF05cD2aF50682fe819Aef81B14CFF2F3dfc7`
4. NFTAuction: `0x2c192761D128Ceb6C2d469cfd1846A197a5F2B06`
5. AuctionFactorySimple: `0x5ACcF55A8D2b324f4f388e84069dA7353Fe63CcF`

---

## 方法一：使用 Remix 插件验证（推荐）⭐

### Step 1: 安装插件

1. 在Remix左侧点击 **"Plugin Manager"** 图标（插头图标）
2. 搜索 **"Etherscan - Contract verification"**
3. 点击 **Activate** 激活插件

### Step 2: 配置 Etherscan API Key

1. 访问 https://etherscan.io/myapikey
2. 登录/注册账号
3. 创建新的API Key（免费）
4. 复制API Key

5. 回到Remix，点击左侧的 **Etherscan** 插件图标
6. 粘贴API Key
7. 选择网络：**Sepolia**

### Step 3: 验证合约

对每个合约重复以下步骤：

1. 在Remix中打开对应的合约文件
2. 确保合约已编译（编译设置必须与部署时一致）
3. 在Etherscan插件中：
   - 合约地址：粘贴合约地址
   - 合约名称：选择正确的合约名
   - 点击 **"Verify"** 按钮

4. 等待验证完成（通常10-30秒）

---

## 方法二：Etherscan 网页手动验证

### 通用步骤

1. 访问 https://sepolia.etherscan.io/
2. 搜索你的合约地址
3. 点击 **"Contract"** 标签
4. 点击 **"Verify and Publish"**

### 验证设置（所有合约相同）

```
Compiler Type: Solidity (Single file)
Compiler Version: v0.8.28+commit.7893614a
Open Source License Type: MIT
```

**Optimization（优化设置）：**
```
Optimization: Yes
Runs: 200
```

---

## 📝 每个合约的具体验证参数

### 1️⃣ MockPriceFeed

**构造函数参数（ABI编码）：**
```
0000000000000000000000000000000000000000000000000000000000000008
0000000000000000000000000000000000000000000000000000000000000060
0000000000000000000000000000000000000000000000000000002e90edd000
0000000000000000000000000000000000000000000000000000000000000007
4554482f555344000000000000000000000000000000000000000000000000
```

**合约代码：** 需要扁平化（Flatten）所有import

---

### 2️⃣ MockERC20

**构造函数参数：**
需要编码：
- name: "TestUSDT"
- symbol: "tUSDT"
- decimals_: 6
- initialSupply: 10000

**获取编码后参数：**
- 使用 https://abi.hashex.org/
- 或在Remix部署详情中查看

---

### 3️⃣ AuctionNFT

**构造函数参数：**
需要编码：
- name: "TestNFT"
- symbol: "TNFT"

---

### 4️⃣ NFTAuction

**构造函数参数：**
需要编码：
- _feeRecipient: 你的钱包地址

---

### 5️⃣ AuctionFactorySimple

**构造函数参数：**
需要编码：
- _feeRecipient: 你的钱包地址
- _platformFeeRate: 250

---

## 🔧 获取构造函数参数（ABI编码）

### 方法A：从Remix获取

1. 部署后，在Remix终端（Console）中找到交易
2. 点击 **Debug** 按钮
3. 查看 **input data**
4. 移除前面的合约bytecode，只保留后面的constructor arguments

### 方法B：使用在线编码器

访问 https://abi.hashex.org/

**示例（MockPriceFeed）：**
```
Function: constructor(uint8,string,int256)

Parameters:
_decimals: 8
_description: ETH/USD
_initialPrice: 200000000000

点击 "Encode"，复制结果
```

---

## 🎯 扁平化合约代码

### 使用 Remix Flattener 插件

1. 安装 **"Flattener"** 插件
2. 右键点击合约文件
3. 选择 **"Flatten"**
4. 复制扁平化后的代码
5. 在Etherscan验证时粘贴

---

## ✅ 验证成功标志

验证成功后，你会看到：
- 绿色的 ✓ 图标
- **"Contract Source Code Verified"** 标记
- 可以在Etherscan上直接读写合约
- 其他人可以看到源代码

---

## ⚠️ 常见问题

**Q: 验证失败 - "Compiled bytecode mismatch"**
A: 确保编译器版本和优化设置与部署时完全一致

**Q: 构造函数参数错误**
A: 使用在线ABI编码器仔细检查参数格式

**Q: Import错误**
A: 使用扁平化工具，将所有依赖合并到一个文件

**Q: 找不到OpenZeppelin合约**
A: 使用扁平化后的代码，包含所有依赖

---

## 📌 验证顺序建议

建议按以下顺序验证（从简单到复杂）：

1. ✅ MockPriceFeed（最简单）
2. ✅ AuctionNFT
3. ✅ MockERC20
4. ✅ NFTAuction
5. ✅ AuctionFactorySimple

---

## 🎉 完成后

所有合约验证成功后：
- 在 `deployment-sepolia.txt` 中标记验证状态
- 可以开始测试合约功能
- 用户可以直接在Etherscan上与你的合约交互

