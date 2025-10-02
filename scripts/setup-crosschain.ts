import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    console.log("🔗 配置跨链 NFT 信任关系...");
    console.log("=".repeat(50));

    // 获取部署者账户
    const [deployer] = await ethers.getSigners();
    console.log("👤 操作账户:", deployer.address);

    // 读取 CCIP 配置
    const ccipConfigPath = path.join(process.cwd(), "ccip-config.json");
    const ccipConfig = JSON.parse(fs.readFileSync(ccipConfigPath, "utf8"));
    
    // 获取当前网络配置
    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);
    
    let currentNetworkName;
    let currentNetworkConfig;
    for (const [networkName, config] of Object.entries(ccipConfig.networks)) {
        if ((config as any).chainId === chainId) {
            currentNetworkName = networkName;
            currentNetworkConfig = config as any;
            break;
        }
    }
    
    if (!currentNetworkConfig) {
        throw new Error(`不支持的网络 Chain ID: ${chainId}`);
    }

    console.log("🌐 当前网络:", currentNetworkConfig.name);

    // 读取当前网络的部署信息
    const deploymentsDir = path.join(process.cwd(), "deployments");
    const latestFile = path.join(deploymentsDir, `crosschain-${currentNetworkConfig.name.toLowerCase().replace(/\s+/g, "-")}-latest.json`);
    
    if (!fs.existsSync(latestFile)) {
        throw new Error(`找不到部署文件: ${latestFile}`);
    }

    const deploymentInfo = JSON.parse(fs.readFileSync(latestFile, "utf8"));
    const nftAddress = deploymentInfo.contracts.CrossChainNFT;
    
    console.log("📋 本地合约地址:", nftAddress);

    // 连接到合约
    const CrossChainNFT = await ethers.getContractFactory("CrossChainNFT");
    const crossChainNFT = CrossChainNFT.attach(nftAddress);

    // 读取所有网络的部署信息，设置信任关系
    console.log("\n🔗 设置跨链信任关系...");
    
    let trustedRemotesSet = 0;
    
    for (const [networkName, networkConfig] of Object.entries(ccipConfig.networks)) {
        if (networkName === currentNetworkName) continue; // 跳过当前网络
        
        const remoteNetworkConfig = networkConfig as any;
        const remoteLatestFile = path.join(deploymentsDir, `crosschain-${remoteNetworkConfig.name.toLowerCase().replace(/\s+/g, "-")}-latest.json`);
        
        if (fs.existsSync(remoteLatestFile)) {
            const remoteDeploymentInfo = JSON.parse(fs.readFileSync(remoteLatestFile, "utf8"));
            const remoteNftAddress = remoteDeploymentInfo.contracts.CrossChainNFT;
            
            console.log(`   设置 ${remoteNetworkConfig.name} 信任关系...`);
            console.log(`   Chain Selector: ${remoteNetworkConfig.chainSelector}`);
            console.log(`   Remote Contract: ${remoteNftAddress}`);
            
            try {
                const tx = await crossChainNFT.setTrustedRemote(
                    remoteNetworkConfig.chainSelector,
                    remoteNftAddress
                );
                await tx.wait();
                
                console.log(`   ✅ ${remoteNetworkConfig.name} 信任关系设置成功`);
                trustedRemotesSet++;
            } catch (error) {
                console.log(`   ⚠️ ${remoteNetworkConfig.name} 信任关系设置失败:`, (error as Error).message);
            }
        } else {
            console.log(`   ⚠️ ${remoteNetworkConfig.name} 未部署，跳过`);
        }
    }

    // 检查 LINK 代币余额
    console.log("\n💰 检查 LINK 代币余额...");
    const linkTokenAddress = currentNetworkConfig.linkToken;
    const linkToken = await ethers.getContractAt("LinkTokenInterface", linkTokenAddress);
    
    const linkBalance = await linkToken.balanceOf(nftAddress);
    console.log("   合约 LINK 余额:", ethers.formatEther(linkBalance), "LINK");
    
    if (linkBalance === 0n) {
        console.log("   ⚠️ 合约没有 LINK 代币，无法支付跨链费用");
        console.log("   💡 建议: 向合约地址转入一些 LINK 代币");
        console.log("   LINK 代币地址:", linkTokenAddress);
        console.log("   合约地址:", nftAddress);
    }

    // 测试费用估算
    if (trustedRemotesSet > 0) {
        console.log("\n💸 测试跨链费用估算...");
        
        // 铸造一个测试 NFT
        console.log("   铸造测试 NFT...");
        const mintTx = await crossChainNFT.mint(deployer.address, "https://example.com/test-nft.json");
        await mintTx.wait();
        
        const tokenId = await crossChainNFT.getNextTokenId() - 1n;
        console.log("   测试 NFT ID:", tokenId.toString());
        
        // 估算到各个网络的费用
        for (const [networkName, networkConfig] of Object.entries(ccipConfig.networks)) {
            if (networkName === currentNetworkName) continue;
            
            const remoteNetworkConfig = networkConfig as any;
            const remoteLatestFile = path.join(deploymentsDir, `crosschain-${remoteNetworkConfig.name.toLowerCase().replace(/\s+/g, "-")}-latest.json`);
            
            if (fs.existsSync(remoteLatestFile)) {
                try {
                    const fee = await crossChainNFT.getTransferFee(
                        remoteNetworkConfig.chainSelector,
                        deployer.address,
                        tokenId
                    );
                    
                    console.log(`   到 ${remoteNetworkConfig.name}: ${ethers.formatEther(fee)} LINK`);
                } catch (error) {
                    console.log(`   到 ${remoteNetworkConfig.name}: 费用估算失败`);
                }
            }
        }
    }

    console.log("\n🎉 跨链配置完成!");
    console.log("=".repeat(50));
    console.log("📋 配置摘要:");
    console.log("   当前网络:", currentNetworkConfig.name);
    console.log("   合约地址:", nftAddress);
    console.log("   信任关系数量:", trustedRemotesSet);
    console.log("   LINK 余额:", ethers.formatEther(linkBalance), "LINK");

    if (trustedRemotesSet === 0) {
        console.log("\n⚠️ 注意: 没有设置任何信任关系");
        console.log("   请先在其他网络部署合约，然后重新运行此脚本");
    }

    if (linkBalance === 0n) {
        console.log("\n💡 下一步: 为合约充值 LINK 代币");
        console.log("   1. 获取 LINK 代币 (测试网可从水龙头获取)");
        console.log("   2. 转账到合约地址:", nftAddress);
        console.log("   3. 或使用 depositLink 函数充值");
    }

    console.log("\n🚀 现在可以测试跨链 NFT 传输了!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ 配置失败:", error);
        process.exit(1);
    });
