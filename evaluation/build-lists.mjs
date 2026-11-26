// Builds the two evaluation address lists from real data (nothing hand-picked).
//   scam.txt   - systematic sample of the MyEtherWallet darklist (every Nth address, sorted)
//   benign.txt - unique senders of transactions in the latest Ethereum mainnet block,
//                excluding anything on the darklist
// Run from the repo root:  node --env-file=frontend/.env evaluation/build-lists.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const TARGET = 50;
const darklist = JSON.parse(readFileSync(new URL('../frontend/src/data/darklist.json', import.meta.url)));
const dark = [...new Set(darklist.map((e) => e.address.toLowerCase().trim()))].sort();
const darkSet = new Set(dark);

// 1. Scam list: systematic sample across the whole darklist
const step = Math.floor(dark.length / TARGET);
const scam = dark.filter((_, i) => i % step === 0).slice(0, TARGET);
writeFileSync(new URL('./scam.txt', import.meta.url),
  `# ${scam.length} addresses, systematic sample (every ${step}th) of the MyEtherWallet darklist (${dark.length} unique)\n` +
  scam.join('\n') + '\n');

// 2. Benign list: senders in the latest mainnet block
const key = process.env.VITE_ETHERSCAN_API_KEY;
if (!key) throw new Error('VITE_ETHERSCAN_API_KEY not set - run with --env-file=frontend/.env');
const url = `https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_getBlockByNumber&tag=latest&boolean=true&apikey=${key}`;
const res = await fetch(url).then((r) => r.json());
if (!res.result?.transactions) throw new Error('Etherscan error: ' + JSON.stringify(res).slice(0, 200));
const blockNo = parseInt(res.result.number, 16);
const senders = [...new Set(res.result.transactions.map((t) => t.from.toLowerCase()))]
  .filter((a) => !darkSet.has(a));
const benign = senders.slice(0, TARGET);
writeFileSync(new URL('./benign.txt', import.meta.url),
  `# ${benign.length} addresses: unique transaction senders in Ethereum mainnet block ${blockNo}, not on the darklist\n` +
  benign.join('\n') + '\n');

console.log(`scam.txt: ${scam.length} addresses | benign.txt: ${benign.length} addresses (block ${blockNo})`);
