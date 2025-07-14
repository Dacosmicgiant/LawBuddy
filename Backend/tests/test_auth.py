# tests/test_auth.py
import pytest
from httpx import AsyncClient

class TestAuthentication:
    """Test authentication endpoints"""
    
    async def test_register_user_success(self, client: AsyncClient, test_user_data: dict):
        """Test successful user registration"""
        response = await client.post("/api/v1/auth/register", json=test_user_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == test_user_data["email"]
        assert data["profile"]["full_name"] == test_user_data["full_name"]
        assert data["is_active"] is True
        assert "password" not in data
        assert "password_hash" not in data
    
    async def test_register_user_duplicate_email(self, client: AsyncClient, test_user_data: dict):
        """Test registration with duplicate email"""
        # First registration
        response1 = await client.post("/api/v1/auth/register", json=test_user_data)
        assert response1.status_code == 201
        
        # Second registration with same email
        response2 = await client.post("/api/v1/auth/register", json=test_user_data)
        assert response2.status_code == 400
        data = response2.json()
        assert "already registered" in data["error"].lower()
    
    async def test_register_user_weak_password(self, client: AsyncClient):
        """Test registration with weak password"""
        user_data = {
            "email": "test@example.com",
            "password": "weak",
            "full_name": "Test User"
        }
        
        response = await client.post("/api/v1/auth/register", json=user_data)
        assert response.status_code == 400
        data = response.json()
        assert "password" in data["error"].lower()
    
    async def test_register_user_invalid_email(self, client: AsyncClient):
        """Test registration with invalid email"""
        user_data = {
            "email": "invalid-email",
            "password": "TestPass123!",
            "full_name": "Test User"
        }
        
        response = await client.post("/api/v1/auth/register", json=user_data)
        assert response.status_code == 422  # Validation error
    
    async def test_login_success(self, client: AsyncClient, test_user_data: dict):
        """Test successful login"""
        # Register user first
        await client.post("/api/v1/auth/register", json=test_user_data)
        
        # Login
        login_data = {
            "email": test_user_data["email"],
            "password": test_user_data["password"]
        }
        response = await client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] > 0
    
    async def test_login_invalid_credentials(self, client: AsyncClient, test_user_data: dict):
        """Test login with invalid credentials"""
        # Register user first
        await client.post("/api/v1/auth/register", json=test_user_data)
        
        # Login with wrong password
        login_data = {
            "email": test_user_data["email"],
            "password": "wrongpassword"
        }
        response = await client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == 401
        data = response.json()
        assert "incorrect" in data["error"].lower()
    
    async def test_login_nonexistent_user(self, client: AsyncClient):
        """Test login with non-existent user"""
        login_data = {
            "email": "nonexistent@example.com",
            "password": "TestPass123!"
        }
        response = await client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == 401
    
    async def test_get_current_user(self, client: AsyncClient, authenticated_user: dict):
        """Test getting current user information"""
        response = await client.get(
            "/api/v1/auth/me",
            headers=authenticated_user["headers"]
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == authenticated_user["user"]["email"]
        assert data["is_active"] is True
    
    async def test_get_current_user_invalid_token(self, client: AsyncClient):
        """Test getting current user with invalid token"""
        headers = {"Authorization": "Bearer invalid_token"}
        response = await client.get("/api/v1/auth/me", headers=headers)
        
        assert response.status_code == 401
    
    async def test_refresh_token(self, client: AsyncClient, test_user_data: dict):
        """Test token refresh"""
        # Register and login user
        await client.post("/api/v1/auth/register", json=test_user_data)
        login_data = {
            "email": test_user_data["email"],
            "password": test_user_data["password"]
        }
        login_response = await client.post("/api/v1/auth/login", json=login_data)
        login_data = login_response.json()
        
        # Refresh token
        refresh_data = {"refresh_token": login_data["refresh_token"]}
        response = await client.post("/api/v1/auth/refresh", json=refresh_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
    
    async def test_logout(self, client: AsyncClient, authenticated_user: dict):
        """Test user logout"""
        response = await client.post(
            "/api/v1/auth/logout",
            headers=authenticated_user["headers"]
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "logged out" in data["message"].lower()
