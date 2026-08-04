use anchor_lang::prelude::*;

#[account]
pub struct ProtocolConfig {
    pub version: u16,
    pub authority: Pubkey,
    pub pending_authority: Option<Pubkey>,
    pub paused: bool,
    pub application_count: u64,
    pub asset_count: u16,
    pub bump: u8,
}

impl ProtocolConfig {
    pub const SPACE: usize =
        8 +  // Anchor discriminator
        2 +  // version
        32 + // authority
        33 + // pending_authority
        1 +  // paused
        8 +  // application_count
        2 +  // asset_count
        1;   // bump
}
