import {task} from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import {getPlatform, getSigner, catchEvent} from "../init";


task("buyToken", "Buy token during SELL round")
    .addParam("amount", "Amount of tokens")
    .setAction(async(taskArgs, hre) => {
        const platform = await getPlatform(hre);
        await platform.buyToken(taskArgs.amount, {value: taskArgs.amount * await platform.currectPrice()})
    })