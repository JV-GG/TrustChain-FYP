import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";
dotenv.config();

let rawPrivateKey = (process.env.PRIVATE_KEY || "").trim();
if (rawPrivateKey && !rawPrivateKey.startsWith("0x")) {
  rawPrivateKey = `0x${rawPrivateKey}`;
}
const isValidPrivateKey = /^0x[a-fA-F0-9]{64}$/.test(rawPrivateKey);

// Default dummy 32-byte key for compilation/testing when placeholder is present in .env
const PRIVATE_KEY = isValidPrivateKey
  ? rawPrivateKey
  : "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/your_alchemy_key_here";

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
};
