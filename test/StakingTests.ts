import { expect } from "chai";
import { ethers } from "hardhat";
import {BigNumber, Signer} from "ethers";
import { Staking, Staking__factory, DAOVoting__factory, DAOVoting, XXXToken__factory, InterfaceERC20 } from "../typechain";


describe("Stacking", function () {
    let staking: Staking;
    let dao: DAOVoting;
    // let factory: IUniswapV2Factory;
    // let router: IUniswapV2Router02;
    let accounts: Signer[];
    let pair: string;
    let token: InterfaceERC20;
  
    beforeEach(async function () {
        accounts = await ethers.getSigners()

        const XXXFactory = new XXXToken__factory(accounts[0])
        token = await XXXFactory.deploy()
        await token.deployed()

        const stakingFactory= new Staking__factory(accounts[0]);
        staking = await stakingFactory.deploy(token.address, token.address);
        await staking.deployed() 

        const DAOFActory = new DAOVoting__factory(accounts[0]);
        dao = await DAOFActory.deploy(await accounts[0].getAddress(), token.address, staking.address, 1, 60);
        await dao.deployed()
    })

    async function stake() {
        await token.mint(await accounts[0].getAddress(), 5);
        await token.approve(staking.address, 5);
        await staking["stake(uint256)"](5); 
    }
  
    it("Stake XXX", async function () {
        await expect(staking["stake(uint256)"](0)).to.be.revertedWith("not enough funds");
        await stake();
        await stake();
        expect(await staking.getStakeAmount(1)).to.equal(5);
        expect(await token.balanceOf(await accounts[0].getAddress())).to.equal(0);
    });

    it("Stake ETH", async function() {
        await expect(staking["stake()"]({value: ethers.utils.parseEther("0")})).to.be.revertedWith("not enough funds");
        let oldBalance: BigNumber = await accounts[0].getBalance();
        await staking["stake()"]({value: ethers.utils.parseEther("0.0000000001")});
        expect(await staking.getStakeAmount(1)).to.equal(10 ** 8);
        expect(await accounts[0].getBalance()).to.lt(oldBalance);
    })
  
    it("Function claim", async function () {
        await stake();
        await ethers.provider.send('evm_mine', [(await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp +  (await staking.timeReward()).toNumber()]);
        const oldBalance = await token.balanceOf(await accounts[0].getAddress());
        await staking.claim();
        expect(await token.balanceOf(await accounts[0].getAddress())).to.gte(oldBalance);
    })
  
    it("Unstake XXX", async function () {
        await stake();
        await stake();
        await expect(staking.unstake(1)).to.be.revertedWith("not ended yet");
        await ethers.provider.send('evm_mine', [(await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp +  (await staking.timeFreezing()).toNumber()]);
        await staking.unstake(1);
        await staking.unstake(2);
        await expect(staking.unstake(1)).to.be.revertedWith("such stake does not exist");
        expect(await staking.getStakeAmount(1)).to.equal(0);
    })

    it("Unstake ETH", async function () {
        await staking["stake()"]({value: ethers.utils.parseEther("0.0000000001")});
        await staking["stake()"]({value: ethers.utils.parseEther("0.0000000001")});
        await expect(staking.unstake(1)).to.be.revertedWith("not ended yet");
        await ethers.provider.send('evm_mine', [(await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp +  (await staking.timeFreezing()).toNumber()]);
        await staking.unstake(1);
        await staking.unstake(2);
        await expect(staking.unstake(1)).to.be.revertedWith("such stake does not exist");
        expect(await staking.getStakeAmount(1)).to.equal(0);
    })

    async function addProposal() {
        const jsonAbi = [    {
            "inputs": [
              {
                "internalType": "uint256",
                "name": "_timeFreezing",
                "type": "uint256"
              }
            ],
            "name": "changeTimeFreezing",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }];
        const iface = new ethers.utils.Interface(jsonAbi);
        const calldata = iface.encodeFunctionData('changeTimeFreezing', [5]);
        const recipient = staking.address;
        await dao.addProposal(calldata, recipient, "Change time freezing to 5 sec.");
    }

    it("Change Time Freezing", async function() {
        await expect(staking.changeTimeFreezing(5)).to.be.revertedWith("not a DAO");
        await expect(staking.connect(accounts[1]).setDAO(dao.address)).to.be.revertedWith("not an owner");
        await staking.setDAO(dao.address);
        await expect(staking.setDAO(dao.address)).to.be.revertedWith("already set");
        await addProposal();
        await token.mint(await accounts[2].getAddress(), 100);
        await token.connect(accounts[2]).approve(dao.address, 100);
        await dao.connect(accounts[2]).deposit(100);
        await dao.connect(accounts[2]).vote(0, true);
        await ethers.provider.send('evm_mine', [(await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp +  (await dao.debatingPeriodDuration()).toNumber()]);
        await dao.finishProposal(0);
    })
  });