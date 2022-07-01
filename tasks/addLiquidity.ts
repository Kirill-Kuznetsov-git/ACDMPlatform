import {task} from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import {getXXXToken, getSigner, catchEvent} from "./init";
import { XXXToken } from "../typechain";
import { BigNumber } from "ethers";

task("addLiquidity", "Add Liquidity to Uniswap")
    .setAction(async(taskArgs, hre) => {
        const token = await getXXXToken(hre);
        console.log("ASD")
        const factory = await hre.ethers.getContractAt(
            "IUniswapV2Factory", 
            process.env.UNISWAP_FACTORY_ADDRESS as string,
            await getSigner(hre)
        );
        const pair = await factory.getPair(process.env.TOKEN_XXX_ADDRESS as string, process.env.WETH_ADDRESS as string)
        await token.approve(pair, 1000)
        console.log("ASD")
        const router02 = await hre.ethers.getContractAt(
            "IUniswapV2Router02", 
            process.env.UNISWAP_ROUTER_ADDRESS as string,
            await getSigner(hre)
        );

        await router02
        .connect(await getSigner(hre))
        .addLiquidityETH(
            process.env.TOKEN_XXX_ADDRESS as string,
            hre.ethers.utils.parseEther('0.0000000001'),
            hre.ethers.utils.parseEther('0.0000000001'),
            1000,
          (await getSigner(hre)).address,
          new Date().getTime() + 60,
          { value: hre.ethers.utils.parseEther('0.0000000001') }
        );
    })