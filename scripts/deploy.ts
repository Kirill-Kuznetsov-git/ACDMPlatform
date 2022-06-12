import { ethers } from "hardhat";

async function main() {
  const Factory = await ethers.getContractFactory("ACDMPlatform");
  const platform = await Factory.deploy("Hello");

  await platform.deployed();

  console.log("ACDMPlatform deployed to:", platform.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
