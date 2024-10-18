import { HardhatRuntimeEnvironment } from "hardhat/types"; // Only needed if you explicitly want to type HRE
import { BigNumber } from "ethers";
import fs from "fs";
import path from "path";
import csvParser from "csv-parser";

const hre = require("hardhat"); // Import Hardhat Runtime Environment (HRE) for ethers

// Constants
const INPUT_CSV_PATH = path.join(__dirname, "wallets_to_transfer.csv");
const TRANSFER_LOG_PATH = path.join(__dirname, "distribution_log.csv");
const BATCH_LOG_PATH = path.join(__dirname, "batch_log.csv");
const ERC20_ADDRESS = "0x1303F139FEac224ff877e6071C782A41C30F3255";
const MULTI_SEND_ADDRESS = "0xA23bF6504798E092123618baeaceB869149DDA85";
let BATCH_SIZE = 1500;

// Load recipients and amounts from the input CSV file
async function loadTransfersFromCSV(): Promise<{ address: string; amount: string }[]> {
  return new Promise((resolve, reject) => {
    const transfers: { address: string; amount: string }[] = [];

    fs.createReadStream(INPUT_CSV_PATH)
      .pipe(csvParser())
      .on("data", (row) => {
        if (row.address && row.amount) {
          transfers.push({ address: row.address, amount: row.amount });
        }
      })
      .on("end", () => {
        console.log("CSV file successfully processed.");
        resolve(transfers);
      })
      .on("error", (error) => {
        console.error("Error reading CSV file:", error);
        reject(error);
      });
  });
}

// Function to estimate gas for multi-send transactions
async function estimateGasForMultiSend(multiSend: any, tokenAddress: string, recipients: string[], amounts: string[]) {
  try {
    console.log(`Estimating gas for sending tokens to ${recipients.length} recipients...`);
    const gasEstimate = await multiSend.estimateGas.multiSendToken(tokenAddress, recipients, amounts);
    return gasEstimate;
  } catch (error: any) {
    console.error("Error estimating gas for multi-send:", error.message);
    throw error;
  }
}

// Main function to execute batch transfers
async function main() {
  const provider = new hre.ethers.providers.JsonRpcProvider("https://rpc.testnet.immutable.com");
  const senderPrivateKey = process.env.PRIVATE_KEY!;
  const senderWallet = new hre.ethers.Wallet(senderPrivateKey, provider);

  // Load the MultiSender contract
  const multiSend = await hre.ethers.getContractAt("MultiSend", MULTI_SEND_ADDRESS, senderWallet);

  // Load recipients and amounts from the CSV file
  const transfers = await loadTransfersFromCSV();
  const tokenDecimals = 18;

  // Create log streams for both transfer and batch logs
  const transferLogStream = fs.createWriteStream(TRANSFER_LOG_PATH, { flags: "a" });
  transferLogStream.write(`Recipient,Amount,Estimated Gas,Actual Gas Used,Transaction Hash\n`);
  
  const batchLogStream = fs.createWriteStream(BATCH_LOG_PATH, { flags: "a" });
  batchLogStream.write(`Batch Number,Batch Size,Estimated Gas,Actual Gas,Error\n`);

  let batchCount = 0;

  // Process transfers in batches
  for (let i = 0; i < transfers.length; ) {
    batchCount++;
    const batch = transfers.slice(i, i + BATCH_SIZE);

    const recipients = batch.map((t) => t.address);
    const amounts = batch.map((t) => hre.ethers.utils.parseUnits(t.amount, tokenDecimals).toString());

    // Estimate gas for the transaction
    let estimatedGas: BigNumber;
    let actualGas: BigNumber | null = null;

    try {
      estimatedGas = await estimateGasForMultiSend(multiSend, ERC20_ADDRESS, recipients, amounts);
      console.log(`Estimated Gas for batch of ${recipients.length}: ${estimatedGas.toString()}`);
    } catch (error: any) {
      console.error("Gas estimation failed:", error.message);
      batchLogStream.write(`Batch ${batchCount},${batch.length},N/A,N/A,Gas estimation failed: ${error.message}\n`);
      break;
    }

    // Perform the batch transfer using the multi-send contract
    try {
      const tx = await multiSend.multiSendToken(ERC20_ADDRESS, recipients, amounts, {
        gasLimit: estimatedGas,
        maxPriorityFeePerGas: hre.ethers.utils.parseUnits("15", "gwei"), // Adjust priority fee
        maxFeePerGas: hre.ethers.utils.parseUnits("50", "gwei"), // Adjust max fee
      });

      const receipt = await tx.wait();
      actualGas = receipt.gasUsed;

      // Log each recipient's details
      batch.forEach((transfer) => {
        transferLogStream.write(
          `${transfer.address},${transfer.amount},${estimatedGas.toString()},${actualGas?.toString() ?? "N/A"},${tx.hash}\n`
        );
      });

      // Log batch details
      batchLogStream.write(`${batchCount},${batch.length},${estimatedGas.toString()},${actualGas?.toString() ?? "N/A"},Success\n`);

      // Move to the next batch
      i += BATCH_SIZE;
    } catch (error: any) {
      // Log error and adjust batch size
      console.error(`Error during batch transfer for batch starting at index ${i}:`, error.message);
      batchLogStream.write(`Batch ${batchCount},${batch.length},${estimatedGas.toString()},N/A,Transaction failed: ${error.message}\n`);

      // Reduce the batch size by half and retry the current batch
      BATCH_SIZE = Math.floor(BATCH_SIZE / 2);
      console.log(`Reducing batch size to ${BATCH_SIZE} and retrying...`);

      if (BATCH_SIZE < 10) {
        console.error("Batch size too small to continue. Stopping.");
        break;
      }
    }
  }

  transferLogStream.end();
  batchLogStream.end();
  console.log("Batch transfer process completed.");
}

main().catch((error: any) => {
  console.error("Error:", error.message);
  process.exitCode = 1;
});
