// Evaluates the wallet risk engine on labelled mainnet addresses.
// Usage (from repo root): node --env-file=frontend/.env evaluation/evaluate.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { fetchWalletData, scoreFromTransactions } from '../frontend/src/services/riskEngine.js';
import { checkBlacklist } from '../frontend/src/services/blacklistChecker.js';

const DIR = new URL('.', import.meta.url);
const THRESHOLD = 51; // same cut-off campaignVerifier.js uses for UNVERIFIED
const SWEEP = [26, 41, 51, 61, 76];
// Each address makes 2 parallel Etherscan calls; free tier allows 3 per rolling second, so pairs must be >1s apart
const DELAY_MS = 1100;
const apiKey = process.env.VITE_ETHERSCAN_API_KEY || process.env.ETHERSCAN_API_KEY;
if (!apiKey) throw new Error('Set VITE_ETHERSCAN_API_KEY (e.g. node --env-file=frontend/.env ...)');

const readList = (name) =>
  readFileSync(new URL(name, DIR), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

// Report date per address. The darklist repeats some addresses, so the earliest report wins.
const darklist = JSON.parse(readFileSync(new URL('../frontend/src/data/darklist.json', import.meta.url)));
const reportDate = new Map();
for (const { address, date } of darklist) {
  const a = address.toLowerCase();
  if (date && !Number.isNaN(Date.parse(date)) && (!reportDate.has(a) || date < reportDate.get(a))) reportDate.set(a, date);
}
// "<= that date" is read as up to the end of that UTC day
const endOfDay = (date) => Math.floor(Date.parse(`${date}T23:59:59Z`) / 1000);

function metrics(rows, isPredScam) {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (const r of rows) {
    const p = isPredScam(r);
    if (r.label === 'scam') p ? tp++ : fn++;
    else p ? fp++ : tn++;
  }
  const div = (a, b) => (b ? a / b : NaN);
  return { n: rows.length, tp, fp, tn, fn, precision: div(tp, tp + fp), recall: div(tp, tp + fn), fpr: div(fp, fp + tn), accuracy: div(tp + tn, rows.length) };
}

// Self-checks: metric maths (2 TP, 1 FN, 1 FP, 1 TN) and point-in-time wallet age
{
  const m = metrics(
    [['scam', 1], ['scam', 1], ['scam', 0], ['benign', 1], ['benign', 0]].map(([label, p]) => ({ label, p })),
    (r) => r.p === 1,
  );
  assert.deepEqual([m.tp, m.fn, m.fp, m.tn, m.precision, m.recall, m.fpr, m.accuracy], [2, 1, 1, 1, 2 / 3, 2 / 3, 0.5, 0.6]);
  const t = endOfDay('2020-11-17');
  const s = scoreFromTransactions('0xa', [{ timeStamp: String(t - 10 * 86400), value: '0', from: '0xb', to: '0xa' }], false, t);
  assert.deepEqual([s.walletAge, s.txCount], [10, 1]);
}

const pct = (x) => (Number.isNaN(x) ? 'n/a' : `${(x * 100).toFixed(1)}%`);
function table(title, m) {
  console.log(`\n=== ${title} (n=${m.n}) ===`);
  console.log('                 Pred scam   Pred benign');
  console.log(`Actual scam      ${String(m.tp).padStart(9)}   ${String(m.fn).padStart(11)}`);
  console.log(`Actual benign    ${String(m.fp).padStart(9)}   ${String(m.tn).padStart(11)}`);
  console.log(`Precision ${pct(m.precision)} | Recall ${pct(m.recall)} | FPR ${pct(m.fpr)} | Accuracy ${pct(m.accuracy)}`);
}

const inputs = [...readList('scam.txt').map((a) => [a, 'scam']), ...readList('benign.txt').map((a) => [a, 'benign'])];
const now = Math.floor(Date.now() / 1000);
const rows = [];
for (const [i, [address, label]] of inputs.entries()) {
  if (i > 0) await new Promise((r) => setTimeout(r, DELAY_MS));
  const [{ transactions, dataError }, bl] = await Promise.all([fetchWalletData(address, apiKey, 'mainnet'), checkBlacklist(address)]);

  const on = scoreFromTransactions(address, transactions, bl.isBlacklisted, now, bl);
  const off = scoreFromTransactions(address, transactions, false, now);
  // Scams are scored as of their report date; benign wallets have no such date, so they use "now"
  const date = label === 'scam' ? reportDate.get(address.toLowerCase()) ?? null : null;
  let pit = label === 'benign' ? off : null;
  if (date) {
    const cutoff = endOfDay(date);
    pit = scoreFromTransactions(address, transactions.filter((tx) => Number(tx.timeStamp) <= cutoff), false, cutoff);
  }

  const row = {
    address, label, blacklisted: bl.isBlacklisted,
    score_on: on.score, score_off: off.score,
    point_in_time_score: pit ? pit.score : '', report_date: date ?? '',
    tx_count: on.txCount, wallet_age_days: on.walletAge,
    pit_tx_count: pit ? pit.txCount : '', pit_wallet_age_days: pit ? pit.walletAge : '',
    error: dataError || '',
  };
  row.pred_a = row.blacklisted || row.score_on >= THRESHOLD ? 'scam' : 'benign';
  row.pred_b = row.score_off >= THRESHOLD ? 'scam' : 'benign';
  row.pred_c = pit ? (pit.score >= THRESHOLD ? 'scam' : 'benign') : '';
  rows.push(row);
  console.log(`[${i + 1}/${inputs.length}] ${address} ${label} on=${row.score_on} off=${row.score_off} pit=${row.point_in_time_score === '' ? '-' : row.point_in_time_score}${row.error ? ` ERROR: ${row.error}` : ''}`);
}

const cols = Object.keys(rows[0] ?? { address: 0 });
const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => JSON.stringify(String(r[c]))).join(','))].join('\n');
writeFileSync(new URL('results.csv', DIR), csv + '\n');

// Rows where Etherscan failed would score as empty wallets, so they are kept in the CSV but left out of metrics
const ok = rows.filter((r) => !r.error);
const pitRows = ok.filter((r) => r.point_in_time_score !== '');
const undated = ok.filter((r) => r.label === 'scam' && !r.report_date).length;
console.log(`\n${ok.length}/${rows.length} addresses scored (${rows.length - ok.length} Etherscan errors excluded)`);
console.log(`${undated} scam address(es) have no darklist date and are skipped in table C`);

table('A. Blacklist ON, app decision rule (isBlacklisted OR score >= 51), current-time features', metrics(ok, (r) => r.pred_a === 'scam'));
table('B. Blacklist OFF, current-time features (score >= 51)', metrics(ok, (r) => r.pred_b === 'scam'));
table('C. Blacklist OFF, point-in-time features (score >= 51)', metrics(pitRows, (r) => r.pred_c === 'scam'));

console.log('\n=== Threshold sweep, table C ===');
console.log('Threshold   Precision   Recall      FPR');
for (const t of SWEEP) {
  const m = metrics(pitRows, (r) => r.point_in_time_score >= t);
  console.log(`${String(t).padStart(9)}   ${pct(m.precision).padStart(9)}   ${pct(m.recall).padStart(6)}   ${pct(m.fpr).padStart(6)}`);
}
console.log('\nSaved evaluation/results.csv');
