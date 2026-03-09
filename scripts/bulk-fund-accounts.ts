#!/usr/bin/env tsx
/**
 * bulk-fund-accounts.ts — One-shot script to fund all test accounts with
 * private CUSDC via the Chainlink Private Token API.
 *
 * Full flow:
 *   0. Mint public CUSDC to the funder, approve vault, deposit into vault
 *      (gives the funder enough private CUSDC balance)
 *   1. Funder sends 25,000 private CUSDC → each test account (privateTransfer)
 *   2. Each test account sends 25,000 private CUSDC → platform EOA
 *      This creates a "deposit" that the user-balance-recording-fallback
 *      CRE workflow will pick up and record in Supabase.
 *
 * After running, wait ~60s for the CRE workflow to reconcile, then all test
 * accounts will have 25,000 USDC available balance in the app.
 *
 * Usage:
 *   cd scripts && npx tsx --env-file=.env bulk-fund-accounts.ts
 *
 * Required env vars:
 *   OWNER_PK or FUNDER_PK — private key of the owner (can mint) / funder
 *   RPC_URL               — Ethereum Sepolia RPC
 *   TEST_ACCOUNT_1..25    — private keys of test accounts
 */

import { privateKeyToAccount } from "viem/accounts";
import {
  createPublicClient,
  createWalletClient,
  http,
  formatUnits,
  parseAbi,
  type Hex,
  type Address,
} from "viem";
import { sepolia } from "viem/chains";
import {
  PRIVATE_CONFIDENTIAL_USDC_ADDRESS,
  VAULT_ADDRESS,
} from "@private-streams/common";
import { PrivateTokenApiClient } from "@private-streams/chainlink-private-token-api-client";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PLATFORM_EOA = "0x6B789D957B87c12F30b48E9bFc58678c2f76f1c5" as Address;
const FUND_AMOUNT = 25_000_000_000n; // 25,000 USDC (6 decimals)
const CONCURRENCY = 3; // parallel transfers (be gentle on the API)

const CUSDC_ABI = parseAbi([
  "function mint(address to, uint256 amount) external",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
]);

const VAULT_ABI = parseAbi([
  "function deposit(address token, uint256 amount) external",
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizePrivateKey(value: string): Hex {
  const normalized = value.startsWith("0x") ? value : `0x${value}`;
  if (!/^0x[a-fA-F0-9]{64}$/.test(normalized)) {
    throw new Error(`Invalid private key: ${value.slice(0, 10)}...`);
  }
  return normalized as Hex;
}

function getTestAccounts(): { pk: Hex; address: string }[] {
  const accounts: { pk: Hex; address: string }[] = [];
  for (let i = 1; i <= 25; i++) {
    const raw = process.env[`TEST_ACCOUNT_${i}`];
    if (raw) {
      try {
        const pk = normalizePrivateKey(raw);
        const address = privateKeyToAccount(pk).address;
        accounts.push({ pk, address });
      } catch {
        console.warn(`TEST_ACCOUNT_${i} is invalid, skipping`);
      }
    }
  }
  return accounts;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function mapConcurrent<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i]!, i);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const funderPk = normalizePrivateKey(process.env.OWNER_PK ?? process.env.FUNDER_PK ?? "");
  const rpcUrl = process.env.RPC_URL;
  if (!rpcUrl) {
    console.error("RPC_URL required");
    process.exit(1);
  }

  const accounts = getTestAccounts();
  if (accounts.length === 0) {
    console.error("No test accounts found (TEST_ACCOUNT_1..25)");
    process.exit(1);
  }

  const funderAccount = privateKeyToAccount(funderPk);
  const totalNeeded = FUND_AMOUNT * BigInt(accounts.length);

  const publicClient = createPublicClient({ chain: sepolia, transport: http(rpcUrl) });
  const walletClient = createWalletClient({
    account: funderAccount,
    chain: sepolia,
    transport: http(rpcUrl),
  });

  const funderClient = new PrivateTokenApiClient(funderPk);

  console.log(`Funder: ${funderAccount.address}`);
  console.log(`Platform EOA: ${PLATFORM_EOA}`);
  console.log(`Private CUSDC: ${PRIVATE_CONFIDENTIAL_USDC_ADDRESS}`);
  console.log(`Vault: ${VAULT_ADDRESS}`);
  console.log(`Amount per account: ${formatUnits(FUND_AMOUNT, 6)} USDC`);
  console.log(`Accounts: ${accounts.length}`);
  console.log(`Total needed: ${formatUnits(totalNeeded, 6)} USDC`);
  console.log();

  // ── Step 0: Ensure funder has enough private CUSDC ────────────────────────
  console.log("=== Step 0: Ensure funder has private CUSDC ===");

  const privateBalances = await funderClient.getBalances();
  const privateCusdcBalance = privateBalances.balances.find(
    (b) => b.token.toLowerCase() === PRIVATE_CONFIDENTIAL_USDC_ADDRESS.toLowerCase(),
  );
  const currentPrivateBalance = privateCusdcBalance ? BigInt(privateCusdcBalance.amount) : 0n;
  console.log(`Current private CUSDC balance: ${formatUnits(currentPrivateBalance, 6)} USDC`);

  if (currentPrivateBalance < totalNeeded) {
    const deficit = totalNeeded - currentPrivateBalance;
    // Add 10% buffer
    const mintAmount = deficit + deficit / 10n;
    console.log(`Need ${formatUnits(deficit, 6)} more USDC, minting ${formatUnits(mintAmount, 6)}...`);

    // Mint public CUSDC to funder
    console.log("  Minting public CUSDC...");
    const mintHash = await walletClient.writeContract({
      address: PRIVATE_CONFIDENTIAL_USDC_ADDRESS as Address,
      abi: CUSDC_ABI,
      functionName: "mint",
      args: [funderAccount.address, mintAmount],
    });
    await publicClient.waitForTransactionReceipt({ hash: mintHash });
    console.log(`  Minted — tx: ${mintHash}`);

    // Approve vault
    console.log("  Approving vault...");
    const approveHash = await walletClient.writeContract({
      address: PRIVATE_CONFIDENTIAL_USDC_ADDRESS as Address,
      abi: CUSDC_ABI,
      functionName: "approve",
      args: [VAULT_ADDRESS as Address, mintAmount],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
    console.log(`  Approved — tx: ${approveHash}`);

    // Deposit into vault
    console.log("  Depositing into vault...");
    const depositHash = await walletClient.writeContract({
      address: VAULT_ADDRESS as Address,
      abi: VAULT_ABI,
      functionName: "deposit",
      args: [PRIVATE_CONFIDENTIAL_USDC_ADDRESS as Address, mintAmount],
    });
    await publicClient.waitForTransactionReceipt({ hash: depositHash });
    console.log(`  Deposited — tx: ${depositHash}`);

    // Verify
    const newBalances = await funderClient.getBalances();
    const newBal = newBalances.balances.find(
      (b) => b.token.toLowerCase() === PRIVATE_CONFIDENTIAL_USDC_ADDRESS.toLowerCase(),
    );
    console.log(`  New private balance: ${formatUnits(newBal ? BigInt(newBal.amount) : 0n, 6)} USDC`);
  } else {
    console.log("Funder has sufficient private CUSDC, skipping mint/deposit");
  }
  console.log();

  // ── Step 1: Funder → each test account ────────────────────────────────────
  console.log("=== Step 1: Funder → Test Accounts ===");
  const step1Results = await mapConcurrent(accounts, CONCURRENCY, async (acct, i) => {
    const label = `[${i + 1}/${accounts.length}]`;
    try {
      const result = await funderClient.privateTransfer({
        recipient: acct.address,
        token: PRIVATE_CONFIDENTIAL_USDC_ADDRESS,
        amount: FUND_AMOUNT.toString(),
      });
      console.log(`${label} → ${acct.address} — tx: ${result.transaction_id}`);
      return { success: true, address: acct.address };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${label} → ${acct.address} — FAILED: ${msg}`);
      return { success: false, address: acct.address };
    }
  });

  const step1Failures = step1Results.filter((r) => !r.success);
  if (step1Failures.length > 0) {
    console.error(`\n${step1Failures.length} transfers failed in step 1. Aborting step 2.`);
    process.exit(1);
  }

  console.log("\nAll funder transfers complete. Waiting 5s for API to settle...\n");
  await sleep(5000);

  // ── Step 2: Each test account → platform EOA (creates deposit) ────────────
  console.log("=== Step 2: Test Accounts → Platform EOA (deposits) ===");
  const step2Results = await mapConcurrent(accounts, CONCURRENCY, async (acct, i) => {
    const label = `[${i + 1}/${accounts.length}]`;
    try {
      const client = new PrivateTokenApiClient(acct.pk);
      const result = await client.privateTransfer({
        recipient: PLATFORM_EOA,
        token: PRIVATE_CONFIDENTIAL_USDC_ADDRESS,
        amount: FUND_AMOUNT.toString(),
      });
      console.log(`${label} ${acct.address} → platform — tx: ${result.transaction_id}`);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${label} ${acct.address} → platform — FAILED: ${msg}`);
      return { success: false };
    }
  });

  const step2Failures = step2Results.filter((r) => !r.success);
  if (step2Failures.length > 0) {
    console.warn(`\n${step2Failures.length} deposit transfers failed in step 2.`);
  }

  console.log("\n=== Done ===");
  console.log("Deposits sent. The user-balance-recording-fallback CRE workflow");
  console.log("will pick them up within ~60s and record balances in Supabase.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
