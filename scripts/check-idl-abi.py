#!/usr/bin/env python3

from pathlib import Path
import hashlib
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]

TRACKED_IDL = (
    ROOT
    / "sdk"
    / "src"
    / "idl"
    / "babycowans_protocol.json"
)

GENERATED_IDL = (
    ROOT
    / "protocol"
    / "babycowans-protocol"
    / "target"
    / "idl"
    / "babycowans_protocol.json"
)

FACTORY = (
    ROOT
    / "sdk"
    / "src"
    / "instructions"
    / "factory.ts"
)

SECTIONS = [
    "address",
    "instructions",
    "accounts",
    "events",
    "types",
    "errors",
    "constants",
]

V1_BASELINE_SHA256 = {
    "address":
        "f1cc82a7465d95deee5ce3d035b90b4278751b25f29b72b0cb361c983c2b038d",
    "instructions":
        "d1421cbba947881f517b2cc72a5a320d570384dcdb9faa44219141b872807a32",
    "accounts":
        "65c33ea9f2a2438d82d2f579715eccff09815b1fd3fa8c482da89a8b6c78e383",
    "events":
        "62f7d1591c5ace8a71c0f115d584a054b9d71fd1efcd34211c1983975290280f",
    "types":
        "b09c35ffb3e293c43351a1fc53659a5a318a365d52ed35fe9fe7852912d3bf00",
    "errors":
        "70c5f8ff8592b3dcc78ad5f939a903a987e23baaae322fb7037045065c1e4abb",
    "constants":
        "74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b",
}

EXPECTED_COUNTS = {
    "instructions": 29,
    "accounts": 12,
    "events": 28,
    "types": 53,
}


def fail(message: str) -> None:
    print(f"ABI_GUARD_FAIL={message}")
    raise SystemExit(1)


def load(path: Path) -> dict:
    if not path.is_file():
        fail(f"MISSING_IDL:{path}")

    try:
        value = json.loads(
            path.read_text(encoding="utf-8")
        )
    except Exception as exc:
        fail(f"INVALID_IDL:{path}:{exc}")

    if not isinstance(value, dict):
        fail(f"INVALID_IDL_ROOT:{path}")

    return value


def canonical(value: object) -> str:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )


def digest(value: object) -> str:
    return hashlib.sha256(
        canonical(value).encode("utf-8")
    ).hexdigest()


def verify_baseline(label: str, idl: dict) -> None:
    for section in SECTIONS:
        actual = digest(idl.get(section))
        expected = V1_BASELINE_SHA256[section]

        status = (
            "PASS"
            if actual == expected
            else "DRIFT"
        )

        print(
            f"{label}_V1_SECTION={section}:"
            f"SHA256={actual}:"
            f"STATUS={status}"
        )

        if actual != expected:
            fail(
                f"{label}_V1_ABI_DRIFT:{section}"
            )

    for section, expected in EXPECTED_COUNTS.items():
        value = idl.get(section)

        if not isinstance(value, list):
            fail(
                f"{label}_INVALID_LIST:{section}"
            )

        actual = len(value)

        print(
            f"{label}_{section.upper()}_COUNT={actual}"
        )

        if actual != expected:
            fail(
                f"{label}_COUNT_DRIFT:"
                f"{section}:{actual}!={expected}"
            )

    print(f"{label}_V1_ABI_BASELINE=PASS")


def verify_discriminators(
    label: str,
    idl: dict,
) -> None:
    domains = [
        ("INSTRUCTION", "instructions", "global"),
        ("ACCOUNT", "accounts", "account"),
        ("EVENT", "events", "event"),
    ]

    total = 0

    for domain, section, namespace in domains:
        entries = idl.get(section)

        if not isinstance(entries, list):
            fail(
                f"{label}_INVALID_{section}"
            )

        for entry in entries:
            if not isinstance(entry, dict):
                fail(
                    f"{label}_INVALID_{domain}_ENTRY"
                )

            name = entry.get("name")
            actual = entry.get("discriminator")

            if not isinstance(name, str):
                fail(
                    f"{label}_INVALID_{domain}_NAME"
                )

            expected = list(
                hashlib.sha256(
                    f"{namespace}:{name}".encode(
                        "utf-8"
                    )
                ).digest()[:8]
            )

            if actual != expected:
                fail(
                    f"{label}_{domain}_DISCRIMINATOR:"
                    f"{name}"
                )

            total += 1

    print(
        f"{label}_DISCRIMINATOR_TOTAL={total}"
    )

    print(
        f"{label}_DISCRIMINATORS=PASS"
    )


def camel_to_snake(value: str) -> str:
    first = re.sub(
        r"(.)([A-Z][a-z]+)",
        r"\1_\2",
        value,
    )

    second = re.sub(
        r"([a-z0-9])([A-Z])",
        r"\1_\2",
        first,
    )

    return second.lower()


def verify_builder_surface(idl: dict) -> None:
    text = FACTORY.read_text(
        encoding="utf-8"
    )

    stems = re.findall(
        r"export\s+function\s+"
        r"build([A-Za-z0-9]+)"
        r"Instruction\s*\(",
        text,
    )

    builders = {
        camel_to_snake(stem)
        for stem in stems
    }

    instructions = {
        entry["name"]
        for entry in idl["instructions"]
    }

    print(
        f"BUILDER_INSTRUCTION_COUNT="
        f"{len(builders)}"
    )

    if builders != instructions:
        print(
            "BUILDER_MISSING="
            + ",".join(
                sorted(
                    instructions - builders
                )
            )
        )

        print(
            "BUILDER_EXTRA="
            + ",".join(
                sorted(
                    builders - instructions
                )
            )
        )

        fail(
            "BUILDER_IDL_INSTRUCTION_SET"
        )

    failures = []

    for name in sorted(instructions):
        pattern = re.compile(
            r"instructionDiscriminator"
            r"\s*\(\s*"
            r"""["']"""
            + re.escape(name)
            + r"""["']"""
            r"\s*,?\s*\)",
            re.MULTILINE,
        )

        count = len(
            pattern.findall(text)
        )

        status = (
            "PASS"
            if count == 1
            else "FAIL"
        )

        print(
            f"BUILDER_DISCRIMINATOR_REFERENCE="
            f"{name}:COUNT={count}:"
            f"STATUS={status}"
        )

        if count != 1:
            failures.append(
                (name, count)
            )

    if failures:
        for name, count in failures:
            print(
                "BUILDER_REFERENCE_FAILURE="
                f"{name}:{count}"
            )

        fail(
            "BUILDER_DISCRIMINATOR_SURFACE"
        )

    print(
        "BUILDER_IDL_INSTRUCTION_SET=PASS"
    )

    print(
        "BUILDER_DISCRIMINATOR_SURFACE=PASS"
    )


def verify_generated_tracked(
    generated: dict,
    tracked: dict,
) -> None:
    for section in SECTIONS:
        if (
            generated.get(section)
            != tracked.get(section)
        ):
            fail(
                "GENERATED_TRACKED_ABI_DRIFT:"
                + section
            )

        print(
            f"GENERATED_TRACKED_SECTION="
            f"{section}:PASS"
        )

    print(
        "GENERATED_TRACKED_ABI=PASS"
    )


def main() -> None:
    tracked_only = (
        len(sys.argv) == 2
        and sys.argv[1] == "--tracked-only"
    )

    if len(sys.argv) > 2:
        fail("INVALID_ARGUMENTS")

    if (
        len(sys.argv) == 2
        and not tracked_only
    ):
        fail("INVALID_ARGUMENT")

    tracked = load(TRACKED_IDL)

    verify_baseline(
        "TRACKED",
        tracked,
    )

    verify_discriminators(
        "TRACKED",
        tracked,
    )

    verify_builder_surface(
        tracked
    )

    if tracked_only:
        print(
            "IDL_ABI_GUARD_MODE=TRACKED_ONLY"
        )

        print(
            "IDL_ABI_COMPATIBILITY_GUARD=PASS"
        )

        print(
            "ABI_CHANGE_REQUIRES_EXPLICIT_V1_BASELINE_UPDATE=1"
        )

        return

    generated = load(
        GENERATED_IDL
    )

    verify_baseline(
        "GENERATED",
        generated,
    )

    verify_discriminators(
        "GENERATED",
        generated,
    )

    verify_generated_tracked(
        generated,
        tracked,
    )

    print(
        "IDL_ABI_GUARD_MODE="
        "GENERATED_AND_TRACKED"
    )

    print(
        "IDL_ABI_COMPATIBILITY_GUARD=PASS"
    )

    print(
        "ABI_CHANGE_REQUIRES_EXPLICIT_V1_BASELINE_UPDATE=1"
    )


if __name__ == "__main__":
    main()
