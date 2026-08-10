import type {
    ApplicationMetadata,
    MetadataAttribute,
    MetadataFile,
    MetadataProperties,
    ResolvedApplicationMetadata,
} from "./types.js";

const MAX_METADATA_BYTES = 1_048_576;

function isRecord(
    value: unknown,
): value is Record<string, unknown> {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
    );
}

function readOptionalString(
    value: unknown,
    field: string,
): string | undefined {
    if (value === undefined) {
        return undefined;
    }

    if (typeof value !== "string") {
        throw new TypeError(
            `Invalid metadata field: ${field}`,
        );
    }

    return value;
}

function parseAttributes(
    value: unknown,
): MetadataAttribute[] | undefined {
    if (value === undefined) {
        return undefined;
    }

    if (!Array.isArray(value)) {
        throw new TypeError(
            "Invalid metadata field: attributes",
        );
    }

    return value.map((entry) => {
        if (!isRecord(entry)) {
            throw new TypeError(
                "Invalid metadata attribute",
            );
        }

        const traitType =
            entry.trait_type ?? entry.traitType;

        if (typeof traitType !== "string") {
            throw new TypeError(
                "Invalid metadata attribute trait_type",
            );
        }

        const attributeValue = entry.value;

        if (
            typeof attributeValue !== "string" &&
            typeof attributeValue !== "number" &&
            typeof attributeValue !== "boolean"
        ) {
            throw new TypeError(
                "Invalid metadata attribute value",
            );
        }

        return {
            traitType,
            value: attributeValue,
        };
    });
}

function parseProperties(
    value: unknown,
): MetadataProperties | undefined {
    if (value === undefined) {
        return undefined;
    }

    if (!isRecord(value)) {
        throw new TypeError(
            "Invalid metadata field: properties",
        );
    }

    let files: MetadataFile[] | undefined;

    if (value.files !== undefined) {
        if (!Array.isArray(value.files)) {
            throw new TypeError(
                "Invalid metadata properties.files",
            );
        }

        files = value.files.map((entry) => {
            if (!isRecord(entry)) {
                throw new TypeError(
                    "Invalid metadata file",
                );
            }

            if (typeof entry.uri !== "string") {
                throw new TypeError(
                    "Invalid metadata file uri",
                );
            }

            if (
                entry.type !== undefined &&
                typeof entry.type !== "string"
            ) {
                throw new TypeError(
                    "Invalid metadata file type",
                );
            }

            return {
                uri: entry.uri,
                type: entry.type,
            };
        });
    }

    return {
        ...value,
        category:
            typeof value.category === "string"
                ? value.category
                : undefined,
        files,
    };
}

export function parseApplicationMetadata(
    value: unknown,
): ApplicationMetadata {
    if (!isRecord(value)) {
        throw new TypeError(
            "Application metadata must be an object",
        );
    }

    if (
        typeof value.name !== "string" ||
        value.name.length === 0
    ) {
        throw new TypeError(
            "Application metadata requires a non-empty name",
        );
    }

    return {
        name: value.name,
        symbol: readOptionalString(
            value.symbol,
            "symbol",
        ),
        description: readOptionalString(
            value.description,
            "description",
        ),
        image: readOptionalString(
            value.image,
            "image",
        ),
        animationUrl: readOptionalString(
            value.animation_url ??
                value.animationUrl,
            "animation_url",
        ),
        externalUrl: readOptionalString(
            value.external_url ??
                value.externalUrl,
            "external_url",
        ),
        attributes: parseAttributes(
            value.attributes,
        ),
        properties: parseProperties(
            value.properties,
        ),
    };
}

export function normalizeMetadataUri(
    uri: string,
): string {
    const trimmed = uri.trim();

    if (trimmed.length === 0) {
        throw new TypeError(
            "Metadata URI must not be empty",
        );
    }

    if (trimmed.startsWith("ipfs://")) {
        return (
            "https://ipfs.io/ipfs/" +
            trimmed.slice("ipfs://".length)
        );
    }

    if (trimmed.startsWith("ar://")) {
        return (
            "https://arweave.net/" +
            trimmed.slice("ar://".length)
        );
    }

    const url = new URL(trimmed);

    if (
        url.protocol !== "https:" &&
        url.protocol !== "http:"
    ) {
        throw new TypeError(
            `Unsupported metadata URI scheme: ${url.protocol}`,
        );
    }

    return url.toString();
}

export async function fetchApplicationMetadata(
    uri: string,
    options?: {
        signal?: AbortSignal;
    },
): Promise<ResolvedApplicationMetadata> {
    const normalizedUri =
        normalizeMetadataUri(uri);

    const response = await fetch(
        normalizedUri,
        {
            signal: options?.signal,
            headers: {
                accept: "application/json",
            },
        },
    );

    if (!response.ok) {
        throw new Error(
            `Metadata request failed: ${response.status}`,
        );
    }

    const contentLength =
        response.headers.get("content-length");

    if (
        contentLength !== null &&
        Number(contentLength) >
            MAX_METADATA_BYTES
    ) {
        throw new RangeError(
            "Metadata response exceeds maximum size",
        );
    }

    const text = await response.text();

    if (
        Buffer.byteLength(text, "utf8") >
        MAX_METADATA_BYTES
    ) {
        throw new RangeError(
            "Metadata response exceeds maximum size",
        );
    }

    let json: unknown;

    try {
        json = JSON.parse(text);
    } catch {
        throw new SyntaxError(
            "Metadata response is not valid JSON",
        );
    }

    return {
        uri: normalizedUri,
        metadata:
            parseApplicationMetadata(json),
    };
}
