# v0.3.0
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

# TruthMarket V4 Gate 1 isolated feasibility probe.
# This is not a production TruthMarket V4 contract.

from genlayer import *
import json


STATUS_REQUESTED = "REQUESTED"
STATUS_COMPLETED = "COMPLETED"
MAX_PAYLOAD_BYTES = 64


class TruthMarketV4Gate1Probe(gl.Contract):
    requests: TreeMap[str, str]
    request_count: str

    def __init__(self):
        self.request_count = "0"

    def _now(self) -> str:
        return str(gl.message_raw["datetime"])

    def _sender(self) -> str:
        return str(gl.message.sender_address)

    def _load_request(self, request_id: str) -> dict:
        normalized_id = str(request_id)
        assert normalized_id.isdigit(), "request id must be a positive integer"
        assert int(normalized_id) > 0, "request id zero is invalid"
        raw = self.requests.get(normalized_id, None)
        assert raw is not None, "request not found"
        return json.loads(raw)

    def _save_request(self, record: dict) -> None:
        self.requests[str(record["request_id"])] = json.dumps(record, sort_keys=True)

    @gl.public.write
    def request_probe(self, payload: str) -> str:
        exact_payload = str(payload)
        payload_size = len(exact_payload.encode("utf-8"))
        assert payload_size > 0, "payload must not be empty"
        assert payload_size <= MAX_PAYLOAD_BYTES, "payload exceeds probe limit"

        request_id = str(int(self.request_count) + 1)
        record = {
            "request_id": request_id,
            "payload": exact_payload,
            "requester": self._sender(),
            "requested_at": self._now(),
            "status": STATUS_REQUESTED,
            "result": "",
            "executor": "",
            "completed_at": "",
        }
        self._save_request(record)
        self.request_count = request_id
        return request_id

    @gl.public.write
    def execute_probe(self, request_id: str) -> str:
        record = self._load_request(request_id)
        assert record["status"] == STATUS_REQUESTED, "request is not executable"
        stored_payload = str(record["payload"])

        def classify_stored_payload() -> str:
            prompt = (
                "Classify the exact JSON string below. Return only MATCH when its decoded "
                "value is exactly gate-one-alpha. Return only OTHER for every other value.\n"
                "STORED_PAYLOAD_JSON=" + json.dumps(stored_payload)
            )
            return str(gl.nondet.exec_prompt(prompt)).strip().upper()

        classification = gl.eq_principle.prompt_non_comparative(
            classify_stored_payload,
            task=(
                "Classify the committed stored payload as MATCH only when it is exactly "
                "gate-one-alpha; otherwise classify it as OTHER."
            ),
            criteria=(
                "The response must be exactly MATCH or OTHER, with MATCH used only for the "
                "exact stored payload gate-one-alpha."
            ),
        )
        normalized_result = str(classification).strip().upper()
        assert normalized_result in ["MATCH", "OTHER"], "invalid probe classification"

        record["status"] = STATUS_COMPLETED
        record["result"] = normalized_result
        record["executor"] = self._sender()
        record["completed_at"] = self._now()
        self._save_request(record)
        return normalized_result

    @gl.public.view
    def get_probe(self, request_id: str) -> str:
        return json.dumps(self._load_request(request_id), sort_keys=True)

    @gl.public.view
    def get_request_count(self) -> str:
        return self.request_count
