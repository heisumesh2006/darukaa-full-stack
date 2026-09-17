from fastapi.testclient import TestClient

from app.main import create_app


def test_health_contract() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/api/health")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/json"
    assert response.json() == {"status": "ok", "service": "darukaa-earth-api"}


def test_cors_allows_frontend_origin() -> None:
    with TestClient(create_app()) as client:
        response = client.options(
            "/api/health",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            },
        )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_cors_rejects_unknown_origin() -> None:
    with TestClient(create_app()) as client:
        response = client.options(
            "/api/health",
            headers={
                "Origin": "https://untrusted.example",
                "Access-Control-Request-Method": "GET",
            },
        )
    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers
