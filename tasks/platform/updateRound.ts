import {task} from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import {getPlatform, getSigner, catchEvent} from "../init";


task("updateRound", "Update Round")
    .setAction(async(taskArgs, hre) => {
        const platform = await getPlatform(hre);
        await platform.updateRound();
    })