from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import get_request_id
from app.core.schemas import BaseSchema

PROBLEM_JSON = "application/problem+json"


class Problem(BaseSchema):
    """RFC 9457 problem document — the shape EVERY failure takes.

    Declared as a schema so it reaches the OpenAPI document. Without it the
    only documented error is FastAPI's default HTTPValidationError, and the
    generated TypeScript describes an error shape this API never returns.
    """

    type: str
    title: str
    status: int
    detail: str
    request_id: str
    errors: dict[str, list[str]] | None = None


# Attached to every route, so a client generated from this document knows what
# a failure looks like on any endpoint rather than only on 422s.
ERROR_RESPONSES: dict[int | str, dict[str, Any]] = {
    code: {"model": Problem, "description": title, "content": {PROBLEM_JSON: {}}}
    for code, title in {
        400: "Bad Request",
        401: "Unauthorized",
        403: "Forbidden",
        404: "Not Found",
        422: "Validation Failed",
        429: "Too Many Requests",
    }.items()
}


class AppError(Exception):
    """Base for every deliberate failure.

    Carries everything an RFC 9457 problem document needs, so one handler can
    render any subclass without knowing which one it is.
    """

    status: int = 500
    code: str = "internal"
    title: str = "Internal Server Error"

    def __init__(
        self,
        detail: str | None = None,
        *,
        errors: dict[str, list[str]] | None = None,
    ) -> None:
        self.detail = detail or self.title
        self.errors = errors or {}
        super().__init__(self.detail)


class NotFoundError(AppError):
    status, code, title = 404, "not-found", "Not Found"


class ConflictError(AppError):
    status, code, title = 409, "conflict", "Conflict"


class ValidationError(AppError):
    status, code, title = 422, "validation", "Validation Failed"


class UnauthorizedError(AppError):
    status, code, title = 401, "unauthorized", "Unauthorized"


class ForbiddenError(AppError):
    status, code, title = 403, "forbidden", "Forbidden"


class RateLimitedError(AppError):
    status, code, title = 429, "rate-limited", "Too Many Requests"

    def __init__(self, detail: str | None = None, *, retry_after: int = 60) -> None:
        super().__init__(detail)
        self.retry_after = retry_after


def _problem(
    *,
    status: int,
    code: str,
    title: str,
    detail: str,
    errors: dict[str, list[str]] | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    body: dict[str, Any] = {
        "type": f"/errors/{code}",
        "title": title,
        "status": status,
        "detail": detail,
        "requestId": get_request_id(),
    }
    if errors:
        body["errors"] = errors
    return JSONResponse(
        status_code=status, content=body, media_type=PROBLEM_JSON, headers=headers
    )


def install_error_handlers(app: FastAPI) -> None:
    """Render every failure as one shape.

    A 422 that differs in shape from a 404 forces the client to branch on
    status before it can read an error, so validation is folded in here too.
    """

    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError) -> JSONResponse:
        headers = None
        if isinstance(exc, RateLimitedError):
            headers = {"Retry-After": str(exc.retry_after)}
        return _problem(
            status=exc.status,
            code=exc.code,
            title=exc.title,
            detail=exc.detail,
            errors=exc.errors,
            headers=headers,
        )

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        grouped: dict[str, list[str]] = {}
        for error in exc.errors():
            # loc is like ("query", "count") or ("body", "profile", "nickname");
            # drop the source segment and join the rest into a client-usable path.
            path = ".".join(str(p) for p in error["loc"][1:]) or "_"
            grouped.setdefault(path, []).append(error["msg"])
        return _problem(
            status=422,
            code="validation",
            title="Validation Failed",
            detail="The request body or parameters are invalid.",
            errors=grouped,
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        return _problem(
            status=exc.status_code,
            code="http-error",
            title="HTTP Error",
            detail=str(exc.detail),
        )
