import {task} from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import {getStaking, getSigner} from "../init";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import {whiteList} from "../../whiteList.json";

task("stake", "Stake")
    .addParam("amount", "Number of wei token")
    .addParam("token", "Name of token: XXX or ETH")
    .setAction(async(taskArgs, hre) => {
        const staking = await getStaking(hre);
        const leafNodes = (whiteList).map((addr) => keccak256(addr));
        const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
        const proof = merkleTree.getHexProof(keccak256((await getSigner(hre)).address));
        if (taskArgs.token == "XXX") {
            await staking.stake(taskArgs.amount, proof);
        } else {
            await staking.stake(proof, {value: taskArgs.amount});
        }
    })