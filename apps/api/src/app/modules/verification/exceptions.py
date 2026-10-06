from app.core.errors import AppError


class VerificationDisabledError(AppError):
    """Face verification is switched off (`VERIFICATION_ENABLED=false`)."""

    status, code, title = 503, "verification-disabled", "Service Unavailable"
