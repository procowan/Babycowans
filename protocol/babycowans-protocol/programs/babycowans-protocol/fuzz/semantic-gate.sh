#!/usr/bin/env bash
set +e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROGRAM_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROGRAM_DIR" || exit 1

EVIDENCE_DIR="${BABYCOWANS_FUZZ_EVIDENCE_DIR:-$PWD/../../../../.astra-evidence/fuzz-semantic}"
MUTATED_RUNS_DEFAULT="${BABYCOWANS_FUZZ_MUTATED_RUNS:-512}"
PAYMENT_RUNS="${BABYCOWANS_FUZZ_PAYMENT_RUNS:-2048}"
SEED_VALUE="${BABYCOWANS_FUZZ_SEED:-424242}"

mkdir -p "$EVIDENCE_DIR"

SUMMARY="$EVIDENCE_DIR/semantic-summary.txt"
: > "$SUMMARY"

TARGETS=(
    application_config_lengths
    authority_state_machine
    canonical_identity
    gate_policy_structure
    membership_renewal
    payment_arithmetic
    pda_domain_separation
    reward_state_time
)

max_len_for() {
    case "$1" in
        application_config_lengths) echo 64 ;;
        authority_state_machine) echo 256 ;;
        canonical_identity) echo 128 ;;
        gate_policy_structure) echo 256 ;;
        membership_renewal) echo 128 ;;
        payment_arithmetic) echo 64 ;;
        pda_domain_separation) echo 192 ;;
        reward_state_time) echo 128 ;;
        *) echo 256 ;;
    esac
}

require_pattern() {
    local file="$1"
    local pattern="$2"
    local label="$3"

    if grep -qE "$pattern" "$file"; then
        echo "$label=PASS" | tee -a "$SUMMARY"
        return 0
    fi

    echo "$label=FAIL" | tee -a "$SUMMARY"
    return 1
}

echo "BABYCOWANS_FUZZ_SEMANTIC_GATE=START" | tee -a "$SUMMARY"
echo "UTC=$(date -u +%Y-%m-%dT%H:%M:%SZ)" | tee -a "$SUMMARY"
echo "GIT_HEAD=$(git rev-parse HEAD 2>/dev/null)" | tee -a "$SUMMARY"
echo "GIT_TREE=$(git rev-parse HEAD^{tree} 2>/dev/null)" | tee -a "$SUMMARY"
echo "FUZZ_SEED=$SEED_VALUE" | tee -a "$SUMMARY"

rustc +nightly --version 2>&1 | tee "$EVIDENCE_DIR/rustc-nightly-version.txt"
cargo +nightly --version 2>&1 | tee "$EVIDENCE_DIR/cargo-nightly-version.txt"
cargo +nightly fuzz --version 2>&1 | tee "$EVIDENCE_DIR/cargo-fuzz-version.txt"

sha256sum \
    "$PROGRAM_DIR/Cargo.toml" \
    "$SCRIPT_DIR/Cargo.toml" \
    "$SCRIPT_DIR/Cargo.lock" \
    > "$EVIDENCE_DIR/lock-and-manifest-hashes.sha256"

find "$SCRIPT_DIR/fuzz_targets" \
     "$SCRIPT_DIR/seeds" \
     -type f \
     -print0 |
sort -z |
xargs -0 sha256sum \
    > "$EVIDENCE_DIR/target-and-seed-hashes.sha256"

GLOBAL_RC=0

for target in "${TARGETS[@]}"; do
    echo "------------------------------------------------------------" | tee -a "$SUMMARY"
    echo "TARGET=$target" | tee -a "$SUMMARY"

    SEED_DIR="$SCRIPT_DIR/seeds/$target"
    FIXED_LOG="$EVIDENCE_DIR/$target-fixed.log"
    MUTATED_LOG="$EVIDENCE_DIR/$target-mutated.log"

    : > "$FIXED_LOG"
    : > "$MUTATED_LOG"

    SEED_COUNT="$(find "$SEED_DIR" -maxdepth 1 -type f | wc -l)"
    echo "SEED_COUNT=$SEED_COUNT" | tee -a "$SUMMARY"

    if [ "$SEED_COUNT" -le 0 ]; then
        echo "FIXED_CORPUS_PRESENT=FAIL" | tee -a "$SUMMARY"
        GLOBAL_RC=1
        continue
    fi

    FIXED_RC=0

    while IFS= read -r seed_file; do
        echo "FIXED_INPUT=$seed_file" >> "$FIXED_LOG"

        cargo +nightly fuzz run "$target" "$seed_file" -- \
            -seed="$SEED_VALUE" \
            >> "$FIXED_LOG" 2>&1

        RC=$?

        echo "FIXED_INPUT_RC=$RC" >> "$FIXED_LOG"

        if [ "$RC" -ne 0 ]; then
            FIXED_RC=1
        fi
    done < <(
        find "$SEED_DIR" -maxdepth 1 -type f -print |
        sort
    )

    FIXED_BODY="$(
        grep -c "BABYCOWANS_FUZZ target=$target body=1" \
            "$FIXED_LOG" 2>/dev/null
    )"

    echo "FIXED_RC=$FIXED_RC" | tee -a "$SUMMARY"
    echo "FIXED_BODY_ENTRY_COUNT=$FIXED_BODY" | tee -a "$SUMMARY"

    if [ "$FIXED_RC" -ne 0 ] ||
       [ "$FIXED_BODY" -lt "$SEED_COUNT" ]; then
        echo "FIXED_SEMANTIC_EXECUTION=FAIL" | tee -a "$SUMMARY"
        GLOBAL_RC=1
    else
        echo "FIXED_SEMANTIC_EXECUTION=PASS" | tee -a "$SUMMARY"
    fi

    TMP_CORPUS="$(mktemp -d)"
    cp "$SEED_DIR"/* "$TMP_CORPUS"/

    RUNS="$MUTATED_RUNS_DEFAULT"
    [ "$target" = "payment_arithmetic" ] && RUNS="$PAYMENT_RUNS"

    MAX_LEN="$(max_len_for "$target")"

    cargo +nightly fuzz run "$target" "$TMP_CORPUS" -- \
        -runs="$RUNS" \
        -seed="$SEED_VALUE" \
        -max_len="$MAX_LEN" \
        > "$MUTATED_LOG" 2>&1

    MUTATED_RC=$?

    MUTATED_BODY="$(
        grep -c "BABYCOWANS_FUZZ target=$target body=1" \
            "$MUTATED_LOG" 2>/dev/null
    )"

    echo "MUTATED_RUNS_REQUESTED=$RUNS" | tee -a "$SUMMARY"
    echo "MUTATED_MAX_LEN=$MAX_LEN" | tee -a "$SUMMARY"
    echo "MUTATED_RC=$MUTATED_RC" | tee -a "$SUMMARY"
    echo "MUTATED_BODY_ENTRY_COUNT=$MUTATED_BODY" | tee -a "$SUMMARY"

    rm -rf "$TMP_CORPUS"

    if [ "$MUTATED_RC" -ne 0 ] ||
       [ "$MUTATED_BODY" -le "$SEED_COUNT" ]; then
        echo "MUTATED_SEMANTIC_EXECUTION=FAIL" | tee -a "$SUMMARY"
        GLOBAL_RC=1
    else
        echo "MUTATED_SEMANTIC_EXECUTION=PASS" | tee -a "$SUMMARY"
    fi

    COMBINED="$EVIDENCE_DIR/$target-combined.log"
    cat "$FIXED_LOG" "$MUTATED_LOG" > "$COMBINED"

    case "$target" in
        application_config_lengths)
            require_pattern "$COMBINED" \
                'class=valid' \
                'APPLICATION_CONFIG_VALID_SPACE' || GLOBAL_RC=1
            require_pattern "$COMBINED" \
                'class=invalid' \
                'APPLICATION_CONFIG_INVALID_SPACE' || GLOBAL_RC=1
            ;;

        authority_state_machine)
            require_pattern "$COMBINED" \
                'class=transfer_completed' \
                'AUTHORITY_VALID_TRANSFER' || GLOBAL_RC=1
            require_pattern "$COMBINED" \
                'class=nomination_rejected' \
                'AUTHORITY_INVALID_NOMINATION' || GLOBAL_RC=1
            require_pattern "$COMBINED" \
                'class=acceptance_rejected' \
                'AUTHORITY_INVALID_ACCEPTANCE' || GLOBAL_RC=1
            ;;

        canonical_identity)
            require_pattern "$COMBINED" \
                'class=canonical' \
                'CANONICAL_POSITIVE_SPACE' || GLOBAL_RC=1
            require_pattern "$COMBINED" \
                'class=noncanonical' \
                'CANONICAL_NEGATIVE_SPACE' || GLOBAL_RC=1
            ;;

        gate_policy_structure)
            require_pattern "$COMBINED" \
                'class=valid' \
                'GATE_POLICY_VALID_SPACE' || GLOBAL_RC=1
            require_pattern "$COMBINED" \
                'class=invalid' \
                'GATE_POLICY_INVALID_SPACE' || GLOBAL_RC=1
            ;;

        membership_renewal)
            require_pattern "$COMBINED" \
                'class=accepted' \
                'MEMBERSHIP_ACCEPTED_SPACE' || GLOBAL_RC=1
            require_pattern "$COMBINED" \
                'class=rejected' \
                'MEMBERSHIP_REJECTED_SPACE' || GLOBAL_RC=1
            ;;

        payment_arithmetic)
            require_pattern "$COMBINED" \
                'result=some production_bridge=1' \
                'PAYMENT_PRODUCTION_SUCCESS_SPACE' || GLOBAL_RC=1
            require_pattern "$COMBINED" \
                'result=none production_bridge=1' \
                'PAYMENT_PRODUCTION_REJECTION_SPACE' || GLOBAL_RC=1
            ;;

        pda_domain_separation)
            require_pattern "$COMBINED" \
                'class=same_child' \
                'BYTE_DOMAIN_SAME_CHILD_SPACE' || GLOBAL_RC=1
            require_pattern "$COMBINED" \
                'class=different_child' \
                'BYTE_DOMAIN_DIFFERENT_CHILD_SPACE' || GLOBAL_RC=1
            require_pattern "$COMBINED" \
                'scope=byte_domain_model_not_solana_pda' \
                'PDA_CLAIM_SCOPE_BOUNDARY' || GLOBAL_RC=1
            ;;

        reward_state_time)
            require_pattern "$COMBINED" \
                'claim=allowed' \
                'REWARD_CLAIM_ALLOWED_SPACE' || GLOBAL_RC=1
            require_pattern "$COMBINED" \
                'claim=rejected' \
                'REWARD_CLAIM_REJECTED_SPACE' || GLOBAL_RC=1
            require_pattern "$COMBINED" \
                'schedule=valid' \
                'REWARD_SCHEDULE_VALID_SPACE' || GLOBAL_RC=1
            require_pattern "$COMBINED" \
                'schedule=invalid' \
                'REWARD_SCHEDULE_INVALID_SPACE' || GLOBAL_RC=1
            ;;
    esac
done

echo "------------------------------------------------------------" | tee -a "$SUMMARY"

if [ "$GLOBAL_RC" -eq 0 ]; then
    echo "FUZZ_SEMANTIC_FAIL_CLOSED_GATE=PASS" | tee -a "$SUMMARY"
else
    echo "FUZZ_SEMANTIC_FAIL_CLOSED_GATE=FAIL" | tee -a "$SUMMARY"
fi

(
    cd "$EVIDENCE_DIR" || exit 1

    find . \
        -maxdepth 1 \
        -type f \
        ! -name 'artifact-manifest.sha256' \
        -print0 |
    sort -z |
    xargs -0 sha256sum \
        > artifact-manifest.sha256
)

exit "$GLOBAL_RC"
