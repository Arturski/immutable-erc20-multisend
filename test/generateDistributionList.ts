import fs from "fs";
import path from "path";

// Use a simple declaration for json2csv
const { parse } = require("json2csv");

// Constants
const WALLETS_JSON_PATH = path.join(__dirname, "wallets.json"); // Path to wallets JSON file
const OUTPUT_CSV_PATH = path.join(__dirname, "wallets_to_transfer.csv"); // Path to output CSV

// Function to generate random amount between 0.001 and 0.1
function getRandomAmount(): string {
  const min = 0.001;
  const max = 0.1;
  return (Math.random() * (max - min) + min).toFixed(3);
}

// Load wallets from JSON file and generate CSV
async function generateCSV() {
  if (!fs.existsSync(WALLETS_JSON_PATH)) {
    throw new Error("Wallets JSON file not found!");
  }

  console.log("Loading wallets from file...");
  const wallets = JSON.parse(fs.readFileSync(WALLETS_JSON_PATH, "utf8"));

  // Prepare data for CSV
  const transfers = wallets.map((wallet: { address: string }) => ({
    address: wallet.address,
    amount: getRandomAmount(),
  }));

  // Convert to CSV
  const csvData = parse(transfers);

  // Write to output CSV file
  fs.writeFileSync(OUTPUT_CSV_PATH, csvData);
  console.log(`CSV file created at ${OUTPUT_CSV_PATH}`);
}

generateCSV().catch((error) => {
  console.error("Error:", error);
  process.exitCode = 1;
});
