import {task} from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import {getVoting, getSigner, catchEvent} from "../init";


task("getFrozenBalance", "Get frozen balance of user")
    .setAction(async(taskArgs, hre) => {
        const voting = await getVoting(hre);
        await voting.getFrozenBalance();
    })