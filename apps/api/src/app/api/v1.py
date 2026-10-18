from fastapi import APIRouter

from app.modules.admin.router import router as admin_router
from app.modules.auth.router import router as auth_router
from app.modules.catalog.router import router as catalog_router
from app.modules.connections.router import router as connections_router
from app.modules.interactions.router import router as interactions_router
from app.modules.matching.router import router as discovery_router
from app.modules.media.router import router as media_router
from app.modules.membership.router import router as membership_router
from app.modules.notifications.router import router as notifications_router
from app.modules.payments.router import router as payments_router
from app.modules.realtime.router import router as realtime_router
from app.modules.users.router import router as users_router
from app.modules.verification.router import router as verification_router

api_router = APIRouter(prefix="/v1")
api_router.include_router(admin_router)
api_router.include_router(auth_router)
api_router.include_router(catalog_router)
api_router.include_router(connections_router)
api_router.include_router(discovery_router)
api_router.include_router(interactions_router)
api_router.include_router(media_router)
api_router.include_router(membership_router)
api_router.include_router(notifications_router)
api_router.include_router(payments_router)
api_router.include_router(realtime_router)
api_router.include_router(users_router)
api_router.include_router(verification_router)
