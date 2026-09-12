import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  BabycowansSDK,
  CANONICAL_ECOSYSTEMS,
  buildApplicationBootstrapPlan,
  buildInitializeProtocolInstruction,
  findProtocolConfigPda,
} from "@babycowans/core-sdk";

import { runEcosystemOnboarding } from "@babycowans/core-sdk/onboarding";

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

const rpcUrl = process.env.SOLANA_RPC_URL ?? "http://127.0.0.1:8899";

const programIdValue = process.env.BABYCOWANS_PROGRAM_ID;

if (!programIdValue) {
  throw new Error("BABYCOWANS_PROGRAM_ID is required");
}

const defaultWalletPath = path.join(
  os.homedir(),
  ".config",
  "solana",
  "id.json"
);

const configuredWalletPath = process.env.SOLANA_WALLET;

if (
  configuredWalletPath !== undefined &&
  path.resolve(configuredWalletPath) !== path.resolve(defaultWalletPath)
) {
  throw new Error(
    "This bootstrap example accepts only the active default Solana wallet path"
  );
}

const walletStat = fs.statSync(defaultWalletPath);

if (!walletStat.isFile()) {
  throw new Error("The default Solana wallet must be a regular file");
}

if (
  typeof process.getuid === "function" &&
  walletStat.uid !== process.getuid()
) {
  throw new Error("The default Solana wallet must be owned by the current user");
}

const authority = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(fs.readFileSync(defaultWalletPath, "utf8"))
  )
);

const connection = new Connection(rpcUrl, "confirmed");

const programId = new PublicKey(programIdValue);

const client = new BabycowansSDK({
  connection,
  programId,
});

const applicationId = BigInt(Date.now());

/*
 * X29_LOCAL_PROTOCOL_INITIALIZATION
 *
 * RegisterApplication requires the global ProtocolConfig PDA.
 * A fresh repository-owned local validator does not contain it yet.
 * This example initializes it exactly once on local RPC only.
 * Non-local endpoints fail closed instead of silently creating
 * global protocol state.
 */
const [protocolConfig] = findProtocolConfigPda(programId);

const protocolConfigAccount = await connection.getAccountInfo(
  protocolConfig,
  "confirmed"
);

if (protocolConfigAccount === null) {
  const rpcHostname = new URL(rpcUrl).hostname;

  const localRpcHosts = new Set(["127.0.0.1", "localhost", "::1"]);

  if (!localRpcHosts.has(rpcHostname)) {
    throw new Error(
      "ProtocolConfig is not initialized. " +
        "Automatic initialization is restricted " +
        "to a local RPC endpoint. Initialize the " +
        "protocol through the deployment/operator " +
        "flow before registering an Application."
    );
  }

  const initializeProtocolInstruction = buildInitializeProtocolInstruction({
    programId,
    authority: authority.publicKey,
  });

  const initializeProtocolSignature = await sendAndConfirmTransaction(
    connection,
    new Transaction().add(initializeProtocolInstruction),
    [authority],
    {
      commitment: "confirmed",
    }
  );

  console.log(
    `BABYCOWANS_PROTOCOL_INITIALIZATION_SIGNATURE=${initializeProtocolSignature}`
  );
}

const configuredEcosystem = process.env.BABYCOWANS_ECOSYSTEM?.trim()
  .replace(/^\$/, "")
  .toUpperCase();

const selectedIdentity =
  configuredEcosystem !== undefined && configuredEcosystem.length > 0
    ? CANONICAL_ECOSYSTEMS.find(
        (identity) =>
          identity.ticker.replace(/^\$/, "").toUpperCase() ===
          configuredEcosystem
      )
    : await runEcosystemOnboarding();

if (selectedIdentity === undefined) {
  throw new Error(
    "BABYCOWANS_ECOSYSTEM must be one of: " +
      CANONICAL_ECOSYSTEMS.map((identity) =>
        identity.ticker.replace(/^\$/, "")
      ).join(", ")
  );
}

console.log(
  `BABYCOWANS_SELECTED_ECOSYSTEM=${selectedIdentity.ticker.replace(/^\$/, "")}`
);

console.log(
  `BABYCOWANS_SELECTED_CANONICAL_MINT=${selectedIdentity.tokenAddress.toBase58()}`
);

const result = await client.bootstrapApplication({
  authority,
  applicationId,
  name: "Babycowans Example",

  selectedEcosystem: selectedIdentity.ecosystem,

  config: {
    websiteUri: "https://example.com",
    logoUri: "https://example.com/logo.png",
    supportUri: "https://example.com/support",
    description: "Executable Babycowans bootstrap example",
    metadataUri: "https://example.com/metadata.json",
  },
});

if (result.applicationRole !== undefined) {
  throw new Error("Two-instruction bootstrap unexpectedly created a role.");
}

console.log("T01_BOOTSTRAP_TWO_INSTRUCTION_RUNTIME=PASS");

const applicationRead = await client.getApplication({
  authority: authority.publicKey,
  applicationId,
});

if (applicationRead === null) {
  throw new Error("Application readback returned null.");
}

if (!applicationRead.address.equals(result.application)) {
  throw new Error("Application readback PDA does not match bootstrap result.");
}

if (applicationRead.data.selectedEcosystem !== selectedIdentity.ecosystem) {
  throw new Error(
    "On-chain selected ecosystem does not match onboarding selection."
  );
}

console.log("BABYCOWANS_SELECTION_TO_BOOTSTRAP_READBACK=PASS");

console.log(
  `BABYCOWANS_READBACK_SELECTED_ECOSYSTEM=${applicationRead.data.selectedEcosystem}`
);

console.log("applicationId", applicationId.toString());

console.log("signature", result.signature);

console.log("application", result.application.toBase58());

console.log("applicationConfig", result.applicationConfig.toBase58());

console.log(`BABYCOWANS_APPLICATION_ID=${result.applicationId.toString()}`);

console.log(`BABYCOWANS_APPLICATION_ADDRESS=${result.application.toBase58()}`);

console.log(
  `BABYCOWANS_APPLICATION_AUTHORITY=${authority.publicKey.toBase58()}`
);

console.log(`BABYCOWANS_TRANSACTION_SIGNATURE=${result.signature}`);

if (process.env.BABYCOWANS_BOOTSTRAP_ASSURANCE === "1") {
  const roleApplicationId = applicationId + 1n;

  const roleResult = await client.bootstrapApplication({
    authority,
    applicationId: roleApplicationId,
    name: "Babycowans Example Role",
    selectedEcosystem: selectedIdentity.ecosystem,
    config: {
      websiteUri: "https://example.com/role",
      logoUri: "https://example.com/role-logo.png",
      supportUri: "https://example.com/role-support",
      description: "Executable three-instruction bootstrap assurance",
      metadataUri: "https://example.com/role-metadata.json",
    },
    role: {
      member: authority.publicKey,
      role: 1,
    },
  });

  if (roleResult.applicationRole === undefined) {
    throw new Error(
      "Three-instruction bootstrap did not return an ApplicationRole PDA."
    );
  }

  const roleAccount = await connection.getAccountInfo(
    roleResult.applicationRole,
    "confirmed"
  );

  if (roleAccount === null) {
    throw new Error(
      "Three-instruction bootstrap ApplicationRole readback returned null."
    );
  }

  const roleApplicationRead = await client.getApplication({
    authority: authority.publicKey,
    applicationId: roleApplicationId,
  });

  if (
    roleApplicationRead === null ||
    roleApplicationRead.data.selectedEcosystem !== selectedIdentity.ecosystem
  ) {
    throw new Error(
      "Three-instruction bootstrap Application readback failed."
    );
  }

  console.log("T01_BOOTSTRAP_THREE_INSTRUCTION_RUNTIME=PASS");
  console.log("T01_BOOTSTRAP_THREE_INSTRUCTION_READBACK=PASS");

  const rollbackApplicationId = applicationId + 2n;

  const rollbackPlan = buildApplicationBootstrapPlan({
    programId,
    authority: authority.publicKey,
    applicationId: rollbackApplicationId,
    name: "Babycowans Rollback Probe",
    selectedEcosystem: selectedIdentity.ecosystem,
    config: {
      websiteUri: "https://example.com/rollback",
      logoUri: "https://example.com/rollback-logo.png",
      supportUri: "https://example.com/rollback-support",
      description: "Atomic rollback assurance probe",
      metadataUri: "https://example.com/rollback-metadata.json",
    },
  });

  if (rollbackPlan.instructions.length !== 2) {
    throw new Error(
      "Rollback probe must use the canonical two-instruction bootstrap plan."
    );
  }

  if (
    (await connection.getAccountInfo(
      rollbackPlan.application,
      "confirmed"
    )) !== null ||
    (await connection.getAccountInfo(
      rollbackPlan.applicationConfig,
      "confirmed"
    )) !== null
  ) {
    throw new Error("Rollback probe accounts unexpectedly exist before send.");
  }

  const registerInstruction = rollbackPlan.instructions[0];
  const configureInstruction = rollbackPlan.instructions[1];

  if (
    registerInstruction === undefined ||
    configureInstruction === undefined
  ) {
    throw new Error("Rollback probe instruction plan is incomplete.");
  }

  const foreignApplication = Keypair.generate().publicKey;

  const poisonedConfigureInstruction =
    new TransactionInstruction({
      programId: configureInstruction.programId,
      keys: configureInstruction.keys.map(
        (meta, index) =>
          index === 0
            ? {
                ...meta,
                pubkey: foreignApplication,
              }
            : meta
      ),
      data: Buffer.from(configureInstruction.data),
    });

  let deliberateFailureObserved = false;

  try {
    await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        registerInstruction,
        poisonedConfigureInstruction
      ),
      [authority],
      {
        commitment: "confirmed",
      }
    );
  } catch (error: unknown) {
    const candidate = error as {
      message?: string;
      logs?: unknown[];
    };

    const failureText = [
      candidate.message ?? String(error),
      ...(Array.isArray(candidate.logs)
        ? candidate.logs.map(String)
        : []),
    ].join("\n");

    if (
      /Unable to obtain a new blockhash|ECONN|ETIMEDOUT|fetch failed/i.test(
        failureText
      )
    ) {
      throw error;
    }

    deliberateFailureObserved = true;
  }

  if (!deliberateFailureObserved) {
    throw new Error(
      "Deliberate second-instruction failure unexpectedly succeeded."
    );
  }

  console.log(
    "T01_BOOTSTRAP_DELIBERATE_SECOND_INSTRUCTION_FAILURE=PASS"
  );

  if (
    (await connection.getAccountInfo(
      rollbackPlan.application,
      "confirmed"
    )) !== null ||
    (await connection.getAccountInfo(
      rollbackPlan.applicationConfig,
      "confirmed"
    )) !== null
  ) {
    throw new Error(
      "Atomic bootstrap rollback left partial Application state behind."
    );
  }

  console.log("T01_BOOTSTRAP_ATOMIC_ROLLBACK=PASS");
  console.log("BABYCOWANS_BOOTSTRAP_ASSURANCE=PASS");
}
