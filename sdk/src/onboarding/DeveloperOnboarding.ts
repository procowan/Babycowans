#!/usr/bin/env node

import readline from "node:readline";

import {
    CANONICAL_ECOSYSTEMS,
    CanonicalEcosystemIdentity,
} from "../ecosystems/index.js";

const divider = "─".repeat(72);

function clearScreen(): void {
    process.stdout.write("\x1B[2J\x1B[0f");
}

function waitForEnter(message = "Press Enter to continue."): Promise<void> {
    return new Promise((resolve) => {
        const interfaceReader = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        interfaceReader.question(`\n${message}`, () => {
            interfaceReader.close();
            resolve();
        });
    });
}

function showIdentity(
    identity: CanonicalEcosystemIdentity,
    position: number,
): void {
    clearScreen();

    console.log(divider);
    console.log(`BABYCOWANS ECOSYSTEM ${position + 1} OF 6`);
    console.log(divider);
    console.log();
    console.log(`Full Name:     ${identity.fullName}`);
    console.log(`Ticker:        ${identity.ticker}`);
    console.log(`Token Address: ${identity.tokenAddress.toBase58()}`);
    console.log();
    console.log("Mission:");
    console.log(identity.mission);
    console.log();
    console.log(divider);
}

async function presentAllEcosystems(): Promise<void> {
    clearScreen();

    console.log(divider);
    console.log("BABYCOWANS DEVELOPER ONBOARDING");
    console.log(divider);
    console.log();
    console.log(
        "Explore all six official Babycowans ecosystems before selecting one.",
    );
    console.log();
    console.log("Each ecosystem contains four official attributes:");
    console.log("Full Name, Ticker, Token Address, and Mission.");
    console.log();
    console.log(divider);

    await waitForEnter();

    for (let index = 0; index < CANONICAL_ECOSYSTEMS.length; index += 1) {
        showIdentity(CANONICAL_ECOSYSTEMS[index], index);

        await waitForEnter(
            index === CANONICAL_ECOSYSTEMS.length - 1
                ? "Press Enter to open ecosystem selection."
                : "Press Enter to view the next ecosystem.",
        );
    }
}

function selectEcosystem(): Promise<CanonicalEcosystemIdentity> {
    if (!process.stdin.isTTY) {
        throw new Error(
            "Interactive ecosystem selection requires a TTY terminal.",
        );
    }

    return new Promise((resolve, reject) => {
        let selectedIndex = 0;

        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);
        process.stdin.resume();

        const render = (): void => {
            clearScreen();

            console.log(divider);
            console.log("SELECT YOUR BABYCOWANS ECOSYSTEM");
            console.log(divider);
            console.log();
            console.log("Use ↑ and ↓ to move. Press Enter to select.");
            console.log();

            for (
                let index = 0;
                index < CANONICAL_ECOSYSTEMS.length;
                index += 1
            ) {
                const identity = CANONICAL_ECOSYSTEMS[index];
                const pointer = index === selectedIndex ? "❯" : " ";

                console.log(
                    `${pointer} ${identity.fullName} — ${identity.ticker}`,
                );
            }

            console.log();
            console.log(divider);
        };

        const cleanup = (): void => {
            process.stdin.off("keypress", onKeypress);
            process.stdin.setRawMode(false);
            process.stdin.pause();
        };

        const onKeypress = (
            _input: string,
            key: readline.Key,
        ): void => {
            if (key.ctrl && key.name === "c") {
                cleanup();
                reject(new Error("Ecosystem selection cancelled."));
                return;
            }

            if (key.name === "up") {
                selectedIndex =
                    (selectedIndex - 1 + CANONICAL_ECOSYSTEMS.length) %
                    CANONICAL_ECOSYSTEMS.length;
                render();
                return;
            }

            if (key.name === "down") {
                selectedIndex =
                    (selectedIndex + 1) %
                    CANONICAL_ECOSYSTEMS.length;
                render();
                return;
            }

            if (key.name === "return") {
                const selected = CANONICAL_ECOSYSTEMS[selectedIndex];

                cleanup();
                resolve(selected);
            }
        };

        process.stdin.on("keypress", onKeypress);
        render();
    });
}

export async function runEcosystemOnboarding(): Promise<
    CanonicalEcosystemIdentity
> {
    await presentAllEcosystems();

    const selected = await selectEcosystem();

    clearScreen();
    console.log(divider);
    console.log("ECOSYSTEM SELECTED");
    console.log(divider);
    console.log();
    console.log(`Full Name:     ${selected.fullName}`);
    console.log(`Ticker:        ${selected.ticker}`);
    console.log(`Token Address: ${selected.tokenAddress.toBase58()}`);
    console.log();
    console.log("Mission:");
    console.log(selected.mission);
    console.log();
    console.log(divider);

    return selected;
}

const isDirectExecution =
    process.argv[1] !== undefined &&
    import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isDirectExecution) {
    runEcosystemOnboarding().catch((error: unknown) => {
        const message =
            error instanceof Error ? error.message : String(error);

        console.error(`Babycowans onboarding failed: ${message}`);
        process.exitCode = 1;
    });
}
