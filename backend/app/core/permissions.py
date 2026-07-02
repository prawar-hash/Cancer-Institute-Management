# Actions constants
USER_MANAGE = "USER_MANAGE"
SYSTEM_SETTINGS = "SYSTEM_SETTINGS"
PATIENT_MANAGE = "PATIENT_MANAGE"
PATIENT_READ = "PATIENT_READ"
PATIENT_PII_READ = "PATIENT_PII_READ"
RESEARCH_READ = "RESEARCH_READ"

# Role permissions map
ROLE_PERMISSIONS: dict[str, set[str]] = {
    "super_admin": {
        USER_MANAGE,
        SYSTEM_SETTINGS,
        PATIENT_MANAGE,
        PATIENT_READ,
        PATIENT_PII_READ,
        RESEARCH_READ
    },
    "admin": {
        PATIENT_MANAGE,
        PATIENT_READ,
        PATIENT_PII_READ,
        RESEARCH_READ
    },
    "student": {
        # Can only read anonymized records, no PII read, no writes
        PATIENT_READ,
        RESEARCH_READ
    }
}

def has_permission(role: str, action: str) -> bool:
    """
    Checks if a role is authorized to perform a specific action.
    """
    allowed_actions = ROLE_PERMISSIONS.get(role, set())
    return action in allowed_actions
