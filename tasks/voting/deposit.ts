import {task} from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import {getVoting, getSigner, catchEvent} from "../init";


task("deposit", "Deposit tokens to voting")
    .addParam("amount", "Amount of tokens")
    .setAction(async(taskArgs, hre) => {
        const voting = await getVoting(hre);
        await voting.deposit(taskArgs.amount);
    })