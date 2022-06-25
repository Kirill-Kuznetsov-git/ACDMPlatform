import "@nomiclabs/hardhat-waffle";
import {HardhatRuntimeEnvironment} from "hardhat/types";


export async function getACDMToken(hre: HardhatRuntimeEnvironment) {
    let CONTRACT_ADDRESS: string
    if (`${process.env.NETWORK}` == 'LOCALHOST'){
        CONTRACT_ADDRESS = `${process.env.TOKEN_ACDM_ADDRESS_LOCALHOST}`;
    } else {
        CONTRACT_ADDRESS = `${process.env.TOKEN_ACDM_ADDRESS}`;
    }
    const signer = new hre.ethers.Wallet(process.env.PRIVATE_KEY as string, hre.ethers.provider);
    const Factory = await hre.ethers.getContractFactory("ACDMToken", signer);
    return new hre.ethers.Contract(
        CONTRACT_ADDRESS,
        Factory.interface,
        signer
    )
}


export async function getXXXToken(hre: HardhatRuntimeEnvironment) {
    let CONTRACT_ADDRESS: string
    if (`${process.env.NETWORK}` == 'LOCALHOST'){
        CONTRACT_ADDRESS = `${process.env.TOKEN_XXX_ADDRESS_LOCALHOST}`;
    } else {
        CONTRACT_ADDRESS = `${process.env.TOKEN_XXX_ADDRESS}`;
    }
    const signer = new hre.ethers.Wallet(process.env.PRIVATE_KEY as string, hre.ethers.provider);
    const Factory = await hre.ethers.getContractFactory("XXXToken", signer);
    return new hre.ethers.Contract(
        CONTRACT_ADDRESS,
        Factory.interface,
        signer
    )
}


export async function getStaking(hre: HardhatRuntimeEnvironment) {
    let CONTRACT_ADDRESS: string
    if (`${process.env.NETWORK}` == 'LOCALHOST'){
        CONTRACT_ADDRESS = `${process.env.STAKING_ADDRESS_LOCALHOST}`;
    } else {
        CONTRACT_ADDRESS = `${process.env.STAKING_ADDRESS}`;
    }
    const signer = new hre.ethers.Wallet(process.env.PRIVATE_KEY as string, hre.ethers.provider);
    const Factory = await hre.ethers.getContractFactory("Staking", signer);
    return new hre.ethers.Contract(
        CONTRACT_ADDRESS,
        Factory.interface,
        signer
    )
}


export async function getVoting(hre: HardhatRuntimeEnvironment) {
    let CONTRACT_ADDRESS: string
    if (`${process.env.NETWORK}` == 'LOCALHOST'){
        CONTRACT_ADDRESS = `${process.env.VOTING_ADDRESS_LOCALHOST}`;
    } else {
        CONTRACT_ADDRESS = `${process.env.VOTING_ADDRESS}`;
    }
    const signer = new hre.ethers.Wallet(process.env.PRIVATE_KEY as string, hre.ethers.provider);
    const Factory = await hre.ethers.getContractFactory("DAOVoting", signer);
    return new hre.ethers.Contract(
        CONTRACT_ADDRESS,
        Factory.interface,
        signer
    )
}


export async function getPlatform(hre: HardhatRuntimeEnvironment) {
    let CONTRACT_ADDRESS: string
    if (`${process.env.NETWORK}` == 'LOCALHOST'){
        CONTRACT_ADDRESS = `${process.env.PLATFORM_ADDRESS_LOCALHOST}`;
    } else {
        CONTRACT_ADDRESS = `${process.env.PLATFORM_ADDRESS}`;
    }
    const signer = new hre.ethers.Wallet(process.env.PRIVATE_KEY as string, hre.ethers.provider);
    const Factory = await hre.ethers.getContractFactory("ACDMPlatform", signer);
    return new hre.ethers.Contract(
        CONTRACT_ADDRESS,
        Factory.interface,
        signer
    )
}

export async function getFunction(hre: HardhatRuntimeEnvironment, title: string) {
    let CONTRACT_ADDRESS: string
    if (`${process.env.NETWORK}` == 'LOCALHOST'){
        CONTRACT_ADDRESS = `${process.env.CONTRACT_ADDRESS_LOCALHOST}`;
    } else {
        CONTRACT_ADDRESS = `${process.env.CONTRACT_ADDRESS_GOERLI}`;
    }
    const signer = new hre.ethers.Wallet(process.env.PRIVATE_KEY as string, hre.ethers.provider);
    const Factory = await hre.ethers.getContractFactory("DAOVoting", signer);
    return Factory.interface.functions[title];
}

export async function getSigner(hre: HardhatRuntimeEnvironment) {
    return new hre.ethers.Wallet(process.env.PRIVATE_KEY as string, hre.ethers.provider);
}

export async function catchEvent(txWait: any, args: string[]) {
    let n: number = 0;
    while (txWait.events[n].args == undefined) {
        n++;
    }
    for (let i = 0; i < args.length; i++){
        console.log(args[i] + ": " + txWait.events[n].args[i])
    }
}