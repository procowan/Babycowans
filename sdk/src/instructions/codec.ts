import { PublicKey } from "@solana/web3.js";

import { BABYCOWANS_IDL } from "../idl/index.js";

export function instructionDiscriminator(name: string): Buffer {
  const instruction = BABYCOWANS_IDL.instructions.find(
    (item) => item.name === name
  );

  if (instruction === undefined) {
    throw new Error(`Unknown Babycowans instruction: ${name}`);
  }

  return Buffer.from(instruction.discriminator);
}

export function encodeU64(value: bigint): Buffer {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(value);
  return buffer;
}

export function encodeU16(value: number): Buffer {
  if (!Number.isInteger(value) || value < 0 || value > 65535) {
    throw new Error("Value must be an unsigned 16-bit integer.");
  }

  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

export function encodeU8(value: number): Buffer {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new Error("Value must be an unsigned 8-bit integer.");
  }

  return Buffer.from([value]);
}

export function encodeBool(value: boolean): Buffer {
  return Buffer.from([value ? 1 : 0]);
}

export function encodePublicKey(value: PublicKey): Buffer {
  return value.toBuffer();
}

export function encodeString(value: string): Buffer {
  const encoded = Buffer.from(value, "utf8");
  const length = Buffer.alloc(4);

  length.writeUInt32LE(encoded.length);

  return Buffer.concat([length, encoded]);
}

export function encodeFixedBytes3(value: string): Buffer {
  const encoded = Buffer.from(value, "ascii");

  if (encoded.length !== 3) {
    throw new Error("Asset code must contain exactly three ASCII bytes.");
  }

  return encoded;
}

export function encodeEnum(value: number): Buffer {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new Error("Enum value must be an unsigned 8-bit integer.");
  }

  return Buffer.from([value]);
}
