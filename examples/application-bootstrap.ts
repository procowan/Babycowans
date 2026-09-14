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

  const readProtocolApplicationCount = async (): Promise<bigint> => {
    const account = await connection.getAccountInfo(
      protocolConfig,
      "confirmed"
    );

    if (account === null) {
      throw new Error("ProtocolConfig readback returned null.");
    }

    // ProtocolConfig: discriminator + version + authority +
    // Option<Pubkey> pendingAuthority + paused + applicationCount.
    let offset = 8 + 2 + 32;
    const pendingAuthorityTag = account.data.readUInt8(offset);
    offset += 1;

    if (pendingAuthorityTag === 1) {
      offset += 32;
    } else if (pendingAuthorityTag !== 0) {
      throw new Error(
        `ProtocolConfig pendingAuthority option tag is invalid: ${pendingAuthorityTag}.`
      );
    }

    offset += 1;
    return account.data.readBigUInt64LE(offset);
  };

  const requireConfirmedInstructionFailure = async (args: {
    transaction: Transaction;
    expectedInstructionIndex: number;
    label: string;
  }): Promise<string> => {
    const latest = await connection.getLatestBlockhash("confirmed");

    args.transaction.recentBlockhash = latest.blockhash;
    args.transaction.feePayer = authority.publicKey;
    args.transaction.sign(authority);

    const raw = args.transaction.serialize();
    let signature: string;

    try {
      signature = await connection.sendRawTransaction(raw, {
        skipPreflight: true,
        maxRetries: 3,
      });
    } catch (error: unknown) {
      throw new Error(
        `${args.label}: transaction was not observably submitted; transport/signing submission failure cannot prove rollback: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    let status:
      | Awaited<ReturnType<typeof connection.getSignatureStatuses>>["value"][number]
      | null = null;

    for (let attempt = 0; attempt < 40; attempt += 1) {
      let response: Awaited<ReturnType<typeof connection.getSignatureStatuses>>;

      try {
        response = await connection.getSignatureStatuses([signature], {
          searchTransactionHistory: true,
        });
      } catch (error: unknown) {
        throw new Error(
          `${args.label}: RPC status lookup failed after submission; rollback evidence is incomplete for ${signature}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }

      status = response.value[0];

      if (
        status !== null &&
        (status.confirmationStatus === "confirmed" ||
          status.confirmationStatus === "finalized")
      ) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    if (status === null) {
      throw new Error(
        `${args.label}: submitted transaction status remained unknown; rollback evidence is incomplete for ${signature}.`
      );
    }

    if (
      status.confirmationStatus !== "confirmed" &&
      status.confirmationStatus !== "finalized"
    ) {
      throw new Error(
        `${args.label}: submitted transaction did not reach confirmed/finalized status; rollback evidence is incomplete for ${signature}.`
      );
    }

    if (status.err === null) {
      throw new Error(
        `${args.label}: deliberate failure unexpectedly succeeded for ${signature}.`
      );
    }

    const tx = await connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (tx === null) {
      throw new Error(
        `${args.label}: confirmed failed transaction could not be retrieved for ${signature}.`
      );
    }

    const metaError = tx.meta?.err;

    if (metaError === null || metaError === undefined) {
      throw new Error(
        `${args.label}: transaction metadata does not contain a program failure for ${signature}.`
      );
    }

    const instructionError =
      typeof metaError === "object" &&
      metaError !== null &&
      "InstructionError" in metaError
        ? (metaError as {
            InstructionError?: [number, unknown];
          }).InstructionError
        : undefined;

    if (
      !Array.isArray(instructionError) ||
      instructionError.length < 2 ||
      instructionError[0] !== args.expectedInstructionIndex
    ) {
      throw new Error(
        `${args.label}: expected InstructionError index ${args.expectedInstructionIndex}, observed ${JSON.stringify(
          metaError
        )}.`
      );
    }

    console.log(`${args.label}_SIGNATURE=${signature}`);
    console.log(
      `${args.label}_INSTRUCTION_ERROR_INDEX=${instructionError[0]}`
    );

    return signature;
  };

  const assertRollbackAccountsAbsent = async (args: {
    application: PublicKey;
    applicationConfig: PublicKey;
    applicationRole?: PublicKey;
    label: string;
  }): Promise<void> => {
    const applicationAccount = await connection.getAccountInfo(
      args.application,
      "confirmed"
    );
    const configAccount = await connection.getAccountInfo(
      args.applicationConfig,
      "confirmed"
    );
    const roleAccount =
      args.applicationRole === undefined
        ? null
        : await connection.getAccountInfo(
            args.applicationRole,
            "confirmed"
          );

    if (
      applicationAccount !== null ||
      configAccount !== null ||
      roleAccount !== null
    ) {
      throw new Error(
        `${args.label}: failed bootstrap left residual program state behind.`
      );
    }
  };

  // B3 — instruction 2 fails after instruction 1 executes.
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

  await assertRollbackAccountsAbsent({
    application: rollbackPlan.application,
    applicationConfig: rollbackPlan.applicationConfig,
    label: "P100_B_B3_PRESTATE",
  });

  const registerInstruction = rollbackPlan.instructions[0];
  const configureInstruction = rollbackPlan.instructions[1];

  if (
    registerInstruction === undefined ||
    configureInstruction === undefined
  ) {
    throw new Error("Rollback probe instruction plan is incomplete.");
  }

  const b3CounterBefore = await readProtocolApplicationCount();
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

  await requireConfirmedInstructionFailure({
    transaction: new Transaction().add(
      registerInstruction,
      poisonedConfigureInstruction
    ),
    expectedInstructionIndex: 1,
    label: "P100_B_B3",
  });

  await assertRollbackAccountsAbsent({
    application: rollbackPlan.application,
    applicationConfig: rollbackPlan.applicationConfig,
    label: "P100_B_B3_POSTSTATE",
  });

  const b3CounterAfter = await readProtocolApplicationCount();

  if (b3CounterAfter !== b3CounterBefore) {
    throw new Error(
      `P100_B_B3: ProtocolConfig application counter changed across failed transaction: before=${b3CounterBefore.toString()} after=${b3CounterAfter.toString()}.`
    );
  }

  console.log(
    "T01_BOOTSTRAP_DELIBERATE_SECOND_INSTRUCTION_FAILURE=PASS"
  );
  console.log("P100_B_B3_CONFIRMED_PROGRAM_FAILURE=PASS");
  console.log("P100_B_B3_ROLLBACK_ACCOUNTS_ABSENT=PASS");
  console.log("P100_B_B3_COUNTER_UNCHANGED=PASS");

  // B4 — instruction 3 fails after instructions 1 and 2 execute.
  const thirdFailureApplicationId = applicationId + 3n;

  const thirdFailurePlan = buildApplicationBootstrapPlan({
    programId,
    authority: authority.publicKey,
    applicationId: thirdFailureApplicationId,
    name: "Babycowans Third Instruction Rollback Probe",
    selectedEcosystem: selectedIdentity.ecosystem,
    config: {
      websiteUri: "https://example.com/rollback-third",
      logoUri: "https://example.com/rollback-third-logo.png",
      supportUri: "https://example.com/rollback-third-support",
      description: "Third-instruction atomic rollback assurance probe",
      metadataUri: "https://example.com/rollback-third-metadata.json",
    },
    role: {
      member: authority.publicKey,
      role: 1,
    },
  });

  if (
    thirdFailurePlan.instructions.length !== 3 ||
    thirdFailurePlan.applicationRole === undefined
  ) {
    throw new Error(
      "Third-instruction rollback probe must use the canonical three-instruction bootstrap plan."
    );
  }

  await assertRollbackAccountsAbsent({
    application: thirdFailurePlan.application,
    applicationConfig: thirdFailurePlan.applicationConfig,
    applicationRole: thirdFailurePlan.applicationRole,
    label: "P100_B_B4_PRESTATE",
  });

  const thirdRegisterInstruction = thirdFailurePlan.instructions[0];
  const thirdConfigureInstruction = thirdFailurePlan.instructions[1];
  const roleInstruction = thirdFailurePlan.instructions[2];

  if (
    thirdRegisterInstruction === undefined ||
    thirdConfigureInstruction === undefined ||
    roleInstruction === undefined
  ) {
    throw new Error(
      "Third-instruction rollback probe instruction plan is incomplete."
    );
  }

  const b4CounterBefore = await readProtocolApplicationCount();
  const foreignRoleApplication = Keypair.generate().publicKey;

  const poisonedRoleInstruction =
    new TransactionInstruction({
      programId: roleInstruction.programId,
      keys: roleInstruction.keys.map(
        (meta, index) =>
          index === 0
            ? {
                ...meta,
                pubkey: foreignRoleApplication,
              }
            : meta
      ),
      data: Buffer.from(roleInstruction.data),
    });

  await requireConfirmedInstructionFailure({
    transaction: new Transaction().add(
      thirdRegisterInstruction,
      thirdConfigureInstruction,
      poisonedRoleInstruction
    ),
    expectedInstructionIndex: 2,
    label: "P100_B_B4",
  });

  await assertRollbackAccountsAbsent({
    application: thirdFailurePlan.application,
    applicationConfig: thirdFailurePlan.applicationConfig,
    applicationRole: thirdFailurePlan.applicationRole,
    label: "P100_B_B4_POSTSTATE",
  });

  const b4CounterAfter = await readProtocolApplicationCount();

  if (b4CounterAfter !== b4CounterBefore) {
    throw new Error(
      `P100_B_B4: ProtocolConfig application counter changed across failed transaction: before=${b4CounterBefore.toString()} after=${b4CounterAfter.toString()}.`
    );
  }

  console.log("P100_B_B4_CONFIRMED_PROGRAM_FAILURE=PASS");
  console.log("P100_B_B4_INSTRUCTION_INDEX_2=PASS");
  console.log("P100_B_B4_ROLLBACK_ACCOUNTS_ABSENT=PASS");
  console.log("P100_B_B4_COUNTER_UNCHANGED=PASS");

  console.log("T01_BOOTSTRAP_ATOMIC_ROLLBACK=PASS");
  console.log("BABYCOWANS_BOOTSTRAP_ASSURANCE=PASS");
}
