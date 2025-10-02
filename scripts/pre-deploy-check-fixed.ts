import hre from "hardhat";
import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import "dotenv/config";

async function checkDeploymentReadiness() {
  console.log("🔍 检查部署准备情况...");
  console.log("=".repeat(50));
  
  let allChecksPass = true;
  
  // 1. 检查网络配置
  console.log("\n📡 检查网络配置...");
  try {
    // 直接检查环境变量和连接
    if (!process.env.SEPOLIA_RPC_URL) {
      console.log("❌ SEPOLIA_RPC_URL 未设置");
      allChecksPass = false;
    } else {
      const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
      const network = await provider.getNetwork();
      
      if (network.chainId !== 11155111n) {
        console.log("❌ 网络不是Sepolia");
        console.log(`   当前Chain ID: ${network.chainId}`);
        allChecksPass = false;
      } else {
        console.log("✅ 网络配置正确 (Sepolia)");
      }
    }
  } catch (error: any) {
    console.log("❌ 网络配置检查失败:", error.message);
    allChecksPass = false;
  }
  
  // 2. 检查环境变量
  console.log("\n🔐 检查环境变量...");
  
  const requiredEnvVars = ["SEPOLIA_RPC_URL", "SEPOLIA_PRIVATE_KEY"];
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar} 已设置`);
    } else {
      console.log(`❌ ${envVar} 未设置`);
      allChecksPass = false;
    }
  }
  
  // 3. 检查账户和余额
  console.log("\n💰 检查账户余额...");
  try {
    if (!process.env.SEPOLIA_RPC_URL || !process.env.SEPOLIA_PRIVATE_KEY) {
      console.log("❌ 环境变量未设置，无法检查账户");
      allChecksPass = false;
    } else {
      const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
      const wallet = new ethers.Wallet(process.env.SEPOLIA_PRIVATE_KEY, provider);
      
      console.log(`📋 部署账户: ${wallet.address}`);
      
      const balance = await provider.getBalance(wallet.address);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      console.log(`💰 账户余额: ${balanceEth.toFixed(4)} ETH`);
      
      if (balanceEth < 0.05) {
        console.log("❌ 余额不足，建议至少有0.05 ETH用于部署");
        console.log("   请访问 https://sepoliafaucet.com/ 获取测试ETH");
        allChecksPass = false;
      } else {
        console.log("✅ 账户余额充足");
      }
    }
  } catch (error: any) {
    console.log("❌ 账户检查失败:", error.message);
    allChecksPass = false;
  }
  
  // 4. 检查合约编译
  console.log("\n🔨 检查合约编译...");
  try {
    const artifactsPath = path.join(process.cwd(), "artifacts", "contracts");
    
    if (!fs.existsSync(artifactsPath)) {
      console.log("❌ 合约未编译，请先运行: npx hardhat compile");
      allChecksPass = false;
    } else {
      const contracts = fs.readdirSync(artifactsPath);
      const requiredContracts = ["AuctionNFT.sol", "NFTAuction.sol", "MockERC20.sol", "MockPriceFeed.sol"];
      
      let compiledCount = 0;
      for (const contract of requiredContracts) {
        if (contracts.includes(contract)) {
          compiledCount++;
        }
      }
      
      if (compiledCount === requiredContracts.length) {
        console.log(`✅ 所有必要合约已编译 (${compiledCount}/${requiredContracts.length})`);
      } else {
        console.log(`❌ 部分合约未编译 (${compiledCount}/${requiredContracts.length})`);
        allChecksPass = false;
      }
    }
  } catch (error: any) {
    console.log("❌ 合约编译检查失败:", error.message);
    allChecksPass = false;
  }
  
  // 5. 估算Gas费用
  console.log("\n⛽ 估算部署成本...");
  try {
    if (!process.env.SEPOLIA_RPC_URL) {
      console.log("⚠️  无法估算Gas费用：RPC URL未设置");
    } else {
      const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, "gwei"));
      
      console.log(`📊 当前Gas价格: ${gasPriceGwei.toFixed(2)} Gwei`);
      
      // 估算总Gas消耗 (大概值)
      const estimatedGas = 3000000; // 3M gas for all contracts
      const estimatedCost = parseFloat(ethers.formatEther(gasPrice * BigInt(estimatedGas)));
      
      console.log(`💸 预估部署成本: ${estimatedCost.toFixed(4)} ETH`);
      
      if (estimatedCost > 0.03) {
        console.log("⚠️  Gas费用较高，建议等待网络拥堵缓解");
      }
    }
  } catch (error: any) {
    console.log("⚠️  Gas费用估算失败:", error.message);
  }
  
  // 6. 输出检查结果
  console.log("\n" + "=".repeat(50));
  if (allChecksPass) {
    console.log("🎉 所有检查通过！可以开始部署");
    console.log("\n🚀 运行部署命令:");
    console.log("   npx hardhat run scripts/deploy-sepolia.ts --network sepolia");
  } else {
    console.log("❌ 部分检查未通过，请修复后再部署");
    console.log("\n📋 修复建议:");
    console.log("   1. 确保 .env 文件配置正确");
    console.log("   2. 确保账户有足够的测试ETH");
    console.log("   3. 运行 npx hardhat compile 编译合约");
  }
  console.log("=".repeat(50));
  
  return allChecksPass;
}

// 运行检查
checkDeploymentReadiness()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error: any) => {
    console.error("检查过程出错:", error);
    process.exit(1);
  });
