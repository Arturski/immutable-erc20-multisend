import { ethers, run } from "hardhat";
import "@nomiclabs/hardhat-ethers";

async function main() {
  // Fetch the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Get the contract factory for MultiSend and deploy
  const MultiSend = await ethers.getContractFactory("MultiSend");
  const multiSend = await MultiSend.deploy();

  await multiSend.deployed();
  console.log("MultiSend deployed to:", multiSend.address);

  // Constructor arguments (none for this contract)
  const constructorArguments: any[] = []; // No constructor arguments for MultiSend

  // Verify the contract on Etherscan
  try {
    console.log("Verifying contract...");
    await run("verify:verify", {
      address: multiSend.address,
      constructorArguments: constructorArguments,
    });
    console.log("Contract verified successfully.");
  } catch (error) {
    console.error("Verification failed:", error);
  }
}

main().catch((error) => {
  console.error("Error during deployment:", error);
  process.exitCode = 1;
});
