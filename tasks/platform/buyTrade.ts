import {task} from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import {getPlatform, getSigner, catchEvent} from "../init";


task("buyTrade", "Buy trade")
    .addParam("seller", "Address of seller")
    .addParam("amount", "Number of wei token")
    .setAction(async(taskArgs, hre) => {
        const platform = await getPlatform(hre);
        await platform.buyTrade(taskArgs.seller, taskArgs.amount, {value: taskArgs.amount * await platform.currectPrice()})
    })