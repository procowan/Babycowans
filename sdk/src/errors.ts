/**
 * Developer-facing transaction failure raised by the high-level
 * Babycowans SDK.
 *
 * The original Solana/Web3 error is preserved in `originalError`,
 * while Anchor/Babycowans error information is normalized into
 * stable fields when it can be recovered from transaction logs.
 */
export class BabycowansTransactionError extends Error {
    readonly anchorErrorCode: string | null;
    readonly anchorErrorMessage: string | null;
    readonly logs: readonly string[];
    readonly originalError: unknown;

    constructor(params: {
        message: string;
        anchorErrorCode: string | null;
        anchorErrorMessage: string | null;
        logs: string[];
        originalError: unknown;
    }) {
        super(params.message);

        this.name = "BabycowansTransactionError";
        this.anchorErrorCode = params.anchorErrorCode;
        this.anchorErrorMessage =
            params.anchorErrorMessage;
        this.logs = params.logs;
        this.originalError = params.originalError;
    }
}

function stringArrayProperty(
    value: unknown,
    property: "logs" | "transactionLogs",
): string[] {
    if (
        typeof value !== "object" ||
        value === null ||
        !(property in value)
    ) {
        return [];
    }

    const candidate = (
        value as Record<string, unknown>
    )[property];

    if (!Array.isArray(candidate)) {
        return [];
    }

    return candidate.map(String);
}

function originalErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}

/**
 * Convert a raw Solana/Web3/Anchor transaction failure into a
 * Babycowans-specific developer-facing error without discarding
 * the original error or transaction logs.
 */
export function normalizeBabycowansTransactionError(
    error: unknown,
): BabycowansTransactionError {
    if (error instanceof BabycowansTransactionError) {
        return error;
    }

    const logs = [
        ...stringArrayProperty(error, "logs"),
        ...stringArrayProperty(
            error,
            "transactionLogs",
        ),
    ];

    const rawMessage = originalErrorMessage(error);

    const evidence = [
        rawMessage,
        ...logs,
    ].join("\n");

    const codeMatch = evidence.match(
        /Error Code:\s*([A-Za-z_][A-Za-z0-9_]*)/,
    );

    const messageMatch = evidence.match(
        /Error Message:\s*([^\n]+)/,
    );

    const anchorErrorCode =
        codeMatch?.[1] ?? null;

    const anchorErrorMessage =
        messageMatch?.[1]?.trim() ?? null;

    let message: string;

    if (
        anchorErrorCode !== null &&
        anchorErrorMessage !== null
    ) {
        message =
            `Babycowans transaction rejected ` +
            `[${anchorErrorCode}]: ` +
            anchorErrorMessage;
    } else if (anchorErrorCode !== null) {
        message =
            `Babycowans transaction rejected ` +
            `[${anchorErrorCode}].`;
    } else {
        message =
            `Babycowans transaction rejected: ` +
            rawMessage;
    }

    return new BabycowansTransactionError({
        message,
        anchorErrorCode,
        anchorErrorMessage,
        logs,
        originalError: error,
    });
}
