import {
    BabycowansSDK,
} from "@babycowans/core-sdk";

import {
    Connection,
    PublicKey,
} from "@solana/web3.js";

const programIdValue =
    process.env.BABYCOWANS_PROGRAM_ID;

const signature =
    process.env.BABYCOWANS_TRANSACTION_SIGNATURE;

if (
    !programIdValue ||
    !signature
) {
    throw new Error(
        "BABYCOWANS_PROGRAM_ID and BABYCOWANS_TRANSACTION_SIGNATURE are required",
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

const events =
    await client.decodeEvents(
        signature,
    );

for (const event of events) {
    console.log(
        event.name,
        event.data,
    );
}
