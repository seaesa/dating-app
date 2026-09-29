import logging
import sys
from contextvars import ContextVar

import structlog

_request_id: ContextVar[str] = ContextVar("request_id", default="")


def set_request_id(value: str) -> None:
    _request_id.set(value)


def get_request_id() -> str:
    return _request_id.get()


def _inject_request_id(
    _logger: object, _name: str, event_dict: structlog.types.EventDict
) -> structlog.types.EventDict:
    request_id = get_request_id()
    if request_id:
        event_dict["request_id"] = request_id
    return event_dict


def configure_logging(*, level: str = "INFO", json: bool = False) -> None:
    """Structured logging with the request id attached to every line.

    The contextvar means a log call deep in a service carries the id without
    threading it through every signature.
    """
    logging.basicConfig(format="%(message)s", stream=sys.stdout, level=level)

    processors: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        _inject_request_id,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]
    processors.append(
        structlog.processors.JSONRenderer()
        if json
        else structlog.dev.ConsoleRenderer(colors=True)
    )

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(
            logging.getLevelNamesMapping()[level]
        ),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    logger: structlog.stdlib.BoundLogger = structlog.get_logger(name)
    return logger
