import {task} from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import {getVoting, catchEvent, getSigner} from "../init";

task("finishProposal", "Finish Voting")
    .addParam("id", "Voting ID")
    .setAction(async(taskArgs, hre) => {
        const voting = await getVoting(hre);
        const signer = await getSigner(hre);
        const tx = await voting.connect(signer).finishProposal(taskArgs.id);

        const txWait = await (tx).wait();

        await catchEvent(txWait, ["Voting ID", "Result"]);
    })