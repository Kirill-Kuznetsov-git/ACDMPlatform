import {task} from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import {getPlatform, getSigner, catchEvent} from "../init";


task("registration", "Buy token during SELL round")
    .addOptionalParam("ref1", "Address of first referral")
    .addOptionalParam("ref2", "Address of second referral")
    .setAction(async(taskArgs, hre) => {
        const platform = await getPlatform(hre);
        const zeroAddress = "0x0000000000000000000000000000000000000000"
        await platform.registration(taskArgs.ref1 == undefined ? zeroAddress : taskArgs.ref1, taskArgs.ref2 == undefined ? zeroAddress : taskArgs.ref2);
    })