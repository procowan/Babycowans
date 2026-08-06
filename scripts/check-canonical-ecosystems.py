#!/usr/bin/env python3

import hashlib
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

FILES = [
    ROOT
    / "protocol/babycowans-protocol/programs/"
    / "babycowans-protocol/src/canonical_ecosystems.rs",
    ROOT / "sdk/src/ecosystems/registry.ts",
]


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


before = {path: digest(path) for path in FILES}

subprocess.run(
    ["python3", str(ROOT / "scripts/generate-canonical-ecosystems.py")],
    cwd=ROOT,
    check=True,
)

after = {path: digest(path) for path in FILES}

changed = [
    str(path.relative_to(ROOT))
    for path in FILES
    if before[path] != after[path]
]

if changed:
    print("Generated canonical ecosystem files were out of date:")
    for path in changed:
        print(f"- {path}")
    raise SystemExit(1)

print("Canonical ecosystem generated files are consistent.")
