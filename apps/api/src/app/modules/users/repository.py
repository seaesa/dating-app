from app.core.repository import BaseRepository
from app.modules.users.models import User
from app.modules.users.schemas import PublicProfile, UserStatus


class UserRepository(BaseRepository[User]):
    model = User

    async def find_by_phone(self, phone: str) -> User | None:
        return await User.find_one(User.phone == phone)

    async def create_for_phone(self, phone: str) -> User:
        # A placeholder persona so the document is valid before onboarding; the
        # user replaces it on the onboarding screen.
        return await User(
            phone=phone,
            status=UserStatus.PENDING_ONBOARDING,
            public=PublicProfile(birth_year=2000, city=""),
        ).insert()
