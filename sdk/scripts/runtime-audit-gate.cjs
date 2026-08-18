const {
  spawnSync,
} = require("node:child_process");

const path =
  require("node:path");

const sdkRoot =
  path.resolve(__dirname, "..");

function runNode(args) {
  return spawnSync(
    process.execPath,
    args,
    {
      cwd: sdkRoot,
      encoding: "utf8",
    },
  );
}

function emit(result) {
  if (result.stdout) {
    process.stdout.write(
      result.stdout,
    );
  }

  if (result.stderr) {
    process.stderr.write(
      result.stderr,
    );
  }
}

const guard =
  runNode([
    "scripts/runtime-dependency-guard.cjs",
    "--verify",
  ]);

emit(guard);

if (guard.status !== 0) {
  console.error(
    "BABYCOWANS_RUNTIME_AUDIT_GATE="
    + "DEPENDENCY_GUARD_FAILED",
  );

  process.exit(
    guard.status || 1,
  );
}

const guardOutput =
  `${guard.stdout || ""}\n`
  + `${guard.stderr || ""}`;

const requiredMarkers = [
  "BABYCOWANS_JAYSON_UUID_V4_ONLY=PASS",
  "BABYCOWANS_UUID_ADVISORY_RUNTIME_PATH=V4_ONLY",
];

for (
  const marker
  of requiredMarkers
) {
  if (
    !guardOutput.includes(
      marker,
    )
  ) {
    console.error(
      "BABYCOWANS_RUNTIME_AUDIT_GATE="
      + `MISSING_GUARD_MARKER:${marker}`,
    );

    process.exit(1);
  }
}

const yarn =
  process.platform === "win32"
    ? "yarn.cmd"
    : "yarn";

const audit =
  spawnSync(
    yarn,
    [
      "audit",
      "--groups",
      "dependencies",
      "--json",
    ],
    {
      cwd: sdkRoot,
      encoding: "utf8",
    },
  );

const auditText =
  `${audit.stdout || ""}\n`
  + `${audit.stderr || ""}`;

const advisories =
  new Map();

for (
  const line
  of auditText.split(/\r?\n/u)
) {
  const trimmed =
    line.trim();

  if (!trimmed) {
    continue;
  }

  let record;

  try {
    record =
      JSON.parse(trimmed);
  } catch {
    continue;
  }

  if (
    record.type
    !== "auditAdvisory"
  ) {
    continue;
  }

  const advisory =
    record.data?.advisory
    || {};

  const id =
    advisory.id ?? null;

  const ghsa =
    advisory.github_advisory_id
    ?? null;

  const moduleName =
    advisory.module_name
    ?? null;

  const title =
    advisory.title
    ?? null;

  const key =
    `${id}|${ghsa}|${moduleName}|${title}`;

  advisories.set(
    key,
    {
      id,
      ghsa,
      moduleName,
      title,
      severity:
        advisory.severity
        ?? null,
      vulnerableVersions:
        advisory.vulnerable_versions
        ?? null,
      patchedVersions:
        advisory.patched_versions
        ?? null,
    },
  );
}

console.log(
  `BABYCOWANS_RAW_YARN_AUDIT_RC=${audit.status ?? 1}`,
);

console.log(
  "BABYCOWANS_AUDIT_UNIQUE_ADVISORY_COUNT="
  + advisories.size,
);

if (
  advisories.size === 0
) {
  if (
    audit.status === 0
  ) {
    console.log(
      "BABYCOWANS_RUNTIME_AUDIT_GATE=PASS",
    );

    console.log(
      "BABYCOWANS_AUDIT_ADVISORY_ADJUDICATED=NONE",
    );

    process.exit(0);
  }

  console.error(
    "BABYCOWANS_RUNTIME_AUDIT_GATE="
    + "UNPARSED_AUDIT_FAILURE",
  );

  emit(audit);

  process.exit(
    audit.status || 1,
  );
}

const known = {
  id: 1119441,
  ghsa: "GHSA-w5hq-g745-h8pq",
  moduleName: "uuid",
  title:
    "uuid: Missing buffer bounds check "
    + "in v3/v5/v6 when buf is provided",
};

for (
  const advisory
  of advisories.values()
) {
  const exactKnown =
    advisory.id === known.id
    && advisory.ghsa === known.ghsa
    && advisory.moduleName
      === known.moduleName
    && advisory.title
      === known.title;

  if (!exactKnown) {
    console.error(
      "BABYCOWANS_RUNTIME_AUDIT_GATE="
      + "UNKNOWN_ADVISORY",
    );

    console.error(
      JSON.stringify(
        advisory,
      ),
    );

    process.exit(
      audit.status || 1,
    );
  }
}

if (
  advisories.size !== 1
) {
  console.error(
    "BABYCOWANS_RUNTIME_AUDIT_GATE="
    + "UNEXPECTED_ADVISORY_SET",
  );

  process.exit(
    audit.status || 1,
  );
}

console.log(
  "BABYCOWANS_AUDIT_ADVISORY="
  + known.ghsa,
);

console.log(
  "BABYCOWANS_AUDIT_ADVISORY_RUNTIME_PATH="
  + "UNREACHABLE_V3_V5_V6",
);

console.log(
  "BABYCOWANS_AUDIT_ADVISORY_ADJUDICATED=PASS",
);

console.log(
  "BABYCOWANS_UNKNOWN_ADVISORY_COUNT=0",
);

console.log(
  "BABYCOWANS_RUNTIME_AUDIT_GATE=PASS",
);

process.exit(0);
