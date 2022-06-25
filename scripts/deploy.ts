import { ethers } from "hardhat";

async function main() {
  const accounts = await ethers.getSigners();

  const XXXTokenFactory = await ethers.getContractFactory("XXXToken");
  const tokenXXX = await XXXTokenFactory.deploy();
  await tokenXXX.deployed();
  console.log("tokenXXX deployed to:", tokenXXX.address);

  const ACDMTokenFactory = await ethers.getContractFactory("ACDMToken");
  const tokenACDM = await ACDMTokenFactory.deploy();
  await tokenACDM.deployed();
  console.log("tokenACDM deployed to:", tokenACDM.address);

  const stakingFactory = await ethers.getContractFactory("Staking");
  const staking = await stakingFactory.deploy(tokenXXX.address, tokenXXX.address);
  await staking.deployed();
  console.log("Staking deployed to:", staking.address);

  const votingFactory = await ethers.getContractFactory("DAOVoting");
  const voting = await votingFactory.deploy(await accounts[0].getAddress(), tokenXXX.address, staking.address, 1, 3 * 24 * 60 * 60);
  await voting.deployed();
  console.log("DAOVoting deployed to:", voting.address);

  const platformFactory = await ethers.getContractFactory("ACDMPlatform");
  const platform = await platformFactory.deploy(tokenACDM.address, tokenXXX.address, process.env.UNISWAP_ROUTER_ADDRESS as string, process.env.WETH_ADDRESS as string);
  await platform.deployed();
  console.log("ACDMPlatform deployed to:", platform.address);
  await platform.setDAO(voting.address);
  await staking.setDAO(voting.address);
  await tokenACDM.giveAdminRole(platform.address);
  await tokenXXX.giveAdminRole(platform.address);
  await platform.startPatform();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
