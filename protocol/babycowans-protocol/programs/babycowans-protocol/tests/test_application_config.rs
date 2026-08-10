use anchor_lang::prelude::*;
use anchor_lang::{InstructionData, ToAccountMetas};

use babycowans_protocol::{
    accounts::{ConfigureApplicationConfig, UpdateApplicationConfig},
    instruction::{
        ConfigureApplicationConfig as ConfigureApplicationConfigIx,
        UpdateApplicationConfig as UpdateApplicationConfigIx,
    },
    state::ApplicationConfig,
};

#[test]
fn application_config_limits_are_stable() {
    assert_eq!(ApplicationConfig::MAX_WEBSITE_URI_LENGTH, 256);
    assert_eq!(ApplicationConfig::MAX_LOGO_URI_LENGTH, 256);
    assert_eq!(ApplicationConfig::MAX_SUPPORT_URI_LENGTH, 256);
    assert_eq!(ApplicationConfig::MAX_DESCRIPTION_LENGTH, 512);
    assert_eq!(ApplicationConfig::MAX_METADATA_URI_LENGTH, 256);
}

#[test]
fn application_config_space_matches_bounded_layout() {
    let expected = 8 + // discriminator
        2 + // version
        32 + // application
        4 + ApplicationConfig::MAX_WEBSITE_URI_LENGTH +
        4 + ApplicationConfig::MAX_LOGO_URI_LENGTH +
        4 + ApplicationConfig::MAX_SUPPORT_URI_LENGTH +
        4 + ApplicationConfig::MAX_DESCRIPTION_LENGTH +
        4 + ApplicationConfig::MAX_METADATA_URI_LENGTH +
        8 + // created_at
        8 + // updated_at
        1; // bump

    assert_eq!(ApplicationConfig::SPACE, expected);
}

#[test]
fn configure_application_config_instruction_is_constructible() {
    let application = Pubkey::new_unique();
    let application_config = Pubkey::new_unique();
    let authority = Pubkey::new_unique();

    let data = ConfigureApplicationConfigIx {
        website_uri: "https://babycowans.example".to_string(),
        logo_uri: "https://babycowans.example/logo.png".to_string(),
        support_uri: "https://babycowans.example/support".to_string(),
        description: "Babycowans application metadata".to_string(),
        metadata_uri: "https://babycowans.example/metadata.json".to_string(),
    }
    .data();

    let accounts = ConfigureApplicationConfig {
        application,
        application_config,
        authority,
        system_program: anchor_lang::system_program::ID,
    }
    .to_account_metas(None);

    assert!(!data.is_empty());
    assert_eq!(accounts.len(), 4);

    assert_eq!(accounts[0].pubkey, application);
    assert!(!accounts[0].is_signer);
    assert!(!accounts[0].is_writable);

    assert_eq!(accounts[1].pubkey, application_config);
    assert!(!accounts[1].is_signer);
    assert!(accounts[1].is_writable);

    assert_eq!(accounts[2].pubkey, authority);
    assert!(accounts[2].is_signer);
    assert!(accounts[2].is_writable);

    assert_eq!(accounts[3].pubkey, anchor_lang::system_program::ID);
}

#[test]
fn update_application_config_instruction_is_constructible() {
    let application = Pubkey::new_unique();
    let application_config = Pubkey::new_unique();
    let authority = Pubkey::new_unique();

    let data = UpdateApplicationConfigIx {
        website_uri: "https://updated.babycowans.example".to_string(),
        logo_uri: "https://updated.babycowans.example/logo.png".to_string(),
        support_uri: "https://updated.babycowans.example/support".to_string(),
        description: "Updated Babycowans application metadata".to_string(),
        metadata_uri: "https://updated.babycowans.example/metadata.json".to_string(),
    }
    .data();

    let accounts = UpdateApplicationConfig {
        application,
        application_config,
        authority,
    }
    .to_account_metas(None);

    assert!(!data.is_empty());
    assert_eq!(accounts.len(), 3);

    assert_eq!(accounts[0].pubkey, application);
    assert!(!accounts[0].is_signer);
    assert!(!accounts[0].is_writable);

    assert_eq!(accounts[1].pubkey, application_config);
    assert!(!accounts[1].is_signer);
    assert!(accounts[1].is_writable);

    assert_eq!(accounts[2].pubkey, authority);
    assert!(accounts[2].is_signer);
    assert!(!accounts[2].is_writable);
}

#[test]
fn application_config_instruction_accepts_empty_metadata_encoding() {
    let data = ConfigureApplicationConfigIx {
        website_uri: String::new(),
        logo_uri: String::new(),
        support_uri: String::new(),
        description: String::new(),
        metadata_uri: String::new(),
    }
    .data();

    assert!(!data.is_empty());
}
