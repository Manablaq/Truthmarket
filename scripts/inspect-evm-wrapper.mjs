import { decodeFunctionData, createPublicClient, formatEther, http } from "viem";
import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const DEFAULT_RPC_URL = "https://rpc-bradbury.genlayer.com";
const DEFAULT_CONTRACT = "0xa7105D2A409b769B62a456E1d57B1210B875cEA5";
const DEFAULT_DEPLOYER = "0x1f87Ae197af539253978d435aD45cCf28Fb95024";
const DEFAULT_DEADLINE = "2026-07-10T23:30:08Z";
const TX_HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/;

const addTransactionAbi = [
  {
    type: "function",
    name: "addTransaction",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_sender", type: "address" },
      { name: "_recipient", type: "address" },
      { name: "_numOfInitialValidators", type: "uint256" },
      { name: "_maxRotations", type: "uint256" },
      { name: "_txData", type: "bytes" },
      { name: "_validUntil", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "addTransaction",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_sender", type: "address" },
      { name: "_recipient", type: "address" },
      { name: "_numOfInitialValidators", type: "uint256" },
      { name: "_maxRotations", type: "uint256" },
      { name: "_txData", type: "bytes" },
    ],
    outputs: [],
  },
];

function parseArgs(argv) {
  const [txHash, ...rest] = argv;
  const options = {
    txHash,
    rpcUrl: DEFAULT_RPC_URL,
    contract: DEFAULT_CONTRACT,
    deployer: DEFAULT_DEPLOYER,
    deadline: DEFAULT_DEADLINE,
    marketId: "2",
  };

  for (let index = 0; index < rest.length; index += 2) {
    const key = rest[index];
    const value = rest[index + 1];
    if (value === undefined) {
      throw new Error(`Missing value for ${key}`);
    }
    if (key === "--rpc-url") options.rpcUrl = value;
    else if (key === "--contract") options.contract = value;
    else if (key === "--deployer") options.deployer = value;
    else if (key === "--deadline") options.deadline = value;
    else if (key === "--market-id") options.marketId = value;
    else throw new Error(`Unknown option: ${key}`);
  }

  if (!TX_HASH_PATTERN.test(options.txHash ?? "")) {
    throw new Error("Usage: npm run inspect:evm-wrapper -- <0x tx hash> [--market-id 2] [--deadline 2026-07-10T23:30:08Z]");
  }

  return options;
}

function stringify(value) {
  return JSON.stringify(
    value,
    (_key, currentValue) =>
      typeof currentValue === "bigint" ? currentValue.toString() : currentValue,
    2,
  );
}

function isoFromBlock(block) {
  return new Date(Number(block.timestamp) * 1000).toISOString();
}

function print(label, value) {
  console.log(`${label}:`);
  console.log(stringify(value));
}

function errorDetails(error) {
  if (!error || typeof error !== "object") {
    return { message: String(error) };
  }

  return {
    name: error.name ?? null,
    message: error.message ?? String(error),
    shortMessage: error.shortMessage ?? null,
    details: error.details ?? null,
    data: error.data ?? error.cause?.data ?? null,
  };
}

function hexToPrintableAscii(hex) {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  let output = "";
  for (let index = 0; index + 1 < cleanHex.length; index += 2) {
    const charCode = Number.parseInt(cleanHex.slice(index, index + 2), 16);
    if (charCode >= 32 && charCode <= 126) {
      output += String.fromCharCode(charCode);
    }
  }
  return output;
}

async function simulateOriginalTransaction(publicClient, transaction, block) {
  const call = {
    account: transaction.from,
    to: transaction.to,
    data: transaction.input,
    value: transaction.value,
    ...(block.blockNumber ? { blockNumber: block.blockNumber } : {}),
  };

  try {
    const result = await publicClient.call(call);
    return {
      label: block.label,
      blockNumber: block.blockNumber ?? "latest",
      includedOriginalValue: true,
      value: transaction.value,
      status: "success",
      data: result.data ?? "0x",
    };
  } catch (error) {
    return {
      label: block.label,
      blockNumber: block.blockNumber ?? "latest",
      includedOriginalValue: true,
      value: transaction.value,
      status: "error",
      error: errorDetails(error),
    };
  }
}

async function estimateOriginalTransactionGas(publicClient, transaction) {
  try {
    const gas = await publicClient.estimateGas({
      account: transaction.from,
      to: transaction.to,
      data: transaction.input,
      value: transaction.value,
    });
    return {
      block: "latest",
      includedOriginalValue: true,
      value: transaction.value,
      status: "success",
      gas,
    };
  } catch (error) {
    return {
      block: "latest",
      includedOriginalValue: true,
      value: transaction.value,
      status: "error",
      error: errorDetails(error),
    };
  }
}

const options = parseArgs(process.argv.slice(2));
const publicClient = createPublicClient({
  chain: testnetBradbury,
  transport: http(options.rpcUrl),
});
const genlayerClient = createClient({
  chain: testnetBradbury,
});

const [receipt, transaction, latestBlock, balance] = await Promise.all([
  publicClient.getTransactionReceipt({ hash: options.txHash }),
  publicClient.getTransaction({ hash: options.txHash }),
  publicClient.getBlock({ blockTag: "latest" }),
  publicClient.getBalance({ address: options.deployer }),
]);

const txBlock = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
const deadlineMs = Date.parse(options.deadline);
const latestMs = Number(latestBlock.timestamp) * 1000;
const txBlockMs = Number(txBlock.timestamp) * 1000;
const parentBlockNumber = receipt.blockNumber - 1n;

let decodedInput = null;
try {
  const decoded = decodeFunctionData({
    abi: addTransactionAbi,
    data: transaction.input,
  });
  decodedInput = {
    functionName: decoded.functionName,
    sender: decoded.args[0],
    recipient: decoded.args[1],
    numOfInitialValidators: decoded.args[2],
    maxRotations: decoded.args[3],
    txData: decoded.args[4],
    txDataPrintableAscii: hexToPrintableAscii(decoded.args[4]),
    validUntil: decoded.args[5] ?? null,
    validUntilIso: decoded.args[5]
      ? new Date(Number(decoded.args[5]) * 1000).toISOString()
      : null,
  };
} catch (error) {
  decodedInput = {
    unavailable: true,
    error: error instanceof Error ? error.message : String(error),
  };
}

let market = null;
try {
  market = await genlayerClient.readContract({
    address: options.contract,
    functionName: "get_market",
    args: [options.marketId],
    stateStatus: "accepted",
  });
} catch (error) {
  market = {
    unavailable: true,
    error: error instanceof Error ? error.message : String(error),
  };
}

print("receipt", {
  transactionHash: receipt.transactionHash,
  status: receipt.status,
  blockNumber: receipt.blockNumber,
  gasUsed: receipt.gasUsed,
  effectiveGasPrice: receipt.effectiveGasPrice,
  from: receipt.from,
  to: receipt.to,
  logs: receipt.logs.length,
});

print("transaction", {
  hash: transaction.hash,
  from: transaction.from,
  to: transaction.to,
  value: transaction.value,
  valueGEN: formatEther(transaction.value),
  gas: transaction.gas,
  gasPrice: transaction.gasPrice,
  nonce: transaction.nonce,
  inputSelector: transaction.input.slice(0, 10),
  input: transaction.input,
});

print("decodedAddTransaction", decodedInput);
print("originalValueSimulationConfig", {
  includedOriginalValue: true,
  value: transaction.value,
  valueGEN: formatEther(transaction.value),
  note: "eth_call and estimateGas use account/from, to, data, and value fetched from the original transaction.",
});
print("ethCallSimulations", [
  await simulateOriginalTransaction(publicClient, transaction, {
    label: "parent",
    blockNumber: parentBlockNumber,
  }),
  await simulateOriginalTransaction(publicClient, transaction, {
    label: "txBlock",
    blockNumber: receipt.blockNumber,
  }),
  await simulateOriginalTransaction(publicClient, transaction, {
    label: "latest",
  }),
]);
print("estimateGas", await estimateOriginalTransactionGas(publicClient, transaction));
print("deployerBalance", {
  address: options.deployer,
  wei: balance,
  gen: formatEther(balance),
});
print("blockTimes", {
  txBlockNumber: txBlock.number,
  txBlockTimestamp: txBlock.timestamp,
  txBlockIso: isoFromBlock(txBlock),
  latestBlockNumber: latestBlock.number,
  latestBlockTimestamp: latestBlock.timestamp,
  latestBlockIso: isoFromBlock(latestBlock),
  deadline: options.deadline,
  deadlinePassedAtTxBlock: txBlockMs > deadlineMs,
  deadlinePassedAtLatestBlock: latestMs > deadlineMs,
});
print("acceptedMarket", market);
