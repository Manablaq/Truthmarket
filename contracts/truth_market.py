# v0.3.0
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
from dataclasses import dataclass
import json


SIDES = ["YES", "NO", "INVALID"]
VERDICTS = ["YES", "NO", "INVALID", "UNRESOLVED"]
CONFIDENCE = ["LOW", "MEDIUM", "HIGH"]
STATUS_OPEN = "OPEN"
STATUS_ACCEPTED = "ACCEPTED"
STATUS_CHALLENGED = "CHALLENGED"
STATUS_FINALIZED = "FINALIZED"
MAX_SOURCES = 12
MAX_FLAGS = 12


@allow_storage
@dataclass
class Market:
    market_id: str
    creator: str
    title: str
    description: str
    yes_rules: str
    no_rules: str
    invalid_rules: str
    deadline: str
    status: str
    created_at: str
    resolved_at: str
    yes_pool: str
    no_pool: str
    invalid_pool: str
    total_pool: str
    evidence_count: str
    resolution_id: str


@allow_storage
@dataclass
class Position:
    market_id: str
    user: str
    side: str
    amount: str
    claimed: str


@allow_storage
@dataclass
class Evidence:
    evidence_id: str
    market_id: str
    submitter: str
    url: str
    note: str
    submitted_at: str


@allow_storage
@dataclass
class Resolution:
    resolution_id: str
    market_id: str
    verdict: str
    confidence: str
    reasoning: str
    accepted_sources: str
    rejected_sources: str
    risk_flags: str
    resolver: str
    created_at: str
    challenge_count: str


@allow_storage
@dataclass
class Challenge:
    challenge_id: str
    market_id: str
    challenger: str
    evidence_url: str
    reason: str
    created_at: str


@gl.evm.contract_interface
class _EOARecipient:
    class View:
        pass

    class Write:
        pass


def _safe_json(text: str) -> dict:
    try:
        s = text.strip()
        if s.startswith("```"):
            s = s.split("```")[1]
            if s.startswith("json"):
                s = s[4:]
        return json.loads(s.strip())
    except:
        return {}


def _clean(text: str, limit: int = 1000) -> str:
    try:
        value = str(text).replace("\r", " ").replace('"', "'")
        while "  " in value:
            value = value.replace("  ", " ")
        return value[:limit]
    except:
        return ""


def _valid_address(address: str) -> bool:
    return len(address) == 42 and address.startswith("0x")


def _is_iso(value: str) -> bool:
    return (
        len(value) == 20
        and value[4] == "-"
        and value[7] == "-"
        and value[10] == "T"
        and value[13] == ":"
        and value[16] == ":"
        and value[19] == "Z"
        and value[0:4].isdigit()
        and value[5:7].isdigit()
        and value[8:10].isdigit()
        and value[11:13].isdigit()
        and value[14:16].isdigit()
        and value[17:19].isdigit()
    )


def _normalize_iso(value: str) -> str:
    normalized = str(value).strip()
    if normalized.endswith(".000Z"):
        normalized = normalized[:-5] + "Z"
    assert _is_iso(normalized), "datetime must be YYYY-MM-DDTHH:MM:SSZ"
    return normalized


def _market_to_json(market: Market) -> str:
    return json.dumps({
        "market_id": market.market_id,
        "creator": market.creator,
        "title": market.title,
        "description": market.description,
        "yes_rules": market.yes_rules,
        "no_rules": market.no_rules,
        "invalid_rules": market.invalid_rules,
        "deadline": market.deadline,
        "status": market.status,
        "created_at": market.created_at,
        "resolved_at": market.resolved_at,
        "yes_pool": market.yes_pool,
        "no_pool": market.no_pool,
        "invalid_pool": market.invalid_pool,
        "total_pool": market.total_pool,
        "evidence_count": market.evidence_count,
        "resolution_id": market.resolution_id,
    }, sort_keys=True)


def _market_from_json(raw: str) -> Market:
    d = json.loads(raw)
    return Market(
        market_id=str(d["market_id"]),
        creator=str(d["creator"]),
        title=str(d["title"]),
        description=str(d["description"]),
        yes_rules=str(d["yes_rules"]),
        no_rules=str(d["no_rules"]),
        invalid_rules=str(d["invalid_rules"]),
        deadline=str(d["deadline"]),
        status=str(d["status"]),
        created_at=str(d["created_at"]),
        resolved_at=str(d.get("resolved_at", "")),
        yes_pool=str(d.get("yes_pool", "0")),
        no_pool=str(d.get("no_pool", "0")),
        invalid_pool=str(d.get("invalid_pool", "0")),
        total_pool=str(d.get("total_pool", "0")),
        evidence_count=str(d.get("evidence_count", "0")),
        resolution_id=str(d.get("resolution_id", "")),
    )


class TruthMarket(gl.Contract):
    markets: TreeMap[str, str]
    market_ids: DynArray[str]
    positions: TreeMap[str, str]
    evidence_by_market: TreeMap[str, str]
    resolutions: TreeMap[str, str]
    challenges_by_market: TreeMap[str, str]
    user_markets: TreeMap[str, str]
    leaderboard: TreeMap[str, str]
    leaderboard_users: DynArray[str]
    next_market_id: str
    next_evidence_id: str
    next_resolution_id: str
    next_challenge_id: str
    finalized_count: str
    total_volume: str

    def __init__(self):
        self.next_market_id = "1"
        self.next_evidence_id = "1"
        self.next_resolution_id = "1"
        self.next_challenge_id = "1"
        self.finalized_count = "0"
        self.total_volume = "0"

    def _now(self) -> str:
        return _normalize_iso(str(gl.message_raw["datetime"]))

    def _sender(self) -> str:
        return str(gl.message.sender_address)

    def _value(self) -> int:
        return int(gl.message.value)

    def _position_key(self, market_id: str, user: str) -> str:
        return str(market_id) + ":" + user.lower()

    def _require_market(self, market_id: str) -> Market:
        raw = self.markets.get(str(market_id), None)
        assert raw is not None, "market not found"
        return _market_from_json(raw)

    def _save_market(self, market: Market) -> None:
        self.markets[market.market_id] = _market_to_json(market)

    def _position_to_json(self, position: Position) -> str:
        return json.dumps({
            "market_id": position.market_id,
            "user": position.user,
            "side": position.side,
            "amount": position.amount,
            "claimed": position.claimed,
        }, sort_keys=True)

    def _position_from_json(self, raw: str) -> Position:
        d = json.loads(raw)
        return Position(
            market_id=str(d["market_id"]),
            user=str(d["user"]),
            side=str(d["side"]),
            amount=str(d["amount"]),
            claimed=str(d.get("claimed", "false")),
        )

    def _evidence_to_dict(self, evidence: Evidence) -> dict:
        return {
            "evidence_id": evidence.evidence_id,
            "market_id": evidence.market_id,
            "submitter": evidence.submitter,
            "url": evidence.url,
            "note": evidence.note,
            "submitted_at": evidence.submitted_at,
        }

    def _resolution_to_json(self, resolution: Resolution) -> str:
        return json.dumps({
            "resolution_id": resolution.resolution_id,
            "market_id": resolution.market_id,
            "verdict": resolution.verdict,
            "confidence": resolution.confidence,
            "reasoning": resolution.reasoning,
            "accepted_sources": json.loads(resolution.accepted_sources or "[]"),
            "rejected_sources": json.loads(resolution.rejected_sources or "[]"),
            "risk_flags": json.loads(resolution.risk_flags or "[]"),
            "resolver": resolution.resolver,
            "created_at": resolution.created_at,
            "challenge_count": resolution.challenge_count,
        }, sort_keys=True)

    @gl.public.write
    def create_market(
        self,
        title: str,
        description: str,
        yes_rules: str,
        no_rules: str,
        invalid_rules: str,
        deadline: str,
    ) -> str:
        assert len(title.strip()) >= 8, "title too short"
        assert len(description.strip()) >= 20, "description too short"
        normalized_deadline = _normalize_iso(deadline)
        assert normalized_deadline > self._now(), "deadline must be in the future"

        market_id = self.next_market_id
        self.next_market_id = str(int(self.next_market_id) + 1)
        market = Market(
            market_id=market_id,
            creator=self._sender(),
            title=_clean(title.strip(), 140),
            description=_clean(description.strip(), 1200),
            yes_rules=_clean(yes_rules.strip(), 1000),
            no_rules=_clean(no_rules.strip(), 1000),
            invalid_rules=_clean(invalid_rules.strip(), 1000),
            deadline=normalized_deadline,
            status=STATUS_OPEN,
            created_at=self._now(),
            resolved_at="",
            yes_pool="0",
            no_pool="0",
            invalid_pool="0",
            total_pool="0",
            evidence_count="0",
            resolution_id="",
        )
        self._save_market(market)
        self.market_ids.append(market_id)
        return market_id

    @gl.public.write.payable
    def stake(self, market_id: str, side: str) -> None:
        market = self._require_market(str(market_id))
        normalized_side = side.upper()
        amount = self._value()
        assert market.status == STATUS_OPEN, "market is not open"
        assert self._now() <= market.deadline, "market deadline has passed"
        assert normalized_side in SIDES, "side must be YES, NO, or INVALID"
        assert amount > 0, "stake value must be positive GEN"

        user = self._sender()
        key = self._position_key(market.market_id, user)
        raw_position = self.positions.get(key, None)
        if raw_position is not None:
            position = self._position_from_json(raw_position)
            assert position.side == normalized_side, "MVP supports one side per market per user"
            position.amount = str(int(position.amount) + amount)
        else:
            position = Position(
                market_id=market.market_id,
                user=user,
                side=normalized_side,
                amount=str(amount),
                claimed="false",
            )
            user_key = user.lower()
            user_ids = json.loads(self.user_markets.get(user_key, "[]"))
            user_ids.append(market.market_id)
            self.user_markets[user_key] = json.dumps(user_ids)

        if normalized_side == "YES":
            market.yes_pool = str(int(market.yes_pool) + amount)
        elif normalized_side == "NO":
            market.no_pool = str(int(market.no_pool) + amount)
        else:
            market.invalid_pool = str(int(market.invalid_pool) + amount)

        market.total_pool = str(int(market.total_pool) + amount)
        self.total_volume = str(int(self.total_volume) + amount)
        self.positions[key] = self._position_to_json(position)
        self._save_market(market)

    @gl.public.write
    def submit_evidence(self, market_id: str, evidence_url: str, note: str) -> None:
        market = self._require_market(str(market_id))
        assert market.status in [STATUS_OPEN, STATUS_ACCEPTED, STATUS_CHALLENGED], "evidence closed"
        assert evidence_url.startswith("https://"), "evidence must be an https URL"

        evidence = Evidence(
            evidence_id=self.next_evidence_id,
            market_id=market.market_id,
            submitter=self._sender(),
            url=_clean(evidence_url.strip(), 500),
            note=_clean(note.strip(), 800),
            submitted_at=self._now(),
        )
        self.next_evidence_id = str(int(self.next_evidence_id) + 1)
        items = json.loads(self.evidence_by_market.get(market.market_id, "[]"))
        assert len(items) < 100, "too much evidence for MVP"
        items.append(self._evidence_to_dict(evidence))
        self.evidence_by_market[market.market_id] = json.dumps(items, sort_keys=True)
        market.evidence_count = str(int(market.evidence_count) + 1)
        self._save_market(market)

    @gl.public.write
    def resolve_market(self, market_id: str) -> str:
        market = self._require_market(str(market_id))
        assert market.status in [STATUS_OPEN, STATUS_CHALLENGED], "market already resolved or finalized"
        assert self._now() > market.deadline, "market deadline has not passed"

        evidence_items = json.loads(self.evidence_by_market.get(market.market_id, "[]"))
        assert len(evidence_items) > 0, "no evidence submitted"

        def _resolve_from_metadata() -> str:
            source_packets = []
            for evidence in evidence_items[:MAX_SOURCES]:
                source_packets.append({
                    "url": str(evidence.get("url", "")),
                    "note": str(evidence.get("note", "")),
                    "submitted_at": str(evidence.get("submitted_at", "")),
                })

            prompt = (
                "Resolve using only submitted evidence metadata and notes. "
                "Do not assume inaccessible page content. "
                "Treat URLs as source identifiers, not fetched proof.\n\n"
                "Title: " + market.title + "\n"
                "Description: " + market.description + "\n"
                "Deadline: " + market.deadline + "\n"
                "YES rules: " + market.yes_rules + "\n"
                "NO rules: " + market.no_rules + "\n"
                "INVALID rules: " + market.invalid_rules + "\n\n"
                "Criteria:\n"
                "- YES only if yes_rules are satisfied by submitted metadata or notes before or at the deadline.\n"
                "- NO only if no_rules are satisfied or yes_rules clearly failed.\n"
                "- INVALID if the claim is ambiguous, impossible to verify, or metadata cannot support either side.\n"
                "- UNRESOLVED if the evidence is too weak or more evidence is needed.\n\n"
                "Evidence JSON: " + json.dumps(source_packets) + "\n\n"
                "Return JSON only with fields: verdict, confidence, reasoning, accepted_sources, rejected_sources, risk_flags."
            )
            result = gl.nondet.exec_prompt(prompt, response_format="json")
            return json.dumps(result, sort_keys=True)

        result_raw = gl.eq_principle.prompt_non_comparative(
            _resolve_from_metadata,
            task=(
                "Resolve the market from submitted evidence metadata and notes, then return a structured JSON verdict. "
                "Do not overclaim truth beyond the evidence and market criteria."
            ),
            criteria=(
                "Validate format only. Accept if all are true: "
                "(1) valid JSON object, "
                "(2) verdict is exactly YES, NO, INVALID, or UNRESOLVED, "
                "(3) confidence is exactly LOW, MEDIUM, or HIGH, "
                "(4) reasoning is a non-empty string, "
                "(5) accepted_sources is an array of strings, "
                "(6) rejected_sources is an array of objects with url and reason strings, "
                "(7) risk_flags is an array of strings."
            ),
        )

        result = _safe_json(result_raw)
        verdict = str(result.get("verdict", "")).upper()
        confidence = str(result.get("confidence", "")).upper()
        reasoning = _clean(str(result.get("reasoning", "")), 1600)
        assert verdict in VERDICTS, "invalid AI verdict"
        assert confidence in CONFIDENCE, "invalid confidence"
        assert len(reasoning) > 0, "missing reasoning"

        accepted_sources = []
        for url in result.get("accepted_sources", [])[:MAX_SOURCES]:
            accepted_sources.append(_clean(str(url), 500))

        rejected_sources = []
        for item in result.get("rejected_sources", [])[:MAX_SOURCES]:
            rejected_sources.append({
                "url": _clean(str(item.get("url", "")), 500),
                "reason": _clean(str(item.get("reason", "")), 500),
            })

        risk_flags = []
        for flag in result.get("risk_flags", [])[:MAX_FLAGS]:
            risk_flags.append(_clean(str(flag), 240))

        resolution_id = self.next_resolution_id
        self.next_resolution_id = str(int(self.next_resolution_id) + 1)
        previous_challenges = "0"
        if market.resolution_id:
            old = self.resolutions.get(market.resolution_id, None)
            if old is not None:
                try:
                    previous_challenges = str(json.loads(old).get("challenge_count", "0"))
                except:
                    previous_challenges = "0"

        resolution = Resolution(
            resolution_id=resolution_id,
            market_id=market.market_id,
            verdict=verdict,
            confidence=confidence,
            reasoning=reasoning,
            accepted_sources=json.dumps(accepted_sources),
            rejected_sources=json.dumps(rejected_sources),
            risk_flags=json.dumps(risk_flags),
            resolver=self._sender(),
            created_at=self._now(),
            challenge_count=previous_challenges,
        )
        self.resolutions[resolution_id] = self._resolution_to_json(resolution)
        market.resolution_id = resolution_id
        market.resolved_at = self._now()
        market.status = STATUS_ACCEPTED
        self._save_market(market)
        return resolution_id

    @gl.public.write
    def challenge_resolution(self, market_id: str, evidence_url: str, reason: str) -> str:
        market = self._require_market(str(market_id))
        assert market.status == STATUS_ACCEPTED, "no accepted resolution to challenge"
        assert evidence_url.startswith("https://"), "challenge evidence must be an https URL"
        assert 10 <= len(reason.strip()) <= 1000, "challenge reason length invalid"

        challenge = Challenge(
            challenge_id=self.next_challenge_id,
            market_id=market.market_id,
            challenger=self._sender(),
            evidence_url=_clean(evidence_url.strip(), 500),
            reason=_clean(reason.strip(), 1000),
            created_at=self._now(),
        )
        self.next_challenge_id = str(int(self.next_challenge_id) + 1)
        items = json.loads(self.challenges_by_market.get(market.market_id, "[]"))
        items.append({
            "challenge_id": challenge.challenge_id,
            "market_id": challenge.market_id,
            "challenger": challenge.challenger,
            "evidence_url": challenge.evidence_url,
            "reason": challenge.reason,
            "created_at": challenge.created_at,
        })
        self.challenges_by_market[market.market_id] = json.dumps(items, sort_keys=True)

        if market.resolution_id:
            raw = self.resolutions.get(market.resolution_id, None)
            if raw is not None:
                data = json.loads(raw)
                data["challenge_count"] = str(int(data.get("challenge_count", "0")) + 1)
                self.resolutions[market.resolution_id] = json.dumps(data, sort_keys=True)

        market.status = STATUS_CHALLENGED
        self._save_market(market)
        return challenge.challenge_id

    @gl.public.write
    def finalize_market(self, market_id: str) -> None:
        market = self._require_market(str(market_id))
        assert market.status == STATUS_ACCEPTED, "challenged markets must be resolved again before finalization"
        resolution = json.loads(self.resolutions.get(market.resolution_id, "{}"))
        assert str(resolution.get("verdict", "")) in SIDES, "unresolved markets cannot be finalized"
        market.status = STATUS_FINALIZED
        self.finalized_count = str(int(self.finalized_count) + 1)
        self._save_market(market)

    @gl.public.write
    def claim_winnings(self, market_id: str) -> str:
        market = self._require_market(str(market_id))
        assert market.status == STATUS_FINALIZED, "market is not finalized"
        resolution = json.loads(self.resolutions.get(market.resolution_id, "{}"))
        verdict = str(resolution.get("verdict", ""))
        assert verdict in SIDES, "no payable winning side"

        user = self._sender()
        key = self._position_key(market.market_id, user)
        raw_position = self.positions.get(key, None)
        assert raw_position is not None, "no position"
        position = self._position_from_json(raw_position)
        assert position.claimed != "true", "already claimed"
        assert position.side == verdict, "position did not win"

        winning_pool = int(market.yes_pool)
        if verdict == "NO":
            winning_pool = int(market.no_pool)
        elif verdict == "INVALID":
            winning_pool = int(market.invalid_pool)
        assert winning_pool > 0, "no winning pool"

        payout = (int(position.amount) * int(market.total_pool)) // winning_pool
        assert payout > 0, "payout is zero"

        position.claimed = "true"
        self.positions[key] = self._position_to_json(position)
        user_key = user.lower()
        previous = int(self.leaderboard.get(user_key, "0"))
        if self.leaderboard.get(user_key, None) is None:
            self.leaderboard_users.append(user)
        self.leaderboard[user_key] = str(previous + payout)
        _EOARecipient(Address(user)).emit_transfer(value=u256(payout))
        return str(payout)

    @gl.public.view
    def get_market(self, market_id: str) -> str:
        return _market_to_json(self._require_market(str(market_id)))

    @gl.public.view
    def list_markets(self) -> str:
        items = []
        for market_id in self.market_ids:
            raw = self.markets.get(str(market_id), None)
            if raw is not None:
                items.append(json.loads(raw))
        return json.dumps(items, sort_keys=True)

    @gl.public.view
    def get_user_position(self, market_id: str, user: str) -> str:
        assert _valid_address(user), "invalid user address"
        raw = self.positions.get(self._position_key(str(market_id), user), None)
        if raw is None:
            return json.dumps({
                "market_id": str(market_id),
                "user": user,
                "side": "",
                "amount": "0",
                "claimed": "false",
                "found": False,
            }, sort_keys=True)
        data = json.loads(raw)
        data["found"] = True
        return json.dumps(data, sort_keys=True)

    @gl.public.view
    def list_evidence(self, market_id: str) -> str:
        return self.evidence_by_market.get(str(market_id), "[]")

    @gl.public.view
    def get_resolution(self, market_id: str) -> str:
        market = self._require_market(str(market_id))
        if not market.resolution_id:
            return json.dumps({"found": False}, sort_keys=True)
        raw = self.resolutions.get(market.resolution_id, None)
        if raw is None:
            return json.dumps({"found": False}, sort_keys=True)
        data = json.loads(raw)
        data["found"] = True
        return json.dumps(data, sort_keys=True)

    @gl.public.view
    def list_challenges(self, market_id: str) -> str:
        return self.challenges_by_market.get(str(market_id), "[]")

    @gl.public.view
    def get_stats(self) -> str:
        return json.dumps({
            "market_count": str(len(self.market_ids)),
            "finalized_count": self.finalized_count,
            "total_volume": self.total_volume,
        }, sort_keys=True)

    @gl.public.view
    def get_leaderboard(self) -> str:
        rows = {}
        for user in self.leaderboard_users:
            rows[user] = self.leaderboard.get(user.lower(), "0")
        return json.dumps(rows, sort_keys=True)
