import idl from "./babycowans_protocol.json" with { type: "json" };

export const BABYCOWANS_IDL = idl;

export type BabycowansIdl = typeof BABYCOWANS_IDL;
