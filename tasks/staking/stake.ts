import {task} from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import {getStaking, getSigner, catchEvent} from "../init";


task("buyTrade", "Buy trade")
    .addParam("seller", "Address of seller")
    .addParam("amount", "Number of wei token")
    .addParam("token", "Name of token: XXX or ETH")
    .setAction(async(taskArgs, hre) => {
        const staking = await getStaking(hre);
        if (taskArgs.token == "XXX") {
            await staking.stake(taskArgs.amount);
        } else {
            await staking.stake({value: taskArgs.amount});
        }
    })