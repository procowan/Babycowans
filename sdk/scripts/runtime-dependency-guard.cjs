"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");

const verifyOnly = process.argv.includes("--verify");

function fail(message) {
  console.error(
    `BABYCOWANS_DEPENDENCY_GUARD_FAIL=${message}`
  );
  process.exit(1);
}

function packageFrom(requireFrom, name) {
  let entry;

  try {
    entry = requireFrom.resolve(name);
  } catch (_) {
    fail(`UNRESOLVABLE_PACKAGE:${name}`);
  }

  let dir = path.dirname(entry);

  while (true) {
    const packageJson = path.join(
      dir,
      "package.json"
    );

    if (fs.existsSync(packageJson)) {
      try {
        const data = JSON.parse(
          fs.readFileSync(
            packageJson,
            "utf8"
          )
        );

        if (data.name === name) {
          return {
            directory: dir,
            data,
            requireFrom:
              createRequire(packageJson),
          };
        }
      } catch (_) {}
    }

    const parent = path.dirname(dir);

    if (parent === dir) {
      fail(
        `PACKAGE_JSON_NOT_FOUND:${name}`
      );
    }

    dir = parent;
  }
}

function exactVersion(pkg, version) {
  if (pkg.data.version !== version) {
    fail(
      `VERSION_MISMATCH:${pkg.data.name}:` +
      `EXPECTED=${version}:` +
      `ACTUAL=${pkg.data.version}`
    );
  }

  console.log(
    `BABYCOWANS_DEPENDENCY_VERSION=` +
    `${pkg.data.name}@${pkg.data.version}`
  );
}

function walkJs(root) {
  const files = [];

  function walk(dir) {
    for (
      const entry
      of fs.readdirSync(
        dir,
        { withFileTypes: true }
      )
    ) {
      if (
        entry.name === "node_modules"
      ) {
        continue;
      }

      const full = path.join(
        dir,
        entry.name
      );

      if (entry.isDirectory()) {
        walk(full);
      } else if (
        entry.isFile()
        && entry.name.endsWith(".js")
      ) {
        files.push(full);
      }
    }
  }

  walk(root);
  return files;
}

function verifyUuidRuntimePath(jayson) {
  const regex =
    /require\((['"])uuid\1\)(?:\.([A-Za-z0-9_]+))?/g;

  let total = 0;
  let v4 = 0;
  const invalid = [];

  for (
    const file of walkJs(
      jayson.directory
    )
  ) {
    const text = fs.readFileSync(
      file,
      "utf8"
    );

    for (
      const match of text.matchAll(regex)
    ) {
      total += 1;

      if (match[2] === "v4") {
        v4 += 1;
      } else {
        invalid.push(
          `${path.relative(
            jayson.directory,
            file
          )}:${match[0]}`
        );
      }
    }
  }

  console.log(
    `BABYCOWANS_JAYSON_UUID_REQUIRE_COUNT=${total}`
  );

  console.log(
    `BABYCOWANS_JAYSON_UUID_V4_COUNT=${v4}`
  );

  if (
    total === 0
    || total !== v4
    || invalid.length !== 0
  ) {
    fail(
      "JAYSON_UUID_RUNTIME_PATH_NOT_V4_ONLY:"
      + invalid.join(",")
    );
  }

  console.log(
    "BABYCOWANS_JAYSON_UUID_V4_ONLY=PASS"
  );
}

function patchExact(
  file,
  oldText,
  newText,
  label
) {
  const text = fs.readFileSync(
    file,
    "utf8"
  );

  const oldCount =
    text.split(oldText).length - 1;

  const newCount =
    text.split(newText).length - 1;

  if (verifyOnly) {
    if (
      oldCount !== 0
      || newCount !== 1
    ) {
      fail(
        `${label}:VERIFY_FAILED:` +
        `OLD=${oldCount}:` +
        `NEW=${newCount}`
      );
    }

    console.log(
      `BABYCOWANS_RUNTIME_COMPAT=` +
      `${label}:VERIFIED`
    );

    return;
  }

  if (
    oldCount === 1
    && newCount === 0
  ) {
    fs.writeFileSync(
      file,
      text.replace(
        oldText,
        newText
      ),
      "utf8"
    );

    console.log(
      `BABYCOWANS_RUNTIME_COMPAT=` +
      `${label}:PATCHED`
    );

    return;
  }

  if (
    oldCount === 0
    && newCount === 1
  ) {
    console.log(
      `BABYCOWANS_RUNTIME_COMPAT=` +
      `${label}:ALREADY_PATCHED`
    );

    return;
  }

  fail(
    `${label}:UNEXPECTED_CONTENT:` +
    `OLD=${oldCount}:NEW=${newCount}`
  );
}

const sdkRoot = path.resolve(
  __dirname,
  ".."
);

const sdkRequire = createRequire(
  path.join(
    sdkRoot,
    "package.json"
  )
);

const web3 = packageFrom(
  sdkRequire,
  "@solana/web3.js"
);

exactVersion(
  web3,
  "1.98.4"
);

const jayson = packageFrom(
  web3.requireFrom,
  "jayson"
);

exactVersion(
  jayson,
  "4.3.0"
);

verifyUuidRuntimePath(
  jayson
);

const uuid = packageFrom(
  jayson.requireFrom,
  "uuid"
);

exactVersion(
  uuid,
  "8.3.2"
);

console.log(
  "BABYCOWANS_UUID_ADVISORY_RUNTIME_PATH=V4_ONLY"
);

const nodeFetch = packageFrom(
  web3.requireFrom,
  "node-fetch"
);

exactVersion(
  nodeFetch,
  "2.7.0"
);

const whatwg = packageFrom(
  nodeFetch.requireFrom,
  "whatwg-url"
);

exactVersion(
  whatwg,
  "5.0.0"
);

const tr46 = packageFrom(
  whatwg.requireFrom,
  "tr46"
);

exactVersion(
  tr46,
  "0.0.3"
);

try {
  whatwg.requireFrom.resolve(
    "punycode/"
  );

  tr46.requireFrom.resolve(
    "punycode/"
  );
} catch (_) {
  fail(
    "USERLAND_PUNYCODE_NOT_RESOLVABLE"
  );
}

patchExact(
  path.join(
    tr46.directory,
    "index.js"
  ),
  'require("punycode")',
  'require("punycode/")',
  "TR46_USERLAND_PUNYCODE"
);

patchExact(
  path.join(
    whatwg.directory,
    "lib",
    "url-state-machine.js"
  ),
  'require("punycode")',
  'require("punycode/")',
  "WHATWG_URL_USERLAND_PUNYCODE"
);

console.log(
  "BABYCOWANS_DEPENDENCY_GUARD=PASS"
);
