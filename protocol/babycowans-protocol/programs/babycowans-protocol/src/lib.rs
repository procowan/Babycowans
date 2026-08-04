pub mod constants;
pub mod error;
pub mod events;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use instructions::*;

declare_id!("BSZkHJyqBW19HQ2tTgooKxPc5FEehgm5uxL44Ggxjucp");

#[program]
pub mod babycowans_protocol {
    use super::*;

    pub fn initialize_protocol(
        ctx: Context<InitializeProtocol>,
    ) -> Result<()> {
        initialize_protocol_handler(ctx)
    }

    pub fn register_asset(
        ctx: Context<RegisterAsset>,
    ) -> Result<()> {
        register_asset_handler(ctx)
    }
}
