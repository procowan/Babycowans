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

const tmpRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "babycowans-packed-consumer-"),
);

try {
  execFileSync(
    "npm",
    ["pack", "--pack-destination", tmpRoot],
    {
      cwd: sdkRoot,
      stdio: "inherit",
    },
  );

  const tarballs = fs.readdirSync(tmpRoot)
    .filter((name) => name.endsWith(".tgz"));

  assert.equal(
    tarballs.length,
    1,
    "exactly one SDK tarball must be produced",
  );

  const tarball = path.join(tmpRoot, tarballs[0]);

  const consumerRoot = path.join(tmpRoot, "consumer");
  fs.mkdirSync(consumerRoot);

  const consumerPackage = {
    private: true,
    type: "module",
    dependencies: {
      "@babycowans/core-sdk": `file:${tarball}`,
    },
  };

  fs.writeFileSync(
    path.join(consumerRoot, "package.json"),
    JSON.stringify(consumerPackage, null, 2) + "\n",
  );

  const consumerInstallLog =
    path.join(tmpRoot, "consumer-install.log");

  const consumerInstallFd =
    fs.openSync(consumerInstallLog, "w");

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
        "--fetch-retries=0",
        "--fetch-timeout=15000",
        "--loglevel=error",
      ],
      {
        cwd: consumerRoot,
        stdio: [
          "ignore",
          consumerInstallFd,
          consumerInstallFd,
        ],
        timeout: 120000,
        killSignal: "SIGTERM",
      },
    );
  } catch (error) {
    const log = fs.existsSync(consumerInstallLog)
      ? fs.readFileSync(consumerInstallLog, "utf8")
      : "";

    process.stderr.write(
      "\nPACKED_CONSUMER_INSTALL_LOG_BEGIN\n" +
      log +
      "\nPACKED_CONSUMER_INSTALL_LOG_END\n",
    );

    if (
      error?.code === "ETIMEDOUT" ||
      error?.signal === "SIGTERM"
    ) {
      throw new Error(
        "PACKED_CONSUMER_DEPENDENCY_INSTALL_TIMEOUT",
      );
    }

    const logText = fs.existsSync(consumerInstallLog)
      ? fs.readFileSync(consumerInstallLog, "utf8")
      : "";

    if (
      /FETCH_ERROR|network timeout|EAI_AGAIN|ECONNRESET|ETIMEDOUT|ENETUNREACH|registry\.yarnpkg\.com|registry\.npmjs\.org/i.test(
        logText,
      )
    ) {
      const environmentError = new Error(
          "PACKED_CONSUMER_ENVIRONMENT_OR_REGISTRY_TIMEOUT",
        );
        environmentError.code =
          "BABYCOWANS_PACKED_CONSUMER_ENVIRONMENT_LIMITATION";
        throw environmentError;
    }

    throw error;
  } finally {
    fs.closeSync(consumerInstallFd);
  }

  console.log(
    "PACKED_CONSUMER_DEPENDENCY_INSTALL=PASS",
  );

  /*
   * Execute the real package lifecycle after deterministic dependency
   * resolution. This exercises @babycowans/core-sdk postinstall without
   * coupling the proof to a second dependency-resolution pass.
   */
  const lifecycleLog =
    path.join(tmpRoot, "consumer-lifecycle.log");

  const lifecycleFd =
    fs.openSync(lifecycleLog, "w");

  try {
    execFileSync(
      "npm",
      [
        "rebuild",
        "@babycowans/core-sdk",
        "--foreground-scripts",
        "--no-audit",
        "--no-fund",
        "--loglevel=error",
      ],
      {
        cwd: consumerRoot,
        stdio: [
          "ignore",
          lifecycleFd,
          lifecycleFd,
        ],
        timeout: 60000,
        killSignal: "SIGTERM",
      },
    );
  } catch (error) {
    const log = fs.existsSync(lifecycleLog)
      ? fs.readFileSync(lifecycleLog, "utf8")
      : "";

    process.stderr.write(
      "\nPACKED_CONSUMER_LIFECYCLE_LOG_BEGIN\n" +
      log +
      "\nPACKED_CONSUMER_LIFECYCLE_LOG_END\n",
    );

    if (
      error?.code === "ETIMEDOUT" ||
      error?.signal === "SIGTERM"
    ) {
      throw new Error(
        "PACKED_CONSUMER_LIFECYCLE_TIMEOUT",
      );
    }

    throw error;
  } finally {
    fs.closeSync(lifecycleFd);
  }

  console.log(
    "PACKED_CONSUMER_POSTINSTALL_LIFECYCLE=PASS",
  );

  const smoke = `
    import assert from "node:assert/strict";
    import {
      BabycowansSDK,
      CANONICAL_ECOSYSTEMS,
      CanonicalEcosystem,
      buildApplicationBootstrapPlan,
      findApplicationPda,
    } from "@babycowans/core-sdk";

    import {
      runEcosystemOnboarding,
    } from "@babycowans/core-sdk/onboarding";

    import {
      PublicKey,
    } from "@solana/web3.js";

    assert.equal(typeof BabycowansSDK, "function");
    assert.equal(typeof buildApplicationBootstrapPlan, "function");
    assert.equal(typeof findApplicationPda, "function");
    assert.equal(typeof runEcosystemOnboarding, "function");
    assert.equal(CANONICAL_ECOSYSTEMS.length, 6);

    const programId =
      new PublicKey(Buffer.alloc(32, 71));

    const authority =
      new PublicKey(Buffer.alloc(32, 72));

    const applicationId =
      9007199254740993n;

    const base = {
      programId,
      authority,
      applicationId,
      name: "Packed Consumer",
      selectedEcosystem:
        CanonicalEcosystem.BabyReptile,
      config: {
        websiteUri: "https://example.test",
        logoUri: "https://example.test/logo.png",
        supportUri: "https://example.test/support",
        description: "packed consumer assurance",
        metadataUri: "https://example.test/meta.json",
      },
    };

    const two = buildApplicationBootstrapPlan(base);

    assert.equal(two.instructions.length, 2);
    assert.equal(two.applicationRole, undefined);

    const member =
      new PublicKey(Buffer.alloc(32, 73));

    const three =
      buildApplicationBootstrapPlan({
        ...base,
        applicationId: applicationId + 1n,
        role: {
          member,
          role: 1,
        },
      });

    assert.equal(three.instructions.length, 3);
    assert.ok(three.applicationRole);

    console.log("PACKED_ROOT_IMPORT=PASS");
    console.log("PACKED_ONBOARDING_SUBPATH_IMPORT=PASS");
    console.log("PACKED_CANONICAL_ECOSYSTEM_COUNT=6");
    console.log("PACKED_BOOTSTRAP_TWO_INSTRUCTION_PLAN=PASS");
    console.log("PACKED_BOOTSTRAP_THREE_INSTRUCTION_PLAN=PASS");
  `;

  const smokePath =
    path.join(consumerRoot, "smoke.mjs");

  fs.writeFileSync(smokePath, smoke);

  execFileSync(
    process.execPath,
    [smokePath],
    {
      cwd: consumerRoot,
      stdio: "inherit",
    },
  );

  /*
   * Validate the actual tracked examples against the packed SDK,
   * without modifying examples/package.json in the repository.
   */
  const exampleConsumer =
    path.join(tmpRoot, "examples-consumer");

  fs.cpSync(
    examplesRoot,
    exampleConsumer,
    {
      recursive: true,
      filter(source) {
        return !source.includes(
          `${path.sep}node_modules${path.sep}`,
        );
      },
    },
  );

  const examplePackagePath =
    path.join(exampleConsumer, "package.json");

  const examplePackage =
    JSON.parse(
      fs.readFileSync(
        examplePackagePath,
        "utf8",
      ),
    );

  examplePackage.dependencies[
    "@babycowans/core-sdk"
  ] = `file:${tarball}`;

  fs.writeFileSync(
    examplePackagePath,
    JSON.stringify(examplePackage, null, 2) + "\n",
  );

  if (
    fs.existsSync(
      path.join(exampleConsumer, "yarn.lock"),
    )
  ) {
    fs.rmSync(
      path.join(exampleConsumer, "yarn.lock"),
    );
  }

  const exampleInstallLog =
    path.join(tmpRoot, "examples-install.log");

  const exampleInstallFd =
    fs.openSync(exampleInstallLog, "w");

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
        stdio: [
          "ignore",
          exampleInstallFd,
          exampleInstallFd,
        ],
        timeout: 120000,
        killSignal: "SIGTERM",
      },
    );
  } catch (error) {
    const log = fs.existsSync(exampleInstallLog)
      ? fs.readFileSync(exampleInstallLog, "utf8")
      : "";

    process.stderr.write(
      "\nPACKED_EXAMPLES_INSTALL_LOG_BEGIN\n" +
      log +
      "\nPACKED_EXAMPLES_INSTALL_LOG_END\n",
    );

    if (
      error?.code === "ETIMEDOUT" ||
      error?.signal === "SIGTERM"
    ) {
      throw new Error(
        "PACKED_EXAMPLES_DEPENDENCY_INSTALL_TIMEOUT",
      );
    }

    throw error;
  } finally {
    fs.closeSync(exampleInstallFd);
  }

  console.log(
    "PACKED_EXAMPLES_DEPENDENCY_INSTALL=PASS",
  );

  execFileSync(
    "npm",
    ["run", "typecheck"],
    {
      cwd: exampleConsumer,
      stdio: "inherit",
    },
  );

  console.log(
    "TRACKED_EXAMPLES_PACKED_SDK_TYPECHECK=PASS",
  );
  console.log(
    "PACKED_CONSUMER_ASSURANCE=PASS",
  );
} finally {
  fs.rmSync(tmpRoot, {
    recursive: true,
    force: true,
  });
}
