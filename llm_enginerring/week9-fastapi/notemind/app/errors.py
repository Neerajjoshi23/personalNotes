import logging
from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

log = logging.getLogger(__name__)

class AppError(Exception):
    """Base class for application-specific errors."""
    status_code = 500
    title = "Internal Server Error"
    def __init__(self, detail: str, headers: dict[str,str] | None = None,
                 **extra: object):
        super().__init__(detail)
        self.detail = detail 
        self.headers = headers
        self.extra = extra
        
class BadRequest(AppError):
    status_code, title = 400, "Bad Request"


class NotFound(AppError):
    status_code, title = 404, "Not Found"


class Conflict(AppError):
    status_code, title = 409, "Conflict"


class PayloadTooLarge(AppError):
    status_code, title = 413, "Content Too Large"


class Unprocessable(AppError):
    status_code, title = 422, "Unprocessable Content"


class TooManyRequests(AppError):
    status_code, title = 429, "Too Many Requests"
    
def problem(
    request: Request,
    status: int,
    title: str,
    detail: str,
    headers: dict[str, str] | None = None,
    **extra: object,
) -> JSONResponse:
    """Build one RFC 9457 problem+json response. Every error in the app goes through here."""
    body: dict[str, object] = {
        "type": "about:blank",
        "title": title,
        "status": status,
        "detail": detail,
        "instance": request.url.path,                               # path only, never the query string
        "requestId": getattr(request.state, "request_id", None),   # set by our middleware (section 3)
    }
    body.update(extra)
    return JSONResponse(body, status_code=status, headers=headers, media_type="application/problem+json")

def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError) -> JSONResponse:
        return problem(request, exc.status_code, exc.title, exc.detail, exc.headers, **exc.extra)

    @app.exception_handler(RequestValidationError)
    async def handle_validation(request: Request, exc: RequestValidationError) -> JSONResponse:
        # keep where + what; drop "input" (could be a password) and "ctx" (may not be JSON-serializable)
        errors = [{"loc": list(e["loc"]), "msg": e["msg"], "type": e["type"]} for e in exc.errors()]
        return problem(request, 422, "Unprocessable Content", "request has invalid fields", errors=errors)

    @app.exception_handler(StarletteHTTPException)
    async def handle_http(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        # unknown path (404), wrong method (405), and any HTTPException raised by FastAPI itself
        return problem(request, exc.status_code, HTTPStatus(exc.status_code).phrase, str(exc.detail), exc.headers)

    @app.exception_handler(Exception)
    async def handle_unexpected(request: Request, exc: Exception) -> JSONResponse:
        # A bug. Full stack trace to OUR logs, nothing internal to the client.
        log.exception("unhandled error (request_id=%s)", getattr(request.state, "request_id", None))
        return problem(request, 500, "Internal Server Error", "unexpected error")