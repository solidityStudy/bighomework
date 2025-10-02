import fs from "fs";
import path from "path";
import { ethers } from "ethers";

// 创建 provider 和 wallet
const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const wallet = new ethers.Wallet(process.env.SEPOLIA_PRIVATE_KEY!, provider);

async function main() {
    console.log("🌉 部署跨链 NFT 合约...");
    console.log("=".repeat(50));

    // 获取部署者账户
    const deployer = wallet;
    console.log("👤 部署账户:", deployer.address);
    
    // 获取账户余额
    const balance = await provider.getBalance(deployer.address);
    console.log("💰 账户余额:", ethers.formatEther(balance), "ETH");

    // 读取 CCIP 配置
    const ccipConfigPath = path.join(process.cwd(), "ccip-config.json");
    const ccipConfig = JSON.parse(fs.readFileSync(ccipConfigPath, "utf8"));
    
    // 获取当前网络配置
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    
    let networkConfig;
    for (const [networkName, config] of Object.entries(ccipConfig.networks)) {
        if ((config as any).chainId === chainId) {
            networkConfig = config as any;
            console.log("🌐 当前网络:", networkConfig.name);
            break;
        }
    }
    
    if (!networkConfig) {
        throw new Error(`不支持的网络 Chain ID: ${chainId}`);
    }

    console.log("📋 网络配置:");
    console.log("   Chain Selector:", networkConfig.chainSelector);
    console.log("   CCIP Router:", networkConfig.router);
    console.log("   LINK Token:", networkConfig.linkToken);

    // 部署跨链 NFT 合约
    console.log("\n🎨 部署 CrossChainNFT 合约...");
    
    // 读取合约 ABI 和 Bytecode
    const artifactPath = path.join(process.cwd(), "artifacts/contracts/CrossChainNFT.sol/CrossChainNFT.json");
    const crossChainNFTArtifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    
    // 创建合约工厂
    const CrossChainNFTFactory = new ethers.ContractFactory(
        crossChainNFTArtifact.abi,
        crossChainNFTArtifact.bytecode,
        deployer
    );
    
    // 部署合约
    const crossChainNFT = await CrossChainNFTFactory.deploy(
        "Cross-Chain Auction NFT",
        "CCANFT",
        networkConfig.router,
        networkConfig.linkToken
    );
    
    await crossChainNFT.waitForDeployment();
    const nftAddress = await crossChainNFT.getAddress();
    
    console.log("✅ CrossChainNFT 部署成功!");
    console.log("   合约地址:", nftAddress);

    // 保存部署信息
    const deploymentInfo = {
        network: networkConfig.name,
        chainId: chainId,
        chainSelector: networkConfig.chainSelector,
        contracts: {
            CrossChainNFT: nftAddress
        },
        ccipConfig: {
            router: networkConfig.router,
            linkToken: networkConfig.linkToken
        },
        deployer: deployer.address,
        deployedAt: new Date().toISOString(),
        gasUsed: {
            CrossChainNFT: "估算中..."
        }
    };

    // 创建部署目录
    const deploymentsDir = path.join(process.cwd(), "deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir);
    }

    // 保存部署信息
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const deploymentFile = path.join(deploymentsDir, `crosschain-${networkConfig.name.toLowerCase().replace(/\s+/g, "-")}-${timestamp}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

    // 保存最新部署信息
    const latestFile = path.join(deploymentsDir, `crosschain-${networkConfig.name.toLowerCase().replace(/\s+/g, "-")}-latest.json`);
    fs.writeFileSync(latestFile, JSON.stringify(deploymentInfo, null, 2));

    console.log("\n📄 部署信息已保存:");
    console.log("   文件:", deploymentFile);

    // 验证合约
    console.log("\n🔍 等待区块确认后验证合约...");
    await crossChainNFT.deploymentTransaction()?.wait(5);

    console.log("⚠️ 合约验证跳过 - 可以稍后手动验证");

    console.log("\n🎉 跨链 NFT 合约部署完成!");
    console.log("=".repeat(50));
    console.log("📋 部署摘要:");
    console.log("   网络:", networkConfig.name);
    console.log("   CrossChainNFT:", nftAddress);
    console.log("   部署者:", deployer.address);
    console.log("\n🔗 在区块链浏览器查看:");
    
    if (chainId === 11155111) { // Sepolia
        console.log("   https://sepolia.etherscan.io/address/" + nftAddress);
    } else if (chainId === 43113) { // Fuji
        console.log("   https://testnet.snowtrace.io/address/" + nftAddress);
    } else if (chainId === 80001) { // Mumbai
        console.log("   https://mumbai.polygonscan.com/address/" + nftAddress);
    }

    console.log("\n📚 下一步:");
    console.log("1. 在其他支持的网络部署相同合约");
    console.log("2. 使用 setup-crosschain.ts 配置跨链信任关系");
    console.log("3. 为合约充值 LINK 代币用于支付跨链费用");
    console.log("4. 测试跨链 NFT 传输功能");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ 部署失败:", error);
        process.exit(1);
    });
