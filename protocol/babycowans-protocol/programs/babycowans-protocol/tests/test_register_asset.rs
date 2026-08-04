use anchor_lang::{
    prelude::Pubkey,
    InstructionData,
    ToAccountMetas,
};

use babycowans_protocol::state::AssetDomain;

#[test]
fn register_asset_instruction_is_constructible() {
    let protocol_config = Pubkey::new_unique();
    let mint = babycowans_protocol::canonical_assets::BRC_MINT;
    let authority = Pubkey::new_unique();

    let (asset_config, _) = Pubkey::find_program_address(
        &[b"asset", mint.as_ref()],
        &babycowans_protocol::ID,
    );

    let data = babycowans_protocol::instruction::RegisterAsset {
        asset_code: *b"BRC",
        domain: AssetDomain::EntertainmentAndExperiences,
    }
    .data();

    let accounts = babycowans_protocol::accounts::RegisterAsset {
        protocol_config,
        asset_config,
        mint,
        authority,
        system_program: anchor_lang::system_program::ID,
    }
    .to_account_metas(None);

    assert!(!data.is_empty());
    assert_eq!(accounts.len(), 5);
}

#[test]
fn canonical_registry_contains_exactly_six_unique_mints() {
    let mints = babycowans_protocol::canonical_assets::CANONICAL_MINTS;

    assert_eq!(mints.len(), 6);

    for (index, mint) in mints.iter().enumerate() {
        assert!(
            !mints[..index].contains(mint),
            "canonical mint addresses must be unique"
        );

        assert!(
            babycowans_protocol::canonical_assets::is_canonical_mint(mint)
        );
    }
}
