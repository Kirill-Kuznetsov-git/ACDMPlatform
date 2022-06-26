import {task} from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import {getXXXToken, getSigner} from "./init";

task("checkAllowance", "Check allowance XXXToken")
    .setAction(async(taskArgs, hre) => {
        const token = await getXXXToken(hre);
        console.log(await token.allowance((await getSigner(hre)).address, process.env.UNISWAP_ROUTER_ADDRESS));
    })