import assert from "node:assert/strict";

import {
    BabycowansTransactionError,
    normalizeBabycowansTransactionError,
} from "../src/errors";

const customRaw = {
    message: "Transaction simulation failed",
    logs: [
        "Program log: AnchorError occurred.",
        "Program log: Error Code: InvalidAuthority. Error Number: 6000. Error Message: The provided authority is invalid.",
    ],
};

const custom =
    normalizeBabycowansTransactionError(customRaw);

assert.ok(
    custom instanceof BabycowansTransactionError,
);

assert.equal(
    custom.name,
    "BabycowansTransactionError",
);

assert.equal(
    custom.anchorErrorCode,
    "InvalidAuthority",
);

assert.equal(
    custom.anchorErrorMessage,
    "The provided authority is invalid.",
);

assert.equal(
    custom.message,
    "Babycowans transaction rejected [InvalidAuthority]: The provided authority is invalid.",
);

assert.equal(
    custom.originalError,
    customRaw,
);

assert.equal(
    custom.logs.length,
    2,
);

const anchorRaw = {
    message: "Transaction simulation failed",
    transactionLogs: [
        "Program log: AnchorError caused by account: application.",
        "Program log: Error Code: ConstraintHasOne. Error Number: 2001. Error Message: A has one constraint was violated.",
    ],
};

const anchor =
    normalizeBabycowansTransactionError(anchorRaw);

assert.equal(
    anchor.anchorErrorCode,
    "ConstraintHasOne",
);

assert.equal(
    anchor.anchorErrorMessage,
    "A has one constraint was violated.",
);

assert.equal(
    anchor.message,
    "Babycowans transaction rejected [ConstraintHasOne]: A has one constraint was violated.",
);

const fallbackRaw =
    new Error("RPC transport failure");

const fallback =
    normalizeBabycowansTransactionError(
        fallbackRaw,
    );

assert.equal(
    fallback.anchorErrorCode,
    null,
);

assert.equal(
    fallback.anchorErrorMessage,
    null,
);

assert.equal(
    fallback.message,
    "Babycowans transaction rejected: RPC transport failure",
);

assert.equal(
    normalizeBabycowansTransactionError(custom),
    custom,
);

console.log(
    "X26_SDK_ERROR_NORMALIZATION_TEST=PASS",
);
