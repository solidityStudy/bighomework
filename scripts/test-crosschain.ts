import fs from "fs";
import path from "path";
import { ethers } from "ethers";

// 创建 provider 和 wallet
const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const wallet = new ethers.Wallet(process.env.SEPOLIA_PRIVATE_KEY!, provider);

async function main() {
    console.log("🧪 测试跨链 NFT 传输...");
    console.log("=".repeat(50));

    // 获取部署者账户
    const deployer = wallet;
    console.log("👤 测试账户:", deployer.address);

    // 读取 CCIP 配置
    const ccipConfigPath = path.join(process.cwd(), "ccip-config.json");
    const ccipConfig = JSON.parse(fs.readFileSync(ccipConfigPath, "utf8"));
    
    // 获取当前网络配置
    const network = await provider.getNetwork();
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

    // 读取部署信息
    const deploymentsDir = path.join(process.cwd(), "deployments");
    const latestFile = path.join(deploymentsDir, `crosschain-${currentNetworkConfig.name.toLowerCase().replace(/\s+/g, "-")}-latest.json`);
    
    if (!fs.existsSync(latestFile)) {
        throw new Error(`找不到部署文件: ${latestFile}`);
    }

    const deploymentInfo = JSON.parse(fs.readFileSync(latestFile, "utf8"));
    const nftAddress = deploymentInfo.contracts.CrossChainNFT;
    
    console.log("📋 合约地址:", nftAddress);

    // 连接到合约
    const artifactPath = path.join(process.cwd(), "artifacts/contracts/CrossChainNFT.sol/CrossChainNFT.json");
    const crossChainNFTArtifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const crossChainNFT = new ethers.Contract(nftAddress, crossChainNFTArtifact.abi, deployer);

    // 1. 检查合约状态
    console.log("\n📊 检查合约状态...");
    
    const nextTokenId = await crossChainNFT.getNextTokenId();
    console.log("   下一个 Token ID:", nextTokenId.toString());
    
    // 检查 LINK 余额
    const linkTokenAddress = currentNetworkConfig.linkToken;
    const linkArtifactPath = path.join(process.cwd(), "artifacts/contracts/interfaces/LinkTokenInterface.sol/LinkTokenInterface.json");
    const linkArtifact = JSON.parse(fs.readFileSync(linkArtifactPath, "utf8"));
    const linkToken = new ethers.Contract(linkTokenAddress, linkArtifact.abi, deployer);
    const linkBalance = await linkToken.balanceOf(nftAddress);
    console.log("   LINK 余额:", ethers.formatEther(linkBalance), "LINK");

    // 2. 铸造测试 NFT
    console.log("\n🎨 铸造测试 NFT...");
    
    const testTokenURI = "https://ipfs.io/ipfs/QmYourTestNFTMetadata";
    const mintTx = await crossChainNFT.mint(deployer.address, testTokenURI);
    await mintTx.wait();
    
    const tokenId = nextTokenId;
    console.log("   ✅ NFT 铸造成功!");
    console.log("   Token ID:", tokenId.toString());
    console.log("   所有者:", await crossChainNFT.ownerOf(tokenId));
    console.log("   URI:", await crossChainNFT.tokenURI(tokenId));

    // 3. 查找可用的目标网络
    console.log("\n🔍 查找可用的目标网络...");
    
    let targetNetwork: any = null;
    let targetChainSelector: string | null = null;
    
    for (const [networkName, networkConfig] of Object.entries(ccipConfig.networks)) {
        if (networkName === currentNetworkName) continue;
        
        const remoteNetworkConfig = networkConfig as any;
        const remoteLatestFile = path.join(deploymentsDir, `crosschain-${remoteNetworkConfig.name.toLowerCase().replace(/\s+/g, "-")}-latest.json`);
        
        if (fs.existsSync(remoteLatestFile)) {
            targetNetwork = remoteNetworkConfig;
            targetChainSelector = remoteNetworkConfig.chainSelector;
            console.log("   找到目标网络:", remoteNetworkConfig.name);
            break;
        }
    }
    
    if (!targetNetwork) {
        console.log("   ⚠️ 没有找到可用的目标网络");
        console.log("   请先在其他网络部署合约");
        return;
    }

    // 4. 估算跨链费用
    console.log("\n💸 估算跨链传输费用...");
    
    try {
        const fee = await crossChainNFT.getTransferFee(
            targetChainSelector,
            deployer.address,
            tokenId
        );
        
        console.log("   传输费用:", ethers.formatEther(fee), "LINK");
        console.log("   目标网络:", targetNetwork.name);
        
        if (linkBalance < fee) {
            console.log("   ❌ LINK 余额不足!");
            console.log("   需要:", ethers.formatEther(fee), "LINK");
            console.log("   当前:", ethers.formatEther(linkBalance), "LINK");
            console.log("   缺少:", ethers.formatEther(fee - linkBalance), "LINK");
            
            // 尝试为合约充值 LINK (如果用户有足够的 LINK)
            const userLinkBalance = await linkToken.balanceOf(deployer.address);
            console.log("   用户 LINK 余额:", ethers.formatEther(userLinkBalance), "LINK");
            
            if (userLinkBalance >= fee) {
                console.log("   💰 尝试为合约充值 LINK...");
                
                const approveTx = await linkToken.approve(nftAddress, fee);
                await approveTx.wait();
                
                const depositTx = await crossChainNFT.depositLink(fee);
                await depositTx.wait();
                
                console.log("   ✅ LINK 充值成功!");
            } else {
                console.log("   ⚠️ 用户 LINK 余额也不足，无法进行跨链传输");
                console.log("   💡 请从 LINK 水龙头获取代币:");
                console.log("   https://faucets.chain.link/");
                return;
            }
        }
        
    } catch (error) {
        console.log("   ❌ 费用估算失败:", (error as Error).message);
        return;
    }

    // 5. 执行跨链传输
    console.log("\n🌉 执行跨链 NFT 传输...");
    
    try {
        console.log("   发送 NFT 到", targetNetwork.name, "...");
        console.log("   Token ID:", tokenId.toString());
        console.log("   接收者:", deployer.address);
        
        const transferTx = await crossChainNFT.sendNFTCrossChain(
            targetChainSelector,
            deployer.address,
            tokenId
        );
        
        console.log("   交易哈希:", transferTx.hash);
        console.log("   等待确认...");
        
        const receipt = await transferTx.wait();
        console.log("   ✅ 跨链传输交易已确认!");
        console.log("   Gas 使用:", receipt?.gasUsed?.toString());
        
        // 查找 TokenSentCrossChain 事件
        const events = receipt?.logs || [];
        for (const log of events) {
            try {
                const parsedLog = crossChainNFT.interface.parseLog({
                    topics: log.topics,
                    data: log.data
                });
                
                if (parsedLog?.name === "TokenSentCrossChain") {
                    console.log("   📤 跨链发送事件:");
                    console.log("     Message ID:", parsedLog.args.messageId);
                    console.log("     Token ID:", parsedLog.args.tokenId.toString());
                    console.log("     From:", parsedLog.args.from);
                    console.log("     To:", parsedLog.args.to);
                }
            } catch (e) {
                // 忽略解析错误
            }
        }
        
        // 检查代币状态
        const isLocked = await crossChainNFT.isTokenLocked(tokenId);
        console.log("   🔒 Token 锁定状态:", isLocked);
        
        if (isLocked) {
            console.log("   ✅ NFT 已锁定，等待目标链接收");
            console.log("   💡 请在目标网络检查 NFT 是否已接收");
            console.log("   🔗 CCIP Explorer: https://ccip.chain.link/");
        }
        
    } catch (error) {
        console.log("   ❌ 跨链传输失败:", (error as Error).message);
        
        // 检查常见错误
        if ((error as Error).message.includes("TokenLocked")) {
            console.log("   💡 Token 已被锁定，可能正在进行跨链传输");
        } else if ((error as Error).message.includes("NotEnoughBalance")) {
            console.log("   💡 LINK 余额不足，请充值后重试");
        }
    }

    // 6. 显示后续步骤
    console.log("\n📋 后续步骤:");
    console.log("1. 等待 CCIP 网络处理跨链消息 (通常需要几分钟)");
    console.log("2. 在目标网络检查 NFT 是否已接收");
    console.log("3. 使用 CCIP Explorer 跟踪消息状态:");
    console.log("   https://ccip.chain.link/");
    console.log("4. 如果传输失败，可以使用 unlockToken 解锁 NFT");

    console.log("\n🎉 跨链测试完成!");
    console.log("=".repeat(50));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ 测试失败:", error);
        process.exit(1);
    });
