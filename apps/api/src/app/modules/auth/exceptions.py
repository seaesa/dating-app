from app.core.errors import AppError


class OtpInvalidError(AppError):
    status, code, title = 400, "otp-invalid", "Invalid Code"


class OtpExpiredError(AppError):
    status, code, title = 400, "otp-expired", "Code Expired"


class OtpLockedError(AppError):
    """Too many wrong codes: this one is burnt and a new code is the only way on."""

    status, code, title = 400, "otp-locked", "Code Locked"
