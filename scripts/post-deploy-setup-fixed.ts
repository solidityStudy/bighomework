import hre from "hardhat";
import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import "dotenv/config";

// 从部署文件中读取合约地址
interface DeployedContracts {
  contracts: {
    nft: string;
    auction: string;
    token: string;
    priceFeed: string;
  };
  deployer: string;
  network: string;
  timestamp: string;
}

async function postDeploySetup() {
  console.log("⚙️  开始部署后配置...");
  console.log("=".repeat(50));
  
  // 创建 provider 和 wallet
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(process.env.SEPOLIA_PRIVATE_KEY!, provider);
  
  console.log(`📋 配置账户: ${wallet.address}`);
  
  // 读取最新的部署文件
  const deploymentsDir = path.join(process.cwd(), "deployments");
  const latestFile = path.join(deploymentsDir, "sepolia-latest.json");
  
  if (!fs.existsSync(latestFile)) {
    console.log("❌ 未找到部署文件，请先部署合约");
    console.log("   运行: npm run deploy:sepolia");
    return;
  }
  
  console.log(`📄 使用部署文件: sepolia-latest.json`);
  
  const deploymentData: DeployedContracts = JSON.parse(
    fs.readFileSync(latestFile, 'utf8')
  );
  
  const contracts = deploymentData.contracts;
  console.log(`📋 合约地址:`);
  console.log(`   NFT: ${contracts.nft}`);
  console.log(`   Auction: ${contracts.auction}`);
  console.log(`   Token: ${contracts.token}`);
  console.log(`   PriceFeed: ${contracts.priceFeed}`);
  
  try {
    // 读取合约 ABI
    const artifactsPath = path.join(process.cwd(), "artifacts", "contracts");
    const auctionNFTArtifact = JSON.parse(fs.readFileSync(path.join(artifactsPath, "AuctionNFT.sol", "AuctionNFT.json"), "utf8"));
    const mockERC20Artifact = JSON.parse(fs.readFileSync(path.join(artifactsPath, "MockERC20.sol", "MockERC20.json"), "utf8"));
    const mockPriceFeedArtifact = JSON.parse(fs.readFileSync(path.join(artifactsPath, "MockPriceFeed.sol", "MockPriceFeed.json"), "utf8"));
    const nftAuctionArtifact = JSON.parse(fs.readFileSync(path.join(artifactsPath, "NFTAuction.sol", "NFTAuction.json"), "utf8"));
    
    // 连接到合约
    const nftContract = new ethers.Contract(contracts.nft, auctionNFTArtifact.abi, wallet);
    const auctionContract = new ethers.Contract(contracts.auction, nftAuctionArtifact.abi, wallet);
    const tokenContract = new ethers.Contract(contracts.token, mockERC20Artifact.abi, wallet);
    const priceFeedContract = new ethers.Contract(contracts.priceFeed, mockPriceFeedArtifact.abi, wallet);
    
    // 1. 设置价格预言机
    console.log("\n📊 配置价格预言机...");
    
    // 为 ETH 设置价格预言机 (address(0) 代表 ETH)
    const ethAddress = "0x0000000000000000000000000000000000000000";
    console.log("   设置 ETH 价格预言机...");
    const setPriceFeedTx1 = await auctionContract.setPriceFeed(ethAddress, contracts.priceFeed);
    await setPriceFeedTx1.wait();
    console.log("   ✅ ETH 价格预言机设置完成");
    
    // 为测试代币设置价格预言机
    console.log("   设置测试代币价格预言机...");
    const setPriceFeedTx2 = await auctionContract.setPriceFeed(contracts.token, contracts.priceFeed);
    await setPriceFeedTx2.wait();
    console.log("   ✅ 测试代币价格预言机设置完成");
    
    // 2. 给 NFT 合约设置 minter 权限给拍卖合约
    console.log("\n🎨 配置 NFT 权限...");
    
    // 检查是否有 MINTER_ROLE
    try {
      const minterRole = await nftContract.MINTER_ROLE();
      console.log("   授予拍卖合约铸造权限...");
      const grantRoleTx = await nftContract.grantRole(minterRole, contracts.auction);
      await grantRoleTx.wait();
      console.log("   ✅ 拍卖合约获得 NFT 铸造权限");
    } catch (error) {
      console.log("   ⚠️  NFT 合约可能没有基于角色的访问控制，跳过权限设置");
    }
    
    // 3. 给部署者一些测试代币
    console.log("\n🪙 分发测试代币...");
    const tokenAmount = ethers.parseEther("10000"); // 10,000 测试代币
    
    // 检查当前余额
    const currentBalance = await tokenContract.balanceOf(wallet.address);
    console.log(`   当前余额: ${ethers.formatEther(currentBalance)} 代币`);
    
    if (currentBalance < tokenAmount) {
      console.log("   铸造更多测试代币...");
      const mintTx = await tokenContract.mint(wallet.address, tokenAmount);
      await mintTx.wait();
      console.log(`   ✅ 已铸造 ${ethers.formatEther(tokenAmount)} 测试代币`);
    } else {
      console.log("   ✅ 代币余额充足，无需铸造");
    }
    
    // 4. 验证配置
    console.log("\n🔍 验证配置...");
    
    // 验证价格预言机
    try {
      const ethPriceFeed = await auctionContract.priceFeeds(ethAddress);
      const tokenPriceFeed = await auctionContract.priceFeeds(contracts.token);
      console.log(`   ETH 价格预言机: ${ethPriceFeed === contracts.priceFeed ? '✅ 正确' : '❌ 错误'}`);
      console.log(`   代币价格预言机: ${tokenPriceFeed === contracts.priceFeed ? '✅ 正确' : '❌ 错误'}`);
    } catch (error) {
      console.log("   ⚠️  无法验证价格预言机配置");
    }
    
    // 验证代币余额
    const finalBalance = await tokenContract.balanceOf(wallet.address);
    console.log(`   最终代币余额: ${ethers.formatEther(finalBalance)} 代币`);
    
    // 验证价格预言机数据
    const latestPrice = await priceFeedContract.latestRoundData();
    console.log(`   当前 ETH 价格: $${ethers.formatUnits(latestPrice[1], 8)}`);
    
    console.log("\n" + "=".repeat(50));
    console.log("🎉 部署后配置完成！");
    console.log("=".repeat(50));
    console.log("✅ 价格预言机已配置");
    console.log("✅ NFT 权限已设置");
    console.log("✅ 测试代币已分发");
    console.log("\n🚀 下一步:");
    console.log("   1. 运行合约验证: npm run deploy:verify");
    console.log("   2. 测试合约交互: npm run deploy:interact");
    console.log("=".repeat(50));
    
  } catch (error: any) {
    console.log(`💥 配置失败: ${error.message}`);
    console.error("详细错误:", error);
    process.exit(1);
  }
}

postDeploySetup()
  .then(() => {
    console.log("配置脚本执行完成");
  })
  .catch((error: any) => {
    console.error("💥 配置脚本执行失败:", error);
    process.exit(1);
  });
