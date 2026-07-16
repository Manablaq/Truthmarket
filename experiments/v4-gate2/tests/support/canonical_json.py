"""Independent Python implementation of the frozen Gate 2 canonical JSON profile."""

from __future__ import annotations

import math
import re
from typing import Any


MIN_SAFE_INTEGER = -9_007_199_254_740_991
MAX_SAFE_INTEGER = 9_007_199_254_740_991
DECIMAL_METADATA = re.compile(r"^-?(?:0|[1-9][0-9]*)$")


class CanonicalizationError(ValueError):
    def __init__(self, reason_code: str):
        super().__init__(reason_code)
        self.reason_code = reason_code


def _validate_string(value: str) -> None:
    try:
        value.encode("utf-8", errors="strict")
    except UnicodeEncodeError as error:
        raise CanonicalizationError("CANONICAL_UNPAIRED_SURROGATE") from error


def _escape_string(value: str) -> str:
    _validate_string(value)
    escapes = {
        '"': '\\"',
        "\\": "\\\\",
        "\b": "\\b",
        "\t": "\\t",
        "\n": "\\n",
        "\f": "\\f",
        "\r": "\\r",
    }
    result = ['"']
    for scalar in value:
        if scalar in escapes:
            result.append(escapes[scalar])
        elif ord(scalar) <= 0x1F:
            result.append(f"\\u{ord(scalar):04x}")
        else:
            result.append(scalar)
    result.append('"')
    return "".join(result)


def canonical_json(value: Any) -> str:
    active: set[int] = set()

    def encode(item: Any) -> str:
        if item is None:
            return "null"
        if item is True:
            return "true"
        if item is False:
            return "false"
        if isinstance(item, int):
            if item < MIN_SAFE_INTEGER or item > MAX_SAFE_INTEGER:
                raise CanonicalizationError("CANONICAL_INTEGER_OUT_OF_RANGE")
            return str(item)
        if isinstance(item, float):
            if not math.isfinite(item):
                raise CanonicalizationError("CANONICAL_NONFINITE")
            if item == 0 and math.copysign(1.0, item) < 0:
                raise CanonicalizationError("CANONICAL_NEGATIVE_ZERO")
            raise CanonicalizationError("CANONICAL_FLOAT")
        if isinstance(item, str):
            return _escape_string(item)
        if isinstance(item, list):
            if type(item) is not list:
                raise CanonicalizationError("UNSUPPORTED_ARRAY_PROPERTY")
            identity = id(item)
            if identity in active:
                raise CanonicalizationError("CANONICAL_CYCLE")
            active.add(identity)
            try:
                return "[" + ",".join(encode(child) for child in item) + "]"
            finally:
                active.remove(identity)
        if isinstance(item, dict):
            if type(item) is not dict:
                raise CanonicalizationError("CANONICAL_UNSUPPORTED_TYPE")
            identity = id(item)
            if identity in active:
                raise CanonicalizationError("CANONICAL_CYCLE")
            for key in item:
                if not isinstance(key, str):
                    raise CanonicalizationError("CANONICAL_NON_STRING_KEY")
                _validate_string(key)
            active.add(identity)
            try:
                keys = sorted(item, key=lambda key: key.encode("utf-8", errors="strict"))
                return "{" + ",".join(
                    _escape_string(key) + ":" + encode(item[key]) for key in keys
                ) + "}"
            finally:
                active.remove(identity)
        raise CanonicalizationError("CANONICAL_UNSUPPORTED_TYPE")

    return encode(value)


def canonical_bytes(value: Any) -> bytes:
    return canonical_json(value).encode("utf-8", errors="strict")


def validate_attempt_id(value: Any) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise CanonicalizationError("ATTEMPT_ID_NOT_INTEGER")
    if value == 0:
        raise CanonicalizationError("ATTEMPT_ID_ZERO")
    if value < 0:
        raise CanonicalizationError("ATTEMPT_ID_NEGATIVE")
    if value > MAX_SAFE_INTEGER:
        raise CanonicalizationError("CANONICAL_INTEGER_OUT_OF_RANGE")
    return value


def validate_decimal_metadata(value: str, allow_negative: bool = False) -> str:
    if not isinstance(value, str) or not DECIMAL_METADATA.fullmatch(value):
        raise CanonicalizationError("CANONICAL_DECIMAL_METADATA")
    if value.startswith("-") and (not allow_negative or value == "-0"):
        raise CanonicalizationError("CANONICAL_DECIMAL_METADATA")
    return value
