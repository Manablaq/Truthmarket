const GEN_DECIMALS=18;
const GEN_SCALE=BigInt("1000000000000000000");
export function parseGen(value:string):bigint{const match=/^(0|[1-9][0-9]*)(?:\.([0-9]{1,18}))?$/.exec(value.trim());if(!match)throw new Error(`GEN amount must be a non-negative decimal with at most ${GEN_DECIMALS} decimal places`);return BigInt(match[1])*GEN_SCALE+BigInt((match[2]??"").padEnd(18,"0")||"0")}
export function formatGenWei(value:string|bigint):string{const wei=typeof value==="bigint"?value:BigInt(value);const whole=wei/GEN_SCALE;const fraction=(wei%GEN_SCALE).toString().padStart(18,"0").replace(/0+$/," ").trim();return fraction?`${whole}.${fraction} GEN`:`${whole} GEN`}
