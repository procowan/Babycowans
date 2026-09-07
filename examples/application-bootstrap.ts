import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  BabycowansSDK,
  CANONICAL_ECOSYSTEMS,
  buildInitializeProtocolInstruction,
  findProtocolConfigPda,
} from "@babycowans/core-sdk";

import { runEcosystemOnboarding } from "@babycowans/core-sdk/onboarding";

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
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
