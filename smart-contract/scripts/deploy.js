import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const TrustChain = await hre.ethers.getContractFactory("TrustChain");
  const trustChain = await TrustChain.deploy();

  await trustChain.waitForDeployment();

  const contractAddress = await trustChain.getAddress();
  console.log("TrustChain deployed to:", contractAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
