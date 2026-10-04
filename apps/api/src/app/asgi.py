"""ASGI entrypoint for Terdin Date API.

Separate from `main` on purpose. Servers locate the application by inspecting
a module for a FastAPI instance, so it must exist as a real module-level
attribute — a lazily-built one is invisible to them.

Keeping it out of `main` means importing the factory does not read settings,
which is what lets `python -m app.cli export-openapi` describe the API with no
environment and no secrets.
"""

from app.main import create_app

app = create_app()
