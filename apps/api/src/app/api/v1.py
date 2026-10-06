from fastapi import APIRouter

from app.modules.auth.router import router as auth_router
from app.modules.catalog.router import router as catalog_router
from app.modules.media.router import router as media_router
from app.modules.users.router import router as users_router
from app.modules.verification.router import router as verification_router

api_router = APIRouter(prefix="/v1")
api_router.include_router(auth_router)
api_router.include_router(catalog_router)
api_router.include_router(media_router)
api_router.include_router(users_router)
api_router.include_router(verification_router)
