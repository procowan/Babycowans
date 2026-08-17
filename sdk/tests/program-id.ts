import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PublicKey } from "@solana/web3.js";

const helperDirectory =
    path.dirname(
        fileURLToPath(import.meta.url),
    );

const defaultRepositoryRoot =
    path.resolve(
        helperDirectory,
        "..",
        "..",
    );

export function loadConfiguredProgramId(
    repositoryRoot: string =
        defaultRepositoryRoot,
): PublicKey {
    const anchorToml =
        path.join(
            repositoryRoot,
            "protocol",
            "babycowans-protocol",
            "Anchor.toml",
        );

    const libRs =
        path.join(
            repositoryRoot,
            "protocol",
            "babycowans-protocol",
            "programs",
            "babycowans-protocol",
            "src",
            "lib.rs",
        );

    const anchorSource =
        fs.readFileSync(
            anchorToml,
            "utf8",
        );

    const libSource =
        fs.readFileSync(
            libRs,
            "utf8",
        );

    const anchorMatch =
        anchorSource.match(
            /babycowans_protocol\s*=\s*"([^"]+)"/,
        );

    const sourceMatch =
        libSource.match(
            /declare_id!\(\s*"([^"]+)"\s*\)/,
        );

    if (
        anchorMatch === null ||
        sourceMatch === null
    ) {
        throw new Error(
            "Unable to resolve Babycowans Program ID from repository source.",
        );
    }

    if (
        anchorMatch[1] !==
        sourceMatch[1]
    ) {
        throw new Error(
            `Program ID mismatch across repository sources: ${anchorMatch[1]} != ${sourceMatch[1]}`,
        );
    }

    return new PublicKey(
        anchorMatch[1],
    );
}
