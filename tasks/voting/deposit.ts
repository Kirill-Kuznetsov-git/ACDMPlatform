import {task} from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import {whiteList} from "../../whiteList.json";
import {getVoting, getSigner, catchEvent} from "../init";


task("deposit", "Deposit tokens to voting")
    .addParam("amount", "Amount of tokens")
    .setAction(async(taskArgs, hre) => {
        const voting = await getVoting(hre);
        const leafNodes = (whiteList).map((addr) => keccak256(addr));
        const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
        const proof = merkleTree.getHexProof(keccak256(((await getVoting(hre)).address)));
        await voting.deposit(taskArgs.amount, proof);
    })