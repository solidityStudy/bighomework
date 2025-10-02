import { expect } from "chai";
import { ethers } from "hardhat";
import { CrossChainNFT, LinkTokenInterface } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("CrossChainNFT", function () {
    let crossChainNFT: CrossChainNFT;
    let linkToken: LinkTokenInterface;
    let owner: HardhatEthersSigner;
    let user1: HardhatEthersSigner;
    let user2: HardhatEthersSigner;
    let mockRouter: HardhatEthersSigner;
    
    const CHAIN_SELECTOR_FUJI = "14767482510784806043";
    const CHAIN_SELECTOR_MUMBAI = "12532609583862916517";

    beforeEach(async function () {
        [owner, user1, user2, mockRouter] = await ethers.getSigners();

        // 部署 Mock LINK Token
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const mockLinkToken = await MockERC20.deploy(
            "ChainLink Token",
            "LINK",
            18,
            1000000 // 1M LINK
        );
        await mockLinkToken.waitForDeployment();
        linkToken = mockLinkToken as any;

        // 部署 CrossChainNFT
        const CrossChainNFTFactory = await ethers.getContractFactory("CrossChainNFT");
        crossChainNFT = await CrossChainNFTFactory.deploy(
            "Cross-Chain Test NFT",
            "CCNFT",
            mockRouter.address, // 使用 mockRouter 作为 CCIP 路由器
            await linkToken.getAddress()
        );
        await crossChainNFT.waitForDeployment();

        // 给合约一些 LINK 代币
        await linkToken.transfer(await crossChainNFT.getAddress(), ethers.parseEther("1000"));
    });

    describe("基础功能", function () {
        it("应该正确部署合约", async function () {
            expect(await crossChainNFT.name()).to.equal("Cross-Chain Test NFT");
            expect(await crossChainNFT.symbol()).to.equal("CCNFT");
            expect(await crossChainNFT.ccipRouter()).to.equal(mockRouter.address);
            expect(await crossChainNFT.linkToken()).to.equal(await linkToken.getAddress());
        });

        it("应该允许铸造 NFT", async function () {
            const tokenURI = "https://example.com/token/1";
            
            await expect(crossChainNFT.mint(user1.address, tokenURI))
                .to.emit(crossChainNFT, "Transfer")
                .withArgs(ethers.ZeroAddress, user1.address, 0);

            expect(await crossChainNFT.ownerOf(0)).to.equal(user1.address);
            expect(await crossChainNFT.tokenURI(0)).to.equal(tokenURI);
            expect(await crossChainNFT.getNextTokenId()).to.equal(1);
        });

        it("应该支持批量铸造", async function () {
            const tokenURIs = [
                "https://example.com/token/1",
                "https://example.com/token/2",
                "https://example.com/token/3"
            ];

            const tokenIds = await crossChainNFT.batchMint(user1.address, tokenURIs);
            
            expect(tokenIds.length).to.equal(3);
            expect(await crossChainNFT.ownerOf(0)).to.equal(user1.address);
            expect(await crossChainNFT.ownerOf(1)).to.equal(user1.address);
            expect(await crossChainNFT.ownerOf(2)).to.equal(user1.address);
            expect(await crossChainNFT.getNextTokenId()).to.equal(3);
        });
    });

    describe("权限控制", function () {
        it("只有 MINTER_ROLE 可以铸造", async function () {
            await expect(
                crossChainNFT.connect(user1).mint(user2.address, "test")
            ).to.be.reverted;
        });

        it("只有 DEFAULT_ADMIN_ROLE 可以设置信任的远程合约", async function () {
            await expect(
                crossChainNFT.connect(user1).setTrustedRemote(CHAIN_SELECTOR_FUJI, user2.address)
            ).to.be.reverted;
        });

        it("只有 DEFAULT_ADMIN_ROLE 可以更新 CCIP 路由器", async function () {
            await expect(
                crossChainNFT.connect(user1).setCCIPRouter(user2.address)
            ).to.be.reverted;
        });
    });

    describe("跨链配置", function () {
        it("应该允许设置信任的远程合约", async function () {
            await expect(crossChainNFT.setTrustedRemote(CHAIN_SELECTOR_FUJI, user1.address))
                .to.emit(crossChainNFT, "TrustedRemoteSet")
                .withArgs(CHAIN_SELECTOR_FUJI, user1.address);

            expect(await crossChainNFT.trustedRemotes(CHAIN_SELECTOR_FUJI)).to.equal(user1.address);
        });

        it("应该允许更新 CCIP 路由器", async function () {
            const newRouter = user2.address;
            
            await expect(crossChainNFT.setCCIPRouter(newRouter))
                .to.emit(crossChainNFT, "CCIPRouterUpdated")
                .withArgs(mockRouter.address, newRouter);

            expect(await crossChainNFT.ccipRouter()).to.equal(newRouter);
        });
    });

    describe("跨链传输", function () {
        beforeEach(async function () {
            // 铸造一个测试 NFT
            await crossChainNFT.mint(user1.address, "https://example.com/token/1");
            
            // 设置信任的远程合约
            await crossChainNFT.setTrustedRemote(CHAIN_SELECTOR_FUJI, user2.address);
        });

        it("应该允许 NFT 所有者发送跨链", async function () {
            const tokenId = 0;
            
            await expect(
                crossChainNFT.connect(user1).sendNFTCrossChain(
                    CHAIN_SELECTOR_FUJI,
                    user2.address,
                    tokenId
                )
            ).to.emit(crossChainNFT, "TokenSentCrossChain");

            // 检查代币是否被锁定
            expect(await crossChainNFT.isTokenLocked(tokenId)).to.be.true;
        });

        it("不应该允许非所有者发送跨链", async function () {
            const tokenId = 0;
            
            await expect(
                crossChainNFT.connect(user2).sendNFTCrossChain(
                    CHAIN_SELECTOR_FUJI,
                    user2.address,
                    tokenId
                )
            ).to.be.revertedWithCustomError(crossChainNFT, "InvalidTokenId");
        });

        it("不应该允许发送到不信任的链", async function () {
            const tokenId = 0;
            
            await expect(
                crossChainNFT.connect(user1).sendNFTCrossChain(
                    CHAIN_SELECTOR_MUMBAI, // 未设置信任关系
                    user2.address,
                    tokenId
                )
            ).to.be.revertedWithCustomError(crossChainNFT, "UntrustedChain");
        });

        it("不应该允许发送已锁定的代币", async function () {
            const tokenId = 0;
            
            // 第一次发送
            await crossChainNFT.connect(user1).sendNFTCrossChain(
                CHAIN_SELECTOR_FUJI,
                user2.address,
                tokenId
            );

            // 尝试再次发送同一个代币
            await expect(
                crossChainNFT.connect(user1).sendNFTCrossChain(
                    CHAIN_SELECTOR_FUJI,
                    user2.address,
                    tokenId
                )
            ).to.be.revertedWithCustomError(crossChainNFT, "TokenLocked");
        });

        it("应该返回跨链费用估算", async function () {
            const fee = await crossChainNFT.getTransferFee(
                CHAIN_SELECTOR_FUJI,
                user2.address,
                0
            );
            
            expect(fee).to.equal(ethers.parseEther("0.001")); // 固定费用
        });
    });

    describe("代币锁定管理", function () {
        beforeEach(async function () {
            await crossChainNFT.mint(user1.address, "https://example.com/token/1");
            await crossChainNFT.setTrustedRemote(CHAIN_SELECTOR_FUJI, user2.address);
        });

        it("应该防止转移被锁定的代币", async function () {
            const tokenId = 0;
            
            // 发送跨链，锁定代币
            await crossChainNFT.connect(user1).sendNFTCrossChain(
                CHAIN_SELECTOR_FUJI,
                user2.address,
                tokenId
            );

            // 尝试转移被锁定的代币
            await expect(
                crossChainNFT.connect(user1).transferFrom(user1.address, user2.address, tokenId)
            ).to.be.revertedWithCustomError(crossChainNFT, "TokenLocked");
        });

        it("应该允许 BRIDGE_ROLE 解锁代币", async function () {
            const tokenId = 0;
            
            // 发送跨链，锁定代币
            await crossChainNFT.connect(user1).sendNFTCrossChain(
                CHAIN_SELECTOR_FUJI,
                user2.address,
                tokenId
            );

            expect(await crossChainNFT.isTokenLocked(tokenId)).to.be.true;

            // 解锁代币
            await crossChainNFT.unlockToken(tokenId);
            
            expect(await crossChainNFT.isTokenLocked(tokenId)).to.be.false;
        });

        it("不应该允许解锁未锁定的代币", async function () {
            const tokenId = 0;
            
            await expect(
                crossChainNFT.unlockToken(tokenId)
            ).to.be.revertedWithCustomError(crossChainNFT, "TokenNotLocked");
        });
    });

    describe("资金管理", function () {
        it("应该允许存入 LINK 代币", async function () {
            const amount = ethers.parseEther("100");
            
            await linkToken.approve(await crossChainNFT.getAddress(), amount);
            await crossChainNFT.depositLink(amount);
            
            const balance = await linkToken.balanceOf(await crossChainNFT.getAddress());
            expect(balance).to.equal(ethers.parseEther("1100")); // 初始 1000 + 100
        });

        it("应该允许管理员提取 LINK", async function () {
            const initialBalance = await linkToken.balanceOf(owner.address);
            
            await crossChainNFT.withdrawLink(owner.address);
            
            const finalBalance = await linkToken.balanceOf(owner.address);
            expect(finalBalance).to.be.gt(initialBalance);
        });

        it("应该允许管理员提取 ETH", async function () {
            // 向合约发送一些 ETH
            await owner.sendTransaction({
                to: await crossChainNFT.getAddress(),
                value: ethers.parseEther("1")
            });

            const initialBalance = await ethers.provider.getBalance(owner.address);
            
            const tx = await crossChainNFT.withdrawEth(owner.address);
            const receipt = await tx.wait();
            const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
            
            const finalBalance = await ethers.provider.getBalance(owner.address);
            expect(finalBalance).to.be.approximately(
                initialBalance + ethers.parseEther("1") - gasUsed,
                ethers.parseEther("0.01") // 允许一些误差
            );
        });
    });

    describe("跨链消息接收", function () {
        beforeEach(async function () {
            await crossChainNFT.setTrustedRemote(CHAIN_SELECTOR_FUJI, user1.address);
        });

        it("应该允许路由器接收跨链消息", async function () {
            const message = {
                to: user2.address,
                tokenId: 100,
                tokenURI: "https://example.com/token/100",
                sourceChain: CHAIN_SELECTOR_FUJI,
                messageId: ethers.keccak256(ethers.toUtf8Bytes("test-message"))
            };

            await expect(
                crossChainNFT.connect(mockRouter).receiveNFTCrossChain(
                    CHAIN_SELECTOR_FUJI,
                    user1.address,
                    message
                )
            ).to.emit(crossChainNFT, "TokenReceivedCrossChain")
            .withArgs(message.tokenId, message.to, CHAIN_SELECTOR_FUJI, message.messageId);

            expect(await crossChainNFT.ownerOf(message.tokenId)).to.equal(user2.address);
            expect(await crossChainNFT.tokenURI(message.tokenId)).to.equal(message.tokenURI);
            expect(await crossChainNFT.isMessageProcessed(message.messageId)).to.be.true;
        });

        it("不应该允许非路由器接收跨链消息", async function () {
            const message = {
                to: user2.address,
                tokenId: 100,
                tokenURI: "https://example.com/token/100",
                sourceChain: CHAIN_SELECTOR_FUJI,
                messageId: ethers.keccak256(ethers.toUtf8Bytes("test-message"))
            };

            await expect(
                crossChainNFT.connect(user1).receiveNFTCrossChain(
                    CHAIN_SELECTOR_FUJI,
                    user1.address,
                    message
                )
            ).to.be.revertedWithCustomError(crossChainNFT, "OnlyRouter");
        });

        it("不应该允许来自不信任链的消息", async function () {
            const message = {
                to: user2.address,
                tokenId: 100,
                tokenURI: "https://example.com/token/100",
                sourceChain: CHAIN_SELECTOR_MUMBAI, // 未设置信任关系
                messageId: ethers.keccak256(ethers.toUtf8Bytes("test-message"))
            };

            await expect(
                crossChainNFT.connect(mockRouter).receiveNFTCrossChain(
                    CHAIN_SELECTOR_MUMBAI,
                    user1.address,
                    message
                )
            ).to.be.revertedWithCustomError(crossChainNFT, "UntrustedChain");
        });

        it("不应该允许重复处理相同消息", async function () {
            const message = {
                to: user2.address,
                tokenId: 100,
                tokenURI: "https://example.com/token/100",
                sourceChain: CHAIN_SELECTOR_FUJI,
                messageId: ethers.keccak256(ethers.toUtf8Bytes("test-message"))
            };

            // 第一次处理
            await crossChainNFT.connect(mockRouter).receiveNFTCrossChain(
                CHAIN_SELECTOR_FUJI,
                user1.address,
                message
            );

            // 尝试再次处理相同消息
            await expect(
                crossChainNFT.connect(mockRouter).receiveNFTCrossChain(
                    CHAIN_SELECTOR_FUJI,
                    user1.address,
                    message
                )
            ).to.be.revertedWithCustomError(crossChainNFT, "MessageAlreadyProcessed");
        });
    });
});
