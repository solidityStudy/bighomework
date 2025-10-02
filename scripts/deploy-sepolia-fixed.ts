import hre from "hardhat";
import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import "dotenv/config";

async function main() {
  console.log("🚀 开始部署NFT拍卖系统到Sepolia测试网...");
  console.log("=".repeat(60));
  
  // 创建 provider 和 wallet
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(process.env.SEPOLIA_PRIVATE_KEY!, provider);
  
  console.log("📋 部署信息:");
  console.log(`   部署账户: ${wallet.address}`);
  console.log(`   网络: Sepolia`);
  
  // 检查账户余额
  const balance = await provider.getBalance(wallet.address);
  const balanceEth = parseFloat(ethers.formatEther(balance));
  console.log(`   账户余额: ${balanceEth.toFixed(4)} ETH`);
  
  if (balanceEth < 0.1) {
    console.log("⚠️  警告: 账户余额较低，请确保有足够的ETH支付gas费用");
  }
  
  const deployedContracts: any = {
    network: "sepolia",
    deployer: wallet.address,
    timestamp: new Date().toISOString(),
    contracts: {}
  };
  
  try {
    // 读取合约编译产物
    const artifactsPath = path.join(process.cwd(), "artifacts", "contracts");
    
    // 读取合约 ABI 和 Bytecode
    const auctionNFTArtifact = JSON.parse(fs.readFileSync(path.join(artifactsPath, "AuctionNFT.sol", "AuctionNFT.json"), "utf8"));
    const mockERC20Artifact = JSON.parse(fs.readFileSync(path.join(artifactsPath, "MockERC20.sol", "MockERC20.json"), "utf8"));
    const mockPriceFeedArtifact = JSON.parse(fs.readFileSync(path.join(artifactsPath, "MockPriceFeed.sol", "MockPriceFeed.json"), "utf8"));
    const nftAuctionArtifact = JSON.parse(fs.readFileSync(path.join(artifactsPath, "NFTAuction.sol", "NFTAuction.json"), "utf8"));
    
    // 创建合约工厂
    const AuctionNFTFactory = new ethers.ContractFactory(auctionNFTArtifact.abi, auctionNFTArtifact.bytecode, wallet);
    const MockERC20Factory = new ethers.ContractFactory(mockERC20Artifact.abi, mockERC20Artifact.bytecode, wallet);
    const MockPriceFeedFactory = new ethers.ContractFactory(mockPriceFeedArtifact.abi, mockPriceFeedArtifact.bytecode, wallet);
    const NFTAuctionFactory = new ethers.ContractFactory(nftAuctionArtifact.abi, nftAuctionArtifact.bytecode, wallet);
    
    // 1. 部署AuctionNFT合约
    console.log("\n🎨 部署AuctionNFT合约...");
    const nftContract = await AuctionNFTFactory.deploy(
      "Sepolia Auction NFT",
      "SANFT"
    );
    await nftContract.waitForDeployment();
    const nftAddress = await nftContract.getAddress();
    
    console.log(`✅ AuctionNFT部署成功: ${nftAddress}`);
    deployedContracts.contracts.nft = nftAddress;
    
    // 2. 部署MockERC20测试代币
    console.log("\n🪙 部署测试代币...");
    const mockToken = await MockERC20Factory.deploy(
      "Sepolia Test Token",
      "STEST",
      18,
      1000000 // 1M tokens
    );
    await mockToken.waitForDeployment();
    const tokenAddress = await mockToken.getAddress();
    
    console.log(`✅ MockERC20部署成功: ${tokenAddress}`);
    deployedContracts.contracts.token = tokenAddress;
    
    // 3. 部署MockPriceFeed价格预言机
    console.log("\n📊 部署价格预言机...");
    const priceFeed = await MockPriceFeedFactory.deploy(
      8, // decimals
      ethers.parseUnits("2000", 8) // $2000 per ETH
    );
    await priceFeed.waitForDeployment();
    const priceFeedAddress = await priceFeed.getAddress();
    
    console.log(`✅ MockPriceFeed部署成功: ${priceFeedAddress}`);
    deployedContracts.contracts.priceFeed = priceFeedAddress;
    
    // 4. 部署NFTAuction主合约
    console.log("\n🏛️ 部署NFTAuction主合约...");
    const auctionContract = await NFTAuctionFactory.deploy(
      nftAddress,
      tokenAddress,
      priceFeedAddress,
      250 // 2.5% platform fee
    );
    await auctionContract.waitForDeployment();
    const auctionAddress = await auctionContract.getAddress();
    
    console.log(`✅ NFTAuction部署成功: ${auctionAddress}`);
    deployedContracts.contracts.auction = auctionAddress;
    
    // 5. 设置权限和初始配置
    console.log("\n⚙️ 配置合约权限...");
    
    // 给拍卖合约铸造权限
    console.log("   设置NFT铸造权限...");
    const minterRole = await nftContract.MINTER_ROLE();
    await nftContract.grantRole(minterRole, auctionAddress);
    console.log("   ✅ NFT铸造权限设置完成");
    
    // 给部署者一些测试代币
    console.log("   铸造测试代币...");
    await mockToken.mint(wallet.address, ethers.parseEther("10000"));
    console.log("   ✅ 测试代币铸造完成");
    
    // 6. 验证部署
    console.log("\n🔍 验证部署结果...");
    
    // 验证NFT合约
    const nftName = await nftContract.name();
    const nftSymbol = await nftContract.symbol();
    console.log(`   NFT合约: ${nftName} (${nftSymbol})`);
    
    // 验证代币合约
    const tokenName = await mockToken.name();
    const tokenSymbol = await mockToken.symbol();
    const tokenBalance = await mockToken.balanceOf(wallet.address);
    console.log(`   代币合约: ${tokenName} (${tokenSymbol})`);
    console.log(`   部署者代币余额: ${ethers.formatEther(tokenBalance)} ${tokenSymbol}`);
    
    // 验证价格预言机
    const latestPrice = await priceFeed.latestRoundData();
    console.log(`   价格预言机: ${ethers.formatUnits(latestPrice[1], 8)} USD/ETH`);
    
    // 验证拍卖合约
    const platformFee = await auctionContract.platformFeeRate();
    console.log(`   拍卖合约平台费率: ${platformFee / 100n}%`);
    
    // 7. 保存部署信息
    console.log("\n💾 保存部署信息...");
    const deploymentsDir = path.join(process.cwd(), "deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    const deploymentFile = path.join(deploymentsDir, `sepolia-${Date.now()}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deployedContracts, null, 2));
    
    // 也保存最新的部署信息
    const latestFile = path.join(deploymentsDir, "sepolia-latest.json");
    fs.writeFileSync(latestFile, JSON.stringify(deployedContracts, null, 2));
    
    console.log(`   ✅ 部署信息已保存: ${deploymentFile}`);
    
    // 8. 输出部署摘要
    console.log("\n" + "=".repeat(60));
    console.log("🎉 部署完成！合约地址摘要:");
    console.log("=".repeat(60));
    console.log(`🎨 AuctionNFT:     ${nftAddress}`);
    console.log(`🪙 MockERC20:      ${tokenAddress}`);
    console.log(`📊 MockPriceFeed:  ${priceFeedAddress}`);
    console.log(`🏛️ NFTAuction:     ${auctionAddress}`);
    console.log("=".repeat(60));
    
    // 计算总gas费用
    const finalBalance = await provider.getBalance(wallet.address);
    const gasUsed = balance - finalBalance;
    const gasUsedEth = parseFloat(ethers.formatEther(gasUsed));
    console.log(`⛽ 总Gas费用: ${gasUsedEth.toFixed(6)} ETH`);
    console.log(`💰 剩余余额: ${parseFloat(ethers.formatEther(finalBalance)).toFixed(4)} ETH`);
    
    console.log("\n🚀 下一步:");
    console.log("   1. 运行合约验证: npm run deploy:verify");
    console.log("   2. 测试合约交互: npm run deploy:interact");
    console.log("=".repeat(60));
    
  } catch (error: any) {
    console.log(`💥 部署失败: ${error.message}`);
    console.error("详细错误:", error);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log("部署脚本执行完成");
  })
  .catch((error: any) => {
    console.error("💥 部署脚本执行失败:", error);
    process.exit(1);
  });
