use anchor_lang::{
    prelude::Pubkey,
    pubkey,
};

pub const BRC_MINT: Pubkey =
    pubkey!("25ZEDgK2R62VRnWbqzfKXire7Gdamkopkx6hqtBwpump");

pub const BEC_MINT: Pubkey =
    pubkey!("BSf9mueWMeHMAJcbmVSY53H8jcQjwVK3oMRkmwnHpump");

pub const BGC_MINT: Pubkey =
    pubkey!("BPCBXkCTYPN3JdcXJojDykmtSvPfykXTLcKnxwopump");

pub const BLC_MINT: Pubkey =
    pubkey!("GK1twW6K1o3JrnHjxaAk2LGfWkqRnMoBe6Vyydkpump");

pub const BBC_MINT: Pubkey =
    pubkey!("2aso6jnQt3r5sUicejnCFbZupvKaUhezirqVKMjbpump");

pub const BAC_MINT: Pubkey =
    pubkey!("DKBBNADxPhGU4yJihzMUu9fXacibXhYHnQhSo5Wopump");

pub const CANONICAL_MINTS: [Pubkey; 6] = [
    BRC_MINT,
    BEC_MINT,
    BGC_MINT,
    BLC_MINT,
    BBC_MINT,
    BAC_MINT,
];

pub fn is_canonical_mint(mint: &Pubkey) -> bool {
    CANONICAL_MINTS.contains(mint)
}
