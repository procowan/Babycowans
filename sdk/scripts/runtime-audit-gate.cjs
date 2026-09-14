const { spawnSync } = require("node:child_process");

const fs = require("node:fs");

const path = require("node:path");

const sdkRoot = path.resolve(__dirname, "..");

const sdkManifest = JSON.parse(
  fs.readFileSync(path.join(sdkRoot, "package.json"), "utf8"),
);

const declaredWeb3Peer =
  sdkManifest.peerDependencies?.["@solana/web3.js"];

if (declaredWeb3Peer !== "1.98.4") {
  console.error(
    "BABYCOWANS_RUNTIME_AUDIT_GATE=WEB3_PEER_CONTRACT_MISMATCH",
  );

  process.exit(1);
}

const installedWeb3ManifestPath = path.join(
  sdkRoot,
  "node_modules",
  "@solana",
  "web3.js",
  "package.json",
);

if (!fs.existsSync(installedWeb3ManifestPath)) {
  console.error(
    "BABYCOWANS_RUNTIME_AUDIT_GATE=WEB3_RUNTIME_GRAPH_MISSING",
  );

  process.exit(1);
}

const installedWeb3Manifest = JSON.parse(
  fs.readFileSync(installedWeb3ManifestPath, "utf8"),
);

if (installedWeb3Manifest.version !== "1.98.4") {
  console.error(
    "BABYCOWANS_RUNTIME_AUDIT_GATE=WEB3_RUNTIME_VERSION_MISMATCH",
  );

  process.exit(1);
}

console.log("BABYCOWANS_WEB3_PEER_VERSION=1.98.4");
console.log("BABYCOWANS_WEB3_RUNTIME_VERSION=1.98.4");
console.log("BABYCOWANS_WEB3_AUDIT_PERIMETER=PASS");

function runNode(args) {
  return spawnSync(process.execPath, args, {
    cwd: sdkRoot,
    encoding: "utf8",
  });
}

function emit(result) {
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
}

function failAudit(reason, audit, exitCode = 1) {
  console.error("BABYCOWANS_RUNTIME_AUDIT_GATE=" + reason);

  if (audit) {
    emit(audit);
  }

  process.exit(
    Number.isInteger(exitCode) && exitCode !== 0
      ? exitCode
      : 1,
  );
}

const guard = runNode(["scripts/runtime-dependency-guard.cjs", "--verify"]);

emit(guard);

if (
  guard.error ||
  guard.signal !== null ||
  !Number.isInteger(guard.status) ||
  guard.status !== 0
) {
  failAudit(
    "DEPENDENCY_GUARD_FAILED",
    guard,
    Number.isInteger(guard.status) ? guard.status : 1,
  );
}

const guardOutput = `${guard.stdout || ""}\n` + `${guard.stderr || ""}`;

const requiredMarkers = [
  "BABYCOWANS_JAYSON_UUID_V4_ONLY=PASS",
  "BABYCOWANS_UUID_ADVISORY_RUNTIME_PATH=V4_ONLY",
  "BABYCOWANS_DEPENDENCY_VERSION=stream-json@1.9.1",
  "BABYCOWANS_JAYSON_STREAM_JSON_RANGE=^1.9.1",
  "BABYCOWANS_STREAM_JSON_ADVISORY_FILTER_IMPORTS=ABSENT",
  "BABYCOWANS_STREAM_JSON_ADVISORY_FILTER_LOAD=ABSENT",
  "BABYCOWANS_STREAM_JSON_VERSION_CONTRACT=PASS",
];

for (const marker of requiredMarkers) {
  if (!guardOutput.includes(marker)) {
    failAudit(`MISSING_GUARD_MARKER:${marker}`);
  }
}

const yarn = process.platform === "win32" ? "yarn.cmd" : "yarn";

const audit = spawnSync(yarn, ["audit", "--json"], {
  cwd: sdkRoot,
  encoding: "utf8",
  maxBuffer: 16 * 1024 * 1024,
});

if (
  audit.error ||
  audit.signal !== null ||
  !Number.isInteger(audit.status)
) {
  failAudit(
    "INCOMPLETE_AUDIT",
    audit,
    Number.isInteger(audit.status) ? audit.status : 1,
  );
}

const auditText = `${audit.stdout || ""}\n` + `${audit.stderr || ""}`;
const records = [];

for (const line of auditText.split(/\r?\n/u)) {
  const trimmed = line.trim();

  if (!trimmed) {
    continue;
  }

  let record;

  try {
    record = JSON.parse(trimmed);
  } catch {
    failAudit("INVALID_AUDIT_JSON", audit);
  }

  if (
    record === null ||
    typeof record !== "object" ||
    Array.isArray(record) ||
    typeof record.type !== "string"
  ) {
    failAudit("INVALID_AUDIT_RECORD_SCHEMA", audit);
  }

  records.push(record);
}

if (records.length === 0) {
  failAudit("EMPTY_AUDIT_OUTPUT", audit);
}

const errorRecord = records.find(
  (record) =>
    record.type === "error" ||
    record.type === "auditError",
);

if (errorRecord) {
  failAudit("SCANNER_ERROR_RECORD", audit);
}

const unsupportedRecord = records.find(
  (record) =>
    record.type !== "auditAdvisory" &&
    record.type !== "auditSummary",
);

if (unsupportedRecord) {
  failAudit(
    `UNSUPPORTED_AUDIT_RECORD_TYPE:${unsupportedRecord.type}`,
    audit,
  );
}

const summaries = records.filter(
  (record) => record.type === "auditSummary",
);

if (summaries.length !== 1) {
  failAudit("AUDIT_SUMMARY_CARDINALITY_INVALID", audit);
}

if (records.at(-1)?.type !== "auditSummary") {
  failAudit("AUDIT_SUMMARY_NOT_TERMINAL", audit);
}

const summary = summaries[0];
const vulnerabilities = summary.data?.vulnerabilities;
const severityOrder = [
  "info",
  "low",
  "moderate",
  "high",
  "critical",
];
const severityBits = {
  info: 1,
  low: 2,
  moderate: 4,
  high: 8,
  critical: 16,
};

if (
  vulnerabilities === null ||
  typeof vulnerabilities !== "object" ||
  Array.isArray(vulnerabilities)
) {
  failAudit("AUDIT_SUMMARY_SCHEMA_INVALID", audit);
}

for (const severity of severityOrder) {
  const value = vulnerabilities[severity];

  if (
    !Number.isInteger(value) ||
    value < 0
  ) {
    failAudit("AUDIT_SUMMARY_SCHEMA_INVALID", audit);
  }
}

const unexpectedSummaryKeys = Object.keys(vulnerabilities)
  .filter((key) => !severityOrder.includes(key));

if (unexpectedSummaryKeys.length !== 0) {
  failAudit("AUDIT_SUMMARY_SCHEMA_INVALID", audit);
}

let expectedSeverityMask = 0;

for (const severity of severityOrder) {
  if (vulnerabilities[severity] > 0) {
    expectedSeverityMask |= severityBits[severity];
  }
}

if (audit.status !== expectedSeverityMask) {
  failAudit(
    `AUDIT_EXIT_SEVERITY_MASK_MISMATCH:expected=${expectedSeverityMask}:actual=${audit.status}`,
    audit,
    audit.status || 1,
  );
}

const advisories = new Map();
const advisorySeverityCounts = Object.fromEntries(
  severityOrder.map((severity) => [severity, 0]),
);

for (const record of records) {
  if (record.type !== "auditAdvisory") {
    continue;
  }

  const advisory = record.data?.advisory;

  if (
    advisory === null ||
    typeof advisory !== "object" ||
    Array.isArray(advisory) ||
    !Number.isInteger(advisory.id) ||
    advisory.id <= 0 ||
    typeof advisory.github_advisory_id !== "string" ||
    advisory.github_advisory_id.length === 0 ||
    typeof advisory.module_name !== "string" ||
    advisory.module_name.length === 0 ||
    typeof advisory.title !== "string" ||
    advisory.title.length === 0 ||
    !severityOrder.includes(advisory.severity)
  ) {
    failAudit("AUDIT_ADVISORY_SCHEMA_INVALID", audit);
  }

  const key = [
    advisory.id,
    advisory.github_advisory_id,
    advisory.module_name,
    advisory.title,
  ].join("|");

  if (advisories.has(key)) {
    failAudit("DUPLICATE_AUDIT_ADVISORY_RECORD", audit);
  }

  advisories.set(key, {
    id: advisory.id,
    ghsa: advisory.github_advisory_id,
    moduleName: advisory.module_name,
    title: advisory.title,
    severity: advisory.severity,
    vulnerableVersions: advisory.vulnerable_versions ?? null,
    patchedVersions: advisory.patched_versions ?? null,
  });

  advisorySeverityCounts[advisory.severity] += 1;
}

for (const severity of severityOrder) {
  if (
    advisorySeverityCounts[severity] !==
    vulnerabilities[severity]
  ) {
    failAudit(
      `AUDIT_STREAM_SUMMARY_MISMATCH:${severity}:stream=${advisorySeverityCounts[severity]}:summary=${vulnerabilities[severity]}`,
      audit,
      audit.status || 1,
    );
  }
}

console.log(`BABYCOWANS_RAW_YARN_AUDIT_RC=${audit.status}`);
console.log(
  "BABYCOWANS_AUDIT_UNIQUE_ADVISORY_COUNT=" +
    advisories.size,
);
console.log(
  "BABYCOWANS_AUDIT_EXPECTED_SEVERITY_MASK=" +
    expectedSeverityMask,
);
console.log("BABYCOWANS_AUDIT_SCAN_COMPLETE=PASS");
console.log("BABYCOWANS_AUDIT_OUTPUT_SCHEMA=PASS");
console.log("BABYCOWANS_AUDIT_TERMINAL_SUMMARY=PASS");
console.log("BABYCOWANS_AUDIT_SCANNER_ERROR_RECORDS=0");
console.log("BABYCOWANS_AUDIT_EXIT_MASK_CONSISTENCY=PASS");
console.log("BABYCOWANS_AUDIT_STREAM_SUMMARY_CONSISTENCY=PASS");

if (advisories.size === 0) {
  if (audit.status !== 0) {
    failAudit("UNPARSED_AUDIT_FAILURE", audit, audit.status);
  }

  console.log("BABYCOWANS_AUDIT_ADVISORY_ADJUDICATED=NONE");
  console.log("BABYCOWANS_UNKNOWN_ADVISORY_COUNT=0");
  console.log("BABYCOWANS_RUNTIME_AUDIT_GATE=PASS");

  process.exit(0);
}

const known = [
  {
    id: 1119441,
    ghsa: "GHSA-w5hq-g745-h8pq",
    moduleName: "uuid",
    title:
      "uuid: Missing buffer bounds check " +
      "in v3/v5/v6 when buf is provided",
    severity: "moderate",
  },
  {
    id: 1164823,
    ghsa: "GHSA-528h-pc64-c93x",
    moduleName: "stream-json",
    title:
      "stream-json: pick/ignore/filter/replace filters " +
      "are O(depth²) on nested input — small crafted " +
      "JSON blocks the event loop for seconds→minutes (DoS)",
    severity: "moderate",
  },
];

for (const advisory of advisories.values()) {
  const exactKnown = known.some(
    (entry) =>
      advisory.id === entry.id &&
      advisory.ghsa === entry.ghsa &&
      advisory.moduleName === entry.moduleName &&
      advisory.title === entry.title &&
      advisory.severity === entry.severity,
  );

  if (!exactKnown) {
    console.error(
      "BABYCOWANS_RUNTIME_AUDIT_GATE=UNKNOWN_ADVISORY",
    );
    console.error(JSON.stringify(advisory));

    process.exit(audit.status || 1);
  }
}

if (advisories.size !== known.length) {
  failAudit(
    "UNEXPECTED_ADVISORY_SET",
    undefined,
    audit.status || 1,
  );
}

for (const advisory of known) {
  console.log(
    "BABYCOWANS_AUDIT_ADVISORY=" + advisory.ghsa,
  );
}

console.log(
  "BABYCOWANS_UUID_ADVISORY_RUNTIME_PATH=V4_ONLY",
);

console.log(
  "BABYCOWANS_STREAM_JSON_ADVISORY_RUNTIME_PATH=" +
    "UNREACHABLE_FILTERS",
);

console.log(
  "BABYCOWANS_STREAM_JSON_ADVISORY_POLICY=" +
    "CONDITIONAL_EVIDENCE_BACKED_EXCEPTION",
);

console.log("BABYCOWANS_AUDIT_ADVISORY_ADJUDICATED=PASS");
console.log("BABYCOWANS_UNKNOWN_ADVISORY_COUNT=0");
console.log("BABYCOWANS_RUNTIME_AUDIT_GATE=PASS");

process.exit(0);
