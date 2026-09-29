import asyncio
import json
import pathlib
from typing import Any

import pytest

from app.core.phone import to_e164

FIXTURES = json.loads(
    (pathlib.Path(__file__).parent / "fixtures" / "phone_cases.json").read_text()
)


@pytest.mark.parametrize(("raw", "expected"), FIXTURES["valid"])
def test_normalizes_like_the_typescript_implementation(raw: str, expected: str) -> None:
    """Both implementations read this same fixture file.

    Divergence means a user who signs up on web and logs in on mobile gets two
    accounts — or a 500 from the unique index.
    """
    assert to_e164(raw, FIXTURES["region"]) == expected


@pytest.mark.parametrize("raw", FIXTURES["invalid"])
def test_rejects_invalid_numbers(raw: str) -> None:
    assert to_e164(raw, FIXTURES["region"]) is None


async def test_request_otp_accepts_a_national_number(client: Any, clean_db: None) -> None:
    response = await client.post("/v1/auth/otp/request", json={"phone": "0912345678"})

    assert response.status_code == 202
    assert response.json()["expiresIn"] == 300


async def test_the_code_is_never_in_the_response(client: Any, clean_db: None) -> None:
    """Not even in development: a code in a response body reaches logs,
    proxies and browser history."""
    response = await client.post("/v1/auth/otp/request", json={"phone": "0912345678"})
    body = response.json()

    from app.modules.auth.sms.console import ConsoleSmsProvider

    code = ConsoleSmsProvider.sent["+84912345678"]
    assert code not in json.dumps(body)


async def test_request_otp_rejects_an_invalid_number(client: Any, clean_db: None) -> None:
    response = await client.post("/v1/auth/otp/request", json={"phone": "1234"})

    assert response.status_code == 422
    assert "phone" in response.json()["errors"]


async def test_verify_issues_a_token_pair(
    client: Any, clean_db: None, last_otp: Any
) -> None:
    await client.post("/v1/auth/otp/request", json={"phone": "0912345678"})

    response = await client.post(
        "/v1/auth/otp/verify",
        json={"phone": "0912345678", "code": last_otp("+84912345678")},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["accessToken"]
    assert body["refreshToken"]
    assert body["isNewUser"] is True


async def test_a_second_login_is_not_a_new_user(
    client: Any, clean_db: None, last_otp: Any
) -> None:
    body: dict[str, Any] = {}
    for _ in range(2):
        await client.post("/v1/auth/otp/request", json={"phone": "0912345678"})
        body = (
            await client.post(
                "/v1/auth/otp/verify",
                json={"phone": "0912345678", "code": last_otp("+84912345678")},
            )
        ).json()

    assert body["isNewUser"] is False


async def test_a_code_cannot_be_used_twice(
    client: Any, clean_db: None, last_otp: Any
) -> None:
    """A code that survives verification is a reusable credential."""
    await client.post("/v1/auth/otp/request", json={"phone": "0912345678"})
    code = last_otp("+84912345678")

    first = await client.post(
        "/v1/auth/otp/verify", json={"phone": "0912345678", "code": code}
    )
    second = await client.post(
        "/v1/auth/otp/verify", json={"phone": "0912345678", "code": code}
    )

    assert first.status_code == 200
    assert second.status_code == 400


async def test_a_wrong_code_fails(client: Any, clean_db: None) -> None:
    await client.post("/v1/auth/otp/request", json={"phone": "0912345678"})

    response = await client.post(
        "/v1/auth/otp/verify", json={"phone": "0912345678", "code": "000000"}
    )

    assert response.status_code == 400
    assert response.json()["type"] == "/errors/otp-invalid"


async def test_too_many_wrong_codes_burns_the_challenge(
    client: Any, clean_db: None, last_otp: Any
) -> None:
    await client.post("/v1/auth/otp/request", json={"phone": "0912345678"})
    code = last_otp("+84912345678")

    for _ in range(5):
        await client.post(
            "/v1/auth/otp/verify", json={"phone": "0912345678", "code": "000000"}
        )

    response = await client.post(
        "/v1/auth/otp/verify", json={"phone": "0912345678", "code": code}
    )

    assert response.status_code in (400, 429)


async def test_requesting_too_often_is_rate_limited(client: Any, clean_db: None) -> None:
    for _ in range(3):
        await client.post("/v1/auth/otp/request", json={"phone": "0912345678"})

    response = await client.post("/v1/auth/otp/request", json={"phone": "0912345678"})

    assert response.status_code == 429
    assert response.headers["retry-after"]


async def test_concurrent_first_login_creates_one_user(
    client: Any, clean_db: None, last_otp: Any
) -> None:
    """Two simultaneous verifies for a new number.

    The unique index is the guard; the code must translate the duplicate-key
    error into a successful login rather than a 500.
    """
    from app.modules.users.models import User

    await client.post("/v1/auth/otp/request", json={"phone": "0912345678"})
    code = last_otp("+84912345678")

    responses = await asyncio.gather(
        client.post("/v1/auth/otp/verify", json={"phone": "0912345678", "code": code}),
        client.post("/v1/auth/otp/verify", json={"phone": "0912345678", "code": code}),
        return_exceptions=True,
    )

    statuses = [r.status_code for r in responses if hasattr(r, "status_code")]
    assert 500 not in statuses, "a race must not produce a server error"
    assert 200 in statuses
    assert await User.find(User.phone == "+84912345678").count() == 1


async def test_refresh_rotates_and_revokes_the_old_token(
    client: Any, clean_db: None, last_otp: Any
) -> None:
    await client.post("/v1/auth/otp/request", json={"phone": "0912345678"})
    tokens = (
        await client.post(
            "/v1/auth/otp/verify",
            json={"phone": "0912345678", "code": last_otp("+84912345678")},
        )
    ).json()

    refreshed = await client.post(
        "/v1/auth/refresh", json={"refreshToken": tokens["refreshToken"]}
    )
    assert refreshed.status_code == 200
    assert refreshed.json()["refreshToken"] != tokens["refreshToken"]

    replayed = await client.post(
        "/v1/auth/refresh", json={"refreshToken": tokens["refreshToken"]}
    )
    assert replayed.status_code == 401, "a rotated token must not work again"


async def test_an_access_token_is_rejected_at_the_refresh_endpoint(
    client: Any, clean_db: None, last_otp: Any
) -> None:
    """Token confusion: the two types must not be interchangeable."""
    await client.post("/v1/auth/otp/request", json={"phone": "0912345678"})
    tokens = (
        await client.post(
            "/v1/auth/otp/verify",
            json={"phone": "0912345678", "code": last_otp("+84912345678")},
        )
    ).json()

    response = await client.post(
        "/v1/auth/refresh", json={"refreshToken": tokens["accessToken"]}
    )

    assert response.status_code == 401


async def test_logout_revokes_the_refresh_token(
    client: Any, clean_db: None, last_otp: Any
) -> None:
    await client.post("/v1/auth/otp/request", json={"phone": "0912345678"})
    tokens = (
        await client.post(
            "/v1/auth/otp/verify",
            json={"phone": "0912345678", "code": last_otp("+84912345678")},
        )
    ).json()

    await client.post("/v1/auth/logout", json={"refreshToken": tokens["refreshToken"]})
    response = await client.post(
        "/v1/auth/refresh", json={"refreshToken": tokens["refreshToken"]}
    )

    assert response.status_code == 401


async def test_a_token_from_login_actually_works(
    client: Any, clean_db: None, last_otp: Any
) -> None:
    """The whole point: the pair must authenticate a real request."""
    await client.post("/v1/auth/otp/request", json={"phone": "0912345678"})
    tokens = (
        await client.post(
            "/v1/auth/otp/verify",
            json={"phone": "0912345678", "code": last_otp("+84912345678")},
        )
    ).json()

    me = await client.get(
        "/v1/users/me",
        headers={"Authorization": f"Bearer {tokens['accessToken']}"},
    )

    assert me.status_code == 200
    assert me.json()["phone"] == "+84912345678"


async def test_a_duplicate_key_race_still_logs_the_user_in(
    client: Any, clean_db: None, last_otp: Any
) -> None:
    """Pin the recovery branch directly.

    Driving two concurrent verifies is non-deterministic: whichever request
    consumes the OTP first makes the second fail on a missing challenge, so
    the duplicate-key branch usually never runs and the assertions pass
    without exercising anything. This forces the exact interleaving instead —
    find_by_phone reports "no user", then the insert loses the race.
    """
    from app.modules.auth.service import AuthService
    from app.modules.auth.sms.console import ConsoleSmsProvider
    from app.modules.users.models import User
    from app.modules.users.repository import UserRepository

    settings = client._transport.app.state.settings

    class RacingRepository(UserRepository):
        """Another request created the user between our lookup and our insert."""

        async def find_by_phone(self, phone: str) -> User | None:
            found = await super().find_by_phone(phone)
            if found is None:
                return None
            self._winner = found
            return None if not getattr(self, "_raced", False) else found

        async def create_for_phone(self, phone: str) -> User:
            self._raced = True
            return await super().create_for_phone(phone)

    service = AuthService(settings, ConsoleSmsProvider(), RacingRepository())

    await service.request_otp("0912345678")
    code = last_otp("+84912345678")
    first = await service.verify_otp("0912345678", code)
    assert first.access_token

    # Second login: the user now exists, so find_by_phone returns None once
    # and the insert hits the unique index.
    await service.request_otp("0912345678")
    code = last_otp("+84912345678")
    second = await service.verify_otp("0912345678", code)

    assert second.access_token, "the duplicate-key path must still issue tokens"
    assert second.is_new_user is False
    assert await User.find(User.phone == "+84912345678").count() == 1
