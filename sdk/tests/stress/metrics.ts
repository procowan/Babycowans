export interface LatencySummary {
    count: number;
    averageMs: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
}

function percentile(
    sorted: readonly number[],
    fraction: number,
): number {
    if (sorted.length === 0) {
        return 0;
    }

    const index =
        Math.min(
            sorted.length - 1,
            Math.ceil(
                fraction * sorted.length,
            ) - 1,
        );

    return sorted[index]!;
}

export function summarizeLatencies(
    values: readonly number[],
): LatencySummary {
    if (values.length === 0) {
        return {
            count: 0,
            averageMs: 0,
            p50Ms: 0,
            p95Ms: 0,
            p99Ms: 0,
        };
    }

    const sorted =
        [...values].sort(
            (a, b) => a - b,
        );

    const total =
        values.reduce(
            (sum, value) =>
                sum + value,
            0,
        );

    return {
        count:
            values.length,
        averageMs:
            total / values.length,
        p50Ms:
            percentile(sorted, 0.50),
        p95Ms:
            percentile(sorted, 0.95),
        p99Ms:
            percentile(sorted, 0.99),
    };
}

export class StreamingLatencyMetrics {
    private countValue = 0;
    private totalMs = 0;

    private readonly sample: number[] = [];

    constructor(
        private readonly sampleCapacity = 2048,
    ) {
        if (
            !Number.isSafeInteger(
                sampleCapacity,
            )
            || sampleCapacity < 1
        ) {
            throw new Error(
                "Invalid latency sample capacity.",
            );
        }
    }

    add(
        valueMs: number,
    ): void {
        if (
            !Number.isFinite(valueMs)
            || valueMs < 0
        ) {
            throw new Error(
                "Invalid latency value.",
            );
        }

        this.countValue += 1;
        this.totalMs += valueMs;

        if (
            this.sample.length
            < this.sampleCapacity
        ) {
            this.sample.push(
                valueMs,
            );

            return;
        }

        const replacementIndex =
            Math.floor(
                Math.random()
                * this.countValue,
            );

        if (
            replacementIndex
            < this.sampleCapacity
        ) {
            this.sample[
                replacementIndex
            ] = valueMs;
        }
    }

    get count(): number {
        return this.countValue;
    }

    get sampleCount(): number {
        return this.sample.length;
    }

    summary(): LatencySummary {
        if (this.countValue === 0) {
            return {
                count: 0,
                averageMs: 0,
                p50Ms: 0,
                p95Ms: 0,
                p99Ms: 0,
            };
        }

        const sorted =
            [...this.sample].sort(
                (a, b) => a - b,
            );

        return {
            count:
                this.countValue,
            averageMs:
                this.totalMs
                / this.countValue,
            p50Ms:
                percentile(
                    sorted,
                    0.50,
                ),
            p95Ms:
                percentile(
                    sorted,
                    0.95,
                ),
            p99Ms:
                percentile(
                    sorted,
                    0.99,
                ),
        };
    }
}
