import {task} from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import {getPlatform, getSigner, catchEvent, getXXXToken} from "../init";


task("setTrade", "Set new Trade")
    .addParam("number", "Number of wei tokens")
    .addParam("price", "Price of one wei token")
    .setAction(async(taskArgs, hre) => {
        const platform = await getPlatform(hre);
        const token = await getXXXToken(hre);
        await token.approve(platform.address, taskArgs.number);
        await platform.setTrade(taskArgs.number, taskArgs.price);
    })