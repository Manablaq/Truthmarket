import { NextResponse } from "next/server";
import { readTruthMarket } from "@/lib/genlayer";
import { isContractConfigured } from "@/lib/config";
import { boundedRead,MAX_BODY_BYTES,validateReadRequest } from "@/lib/api-safety";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    const length=Number(request.headers.get("content-length")||0);
    if(length>MAX_BODY_BYTES)return jsonError("Request body is too large",413);
    const text=await request.text();
    if(new TextEncoder().encode(text).length>MAX_BODY_BYTES)return jsonError("Request body is too large",413);
    body = JSON.parse(text);
  } catch {
    return jsonError("Invalid JSON body");
  }

  if (!body || typeof body !== "object") {
    return jsonError("Request body must be an object");
  }

  let validated;
  try{validated=validateReadRequest(body)}catch(error){const e=error as Error&{status?:number};return jsonError(e.message,e.status??400)}

  if (!isContractConfigured()) {
    return jsonError("TruthMarket contract is not deployed or configured yet.", 503);
  }

  try {
    const result = await boundedRead(validated.method,validated.args,readTruthMarket);
    return NextResponse.json({ ok: true, result });
  } catch {
    return jsonError("Contract read failed safely", 502);
  }
}
