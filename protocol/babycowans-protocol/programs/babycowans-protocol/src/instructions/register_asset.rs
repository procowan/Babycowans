use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct RegisterAsset<'info> {
    pub authority: Signer<'info>,
}

pub fn register_asset_handler(
    _ctx: Context<RegisterAsset>,
) -> Result<()> {
    Ok(())
}
