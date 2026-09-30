import phonenumbers

DEFAULT_REGION = "VN"


def to_e164(raw: str, region: str = DEFAULT_REGION) -> str | None:
    """Normalize a typed phone number to E.164, or None when invalid.

    Mirrors toE164 in @repo/core. The server is authoritative — it rejects what
    it cannot parse, whatever the client accepted.

    E.164 is the storage format because the unique index depends on one number
    having exactly one representation.
    """
    trimmed = raw.strip()
    if not trimmed:
        return None

    # Users paste the international-access form; the parser wants "+".
    candidate = f"+{trimmed[2:]}" if trimmed.startswith("00") else trimmed

    try:
        parsed = phonenumbers.parse(candidate, region)
    except phonenumbers.NumberParseException:
        return None

    if not phonenumbers.is_valid_number(parsed):
        return None
    formatted: str = phonenumbers.format_number(
        parsed, phonenumbers.PhoneNumberFormat.E164
    )
    return formatted
