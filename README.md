## Disclaimer

This project is provided for **testing and educational purposes only**. The `MultiSend` contract and associated scripts have **not been audited** and should not be used in production or any environment handling real funds without a thorough security review and proper auditing. Use this code at your own risk. The developers are not liable for any issues or losses that may arise from the use of this project.


# MultiSend ERC20 Distribution Project

This project is designed to deploy and test an ERC20 `MultiSend` smart contract, which allows batch transfers of ERC20 tokens to multiple addresses. The project includes scripts to generate wallets, create distribution lists, and perform batch transactions using the deployed contract.

## Features

- Deploy an ERC20 `MultiSend` smart contract.
- Generate multiple Ethereum wallets with private keys.
- Create a distribution list of addresses with token amounts in CSV format.
- Batch send ERC20 tokens to multiple recipients.
- Track gas usage and transaction results in logs.

## Prerequisites

Before running the project, make sure to install the required dependencies:

```
yarn install
``` 

Ensure that you have the following environment variables set up in a `.env` file:

```
# used for contract verification - sign up for an account at https://explorer.testnet.immutable.com and get an API key
BLOCKSCOUT_API_KEY_TESTNET=

# private key for the deployer account
PRIVATE_KEY=

# operator allowlist contract address on testnet
OPERATOR_ALLOWLIST=0x02Ada708Db37470F6707075Cbdc7bD295d30B25E
```

## Smart Contract: MultiSend

The `MultiSend.sol` contract allows an external caller to transfer ERC20 tokens to multiple recipients in a single transaction.

### Contract Code

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MultiSend {
    function multiSendToken(
        IERC20 token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external {
        require(recipients.length == amounts.length, "Mismatched arrays");

        for (uint256 i = 0; i < recipients.length; i++) {
            require(token.transferFrom(msg.sender, recipients[i], amounts[i]), "Transfer failed");
        }
    }
}
```

## Deployment

To deploy the contract to the Immutable zkEVM Testnet, run the following command:

```
npx hardhat run scripts/deploy.ts --network immutableZkevmTestnet
```

## Testing and Scripts

### Generating Wallets

You can generate a specified number of wallets using the `generateWallets.ts` script. The generated wallets will be stored in a JSON file.

Set the number of wallets in the script and run:

```
ts-node test/generateWallets.ts
```

### Creating a Distribution List

This script generates a CSV file with a list of addresses and random amounts of tokens to distribute. The wallets used are those generated from the previous step.

Run the following command to create the CSV distribution list:

```
ts-node test/generateDistributionList.ts
```

### Performing Batch Transfers

The `distribute.ts` script reads the distribution list from the CSV file and sends tokens to the specified recipients in batches. It also logs each transaction, including gas usage and results.

To run the distribution script, use:

```
ts-node test/distribute.ts
```

## Logs and Output

### Transfer Log

The transfer log is stored in `distribution_log.csv` and includes the following details for each transaction:

- Recipient address
- Amount transferred
- Estimated gas
- Actual gas used
- Transaction hash

### Batch Log

The batch log is stored in `batch_log.csv` and includes details for each batch of transactions:

- Batch number
- Batch size (number of recipients in the batch)
- Estimated gas for the batch
- Actual gas used
- Status of the batch (Success or Error)


## Conclusion

This project allows you to easily deploy and test ERC20 batch transfers using the `MultiSend` contract. You can modify the parameters and scripts as needed for your specific use case.
