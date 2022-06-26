import {task} from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import {getVoting, getFunction, getSigner, catchEvent} from "../init";

task("addProposal", "Add new proposal")
    .addParam("title", "Title of function")
    .addParam("address", "Address of contract")
    .addParam("value", "Value which used in function")
    .addParam("description", "Description")
    .setAction(async(taskArgs, hre) => {
        const signer = await getSigner(hre);
        const voting = await getVoting(hre);
        const jsonAbi = [await getFunction(hre, taskArgs.title)];
        const iface = new hre.ethers.utils.Interface(jsonAbi);
        const calldata = iface.encodeFunctionData(taskArgs.title, [taskArgs.value]);

        const tx = await voting.connect(signer).addProposal(calldata, taskArgs.address, taskArgs.description);

        const txWait = await (tx).wait();

        await catchEvent(txWait, ["Voting ID", "Description"]);
    })