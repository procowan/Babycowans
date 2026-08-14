use std::collections::HashSet;

use babycowans_protocol::canonical_ecosystems::{CanonicalEcosystem, CanonicalEcosystemIdentity};

#[test]
fn registry_contains_exactly_six_ecosystems() {
    assert_eq!(CanonicalEcosystem::ALL.len(), 6);
}

#[test]
fn every_ecosystem_contains_the_four_official_attributes() {
    for ecosystem in CanonicalEcosystem::ALL {
        let CanonicalEcosystemIdentity {
            full_name,
            ticker,
            token_address,
            mission,
        } = ecosystem.identity();

        assert!(!full_name.is_empty());
        assert!(ticker.starts_with('$'));
        assert_ne!(token_address, Default::default());
        assert!(!mission.is_empty());

        assert_eq!(
            CanonicalEcosystem::from_token_address(&token_address),
            Some(ecosystem),
        );
    }
}

#[test]
fn all_ecosystem_identities_are_unique() {
    let mut names = HashSet::new();
    let mut tickers = HashSet::new();
    let mut token_addresses = HashSet::new();
    let mut missions = HashSet::new();

    for ecosystem in CanonicalEcosystem::ALL {
        let identity = ecosystem.identity();

        assert!(names.insert(identity.full_name));
        assert!(tickers.insert(identity.ticker));
        assert!(token_addresses.insert(identity.token_address));
        assert!(missions.insert(identity.mission));
    }
}
