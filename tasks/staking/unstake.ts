import {task} from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import {getStaking, getSigner, catchEvent} from "../init";


task("unstake", "Unstake stake with ID")
    .addParam("id", "ID of stake")
    .setAction(async(taskArgs, hre) => {
        const staking = await getStaking(hre);
        await staking.unstake(taskArgs.id)
    })