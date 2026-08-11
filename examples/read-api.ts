import {
    BabycowansSDK,
} from "@babycowans/core-sdk";

import {
    Connection,
    PublicKey,
} from "@solana/web3.js";

const programIdValue =
    process.env.BABYCOWANS_PROGRAM_ID;

const authorityValue =
    process.env.BABYCOWANS_APPLICATION_AUTHORITY;

const applicationIdValue =
    process.env.BABYCOWANS_APPLICATION_ID;

if (
    !programIdValue ||
    !authorityValue ||
    !applicationIdValue
) {
    throw new Error(
        "BABYCOWANS_PROGRAM_ID, BABYCOWANS_APPLICATION_AUTHORITY, and BABYCOWANS_APPLICATION_ID are required",
    );
}

const client =
    new BabycowansSDK({
        connection:
            new Connection(
                process.env.SOLANA_RPC_URL ??
                    "http://127.0.0.1:8899",
                "confirmed",
            ),

        programId:
            new PublicKey(
                programIdValue,
            ),
    });

const application =
    await client.getApplication({
        authority:
            new PublicKey(
                authorityValue,
            ),

        applicationId:
            BigInt(
                applicationIdValue,
            ),
    });

if (application === null) {
    console.log(
        "Application not found",
    );
} else {
    console.log(
        "address",
        application.address.toBase58(),
    );

    console.log(
        "name",
        application.data.name,
    );

    console.log(
        "applicationId",
        application.data.applicationId.toString(),
    );

    console.log(
        "selectedEcosystem",
        application.data.selectedEcosystem,
    );
}
