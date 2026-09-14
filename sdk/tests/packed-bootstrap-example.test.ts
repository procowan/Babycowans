import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const sdkRoot = path.resolve(here, "..");
const repoRoot = path.resolve(sdkRoot, "..");
const examplesRoot = path.join(repoRoot, "examples");

const rpcUrl = process.env.BABYCOWANS_RPC_URL;
const programId = process.env.BABYCOWANS_PROGRAM_ID;

if (!rpcUrl) {
  throw new Error("BABYCOWANS_RPC_URL is required");
}

if (!programId) {
  throw new Error("BABYCOWANS_PROGRAM_ID is required");
}

const tmpRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "babycowans-packed-bootstrap-"),
);

try {
  const releaseAsset = process.env.BABYCOWANS_SDK_RELEASE_ASSET;
  const expectedSha256 =
    "277cf70db8fbbbaeedf126b51c4abae226ffafdaa10f5af84b13f042350accee";

  if (!releaseAsset) {
    throw new Error("BABYCOWANS_SDK_RELEASE_ASSET is required");
  }

  const tarball = path.resolve(releaseAsset);
  assert.equal(path.basename(tarball), "babycowans-core-sdk-1.0.0.tgz");
  assert.equal(
    fs.existsSync(tarball),
    true,
    "release SDK asset is missing",
  );

  const actualSha256 = execFileSync(
    "sha256sum",
    [tarball],
    { encoding: "utf8" },
  ).trim().split(/\s+/u)[0];

  assert.equal(
    actualSha256,
    expectedSha256,
    "release SDK SHA-256 mismatch",
  );

  const exampleConsumer = path.join(
    tmpRoot,
    "examples-consumer",
  );

  fs.cpSync(examplesRoot, exampleConsumer, {
    recursive: true,
    filter(source) {
      return !source.includes(
        `${path.sep}node_modules${path.sep}`,
      );
    },
  });

  const packagePath = path.join(
    exampleConsumer,
    "package.json",
  );

  const packageJson = JSON.parse(
    fs.readFileSync(packagePath, "utf8"),
  );

  packageJson.dependencies ??= {};
  packageJson.dependencies["@babycowans/core-sdk"] =
    `file:${tarball}`;

  fs.writeFileSync(
    packagePath,
    JSON.stringify(packageJson, null, 2) + "\n",
  );

  fs.rmSync(
    path.join(exampleConsumer, "yarn.lock"),
    { force: true },
  );

  const installLog = path.join(
    tmpRoot,
    "install.log",
  );

  const installFd = fs.openSync(installLog, "w");

  try {
    execFileSync(
      "npm",
      [
        "install",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--package-lock=false",
        "--no-progress",
        "--prefer-offline",
        "--fetch-retries=1",
        "--fetch-retry-mintimeout=1000",
        "--fetch-retry-maxtimeout=5000",
        "--fetch-timeout=30000",
        "--loglevel=error",
      ],
      {
        cwd: exampleConsumer,
        stdio: ["ignore", installFd, installFd],
        timeout: 180_000,
        killSignal: "SIGTERM",
      },
    );
  } finally {
    fs.closeSync(installFd);
  }

  const installedSdkManifest = JSON.parse(
    fs.readFileSync(
      path.join(
        exampleConsumer,
        "node_modules",
        "@babycowans",
        "core-sdk",
        "package.json",
      ),
      "utf8",
    ),
  );

  assert.equal(
    installedSdkManifest.name,
    "@babycowans/core-sdk",
  );
  assert.equal(installedSdkManifest.version, "1.0.0");
  assert.equal(
    installedSdkManifest.peerDependencies?.[
      "@solana/web3.js"
    ],
    "1.98.4",
  );

  const output = execFileSync(
    "npm",
    ["run", "application-bootstrap"],
    {
      cwd: exampleConsumer,
      encoding: "utf8",
      env: {
        ...process.env,
        SOLANA_RPC_URL: rpcUrl,
        BABYCOWANS_PROGRAM_ID: programId,
        BABYCOWANS_ECOSYSTEM: "BRC",
        BABYCOWANS_BOOTSTRAP_ASSURANCE: "1",
      },
      timeout: 180_000,
      killSignal: "SIGTERM",
    },
  );

  process.stdout.write(output);

  const requiredMarkers = [
    "T01_BOOTSTRAP_TWO_INSTRUCTION_RUNTIME=PASS",
    "BABYCOWANS_SELECTION_TO_BOOTSTRAP_READBACK=PASS",
    "T01_BOOTSTRAP_THREE_INSTRUCTION_RUNTIME=PASS",
    "T01_BOOTSTRAP_THREE_INSTRUCTION_READBACK=PASS",
    "T01_BOOTSTRAP_DELIBERATE_SECOND_INSTRUCTION_FAILURE=PASS",
    "P100_B_B3_CONFIRMED_PROGRAM_FAILURE=PASS",
    "P100_B_B3_ROLLBACK_ACCOUNTS_ABSENT=PASS",
    "P100_B_B3_COUNTER_UNCHANGED=PASS",
    "P100_B_B4_CONFIRMED_PROGRAM_FAILURE=PASS",
    "P100_B_B4_INSTRUCTION_INDEX_2=PASS",
    "P100_B_B4_ROLLBACK_ACCOUNTS_ABSENT=PASS",
    "P100_B_B4_COUNTER_UNCHANGED=PASS",
    "T01_BOOTSTRAP_ATOMIC_ROLLBACK=PASS",
    "BABYCOWANS_BOOTSTRAP_ASSURANCE=PASS",
  ];

  for (const marker of requiredMarkers) {
    assert.ok(
      output.includes(marker),
      `missing bootstrap marker: ${marker}`,
    );
  }

  console.log(
    "T01_PACKED_CANONICAL_EXAMPLE_RUNTIME=PASS",
  );
  console.log(
    "T01_PACKED_CANONICAL_EXAMPLE_ARTIFACT=PASS",
  );

  // P100-B / R10 — permanent ASTRA negative control:
  // a transaction whose signature bytes are corrupted must never be
  // accepted as evidence of a submitted program failure or atomic rollback.
  const bootstrapSourcePath = path.join(
    exampleConsumer,
    "application-bootstrap.ts",
  );
  const bootstrapSource = fs.readFileSync(
    bootstrapSourcePath,
    "utf8",
  );

  const signatureAnchor = [
    '    args.transaction.sign(authority);',
    '',
    '    const raw = args.transaction.serialize();',
  ].join("\n");

  assert.equal(
    bootstrapSource.includes(signatureAnchor),
    true,
    "signature-verification fault anchor is missing",
  );

  const signatureFaultSource = bootstrapSource.replace(
    signatureAnchor,
    [
      '    args.transaction.sign(authority);',
      '',
      '    if (process.env.P100_B_SIGNATURE_VERIFICATION_FAULT === "1") {',
      '      const signature = args.transaction.signatures[0]?.signature;',
      '',
      '      if (signature === null || signature === undefined) {',
      '        throw new Error("P100_B_SIGNATURE_VERIFICATION_FAULT_SIGNATURE_MISSING");',
      '      }',
      '',
      '      signature[0] ^= 0xff;',
      '    }',
      '',
      '    const raw = args.transaction.serialize();',
    ].join("\n"),
  );

  assert.notEqual(
    signatureFaultSource,
    bootstrapSource,
    "signature-verification fault injection did not modify disposable source",
  );

  fs.writeFileSync(
    bootstrapSourcePath,
    signatureFaultSource,
    "utf8",
  );

  const negative = spawnSync(
    "npm",
    ["run", "application-bootstrap"],
    {
      cwd: exampleConsumer,
      encoding: "utf8",
      env: {
        ...process.env,
        SOLANA_RPC_URL: rpcUrl,
        BABYCOWANS_PROGRAM_ID: programId,
        BABYCOWANS_ECOSYSTEM: "BRC",
        BABYCOWANS_BOOTSTRAP_ASSURANCE: "1",
        P100_B_SIGNATURE_VERIFICATION_FAULT: "1",
      },
      timeout: 180_000,
      killSignal: "SIGTERM",
    },
  );

  const negativeOutput = [
    negative.stdout ?? "",
    negative.stderr ?? "",
  ].join("\n");

  process.stdout.write(negativeOutput);

  assert.notEqual(
    negative.status,
    0,
    "signature-verification fault unexpectedly succeeded",
  );
  assert.equal(
    negative.signal,
    null,
    "signature-verification negative control was terminated by signal",
  );
  assert.match(
    negativeOutput,
    /signature verification|signature.*verify|verify.*signature/i,
    "signature-verification failure was not observed",
  );
  assert.equal(
    negativeOutput.includes("BABYCOWANS_BOOTSTRAP_ASSURANCE=PASS"),
    false,
    "signature-verification failure produced false assurance PASS",
  );
  assert.equal(
    negativeOutput.includes("T01_BOOTSTRAP_ATOMIC_ROLLBACK=PASS"),
    false,
    "signature-verification failure produced false rollback PASS",
  );

  console.log("P100_B_SIGNATURE_VERIFICATION_ERROR_OBSERVED=PASS");
  console.log("P100_B_SIGNATURE_VERIFICATION_FALSE_ASSURANCE=0");
  console.log("P100_B_SIGNATURE_VERIFICATION_FALSE_ROLLBACK=0");
  console.log("P100_B_SIGNATURE_VERIFICATION_NEGATIVE=PASS");
} finally {
  fs.rmSync(tmpRoot, {
    recursive: true,
    force: true,
  });
}
