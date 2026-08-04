use anchor_lang::prelude::Pubkey;

use babycowans_protocol::state::{
    ApplicationRole,
    Role,
};

fn application_role(role: Role, active: bool) -> ApplicationRole {
    ApplicationRole {
        version: 1,
        application: Pubkey::new_unique(),
        member: Pubkey::new_unique(),
        role,
        active,
        created_at: 0,
        updated_at: 0,
        bump: 255,
    }
}

#[test]
fn owner_has_all_permissions() {
    let role = application_role(Role::Owner, true);

    assert!(role.can_manage());
    assert!(role.can_operate());
    assert!(role.can_audit());
}

#[test]
fn admin_has_all_permissions() {
    let role = application_role(Role::Admin, true);

    assert!(role.can_manage());
    assert!(role.can_operate());
    assert!(role.can_audit());
}

#[test]
fn operator_cannot_manage() {
    let role = application_role(Role::Operator, true);

    assert!(!role.can_manage());
    assert!(role.can_operate());
    assert!(role.can_audit());
}

#[test]
fn auditor_can_only_audit() {
    let role = application_role(Role::Auditor, true);

    assert!(!role.can_manage());
    assert!(!role.can_operate());
    assert!(role.can_audit());
}

#[test]
fn inactive_role_has_no_permissions() {
    let role = application_role(Role::Owner, false);

    assert!(!role.can_manage());
    assert!(!role.can_operate());
    assert!(!role.can_audit());
}
