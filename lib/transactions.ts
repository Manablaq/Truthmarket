import type { Address } from "viem";
import type { Eip1193Provider } from "./wallet.ts";
import { ensureBradbury, verifyWriteIdentity } from "./wallet.ts";
import { BRADBURY_CHAIN_ID, TRUTHMARKET_CONTRACT_ADDRESS } from "./config.ts";
import { writeTruthMarket } from "./genlayer.ts";
import { actionForMethod, HASH_RE, persistActivity, safeError, type Activity, type ActivityStorage, type SafeError, type SafeErrorStage, type WriteMethod } from "./activity.ts";

export type { Activity, ActivityPhase, ActivityStatusName, ActivityResultName, ActivityExecutionResult, SafeError, WriteMethod } from "./activity.ts";
export { applySupplementaryRead, monitorActivity } from "./activity.ts";
export const SUBMISSION_STAGES=["PREPARATION","CLIENT_INITIALIZATION","NETWORK_VERIFICATION","WALLET_SUBMISSION","HASH_VALIDATION"] as const;
export type SubmissionStage=typeof SUBMISSION_STAGES[number];
export type SubmissionResult={transactionHash:`0x${string}`;activity:Activity;storageWarning:SafeError|null};
const FAILURE_BRAND=Symbol("TruthMarketSafeFailure");
export class AppFailure extends Error{readonly [FAILURE_BRAND]=true;readonly safe:SafeError;constructor(safe:SafeError){super(safe.message);this.name="AppFailure";this.safe=safe}}
let submitting=false;
export function resetSubmissionLockForTests(){submitting=false}
function isAppFailure(error:unknown):error is AppFailure{try{return error instanceof AppFailure&&error[FAILURE_BRAND]===true}catch{return false}}
export function normalizeFailure(error:unknown,stage:SafeErrorStage){return isAppFailure(error)?error:new AppFailure(safeError(error,stage))}
export function failureDetails(error:unknown,fallback:SafeErrorStage="PREPARATION"){return normalizeFailure(error,fallback).safe}

export async function submitTransaction(options:{account:string;provider:Eip1193Provider;action:string;method:WriteMethod;args?:unknown[];value?:bigint;marketId?:string;storage?:ActivityStorage;onStage?:(stage:SubmissionStage)=>void;write?:typeof writeTruthMarket}):Promise<SubmissionResult>{
 if(submitting)throw new AppFailure({stage:"PREPARATION",message:"A transaction submission is already in progress"});
 submitting=true;let stage:SubmissionStage="PREPARATION";
 try{
  options.onStage?.(stage);if(!options.account||!options.provider)throw new Error("Connect a wallet first");
  stage="CLIENT_INITIALIZATION";options.onStage?.(stage);const write=options.write??writeTruthMarket;
  stage="NETWORK_VERIFICATION";options.onStage?.(stage);await ensureBradbury(options.provider);await verifyWriteIdentity(options.provider,options.account);
  stage="WALLET_SUBMISSION";options.onStage?.(stage);const raw=await write({account:options.account as Address,provider:options.provider,functionName:options.method,args:options.args,value:options.value});
  stage="HASH_VALIDATION";options.onStage?.(stage);if(typeof raw!=="string"||!HASH_RE.test(raw))throw new Error("Wallet/SDK did not return a valid transaction hash");
  const now=new Date().toISOString();const activity:Activity={action:actionForMethod(options.method),contractMethod:options.method,marketId:options.marketId,submittedAt:now,updatedAt:now,revision:0,transactionHash:raw as `0x${string}`,currentPhase:"submitted",terminal:false,pollingState:"IDLE",pollingStoppedAt:null,statusName:null,resultName:null,executionResult:null,safeError:null,supplementaryStateRead:null,chainId:BRADBURY_CHAIN_ID,contractAddress:TRUTHMARKET_CONTRACT_ADDRESS,walletAddress:options.account};
  if(!options.storage)return{transactionHash:activity.transactionHash,activity,storageWarning:null};
  const persisted=await persistActivity(options.storage,activity);return{transactionHash:activity.transactionHash,activity:persisted.activity,storageWarning:persisted.warning};
 }catch(error){throw normalizeFailure(error,stage)}finally{submitting=false}
}
