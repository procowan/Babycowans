import assert from "node:assert/strict";

import {
  Connection,
  Keypair,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";

import {
  createWalletNeutralTransactionPlan,
  resolveTransactionReceipt,
} from "../src/index.js";

const payer = Keypair.generate().publicKey;

const instruction = new TransactionInstruction({
  programId: SystemProgram.programId,
  keys: [],
  data: Buffer.alloc(0),
});

const plan = createWalletNeutralTransactionPlan(payer, [instruction]);

assert.equal(plan.payer.toBase58(), payer.toBase58());

assert.equal(plan.instructions.length, 1);

assert.equal(plan.instructions[0], instruction);

const successConnection = {
  getSignatureStatuses: async () => ({
    context: {
      slot: 42,
    },
    value: [
      {
        slot: 42,
        confirmations: null,
        err: null,
        confirmationStatus: "finalized",
        status: {
          Ok: null,
        },
      },
    ],
  }),
} as unknown as Connection;

const successReceipt = await resolveTransactionReceipt(
  successConnection,
  "success-signature"
);

assert.equal(successReceipt.confirmationStatus, "finalized");

assert.equal(successReceipt.succeeded, true);

assert.equal(successReceipt.error, null);

const failureConnection = {
  getSignatureStatuses: async () => ({
    context: {
      slot: 43,
    },
    value: [
      {
        slot: 43,
        confirmations: 0,
        err: {
          InstructionError: [0, "Custom"],
        },
        confirmationStatus: "confirmed",
        status: {
          Err: {
            InstructionError: [0, "Custom"],
          },
        },
      },
    ],
  }),
} as unknown as Connection;

const failedReceipt = await resolveTransactionReceipt(
  failureConnection,
  "failed-signature"
);

assert.equal(failedReceipt.succeeded, false);

assert.notEqual(failedReceipt.error, null);

const undefinedStatusConnection = {
  getSignatureStatuses: async () => ({
    context: {
      slot: 44,
    },
    value: [
      {
        slot: 44,
        confirmations: 1,
        err: null,
        confirmationStatus: undefined,
        status: {
          Ok: null,
        },
      },
    ],
  }),
} as unknown as Connection;

const undefinedStatusReceipt = await resolveTransactionReceipt(
  undefinedStatusConnection,
  "undefined-status-signature"
);

assert.equal(undefinedStatusReceipt.confirmationStatus, null);

assert.equal(undefinedStatusReceipt.succeeded, true);

const unknownConnection = {
  getSignatureStatuses: async () => ({
    context: {
      slot: 45,
    },
    value: [null],
  }),
} as unknown as Connection;

const unknownReceipt = await resolveTransactionReceipt(
  unknownConnection,
  "unknown-signature"
);

assert.equal(unknownReceipt.confirmationStatus, null);

assert.equal(unknownReceipt.succeeded, null);

console.log("DX01_WALLET_NEUTRAL_PLAN=PASS");

console.log("DX01_STATUS_AWARE_RECEIPT=PASS");

console.log("DX01_UNDEFINED_CONFIRMATION_STATUS_NORMALIZED=PASS");
