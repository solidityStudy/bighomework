import hre from "hardhat";
import fs from "fs";
import path from "path";
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

async function verifyContracts() {
  console.log("🔍 开始验证Sepolia测试网上的合约...");
  console.log("=".repeat(60));
  
  // 检查 Etherscan API Key
  if (!process.env.ETHERSCAN_API_KEY) {
    console.log("❌ 未设置 ETHERSCAN_API_KEY，无法验证合约");
    console.log("   请在 .env 文件中设置 ETHERSCAN_API_KEY");
    return;
  }
  
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
  console.log(`📋 准备验证的合约:`);
  console.log(`   NFT: ${contracts.nft}`);
  console.log(`   Auction: ${contracts.auction}`);
  console.log(`   Token: ${contracts.token}`);
  console.log(`   PriceFeed: ${contracts.priceFeed}`);
  
  let successCount = 0;
  let totalCount = 4;
  
  try {
    // 1. 验证 AuctionNFT 合约
    console.log("\n🎨 验证 AuctionNFT 合约...");
    try {
      await hre.run("verify:verify", {
        address: contracts.nft,
        constructorArguments: [
          "Sepolia Auction NFT",
          "SANFT"
        ],
      });
      console.log("✅ AuctionNFT 验证成功");
      successCount++;
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("✅ AuctionNFT 已经验证过了");
        successCount++;
      } else {
        console.log(`❌ AuctionNFT 验证失败: ${error.message}`);
      }
    }
    
    // 2. 验证 MockERC20 合约
    console.log("\n🪙 验证 MockERC20 合约...");
    try {
      await hre.run("verify:verify", {
        address: contracts.token,
        constructorArguments: [
          "Sepolia Test Token",
          "STEST",
          18,
          1000000
        ],
      });
      console.log("✅ MockERC20 验证成功");
      successCount++;
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("✅ MockERC20 已经验证过了");
        successCount++;
      } else {
        console.log(`❌ MockERC20 验证失败: ${error.message}`);
      }
    }
    
    // 3. 验证 MockPriceFeed 合约
    console.log("\n📊 验证 MockPriceFeed 合约...");
    try {
      await hre.run("verify:verify", {
        address: contracts.priceFeed,
        constructorArguments: [
          8,
          "ETH/USD Price Feed",
          "200000000000" // $2000 * 10^8
        ],
      });
      console.log("✅ MockPriceFeed 验证成功");
      successCount++;
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("✅ MockPriceFeed 已经验证过了");
        successCount++;
      } else {
        console.log(`❌ MockPriceFeed 验证失败: ${error.message}`);
      }
    }
    
    // 4. 验证 NFTAuction 合约
    console.log("\n🏛️ 验证 NFTAuction 合约...");
    try {
      await hre.run("verify:verify", {
        address: contracts.auction,
        constructorArguments: [
          deploymentData.deployer // 手续费接收者地址
        ],
      });
      console.log("✅ NFTAuction 验证成功");
      successCount++;
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("✅ NFTAuction 已经验证过了");
        successCount++;
      } else {
        console.log(`❌ NFTAuction 验证失败: ${error.message}`);
      }
    }
    
    // 验证结果汇总
    console.log("\n" + "=".repeat(60));
    console.log("📊 验证结果汇总:");
    console.log("=".repeat(60));
    console.log(`✅ 成功验证: ${successCount}/${totalCount} 个合约`);
    
    if (successCount === totalCount) {
      console.log("🎉 所有合约验证完成！");
      console.log("\n🔗 在 Etherscan 上查看:");
      console.log(`   AuctionNFT: https://sepolia.etherscan.io/address/${contracts.nft}`);
      console.log(`   MockERC20: https://sepolia.etherscan.io/address/${contracts.token}`);
      console.log(`   MockPriceFeed: https://sepolia.etherscan.io/address/${contracts.priceFeed}`);
      console.log(`   NFTAuction: https://sepolia.etherscan.io/address/${contracts.auction}`);
    } else {
      console.log("⚠️  部分合约验证失败，但不影响合约功能");
    }
    
    console.log("\n🚀 下一步:");
    console.log("   测试合约交互: npm run deploy:interact");
    console.log("=".repeat(60));
    
  } catch (error: any) {
    console.log(`💥 验证过程出错: ${error.message}`);
    console.error("详细错误:", error);
  }
}

verifyContracts()
  .then(() => {
    console.log("验证脚本执行完成");
  })
  .catch((error: any) => {
    console.error("💥 验证脚本执行失败:", error);
    process.exit(1);
  });
