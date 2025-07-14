# tests/test_api_integration.py
import pytest
from httpx import AsyncClient

class TestAPIIntegration:
    """Test API integration and workflows"""
    
    async def test_complete_user_workflow(self, client: AsyncClient):
        """Test complete user workflow from registration to chat"""
        # 1. Register user
        user_data = {
            "email": "workflow@example.com",
            "password": "WorkflowPass123!",
            "full_name": "Workflow User"
        }
        
        register_response = await client.post("/api/v1/auth/register", json=user_data)
        assert register_response.status_code == 201
        
        # 2. Login user
        login_data = {
            "email": user_data["email"],
            "password": user_data["password"]
        }
        login_response = await client.post("/api/v1/auth/login", json=login_data)
        assert login_response.status_code == 200
        
        token_data = login_response.json()
        headers = {"Authorization": f"Bearer {token_data['access_token']}"}
        
        # 3. Get user profile
        profile_response = await client.get("/api/v1/auth/me", headers=headers)
        assert profile_response.status_code == 200
        
        # 4. Create chat session
        chat_data = {"title": "My First Legal Consultation"}
        chat_response = await client.post("/api/v1/chats/", json=chat_data, headers=headers)
        assert chat_response.status_code == 201
        
        chat_id = chat_response.json()["id"]
        
        # 5. Send message
        message_data = {
            "content": "What documents do I need for driving license?",
            "role": "user"
        }
        message_response = await client.post(
            f"/api/v1/chats/{chat_id}/messages",
            json=message_data,
            headers=headers
        )
        assert message_response.status_code == 201
        
        # 6. Get chat history
        history_response = await client.get("/api/v1/chats/", headers=headers)
        assert history_response.status_code == 200
        
        history_data = history_response.json()
        assert len(history_data["chat_sessions"]) >= 1
        
        # 7. Get messages
        messages_response = await client.get(
            f"/api/v1/chats/{chat_id}/messages",
            headers=headers
        )
        assert messages_response.status_code == 200
        
        messages_data = messages_response.json()
        assert len(messages_data["messages"]) >= 1
    
    async def test_api_health_check(self, client: AsyncClient):
        """Test API health check"""
        response = await client.get("/health")
        
        # Should return 200 or 503 depending on service health
        assert response.status_code in [200, 503]
        
        data = response.json()
        assert "status" in data
        assert "services" in data
        assert "database" in data["services"]
    
    async def test_api_version_info(self, client: AsyncClient):
        """Test API version information"""
        response = await client.get("/version")
        
        assert response.status_code == 200
        data = response.json()
        assert "app_name" in data
        assert "version" in data
        assert "features" in data
        assert "legal_domains" in data
    
    async def test_api_stats(self, client: AsyncClient):
        """Test API statistics"""
        response = await client.get("/api/v1/stats")
        
        assert response.status_code == 200
        data = response.json()
        assert "api_status" in data
        assert "websocket" in data
        assert "features" in data
        assert "legal_coverage" in data
    
    async def test_legal_info_endpoint(self, client: AsyncClient):
        """Test legal information endpoint"""
        response = await client.get("/api/v1/legal-info")
        
        assert response.status_code == 200
        data = response.json()
        assert "legal_framework" in data
        assert "covered_areas" in data
        assert "penalty_ranges" in data
        assert "disclaimer" in data
        
        # Verify specific legal information
        assert "Motor Vehicles Act, 1988" in data["legal_framework"]["primary_act"]
        assert len(data["covered_areas"]) > 0
        assert "general_offenses" in data["penalty_ranges"]
    
    async def test_unauthorized_access(self, client: AsyncClient):
        """Test unauthorized access to protected endpoints"""
        # Try to access protected endpoints without token
        protected_endpoints = [
            "/api/v1/auth/me",
            "/api/v1/chats/",
            "/api/v1/chats/analytics/overview"
        ]
        
        for endpoint in protected_endpoints:
            response = await client.get(endpoint)
            assert response.status_code == 401
    
    async def test_rate_limiting_simulation(self, client: AsyncClient, authenticated_user: dict):
        """Test rate limiting (basic simulation)"""
        # This would need to be adjusted based on actual rate limits
        # For now, just test that the endpoint works
        
        response = await client.get("/api/v1/chats/", headers=authenticated_user["headers"])
        assert response.status_code == 200
        
        # In a real test, you would make many rapid requests
        # and verify that rate limiting kicks in