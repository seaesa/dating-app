import argparse
import json
import pathlib
import sys

from app.core.config import Settings
from app.main import create_app


def export_openapi(destination: pathlib.Path) -> None:
    """Write the OpenAPI document for the TypeScript generator.

    Committed rather than fetched at build time, so CI can typecheck and build
    web and mobile without Python or MongoDB. A CI job regenerates it and fails
    on any diff, which is what keeps it honest.

    sort_keys because FastAPI's dictionary ordering can vary between runs, and
    the drift check would otherwise fail on noise.
    """
    # Placeholder settings: describing the API connects to nothing, and CI's
    # drift check must be able to export the document with no environment and
    # no secrets. Reading real settings here would make `pnpm openapi` fail on
    # a clean checkout.
    settings = Settings(
        mongodb_url="mongodb://schema-export-only",
        redis_url="redis://schema-export-only",
        jwt_secret="x" * 32,
    )
    schema = create_app(settings).openapi()
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(schema, indent=2, sort_keys=True) + "\n")
    print(f"wrote {destination} ({len(schema['paths'])} paths)")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="app.cli")
    sub = parser.add_subparsers(dest="command", required=True)

    export = sub.add_parser("export-openapi")
    export.add_argument("destination", type=pathlib.Path)

    sub.add_parser("verification-worker")
    sub.add_parser("face-check-worker")
    sub.add_parser("push-worker")

    seed = sub.add_parser("seed-chat")
    seed.add_argument("--a", required=True, help="first phone, E.164")
    seed.add_argument("--b", required=True, help="second phone, E.164")
    seed.add_argument("--messages", type=int, default=6)

    args = parser.parse_args(argv)
    if args.command == "export-openapi":
        export_openapi(args.destination)
    elif args.command == "verification-worker":
        return run_verification_worker()
    elif args.command == "face-check-worker":
        return run_face_check_worker()
    elif args.command == "push-worker":
        return run_push_worker()
    elif args.command == "seed-chat":
        return run_seed(args.a, args.b, args.messages)
    return 0


def run_verification_worker() -> int:
    """Start the face verification worker; refuses while the feature is off."""
    from app.core.config import get_settings
    from app.modules.verification.worker import main as worker_main

    settings = get_settings()
    if not settings.verification_enabled:
        print("VERIFICATION_ENABLED is false; the verification worker is not started.")
        return 1
    worker_main(settings)
    return 0


def run_face_check_worker() -> int:
    """Start the main photo face check worker; refuses while the check is off."""
    from app.core.config import get_settings
    from app.modules.media.face_worker import main as worker_main

    settings = get_settings()
    if not settings.face_check_enabled:
        print("FACE_CHECK_ENABLED is false; the face check worker is not started.")
        return 1
    worker_main(settings)
    return 0


def run_push_worker() -> int:
    """Start the push worker."""
    from app.core.config import get_settings
    from app.modules.notifications.worker import main as worker_main

    worker_main(get_settings())
    return 0


def run_seed(phone_a: str, phone_b: str, messages: int) -> int:
    """Two connected users with a short conversation, for local testing."""
    import asyncio

    from app.core.config import get_settings
    from app.seed import run_seed_chat

    settings = get_settings()
    if settings.is_production:
        print("seed-chat refuses to run in production.")
        return 1
    asyncio.run(run_seed_chat(settings, phone_a, phone_b, messages))
    return 0


if __name__ == "__main__":
    sys.exit(main())
