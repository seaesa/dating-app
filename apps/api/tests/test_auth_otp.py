import pytest

PHONE = "+84910000009"


async def request_code(api) -> None:
    response = await api.post("/v1/auth/otp/request", json={"phone": PHONE})
    assert response.status_code == 202


@pytest.mark.asyncio
async def test_wrong_code_then_lockout_are_told_apart(api, settings):
    await request_code(api)
    wrong = {"phone": PHONE, "code": "000000"}

    first = await api.post("/v1/auth/otp/verify", json=wrong)
    assert first.json()["type"] == "/errors/otp-invalid"

    for _ in range(settings.otp_max_attempts - 1):
        await api.post("/v1/auth/otp/verify", json=wrong)
    locked = await api.post("/v1/auth/otp/verify", json=wrong)

    # The app tells the user to type again for the first, to ask for a new
    # code for the second; one error type for both leaves them guessing.
    assert locked.json()["type"] == "/errors/otp-locked"


@pytest.mark.asyncio
async def test_expired_code_has_its_own_type(api):
    response = await api.post(
        "/v1/auth/otp/verify", json={"phone": PHONE, "code": "123456"}
    )
    assert response.json()["type"] == "/errors/otp-expired"


@pytest.mark.asyncio
async def test_console_provider_returns_the_code_for_demos(api):
    response = await api.post("/v1/auth/otp/request", json={"phone": PHONE})

    code = response.json()["demoCode"]
    verified = await api.post("/v1/auth/otp/verify", json={"phone": PHONE, "code": code})
    assert verified.status_code == 200


@pytest.mark.asyncio
async def test_real_sms_never_returns_the_code(redis, settings, monkeypatch):
    import httpx

    from app.main import create_app
    from app.modules.auth.sms.twilio import TwilioSmsProvider

    async def no_send(self, phone: str, code: str) -> None:
        return None

    monkeypatch.setattr(TwilioSmsProvider, "send_code", no_send)
    app = create_app(settings.model_copy(update={"sms_provider": "twilio"}))
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/v1/auth/otp/request", json={"phone": PHONE})

    assert response.status_code == 202
    assert response.json().get("demoCode") is None
