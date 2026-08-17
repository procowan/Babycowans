#!/usr/bin/env bash

# Babycowans Protocol V1.0.0
# Repository-owned six-canonical local validator launcher.
# Final validator runs directly in the foreground.

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
    echo "PRECHECK=1"
    echo "STARTUP_ABORTED=NOT_INSIDE_BABYCOWANS_REPOSITORY"
    exit 1
}

cd "$ROOT" || exit 1

ASSETS="$ROOT/protocol/babycowans-protocol/programs/babycowans-protocol/src/canonical_assets.rs"
LEDGER="${BABYCOWANS_LEDGER:-$ROOT/test-ledger}"
BUILD_DIR="${BABYCOWANS_FIXTURE_DIR:-/tmp/babycowans-canonical-fixtures}"
LAYOUT_MANIFEST="$ROOT/protocol/babycowans-protocol/tests/fixtures/canonical-local-mint-layouts.json"

SOURCE_RPC_PORT="${BABYCOWANS_FIXTURE_RPC_PORT:-18999}"
SOURCE_FAUCET_PORT="${BABYCOWANS_FIXTURE_FAUCET_PORT:-19901}"
SOURCE_GOSSIP_PORT="${BABYCOWANS_FIXTURE_GOSSIP_PORT:-18200}"
SOURCE_DYNAMIC_PORT_RANGE="${BABYCOWANS_FIXTURE_DYNAMIC_PORT_RANGE:-18201-18300}"

SOURCE_RPC="http://127.0.0.1:${SOURCE_RPC_PORT}"
SOURCE_LEDGER="${BUILD_DIR}/source-ledger"

MAIN_RPC_PORT="${BABYCOWANS_RPC_PORT:-8899}"
MAIN_FAUCET_PORT="${BABYCOWANS_FAUCET_PORT:-9900}"
MAIN_GOSSIP_PORT="${BABYCOWANS_GOSSIP_PORT:-8001}"
MAIN_DYNAMIC_PORT_RANGE="${BABYCOWANS_DYNAMIC_PORT_RANGE:-}"

for tool in \
    solana-test-validator \
    solana \
    solana-keygen \
    spl-token \
    python3 \
    ss
do
    if ! command -v "$tool" >/dev/null 2>&1; then
        echo "PRECHECK=1"
        echo "STARTUP_ABORTED=MISSING_TOOL:$tool"
        exit 1
    fi
done

if [ ! -f "$ASSETS" ]; then
    echo "PRECHECK=1"
    echo "STARTUP_ABORTED=CANONICAL_SOURCE_NOT_FOUND"
    exit 1
fi

AUTHORITY="$(solana address 2>/dev/null)"

if [ -z "$AUTHORITY" ]; then
    echo "PRECHECK=1"
    echo "STARTUP_ABORTED=SOLANA_AUTHORITY_NOT_RESOLVED"
    exit 1
fi

mkdir -p "$BUILD_DIR"

CANONICAL_TSV="$BUILD_DIR/canonical.tsv"
MINT_INFO_TSV="$BUILD_DIR/mint-info.tsv"

python3 - "$ASSETS" "$CANONICAL_TSV" <<'PY'
import re
import sys
from pathlib import Path

source = Path(sys.argv[1]).read_text(encoding="utf-8")

pairs = re.findall(
    r'pub const (BRC|BEC|BGC|BLC|BBC|BAC)_MINT:'
    r'\s*Pubkey\s*=\s*pubkey!\("([^"]+)"\)',
    source,
)

expected = [
    "BRC",
    "BEC",
    "BGC",
    "BLC",
    "BBC",
    "BAC",
]

if [code for code, _ in pairs] != expected:
    raise SystemExit(
        f"CANONICAL_EXTRACTION_FAILED={pairs}"
    )

if len({mint for _, mint in pairs}) != 6:
    raise SystemExit(
        "CANONICAL_MINT_UNIQUENESS_FAILED"
    )

with open(sys.argv[2], "w", encoding="utf-8") as output:
    for code, mint in pairs:
        output.write(f"{code}\t{mint}\n")
PY

if [ "$?" -ne 0 ]; then
    echo "PRECHECK=1"
    echo "STARTUP_ABORTED=CANONICAL_EXTRACTION_FAILED"
    exit 1
fi

echo "============================================================"
echo "BABYCOWANS — SIX-CANONICAL LOCAL VALIDATOR"
echo "============================================================"
echo "LOCAL_AUTHORITY=$AUTHORITY"
echo "CANONICAL_MINT_COUNT=6"

while IFS=$'\t' read -r CODE MINT; do
    echo "CANONICAL_${CODE}_MINT=$MINT"
done < "$CANONICAL_TSV"

: > "$MINT_INFO_TSV"

if [ ! -s "$LAYOUT_MANIFEST" ]; then
    echo "STARTUP_ABORTED=LOCAL_LAYOUT_MANIFEST_MISSING"
    exit 1
fi

python3 - \
    "$CANONICAL_TSV" \
    "$LAYOUT_MANIFEST" \
    "$MINT_INFO_TSV" <<'PY_LOCAL_LAYOUT'
from pathlib import Path
import json
import sys

canonical_path = Path(sys.argv[1])
manifest_path = Path(sys.argv[2])
output_path = Path(sys.argv[3])

expected_codes = [
    "BRC",
    "BEC",
    "BGC",
    "BLC",
    "BBC",
    "BAC",
]

allowed_programs = {
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
}

canonical_rows = []

for line in canonical_path.read_text(
    encoding="utf-8"
).splitlines():
    if not line:
        continue

    parts = line.split("\t")

    if len(parts) != 2:
        raise SystemExit(1)

    canonical_rows.append(
        (parts[0], parts[1])
    )

if [code for code, _ in canonical_rows] != expected_codes:
    raise SystemExit(2)

if len({mint for _, mint in canonical_rows}) != 6:
    raise SystemExit(3)

try:
    manifest = json.loads(
        manifest_path.read_text(
            encoding="utf-8"
        )
    )
except Exception:
    raise SystemExit(4)

if list(manifest.keys()) != expected_codes:
    raise SystemExit(5)

lines = []

for code, mint in canonical_rows:
    entry = manifest.get(code)

    if not isinstance(entry, dict):
        raise SystemExit(6)

    if set(entry.keys()) != {
        "tokenProgram",
        "decimals",
    }:
        raise SystemExit(7)

    token_program = entry["tokenProgram"]
    decimals = entry["decimals"]

    if token_program not in allowed_programs:
        raise SystemExit(8)

    if (
        not isinstance(decimals, int)
        or decimals < 0
        or decimals > 255
    ):
        raise SystemExit(9)

    lines.append(
        f"{code}\t{mint}\t"
        f"{token_program}\t{decimals}"
    )

output_path.write_text(
    "\n".join(lines) + "\n",
    encoding="utf-8",
)
PY_LOCAL_LAYOUT

LAYOUT_MANIFEST_RC=$?

if [ "$LAYOUT_MANIFEST_RC" -ne 0 ]; then
    echo "STARTUP_ABORTED=LOCAL_LAYOUT_MANIFEST_INVALID"
    exit 1
fi

while IFS=$'\t' read -r CODE MINT PROGRAM DECIMALS; do
    echo "CANONICAL_LAYOUT=$CODE:$PROGRAM:$DECIMALS"
    echo "CANONICAL_LAYOUT_SOURCE=$CODE:REPOSITORY_TEST_MANIFEST"
done < "$MINT_INFO_TSV"

rm -rf -- "$SOURCE_LEDGER"

solana-test-validator \
    --reset \
    --ledger "$SOURCE_LEDGER" \
    --rpc-port "$SOURCE_RPC_PORT" \
    --faucet-port "$SOURCE_FAUCET_PORT" \
    --gossip-port "$SOURCE_GOSSIP_PORT" \
    --dynamic-port-range "$SOURCE_DYNAMIC_PORT_RANGE" \
    >"$BUILD_DIR/source-validator.log" \
    2>&1 &

SOURCE_PID=$!
SOURCE_READY=0

cleanup_source_validator() {
    if kill -0 "$SOURCE_PID" 2>/dev/null; then
        kill "$SOURCE_PID" 2>/dev/null || true
        wait "$SOURCE_PID" 2>/dev/null || true
    fi
}

trap cleanup_source_validator EXIT INT TERM

for _ in $(seq 1 60); do
    if solana cluster-version \
        --url "$SOURCE_RPC" \
        >/dev/null 2>&1
    then
        SOURCE_READY=1
        break
    fi

    if ! kill -0 "$SOURCE_PID" 2>/dev/null; then
        break
    fi

    sleep 0.5
done

if [ "$SOURCE_READY" -ne 1 ]; then
    echo "STARTUP_ABORTED=FIXTURE_SOURCE_VALIDATOR_FAILED"
    tail -n 120 "$BUILD_DIR/source-validator.log" 2>/dev/null || true
    exit 1
fi

if ! solana airdrop \
    20 \
    "$AUTHORITY" \
    --url "$SOURCE_RPC" \
    >/dev/null 2>&1
then
    echo "STARTUP_ABORTED=FIXTURE_AUTHORITY_FUNDING_FAILED"
    exit 1
fi

TOKEN_LEGACY='TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
TOKEN_2022='TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'

while IFS=$'\t' read -r CODE MINT PROGRAM DECIMALS; do
    EXTRA=()

    if [ "$PROGRAM" = "$TOKEN_2022" ]; then
        EXTRA+=(--program-2022)
    elif [ "$PROGRAM" != "$TOKEN_LEGACY" ]; then
        echo "STARTUP_ABORTED=UNSUPPORTED_TOKEN_PROGRAM:$CODE:$PROGRAM"
        exit 1
    fi

    CREATE_JSON="$(
        spl-token create-token \
            --url "$SOURCE_RPC" \
            --decimals "$DECIMALS" \
            --mint-authority "$AUTHORITY" \
            "${EXTRA[@]}" \
            --output json \
            2>/dev/null
    )"

    if [ "$?" -ne 0 ]; then
        echo "STARTUP_ABORTED=FIXTURE_MINT_CREATE_FAILED:$CODE"
        exit 1
    fi

    TEMP_MINT="$(
        printf '%s\n' "$CREATE_JSON" |
        python3 -c '
import json
import sys

value = json.load(sys.stdin)
print(value["commandOutput"]["address"])
'
    )"

    SOURCE_DUMP="$BUILD_DIR/${CODE}-source.json"
    FINAL_FIXTURE="$BUILD_DIR/${CODE}.json"

    if ! solana account \
        --url "$SOURCE_RPC" \
        --output json \
        --output-file "$SOURCE_DUMP" \
        "$TEMP_MINT" \
        >/dev/null 2>&1
    then
        echo "STARTUP_ABORTED=FIXTURE_ACCOUNT_DUMP_FAILED:$CODE"
        exit 1
    fi

    python3 - "$SOURCE_DUMP" "$FINAL_FIXTURE" "$MINT" <<'PY'
import json
import sys
from pathlib import Path

source = Path(sys.argv[1])
target = Path(sys.argv[2])
canonical_mint = sys.argv[3]

value = json.loads(
    source.read_text(encoding="utf-8")
)

value["pubkey"] = canonical_mint

target.write_text(
    json.dumps(value, indent=2) + "\n",
    encoding="utf-8",
)
PY

    if ! python3 -m json.tool \
        "$FINAL_FIXTURE" \
        >/dev/null 2>&1
    then
        echo "STARTUP_ABORTED=FIXTURE_JSON_INVALID:$CODE"
        exit 1
    fi

    ACTUAL="$(
        python3 - "$FINAL_FIXTURE" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as file:
    print(json.load(file).get("pubkey", ""))
PY
    )"

    if [ "$ACTUAL" != "$MINT" ]; then
        echo "STARTUP_ABORTED=FIXTURE_IDENTITY_MISMATCH:$CODE"
        exit 1
    fi

    echo "FIXTURE_READY=$CODE:$MINT"
done < "$MINT_INFO_TSV"

cleanup_source_validator
trap - EXIT INT TERM

EXISTING_PID="$(
    ss -ltnp 2>/dev/null |
    awk -v port=":$MAIN_RPC_PORT" '$4 ~ (port "$") {print}' |
    sed -n 's/.*pid=\([0-9][0-9]*\).*/\1/p' |
    head -n1
)"

if [ -n "$EXISTING_PID" ]; then
    EXISTING_CMD="$(
        tr '\0' ' ' \
            < "/proc/$EXISTING_PID/cmdline" \
            2>/dev/null ||
        true
    )"

    if [[ "$EXISTING_CMD" != *solana-test-validator* ]]; then
        echo "STARTUP_ABORTED=RPC_PORT_OCCUPIED_BY_OTHER_PROCESS"
        echo "RPC_PORT=$MAIN_RPC_PORT"
        echo "RPC_PORT_PID=$EXISTING_PID"
        echo "RPC_PORT_CMD=$EXISTING_CMD"
        exit 1
    fi

    echo "STARTUP_ABORTED=VALIDATOR_ALREADY_RUNNING"
    echo "RPC_PORT=$MAIN_RPC_PORT"
    echo "RPC_PORT_PID=$EXISTING_PID"
    echo "Use the existing validator or stop it explicitly first."
    exit 1
fi

MAIN_DYNAMIC_ARGS=()

if [ -n "$MAIN_DYNAMIC_PORT_RANGE" ]; then
    MAIN_DYNAMIC_ARGS+=(
        --dynamic-port-range
        "$MAIN_DYNAMIC_PORT_RANGE"
    )
fi

VALIDATOR_ARGS=()

while IFS=$'\t' read -r CODE MINT; do
    FIXTURE="$BUILD_DIR/${CODE}.json"

    if [ ! -s "$FIXTURE" ]; then
        echo "STARTUP_ABORTED=MISSING_FIXTURE:$CODE"
        exit 1
    fi

    VALIDATOR_ARGS+=(
        --account
        "$MINT"
        "$FIXTURE"
    )
done < "$CANONICAL_TSV"

PROGRAM_PRELOAD_ID="${BABYCOWANS_PROGRAM_PRELOAD_ID:-}"
PROGRAM_PRELOAD_SO="${BABYCOWANS_PROGRAM_PRELOAD_SO:-}"

if [ -n "$PROGRAM_PRELOAD_ID" ] || [ -n "$PROGRAM_PRELOAD_SO" ]; then
    if [ -z "$PROGRAM_PRELOAD_ID" ] || [ -z "$PROGRAM_PRELOAD_SO" ]; then
        echo "STARTUP_ABORTED=INCOMPLETE_PROGRAM_PRELOAD_CONTRACT"
        exit 1
    fi

    if [ ! -s "$PROGRAM_PRELOAD_SO" ]; then
        echo "STARTUP_ABORTED=PROGRAM_PRELOAD_SO_MISSING"
        echo "PROGRAM_PRELOAD_SO=$PROGRAM_PRELOAD_SO"
        exit 1
    fi

    VALIDATOR_ARGS+=(
        --upgradeable-program
        "$PROGRAM_PRELOAD_ID"
        "$PROGRAM_PRELOAD_SO"
        none
    )

    echo "BABYCOWANS_PROGRAM_PRELOAD=ENABLED"
    echo "BABYCOWANS_PROGRAM_PRELOAD_ID=$PROGRAM_PRELOAD_ID"
fi

rm -rf -- "$LEDGER"

echo
echo "VALIDATOR_PRECHECK_PASS"
echo "CANONICAL_ACCOUNT_COUNT=6"
echo "TERMINAL1_MODE=LIVE_FOREGROUND"
echo "BABYCOWANS_LOCAL_VALIDATOR_START_PASS"
echo
echo "Leave this terminal open."
echo "The validator now runs in the foreground."
echo

solana-test-validator \
    --reset \
    --ledger "$LEDGER" \
    --rpc-port "$MAIN_RPC_PORT" \
    --faucet-port "$MAIN_FAUCET_PORT" \
    --gossip-port "$MAIN_GOSSIP_PORT" \
    "${MAIN_DYNAMIC_ARGS[@]}" \
    "${VALIDATOR_ARGS[@]}"

RC=$?

echo
echo "VALIDATOR_EXIT_RC=$RC"
echo "VALIDATOR_STOPPED=1"

exit "$RC"
