import {task} from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import {getStaking, getSigner, catchEvent} from "../init";


task("getStakeAmount", "Get amount in stake")
    .addParam("id", "ID of stake")
    .setAction(async(taskArgs, hre) => {
        const staking = await getStaking(hre);
        await staking.getStakeAmount(taskArgs.id)
    })