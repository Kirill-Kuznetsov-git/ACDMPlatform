import { expect } from "chai";
import { ethers } from "hardhat";
import {BigNumber, Signer} from "ethers";
import { DAOVoting, DAOVoting__factory, InterfaceERC20, ACDMPlatform, ACDMPlatform__factory, ACDMToken, ACDMToken__factory, XXXToken, XXXToken__factory, Staking, Staking__factory } from "../typechain";

describe("ACDMPlatform", function () {
    let voting: DAOVoting;
    let tokenXXX: InterfaceERC20;
    let tokenACDM: InterfaceERC20;
    let platform: ACDMPlatform;
    let accounts: Signer[];
    let signer: Signer;
    const zeroAddress = "0x0000000000000000000000000000000000000000"

    this.beforeEach(async function () {
        accounts = await ethers.getSigners()
        signer = accounts[0];

        const XXXTokenFactory = new XXXToken__factory(signer);
        tokenXXX = await XXXTokenFactory.deploy();
        await tokenXXX.deployed();

        const ACDMTokenFactory = new ACDMToken__factory(signer);
        tokenACDM = await ACDMTokenFactory.deploy();
        await tokenACDM.deployed();

        const stakingFactory = new Staking__factory(signer);
        const staking = await stakingFactory.deploy(tokenXXX.address, tokenXXX.address);
        await staking.deployed();

        const votingFactory = new DAOVoting__factory(signer);
        voting = await votingFactory.deploy(await signer.getAddress(), tokenXXX.address, staking.address, 1, 3 * 24 * 60 * 60);
        await voting.deployed();

        const platformFactory = new ACDMPlatform__factory(signer);
        platform = await platformFactory.deploy(tokenACDM.address, tokenXXX.address, process.env.UNISWAP_ROUTER_ADDRESS as string, process.env.WETH_ADDRESS as string);
        await platform.deployed();
        await platform.setDAO(voting.address);
        await tokenACDM.giveAdminRole(platform.address);
        await tokenXXX.giveAdminRole(platform.address);
        await platform.startPatform();
    })
    
    it("registration", async function() {
        await expect(platform.connect(accounts[1]).startPatform()).to.be.revertedWith("not an owner");
        await expect(platform.setDAO(voting.address)).to.be.revertedWith("already set");
        await platform.registration(zeroAddress, zeroAddress);
        await expect(platform.registration(zeroAddress, zeroAddress)).to.be.revertedWith("already registrated");
        await expect(platform.connect(accounts[1]).registration(await accounts[4].getAddress(), zeroAddress)).to.be.revertedWith("first referral not registrated");
        await expect(platform.connect(accounts[1]).registration(await signer.getAddress(), await accounts[4].getAddress())).to.be.revertedWith("second referral not registrated");
        await platform.connect(accounts[1]).registration(zeroAddress, await signer.getAddress());

    })

    it("buy Token", async function() {
        await expect(platform.setTrade(1, 1)).to.be.revertedWith("not trade round");
        await expect(platform.buyToken(100, {value: ethers.utils.parseEther("0")})).to.be.revertedWith("not registrated");
        await platform.registration(zeroAddress, zeroAddress);
        await expect(platform.buyToken(100, {value: ethers.utils.parseEther("0")})).to.be.revertedWith("not enough funds");
        const oldBalance = await platform.numberToken();
        await platform.buyToken(100, {value: (await platform.currectPrice()).mul(100)});
        await platform.buyToken(100, {value: (await platform.currectPrice()).mul(102)});
        expect(await platform.numberToken()).be.equal(oldBalance.add(-200));

        await platform.connect(accounts[1]).registration(zeroAddress, zeroAddress);
        await platform.connect(accounts[2]).registration(await signer.getAddress(), await accounts[1].getAddress());

        const firstRefOldBalance = await signer.getBalance();
        const secondRefOldBalance = await accounts[1].getBalance();
        await platform.connect(accounts[2]).buyToken(await platform.numberToken(), {value: ethers.utils.parseEther("1")});
        
        expect(await signer.getBalance()).to.gt(firstRefOldBalance);
        expect(await accounts[1].getBalance()).to.gt(secondRefOldBalance);
        expect((await platform.currentRound()).round).to.equal(1);

        await expect(platform.buyToken(100, {value: ethers.utils.parseEther("1")})).to.be.revertedWith("not sell round");
    })

    it("Set and Close Trade", async function() {
        await platform.registration(zeroAddress, zeroAddress);
        await platform.buyToken(100, {value: (await platform.currectPrice()).mul(100)});
        await ethers.provider.send('evm_mine', [(await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp +  (await platform.DURATIONROUND()).toNumber()]);
        await platform.updateRound();
        await tokenACDM.approve(platform.address, 100);
        await expect(platform.setTrade(101, await platform.currectPrice())).to.be.revertedWith("not enough tokens");
        const oldBalance = await tokenACDM.balanceOf(await signer.getAddress());
        await platform.setTrade(99, await platform.currectPrice());
        expect(await tokenACDM.balanceOf(await signer.getAddress())).to.eq(oldBalance.add(-99));
        await platform.closeTrade();
        expect(await tokenACDM.balanceOf(await signer.getAddress())).to.eq(oldBalance);
    })

    it("Buy Trade", async function() {
        await platform.registration(zeroAddress, zeroAddress);
        await platform.connect(accounts[1]).registration(zeroAddress, zeroAddress);
        await platform.buyToken(100, {value: (await platform.currectPrice()).mul(100)});
        await ethers.provider.send('evm_mine', [(await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp +  (await platform.DURATIONROUND()).toNumber()]);
        await platform.updateRound();
        await tokenACDM.approve(platform.address, 100);
        await platform.setTrade(99, await platform.currectPrice());
        await platform.connect(accounts[1]).buyTrade(await signer.getAddress(), 98, {value: (await platform.currectPrice()).mul(99)});
        expect(await tokenACDM.balanceOf(platform.address)).to.eq(1);
        expect(await tokenACDM.balanceOf(await accounts[1].getAddress())).to.eq(98);
        await platform.connect(accounts[1]).buyTrade(await signer.getAddress(), 1, {value: (await platform.currectPrice())});
        expect(await tokenACDM.balanceOf(platform.address)).to.eq(0);
        expect(await tokenACDM.balanceOf(await accounts[1].getAddress())).to.eq(99);
        await expect(platform.connect(accounts[1]).buyTrade(await signer.getAddress(), 1, {value: (await platform.currectPrice())})).to.be.revertedWith("not enough tokens");
    })

    it("Buy trade with referrals", async function() {
        await platform.connect(accounts[1]).registration(zeroAddress, zeroAddress);
        await platform.connect(accounts[2]).registration(zeroAddress, zeroAddress);
        await platform.connect(accounts[3]).registration(zeroAddress, zeroAddress);
        await platform.registration(await accounts[1].getAddress(), await accounts[2].getAddress());
        await platform.buyToken(100, {value: (await platform.currectPrice()).mul(100)});
        await ethers.provider.send('evm_mine', [(await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp +  (await platform.DURATIONROUND()).toNumber()]);
        await platform.updateRound();
        await tokenACDM.approve(platform.address, 100);
        await platform.setTrade(99, await platform.currectPrice());

        const firstRefOldBalance = await accounts[1].getBalance();
        const secondRefOldBalance = await accounts[2].getBalance();

        await platform.connect(accounts[3]).buyTrade(await signer.getAddress(), 98, {value: (await platform.currectPrice()).mul(98)});
        expect(await accounts[1].getBalance()).to.gt(firstRefOldBalance);
        expect(await accounts[2].getBalance()).to.gt(secondRefOldBalance);

        await expect(platform.updateRound()).to.be.revertedWith("not ended yet");
        await ethers.provider.send('evm_mine', [(await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp +  (await platform.DURATIONROUND()).toNumber()]);
        await expect(platform.setTrade(1, 1)).to.be.revertedWith("round already ended");
        await platform.updateRound();
        expect((await platform.currentRound()).round).to.equal(0);
        await ethers.provider.send('evm_mine', [(await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp +  (await platform.DURATIONROUND()).toNumber()]);
        await expect(platform.buyToken(1)).to.be.revertedWith("round already ended");
        await platform.updateRound();
        await ethers.provider.send('evm_mine', [(await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp +  (await platform.DURATIONROUND()).toNumber()]);
        await platform.updateRound();
        expect((await platform.currentRound()).round).to.equal(1);
    })

    async function addProposal(res: number) {
        const jsonAbi = [    {
            "inputs": [
              {
                "internalType": "uint256",
                "name": "res",
                "type": "uint256"
              }
            ],
            "name": "spendCharity",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }];
        const iface = new ethers.utils.Interface(jsonAbi);
        const calldata = iface.encodeFunctionData('spendCharity', [res]);
        const recipient = platform.address;
        await voting.connect(signer).addProposal(calldata, recipient, "Spend Charity");
    }

    it("Spend charity", async function() {
        await platform.registration(zeroAddress, zeroAddress);
        await platform.connect(accounts[1]).registration(zeroAddress, zeroAddress);
        await platform.buyToken(100000, {value: (await platform.currectPrice()).mul(100000)});
        await ethers.provider.send('evm_mine', [(await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp +  (await platform.DURATIONROUND()).toNumber()]);
        await platform.updateRound();
        await tokenACDM.approve(platform.address, 100000);
        await platform.setTrade(100000, await platform.currectPrice());
        await platform.connect(accounts[1]).buyTrade(await signer.getAddress(), 100000, {value: (await platform.currectPrice()).mul(100000)});
        const oldBalance = await signer.getBalance();
        
        await addProposal(5);
        await tokenXXX.mint(await signer.getAddress(), 100);
        await tokenXXX.approve(voting.address, 100);
        await voting.deposit(100);
        await voting.vote(0, true);
        await ethers.provider.send('evm_mine', [(await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp +  (await voting.debatingPeriodDuration()).toNumber()]);
        await expect(voting.finishProposal(0)).to.be.revertedWith("ERROR call function");
        
        await addProposal(0);
        await tokenXXX.mint(await signer.getAddress(), 100);
        await tokenXXX.approve(voting.address, 100);
        await voting.deposit(100);
        await voting.vote(1, true);
        await ethers.provider.send('evm_mine', [(await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp +  (await voting.debatingPeriodDuration()).toNumber()]);
        await voting.finishProposal(1);
        
        expect(await signer.getBalance()).to.gt(oldBalance);
    })

    it("Burn charity", async function() {
        await platform.registration(zeroAddress, zeroAddress);
        await platform.connect(accounts[1]).registration(zeroAddress, zeroAddress);
        await platform.buyToken(100000, {value: (await platform.currectPrice()).mul(100000)});
        await ethers.provider.send('evm_mine', [(await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp +  (await platform.DURATIONROUND()).toNumber()]);
        await platform.updateRound();
        await tokenACDM.approve(platform.address, 100000);
        await platform.setTrade(100000, await platform.currectPrice());
        await platform.connect(accounts[1]).buyTrade(await signer.getAddress(), 100000, {value: (await platform.currectPrice()).mul(100000)});
        const oldBalance = await signer.getBalance();

        await addProposal(1);
        await tokenXXX.mint(await signer.getAddress(), 100);
        await tokenXXX.approve(voting.address, 100);
        await voting.deposit(100);
        await voting.vote(0, true);
        await ethers.provider.send('evm_mine', [(await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp +  (await voting.debatingPeriodDuration()).toNumber()]);
        await voting.finishProposal(0);


    })
});
