import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
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
  execFileSync("yarn", ["build"], {
    cwd: sdkRoot,
    stdio: "inherit",
    timeout: 120_000,
  });

  execFileSync(
    "npm",
    ["pack", "--pack-destination", tmpRoot],
    {
      cwd: sdkRoot,
      stdio: "inherit",
      timeout: 60_000,
    },
  );

  const tarballs = fs
    .readdirSync(tmpRoot)
    .filter((name) => name.endsWith(".tgz"));

  assert.deepEqual(
    tarballs,
    ["babycowans-core-sdk-1.0.0.tgz"],
  );

  const tarball = path.join(tmpRoot, tarballs[0]);

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
} finally {
  fs.rmSync(tmpRoot, {
    recursive: true,
    force: true,
  });
}
