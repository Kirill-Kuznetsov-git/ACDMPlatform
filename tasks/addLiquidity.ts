// import {task} from "hardhat/config";
// import "@nomiclabs/hardhat-waffle";
// import {getXXXToken, getSigner, catchEvent} from "./init";
// import { IUniswapV2Router02__factory } from "../typechain/factories/IUniswapV2Router02__factory";
// import IUniswapV2Router02 from "../abi/router2.json";

// task("addLiquidity", "Add Liquidity to Uniswap")
//     .setAction(async(taskArgs, hre) => {
//         const token = await getXXXToken(hre);
//         console.log(await token.allowance((await getSigner(hre)).address, process.env.UNISWAP_ROUTER_ADDRESS));
//         await token
//         .connect(await getSigner(hre))
//         .approve(process.env.UNISWAP_ROUTER_ADDRESS, '1000000000000000');
//         const Factory = await hre.ethers.getContractFactory("IUniswapV2Router02", await getSigner(hre));
//         const router02 = new hre.ethers.Contract(
//             process.env.UNISWAP_ROUTER_ADDRESS as string,
//             Factory.interface,
//             await getSigner(hre)
//         );

//         await router02
//         .connect(await getSigner(hre))
//         .addLiquidityETH(
//             process.env.TOKEN_XXX_ADDRESS as string,
//           100000000000000,
//           100000000000000,
//           1000000000,
//           (await getSigner(hre)).address,
//           new Date().getTime() + 60,
//           { value: hre.ethers.utils.parseUnits("1000000000".toString(), 13) }
//         );
//     })