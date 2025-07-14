# tests/conftest.py
import pytest
import asyncio
from httpx import AsyncClient
from motor.motor_asyncio import AsyncIOMotorClient
from app.main import app
from app.core.config import settings

# Test database configuration
TEST_DATABASE_NAME = "lawbuddy_test"

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
async def test_db():
    """Create test database connection"""
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[TEST_DATABASE_NAME]
    
    # Clean up before test
    await db.users.delete_many({})
    await db.chat_sessions.delete_many({})
    await db.messages.delete_many({})
    
    yield db
    
    # Clean up after test
    await db.users.delete_many({})
    await db.chat_sessions.delete_many({})
    await db.messages.delete_many({})
    
    client.close()

@pytest.fixture
async def client():
    """Create test client"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.fixture
async def test_user_data():
    """Test user data"""
    return {
        "email": "test@example.com",
        "password": "TestPass123!",
        "full_name": "Test User"
    }

@pytest.fixture
async def authenticated_user(client: AsyncClient, test_user_data: dict):
    """Create and authenticate a test user"""
    # Register user
    register_response = await client.post("/api/v1/auth/register", json=test_user_data)
    assert register_response.status_code == 201
    
    # Login user
    login_data = {
        "email": test_user_data["email"],
        "password": test_user_data["password"]
    }
    login_response = await client.post("/api/v1/auth/login", json=login_data)
    assert login_response.status_code == 200
    
    token_data = login_response.json()
    user_data = register_response.json()
    
    return {
        "user": user_data,
        "token": token_data["access_token"],
        "headers": {"Authorization": f"Bearer {token_data['access_token']}"}
    }