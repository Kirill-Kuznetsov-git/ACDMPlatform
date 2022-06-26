import {task} from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import {getStaking, getSigner, catchEvent} from "../init";


task("claim", "Get reawrd tokens")
    .setAction(async(taskArgs, hre) => {
        const staking = await getStaking(hre);
        await staking.claim();
    })