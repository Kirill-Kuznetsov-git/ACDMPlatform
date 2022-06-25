import { throws } from "assert";
import { expect } from "chai";
import { Signer } from "ethers";
import { ethers } from "hardhat";
import { DAOVoting, InterfaceERC20, Staking, Staking__factory, XXXToken__factory, XXXToken, DAOVoting__factory } from "../typechain";

describe("DAOVoting", function () {
    let token: InterfaceERC20;
    let staking: Staking;
    let voting: DAOVoting;
    let voting1: DAOVoting;
    let accounts: Signer[];
    let signer: Signer;
    this.beforeEach(async function () {
        accounts = await ethers.getSigners()
        signer = accounts[0]

        const XXXFactory = new XXXToken__factory(accounts[0])
        token = await XXXFactory.deploy()
        await token.deployed()

        const stakingFactory = new Staking__factory(accounts[0]);
        staking = await stakingFactory.deploy(token.address, token.address);
        await staking.deployed() 

        const votingFactory = new DAOVoting__factory(accounts[0]);
        voting = await votingFactory.deploy(await signer.getAddress(), token.address, staking.address, 2, 3 * 24 * 60 * 60);

        voting1 = await votingFactory.deploy(await signer.getAddress(), token.address, staking.address, 2, 3 * 24 * 60 * 60);

        await voting.deployed();
        await voting1.deployed();
    });

    it("addChairMan function", async function() {
        const accounts = await ethers.getSigners();
        await expect(voting.connect(accounts[1]).addChairMan(accounts[1].address)).to.be.revertedWith("not an owner");
    })

    it("setMinimumQuorum function", async function() {
        const accounts = await ethers.getSigners();
        await expect(voting.setMinimumQuorum(10)).to.be.revertedWith("not a DAO");
    })


    it("setDebatingPeriodDuration function", async function() {
        const accounts = await ethers.getSigners();
        await expect(voting.setDebatingPeriodDuration(10)).to.be.revertedWith("not a DAO");
    })


    it("addProposal function", async function() {
        const accounts = await ethers.getSigners();
        const jsonAbi = [    {
            "inputs": [
              {
                "internalType": "uint256",
                "name": "newDebatingPeriodDuration",
                "type": "uint256"
              }
            ],
            "name": "setDebatingPeriodDuration",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }];
        const iface = new ethers.utils.Interface(jsonAbi);
        const calldata = iface.encodeFunctionData('setDebatingPeriodDuration', [60]);
        const recipient = voting.address;
        await voting.connect(signer).addProposal(calldata, recipient, "Set debating period duration to 60 seconds.");
        await expect(voting.connect(accounts[2]).addProposal(calldata, recipient, "test")).to.be.revertedWith("not a chairman");
        expect((await voting.votings(0)).recipient).to.eq(recipient);
        expect((await voting.votings(0)).callData).to.eq(calldata);
    });

    it("deposit function", async function() {
        await expect(voting.deposit(100)).to.be.revertedWith("not enough funds");
        await token.mint(await signer.getAddress(), 100);
        await token.approve(voting.address, 100);
        await voting.connect(signer).deposit(50);
        expect(await voting.connect(signer).getBalance()).to.eq(50);
    })

    describe("vote function", async function() {
        this.beforeEach(async function() {
            const accounts = await ethers.getSigners();
            const jsonAbi = [    {
                "inputs": [
                  {
                    "internalType": "uint256",
                    "name": "newDebatingPeriodDuration",
                    "type": "uint256"
                  }
                ],
                "name": "setDebatingPeriodDuration",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }];
            const iface = new ethers.utils.Interface(jsonAbi);
            const calldata = iface.encodeFunctionData('setDebatingPeriodDuration', [60]);
            const recipient = voting.address;
            await voting.connect(signer).addProposal(calldata, recipient, "Set debating period duration to 60 seconds.");
        })

        it("voting does not exist", async function() {
            await expect(voting.vote(100, true)).to.be.revertedWith("such voting does not exist");
        })

        it("proposal is runnning right now", async function() {
            const accounts = await ethers.getSigners();
            await expect(voting.connect(accounts[2]).vote(0, true)).to.be.revertedWith("you don't froze enough tokens");
        })

        it("already ended", async function() {
            const accounts = await ethers.getSigners();
            await token.connect(signer).mint(accounts[2].address, 100);
            await token.approve(voting.address, 100);
            await token.connect(accounts[2]).approve(voting.address, 100);
            await voting.connect(accounts[2]).deposit(100);

            const fiveDays = 5 * 24 * 60 * 60;
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;
            await ethers.provider.send('evm_mine', [timestampBefore + fiveDays]);

            await expect(voting.connect(accounts[2]).vote(0, true)).to.be.revertedWith("already ended");
        })

        it("you already voted", async function() {
            const accounts = await ethers.getSigners();
            await token.connect(signer).mint(accounts[2].address, 100);
            await token.connect(accounts[2]).approve(voting.address, 100);
            await voting.connect(accounts[2]).deposit(100);
            await voting.connect(accounts[2]).vote(0, true);
            expect(await voting.connect(accounts[2]).getFrozenBalance()).to.eq(100);
            await expect(voting.connect(accounts[2]).vote(0, true)).to.be.revertedWith("you already voted");

            await token.connect(signer).mint(accounts[3].address, 100);
            await token.connect(accounts[3]).approve(voting.address, 100);
            await voting.connect(accounts[3]).deposit(100);
            await voting.connect(accounts[3]).vote(0, false);
        })
    })

    describe("finishProposal", async function() {
        this.beforeEach(async function() {
            const accounts = await ethers.getSigners();
            const jsonAbi = [    {
                "inputs": [
                  {
                    "internalType": "uint256",
                    "name": "newDebatingPeriodDuration",
                    "type": "uint256"
                  }
                ],
                "name": "setDebatingPeriodDuration",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }];
            const iface = new ethers.utils.Interface(jsonAbi);
            const calldata = iface.encodeFunctionData('setDebatingPeriodDuration', [60]);
            const recipient = voting.address;
            await voting.connect(signer).addProposal(calldata, recipient, "Set debating period duration to 60 seconds.");
        })

        it("voting does not exist", async function() {
            await expect(voting.finishProposal(100)).to.be.revertedWith("such voting does not exist");
        })

        it("runnning right now", async function() {
            await expect(voting.finishProposal(0)).to.be.revertedWith("proposal is runnning right now");
        })

        it("already ended", async function() {
            const fiveDays = 5 * 24 * 60 * 60;
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;
            await ethers.provider.send('evm_mine', [timestampBefore + fiveDays]);
            await voting.finishProposal(0);
            await expect(voting.finishProposal(0)).to.be.revertedWith("already ended");
        })

        it("success", async function() {
            const accounts = await ethers.getSigners();
            await token.connect(signer).mint(accounts[2].address, 100);
            await token.connect(accounts[2]).approve(voting.address, 100);
            await voting.connect(accounts[2]).deposit(100);
            await voting.connect(accounts[2]).vote(0, true);
            expect(await voting.connect(accounts[2]).getFrozenBalance()).to.eq(100);

            await token.connect(signer).mint(accounts[3].address, 100);
            await token.connect(accounts[3]).approve(voting.address, 100);
            await voting.connect(accounts[3]).deposit(100);
            await voting.connect(accounts[3]).vote(0, true);

            const fiveDays = 5 * 24 * 60 * 60;
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;
            await ethers.provider.send('evm_mine', [timestampBefore + fiveDays]);
            const tx = await voting.finishProposal(0);
            await expect(tx).to.emit(voting, 'VotingEnded').withArgs(0, true);
        })

        it("second success", async function() {
            const accounts = await ethers.getSigners();

            const jsonAbi = [    {
                "inputs": [
                  {
                    "internalType": "uint256",
                    "name": "newMinimumQuorum",
                    "type": "uint256"
                  }
                ],
                "name": "ERROR",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }];
            const iface = new ethers.utils.Interface(jsonAbi);
            const calldata = iface.encodeFunctionData('ERROR', [1]);
            const recipient = voting.address;
            await voting.connect(signer).addProposal(calldata, recipient, "Set minimum quorum to 1.");

            await token.connect(signer).mint(accounts[2].address, 100);
            await token.connect(accounts[2]).approve(voting.address, 100);
            await voting.connect(accounts[2]).deposit(100);
            await voting.connect(accounts[2]).vote(0, true);
            await voting.connect(accounts[2]).vote(1, true);

            const fiveDays = 5 * 24 * 60 * 60;
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;
            await ethers.provider.send('evm_mine', [timestampBefore + fiveDays]);

            await voting.connect(accounts[2]).finishProposal(0);
            expect(await voting.getFrozenBalance()).to.eq(0);
            await expect(voting.connect(accounts[2]).finishProposal(1)).to.be.revertedWith("ERROR call function");
        })

        it("setMinimumQuorum", async function() {
            const accounts = await ethers.getSigners();

            const jsonAbi = [    {
                "inputs": [
                  {
                    "internalType": "uint256",
                    "name": "newMinimumQuorum",
                    "type": "uint256"
                  }
                ],
                "name": "setMinimumQuorum",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }];
            const iface = new ethers.utils.Interface(jsonAbi);
            const calldata = iface.encodeFunctionData('setMinimumQuorum', [1]);
            const recipient = voting.address;
            await voting.connect(signer).addProposal(calldata, recipient, "Set minimum quorum to 1.");

            await token.connect(signer).mint(accounts[2].address, 100);
            await token.connect(accounts[2]).approve(voting.address, 100);
            await voting.connect(accounts[2]).deposit(100);
            await voting.connect(accounts[2]).vote(1, true);

            await token.connect(signer).mint(accounts[3].address, 100);
            await token.connect(accounts[3]).approve(voting.address, 100);
            await voting.connect(accounts[3]).deposit(100);
            await voting.connect(accounts[3]).vote(1, true);

            const fiveDays = 5 * 24 * 60 * 60;
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;
            await ethers.provider.send('evm_mine', [timestampBefore + fiveDays]);

            await voting.connect(accounts[2]).finishProposal(1);
        })
    })

    async function addProposal(_voting: DAOVoting) {
        const jsonAbi = [    {
            "inputs": [
              {
                "internalType": "uint256",
                "name": "newDebatingPeriodDuration",
                "type": "uint256"
              }
            ],
            "name": "setDebatingPeriodDuration",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }];
        const iface = new ethers.utils.Interface(jsonAbi);
        const calldata = iface.encodeFunctionData('setDebatingPeriodDuration', [5]);
        const recipient = _voting.address;
        await _voting.connect(signer).addProposal(calldata, recipient, "Set debating period duration to 5 seconds.");
    }

    it("withdraw all", async function() {
        const accounts = await ethers.getSigners();
        await token.connect(signer).mint(accounts[2].address, 100);
        await token.connect(accounts[2]).approve(voting.address, 100);
        const old = await token.balanceOf(accounts[2].address);
        await voting.connect(accounts[2]).deposit(100);


        await addProposal(voting);

        await voting.connect(accounts[2]).vote(0, true);
        await voting.connect(accounts[2]).withdraw();
        expect(await token.balanceOf(accounts[2].address)).to.eq(0);

        await ethers.provider.send('evm_mine', [(await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp + (await voting.debatingPeriodDuration()).toNumber()]);

        await voting.finishProposal(0);

        await voting.connect(accounts[2]).withdraw();
        expect(await token.balanceOf(accounts[2].address)).to.eq(old);
    })

    it("withdraw when one stake end and another dont", async function() {
        const accounts = await ethers.getSigners();
        await token.connect(signer).mint(accounts[2].address, 100);
        await token.connect(accounts[2]).approve(voting.address, 100);
        await voting.connect(accounts[2]).deposit(50);
        await token.connect(signer).mint(accounts[3].address, 100);
        await token.connect(accounts[3]).approve(voting.address, 100);
        await voting.connect(accounts[3]).deposit(50);

        await addProposal(voting);
        await voting.connect(accounts[2]).vote(0, true);
        await voting.connect(accounts[3]).vote(0, true);
        await ethers.provider.send('evm_mine', [(await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp + (await voting.debatingPeriodDuration()).toNumber()]);
        await voting.finishProposal(0);

        await addProposal(voting);
        await voting.connect(accounts[2]).deposit(50);
        await voting.connect(accounts[2]).vote(1, true);
        await ethers.provider.send('evm_mine', [(await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp + (await voting.debatingPeriodDuration()).toNumber()]);
        await voting.connect(accounts[2]).withdraw();
        expect(await token.balanceOf(accounts[2].address)).to.eq(50);
    })

    it("withdraw only unused", async function() {
        const accounts = await ethers.getSigners();
        await token.connect(signer).mint(accounts[2].address, 100);
        await token.connect(accounts[2]).approve(voting.address, 100);
        await voting.connect(accounts[2]).deposit(50);

        await addProposal(voting);

        await voting.connect(accounts[2]).vote(0, true);
        await voting.connect(accounts[2]).deposit(50);

        await ethers.provider.send('evm_mine', [(await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp + (await staking.timeFreezing()).toNumber()]);

        await voting.connect(accounts[2]).withdraw();
        expect(await token.balanceOf(accounts[2].address)).to.eq(50);
    })

    it("withdraw when stake does not end", async function() {
        const accounts = await ethers.getSigners();
        const votingFactory = new DAOVoting__factory(accounts[0]);
        const votingTmp = await votingFactory.deploy(await signer.getAddress(), token.address, staking.address, 2, 5);

        await token.connect(signer).mint(accounts[2].address, 100);
        await token.connect(accounts[2]).approve(votingTmp.address, 100);
        await votingTmp.connect(accounts[2]).deposit(100);

        await addProposal(votingTmp);

        await votingTmp.connect(accounts[2]).vote(0, true);
        await ethers.provider.send('evm_mine', [(await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp + (await votingTmp.debatingPeriodDuration()).toNumber()]);
        
        await votingTmp.finishProposal(0);

        await votingTmp.connect(accounts[2]).withdraw();
        expect(await token.balanceOf(accounts[2].address)).to.eq(0);
    })
});