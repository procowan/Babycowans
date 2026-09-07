const { mkdtempSync, rmSync, writeFileSync } = require("node:fs");

const { tmpdir } = require("node:os");

const path = require("node:path");

const { spawnSync } = require("node:child_process");

const sdkRoot = path.resolve(__dirname, "..");

const gate = path.join(sdkRoot, "scripts", "runtime-audit-gate.cjs");

const tmp = mkdtempSync(path.join(tmpdir(), "babycowans-audit-regression-"));

const preload = path.join(tmp, "mock-spawn.cjs");

writeFileSync(
  preload,
  String.raw`
const childProcess =
  require("node:child_process");

const scenario =
  process.env.BABYCOWANS_AUDIT_TEST_SCENARIO;

const known = {
  type: "auditAdvisory",
  data: {
    advisory: {
      id: 1119441,
      github_advisory_id:
        "GHSA-w5hq-g745-h8pq",
      module_name: "uuid",
      title:
        "uuid: Missing buffer bounds check "
        + "in v3/v5/v6 when buf is provided",
      severity: "moderate",
    },
  },
};

const streamJsonKnown = {
  type: "auditAdvisory",
  data: {
    advisory: {
      id: 1164823,
      github_advisory_id:
        "GHSA-528h-pc64-c93x",
      module_name: "stream-json",
      title:
        "stream-json: pick/ignore/filter/replace filters "
        + "are O(depth²) on nested input — small crafted "
        + "JSON blocks the event loop for seconds→minutes (DoS)",
      severity: "moderate",
    },
  },
};

const unknown = {
  type: "auditAdvisory",
  data: {
    advisory: {
      id: 9999999,
      github_advisory_id:
        "GHSA-controlled-unknown",
      module_name: "controlled",
      title: "Controlled unknown advisory",
      severity: "high",
    },
  },
};

const vulnerableSummary = {
  type: "auditSummary",
  data: {
    vulnerabilities: {
      info: 0,
      low: 0,
      moderate: 1,
      high: 0,
      critical: 0,
    },
  },
};

const cleanSummary = {
  type: "auditSummary",
  data: {
    vulnerabilities: {
      info: 0,
      low: 0,
      moderate: 0,
      high: 0,
      critical: 0,
    },
  },
};

const guardOutput = [
  "BABYCOWANS_JAYSON_UUID_V4_ONLY=PASS",
  "BABYCOWANS_UUID_ADVISORY_RUNTIME_PATH=V4_ONLY",
  "BABYCOWANS_DEPENDENCY_VERSION=stream-json@1.9.1",
  "BABYCOWANS_JAYSON_STREAM_JSON_RANGE=^1.9.1",
  "BABYCOWANS_STREAM_JSON_ADVISORY_FILTER_IMPORTS=ABSENT",
  "BABYCOWANS_STREAM_JSON_ADVISORY_FILTER_LOAD=ABSENT",
  "BABYCOWANS_STREAM_JSON_VERSION_CONTRACT=PASS",
].join("\n");

childProcess.spawnSync =
  function controlledSpawn(command, args) {
    if (
      Array.isArray(args)
      && args.includes(
        "scripts/runtime-dependency-guard.cjs",
      )
    ) {
      if (
        scenario
        === "COMPLETE_KNOWN_MISSING_STREAM_GUARD"
      ) {
        return {
          status: 0,
          signal: null,
          error: undefined,
          stdout: [
            "BABYCOWANS_JAYSON_UUID_V4_ONLY=PASS",
            "BABYCOWANS_UUID_ADVISORY_RUNTIME_PATH=V4_ONLY",
          ].join("\n"),
          stderr: "",
        };
      }

      return {
        status: 0,
        signal: null,
        error: undefined,
        stdout: guardOutput,
        stderr: "",
      };
    }

    if (scenario === "COMPLETE_KNOWN") {
      return {
        status: 4,
        signal: null,
        error: undefined,
        stdout:
          JSON.stringify(known)
          + "\n"
          + JSON.stringify(streamJsonKnown)
          + "\n"
          + JSON.stringify(vulnerableSummary)
          + "\n",
        stderr: "",
      };
    }

    if (scenario === "COMPLETE_CLEAN") {
      return {
        status: 0,
        signal: null,
        error: undefined,
        stdout:
          JSON.stringify(cleanSummary)
          + "\n",
        stderr: "",
      };
    }

    if (scenario === "INTERRUPTED_KNOWN") {
      return {
        status: null,
        signal: "SIGTERM",
        error: undefined,
        stdout:
          JSON.stringify(known)
          + "\n",
        stderr: "",
      };
    }

    if (scenario === "SPAWN_ERROR_KNOWN") {
      return {
        status: null,
        signal: null,
        error:
          new Error(
            "controlled spawn failure",
          ),
        stdout:
          JSON.stringify(known)
          + "\n",
        stderr: "",
      };
    }

    if (scenario === "INTERRUPTED_EMPTY") {
      return {
        status: null,
        signal: "SIGTERM",
        error: undefined,
        stdout: "",
        stderr: "",
      };
    }

    if (scenario === "COMPLETE_UNKNOWN") {
      return {
        status: 8,
        signal: null,
        error: undefined,
        stdout:
          JSON.stringify(unknown)
          + "\n"
          + JSON.stringify(vulnerableSummary)
          + "\n",
        stderr: "",
      };
    }

    throw new Error(
      "Unknown controlled audit scenario.",
    );
  };
`,
  "utf8"
);

function run(scenario, expectPass) {
  const result = spawnSync(process.execPath, ["--require", preload, gate], {
    cwd: sdkRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      BABYCOWANS_AUDIT_TEST_SCENARIO: scenario,
    },
  });

  const text = `${result.stdout || ""}\n` + `${result.stderr || ""}`;

  const passMarker = text.includes("BABYCOWANS_RUNTIME_AUDIT_GATE=PASS");

  const actualPass = result.status === 0 && passMarker;

  console.log(
    `F02_SCENARIO=${scenario}` +
      `|EXIT=${result.status}` +
      `|PASS_MARKER=${passMarker}`
  );

  if (actualPass !== expectPass) {
    console.error(text);

    throw new Error(`Unexpected F02 outcome: ${scenario}`);
  }

  if (!expectPass && result.status === 0) {
    throw new Error(`${scenario} did not fail closed.`);
  }
}

try {
  run("COMPLETE_KNOWN", true);
  run("COMPLETE_KNOWN_MISSING_STREAM_GUARD", false);
  run("COMPLETE_CLEAN", true);
  run("INTERRUPTED_KNOWN", false);
  run("SPAWN_ERROR_KNOWN", false);
  run("INTERRUPTED_EMPTY", false);
  run("COMPLETE_UNKNOWN", false);

  console.log("F02_RUNTIME_AUDIT_FAIL_CLOSED_REGRESSION=PASS");
} finally {
  rmSync(tmp, {
    recursive: true,
    force: true,
  });
}
