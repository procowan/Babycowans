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
const childProcess = require("node:child_process");
const scenario = process.env.BABYCOWANS_AUDIT_TEST_SCENARIO;

const known = {
  type: "auditAdvisory",
  data: {
    advisory: {
      id: 1119441,
      github_advisory_id: "GHSA-w5hq-g745-h8pq",
      module_name: "uuid",
      title: "uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided",
      severity: "moderate",
    },
  },
};

const streamJsonKnown = {
  type: "auditAdvisory",
  data: {
    advisory: {
      id: 1164823,
      github_advisory_id: "GHSA-528h-pc64-c93x",
      module_name: "stream-json",
      title: "stream-json: pick/ignore/filter/replace filters are O(depth²) on nested input — small crafted JSON blocks the event loop for seconds→minutes (DoS)",
      severity: "moderate",
    },
  },
};

const unknown = {
  type: "auditAdvisory",
  data: {
    advisory: {
      id: 9999999,
      github_advisory_id: "GHSA-controlled-unknown",
      module_name: "controlled",
      title: "Controlled unknown advisory",
      severity: "high",
    },
  },
};

const summary = (values) => ({
  type: "auditSummary",
  data: {
    vulnerabilities: {
      info: 0,
      low: 0,
      moderate: 0,
      high: 0,
      critical: 0,
      ...values,
    },
  },
});

const cleanSummary = summary({});
const knownSummary = summary({ moderate: 2 });
const unknownSummary = summary({ high: 1 });
const mismatchedKnownSummary = summary({ moderate: 1 });

const guardOutput = [
  "BABYCOWANS_JAYSON_UUID_V4_ONLY=PASS",
  "BABYCOWANS_UUID_ADVISORY_RUNTIME_PATH=V4_ONLY",
  "BABYCOWANS_DEPENDENCY_VERSION=stream-json@1.9.1",
  "BABYCOWANS_JAYSON_STREAM_JSON_RANGE=^1.9.1",
  "BABYCOWANS_STREAM_JSON_ADVISORY_FILTER_IMPORTS=ABSENT",
  "BABYCOWANS_STREAM_JSON_ADVISORY_FILTER_LOAD=ABSENT",
  "BABYCOWANS_STREAM_JSON_VERSION_CONTRACT=PASS",
].join("\n");

function result(status, stdout, options = {}) {
  return {
    status,
    signal: options.signal ?? null,
    error: options.error,
    stdout,
    stderr: options.stderr ?? "",
  };
}

childProcess.spawnSync = function controlledSpawn(command, args) {
  if (
    Array.isArray(args) &&
    args.includes("scripts/runtime-dependency-guard.cjs")
  ) {
    if (scenario === "COMPLETE_KNOWN_MISSING_STREAM_GUARD") {
      return result(
        0,
        [
          "BABYCOWANS_JAYSON_UUID_V4_ONLY=PASS",
          "BABYCOWANS_UUID_ADVISORY_RUNTIME_PATH=V4_ONLY",
        ].join("\n"),
      );
    }

    return result(0, guardOutput);
  }

  if (
    !Array.isArray(args) ||
    args.length !== 2 ||
    args[0] !== "audit" ||
    args[1] !== "--json"
  ) {
    throw new Error(
      "Audit invocation must cover the complete installed graph with: yarn audit --json",
    );
  }

  const lines = (...records) =>
    records.map((record) =>
      typeof record === "string" ? record : JSON.stringify(record)
    ).join("\n") + "\n";

  switch (scenario) {
    case "COMPLETE_KNOWN":
      return result(4, lines(known, streamJsonKnown, knownSummary));
    case "COMPLETE_CLEAN":
      return result(0, lines(cleanSummary));
    case "COMPLETE_UNKNOWN":
      return result(8, lines(unknown, unknownSummary));
    case "COMPLETE_KNOWN_MISSING_STREAM_GUARD":
      return result(4, lines(known, streamJsonKnown, knownSummary));
    case "INTERRUPTED_KNOWN":
      return result(null, lines(known), { signal: "SIGTERM" });
    case "SPAWN_ERROR_KNOWN":
      return result(null, lines(known), {
        error: new Error("controlled spawn failure"),
      });
    case "INTERRUPTED_EMPTY":
      return result(null, "", { signal: "SIGTERM" });
    case "NULL_STATUS":
      return result(null, lines(cleanSummary));
    case "MAXBUFFER":
      return result(null, lines(known), {
        error: Object.assign(
          new Error("controlled maxBuffer overflow"),
          { code: "ENOBUFS" },
        ),
      });
    case "ERROR_RECORD":
      return result(
        0,
        lines(
          {
            type: "error",
            data: { message: "controlled scanner error" },
          },
          cleanSummary,
        ),
      );
    case "MASK_MISMATCH":
      return result(0, lines(known, streamJsonKnown, knownSummary));
    case "MISSING_SUMMARY":
      return result(4, lines(known, streamJsonKnown));
    case "TRUNCATED_SUMMARY":
      return result(
        4,
        lines(known, streamJsonKnown) +
          '{"type":"auditSummary","data":{"vulnerabilities":',
      );
    case "MALFORMED_JSON":
      return result(
        0,
        "not-json\n" + lines(cleanSummary),
      );
    case "INVALID_SUMMARY_SCHEMA":
      return result(
        0,
        lines({
          type: "auditSummary",
          data: {
            vulnerabilities: {
              info: 0,
              low: 0,
              moderate: "0",
              high: 0,
              critical: 0,
            },
          },
        }),
      );
    case "SUMMARY_ADVISORY_MISMATCH":
      return result(
        4,
        lines(known, streamJsonKnown, mismatchedKnownSummary),
      );
    case "SUMMARY_NOT_TERMINAL":
      return result(
        4,
        lines(knownSummary, known, streamJsonKnown),
      );
    case "DUPLICATE_ADVISORY":
      return result(
        4,
        lines(known, known, streamJsonKnown, knownSummary),
      );
    case "UNKNOWN_RECORD":
      return result(
        0,
        lines({ type: "notice", data: {} }, cleanSummary),
      );
    default:
      throw new Error("Unknown controlled audit scenario.");
  }
};
`,
  "utf8",
);

function run(scenario, expectPass, requiredMarker = null) {
  const result = spawnSync(
    process.execPath,
    ["--require", preload, gate],
    {
      cwd: sdkRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        BABYCOWANS_AUDIT_TEST_SCENARIO: scenario,
      },
    },
  );

  const text = `${result.stdout || ""}\n${result.stderr || ""}`;
  const passMarker = text.includes(
    "BABYCOWANS_RUNTIME_AUDIT_GATE=PASS",
  );
  const actualPass =
    result.status === 0 &&
    passMarker;

  console.log(
    `R11_SCENARIO=${scenario}` +
      `|EXIT=${result.status}` +
      `|PASS_MARKER=${passMarker}` +
      `|EXPECTED_PASS=${expectPass}`,
  );

  if (actualPass !== expectPass) {
    console.error(text);
    throw new Error(
      `Unexpected R11 outcome: ${scenario}`,
    );
  }

  if (!expectPass && result.status === 0) {
    throw new Error(`${scenario} did not fail closed.`);
  }

  if (
    requiredMarker !== null &&
    !text.includes(requiredMarker)
  ) {
    console.error(text);
    throw new Error(
      `${scenario} missing marker: ${requiredMarker}`,
    );
  }

  return text;
}

try {
  const knownText = run("COMPLETE_KNOWN", true);
  for (const marker of [
    "BABYCOWANS_AUDIT_SCAN_COMPLETE=PASS",
    "BABYCOWANS_AUDIT_OUTPUT_SCHEMA=PASS",
    "BABYCOWANS_AUDIT_TERMINAL_SUMMARY=PASS",
    "BABYCOWANS_AUDIT_SCANNER_ERROR_RECORDS=0",
    "BABYCOWANS_AUDIT_EXIT_MASK_CONSISTENCY=PASS",
    "BABYCOWANS_AUDIT_STREAM_SUMMARY_CONSISTENCY=PASS",
    "BABYCOWANS_AUDIT_EXPECTED_SEVERITY_MASK=4",
    "BABYCOWANS_AUDIT_ADVISORY_ADJUDICATED=PASS",
  ]) {
    if (!knownText.includes(marker)) {
      throw new Error(
        `COMPLETE_KNOWN missing success marker: ${marker}`,
      );
    }
  }

  run(
    "COMPLETE_KNOWN_MISSING_STREAM_GUARD",
    false,
    "BABYCOWANS_RUNTIME_AUDIT_GATE=MISSING_GUARD_MARKER:",
  );
  run("COMPLETE_CLEAN", true);
  run("INTERRUPTED_KNOWN", false, "INCOMPLETE_AUDIT");
  run("SPAWN_ERROR_KNOWN", false, "INCOMPLETE_AUDIT");
  run("INTERRUPTED_EMPTY", false, "INCOMPLETE_AUDIT");
  run("NULL_STATUS", false, "INCOMPLETE_AUDIT");
  run("MAXBUFFER", false, "INCOMPLETE_AUDIT");
  run("COMPLETE_UNKNOWN", false, "UNKNOWN_ADVISORY");
  run("ERROR_RECORD", false, "SCANNER_ERROR_RECORD");
  run("MASK_MISMATCH", false, "AUDIT_EXIT_SEVERITY_MASK_MISMATCH");
  run("MISSING_SUMMARY", false, "AUDIT_SUMMARY_CARDINALITY_INVALID");
  run("TRUNCATED_SUMMARY", false, "INVALID_AUDIT_JSON");
  run("MALFORMED_JSON", false, "INVALID_AUDIT_JSON");
  run("INVALID_SUMMARY_SCHEMA", false, "AUDIT_SUMMARY_SCHEMA_INVALID");
  run("SUMMARY_ADVISORY_MISMATCH", false, "AUDIT_STREAM_SUMMARY_MISMATCH");
  run("SUMMARY_NOT_TERMINAL", false, "AUDIT_SUMMARY_NOT_TERMINAL");
  run("DUPLICATE_ADVISORY", false, "DUPLICATE_AUDIT_ADVISORY_RECORD");
  run("UNKNOWN_RECORD", false, "UNSUPPORTED_AUDIT_RECORD_TYPE");

  console.log("F02_AUDIT_COMPLETE_INSTALLED_GRAPH_ARGS=PASS");
  console.log("R11_OUTPUT_SCHEMA_VALIDATION=PASS");
  console.log("R11_TERMINAL_SUMMARY_VALIDATION=PASS");
  console.log("R11_SCANNER_ERROR_RECORD_REJECTION=PASS");
  console.log("R11_EXIT_SEVERITY_MASK_CONSISTENCY=PASS");
  console.log("R11_ADVISORY_STREAM_SUMMARY_CONSISTENCY=PASS");
  console.log("R11_SIGNAL_SPAWN_NULL_MAXBUFFER_FAIL_CLOSED=PASS");
  console.log("R11_UNKNOWN_ADVISORY_FAIL_CLOSED=PASS");
  console.log("R11_FALSE_GREEN_REGRESSION_MATRIX=PASS");
  console.log("F02_RUNTIME_AUDIT_FAIL_CLOSED_REGRESSION=PASS");
} finally {
  rmSync(tmp, {
    recursive: true,
    force: true,
  });
}
