from app.core.errors import AppError


class OtpInvalidError(AppError):
    status, code, title = 400, "otp-invalid", "Invalid Code"


class OtpExpiredError(AppError):
    status, code, title = 400, "otp-expired", "Code Expired"
