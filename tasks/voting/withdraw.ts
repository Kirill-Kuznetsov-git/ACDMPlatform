import {task} from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import {getVoting, getSigner, catchEvent} from "../init";


task("withdraw", "Withdraw all tokens")
    .setAction(async(taskArgs, hre) => {
        const voting = await getVoting(hre);
        await voting.withdraw();
    })