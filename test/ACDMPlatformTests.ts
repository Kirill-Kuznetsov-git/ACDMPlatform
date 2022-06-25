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
        const staking = await stakingFactory.deploy(tokenACDM.address, tokenACDM.address);
        await staking.deployed();

        const votingFactory = new DAOVoting__factory(signer);
        voting = await votingFactory.deploy(await signer.getAddress(), tokenXXX.address, staking.address, 2, 3 * 24 * 60 * 60);
        await voting.deployed();

        const platformFactory = new ACDMPlatform__factory(signer);
        platform = await platformFactory.deploy(tokenACDM.address, tokenXXX.address);
        await platform.deployed();
        // await platform.setDAO(voting.address);
    })
    
    it("registration", async function() {
        await platform.registration("0", "0");
        await expect(platform.registration("0", "0")).to.be.revertedWith("already registrated");
        await expect(platform.connect(accounts[1]).registration("1", "0")).to.be.revertedWith("first referral not registrated");
        await expect(platform.connect(accounts[1]).registration(await signer.getAddress(), "0")).to.be.revertedWith("second referral not registrated");
    })

    it("buy Token", async function() {

    })
});
