# Scale Assurance

## Final result

**PASS**

The final Scale examination covered a 10,000,000-user population model
and real isolated Solana-runtime Application and Payment workloads.

## 10,000,000-user population model

The population model processed **10,000,000 registered users** using
bounded-memory streaming analysis.

Modeled traffic:

| Scenario | Traffic model |
|---|---:|
| 100,000 daily active users × 2 transactions/day | ~2.315 average TPS |
| 1,000,000 daily active users × 5 transactions/day | ~57.87 average TPS |
| 100,000 users over 60 seconds | ~1,666.67 TPS |
| 1,000,000 users over 60 seconds | ~16,666.67 TPS |

Registered population and simultaneous transaction load are intentionally
modeled as different capacity dimensions.

## Application runtime scale

| Concurrency | TPS | Average | p50 | p95 | p99 |
|---:|---:|---:|---:|---:|---:|
| 4 | 9.534642 | 401.590 ms | 402.438 ms | 422.564 ms | 434.421 ms |
| 8 | 18.975806 | 382.888 ms | 382.857 ms | 417.912 ms | 436.016 ms |
| 16 | 37.924554 | 342.321 ms | 343.091 ms | 401.583 ms | 429.588 ms |
| 32 | 74.134585 | 270.482 ms | 273.591 ms | 383.627 ms | 421.764 ms |
| 64 | 101.055427 | 383.434 ms | 350.631 ms | 574.399 ms | 1044.174 ms |

The sustained Application run at C32 completed **2,500 / 2,500** state
proofs.

- TPS: **75.403938**
- Average latency: **281.032 ms**
- p95: **386.517 ms**
- p99: **421.639 ms**

C64 remained correct while tail latency increased materially. It is
classified as the **local validator/workstation saturation knee** in the
tested environment, not as a Babycowans Protocol capacity ceiling.

## Payment runtime scale

| Concurrency | TPS | Average | p50 | p95 | p99 |
|---:|---:|---:|---:|---:|---:|
| 4 | 9.449598 | 423.182 ms | 419.357 ms | 443.054 ms | 467.113 ms |
| 8 | 19.029601 | 419.999 ms | 420.199 ms | 446.694 ms | 462.513 ms |
| 16 | 37.780587 | 418.717 ms | 420.511 ms | 491.478 ms | 524.832 ms |
| 32 | 72.276633 | 418.790 ms | 415.334 ms | 538.691 ms | 592.328 ms |
| 64 | 85.824347 | 687.540 ms | 753.309 ms | 903.292 ms | 1153.625 ms |

The sustained Payment run at C32 completed:

- state proof: **2,500 / 2,500**
- TPS: **74.336934**
- Average latency: **424.001 ms**
- p95: **549.341 ms**
- p99: **642.837 ms**
- financial conservation: **PASS**
- transaction uniqueness: **PASS**
- cross-lane writable sharing: **0**

C64 remained transactionally correct but exposed the local Payment
saturation knee through reduced parallel efficiency and increased tail
latency.

## Final Scale classification

- 10M population model: **PASS**
- Application runtime Scale: **PASS**
- Payment runtime Scale: **PASS**
- Application sustained 2,500 @ C32: **PASS**
- Payment sustained 2,500 @ C32: **PASS**
- Confirmed Protocol Scale defects: **0**

## Production Operational Requirements & Trust Boundaries

Large production deployments should use infrastructure matched to actual
traffic rather than registered-user count alone:

- horizontally scalable RPC capacity;
- multiple RPC providers and failover;
- indexed off-chain reads;
- caching for repeated reads;
- bounded retries and backpressure;
- latency, error and saturation observability;
- distributed/cloud load generation for extreme burst validation.

The local measurements characterize the tested local environment and are
not represented as Solana mainnet throughput or as the maximum capacity
of Babycowans Protocol V1.0.0.
