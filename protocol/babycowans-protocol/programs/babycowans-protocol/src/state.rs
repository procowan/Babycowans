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

#[derive(
    AnchorSerialize,
    AnchorDeserialize,
    Clone,
    Copy,
    Debug,
    PartialEq,
    Eq,
)]
pub enum AssetDomain {
    ArtificialIntelligenceAndIoT,
    HealthcareAndInsurance,
    IntellectualPropertyAndLuxury,
    TradeAndLogistics,
    EntertainmentAndExperiences,
    ManufacturingAndSupplyChain,
}

impl AssetDomain {
    pub const SPACE: usize = 1;
}

#[account]
pub struct AssetConfig {
    pub version: u16,
    pub mint: Pubkey,
    pub token_program: Pubkey,
    pub asset_code: [u8; 3],
    pub domain: AssetDomain,
    pub decimals: u8,
    pub enabled: bool,
    pub registered_at: i64,
    pub bump: u8,
}

impl AssetConfig {
    pub const SPACE: usize =
        8 +                    // Anchor discriminator
        2 +                    // version
        32 +                   // mint
        32 +                   // token_program
        3 +                    // asset_code
        AssetDomain::SPACE +   // domain
        1 +                    // decimals
        1 +                    // enabled
        8 +                    // registered_at
        1;                     // bump
}
