# tests/test_chat.py
import pytest
from httpx import AsyncClient

class TestChatManagement:
    """Test chat management endpoints"""
    
    async def test_create_chat_session(self, client: AsyncClient, authenticated_user: dict):
        """Test creating a new chat session"""
        chat_data = {
            "title": "Test Legal Consultation",
            "initial_message": "What is the penalty for speeding?"
        }
        
        response = await client.post(
            "/api/v1/chats/",
            json=chat_data,
            headers=authenticated_user["headers"]
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == chat_data["title"]
        assert data["status"] == "active"
        assert "id" in data
        assert data["metadata"]["message_count"] >= 0
    
    async def test_create_chat_session_empty_title(self, client: AsyncClient, authenticated_user: dict):
        """Test creating chat session with empty title"""
        chat_data = {
            "title": "",
            "initial_message": "Test message"
        }
        
        response = await client.post(
            "/api/v1/chats/",
            json=chat_data,
            headers=authenticated_user["headers"]
        )
        
        assert response.status_code == 422  # Validation error
    
    async def test_get_chat_history(self, client: AsyncClient, authenticated_user: dict):
        """Test getting user's chat history"""
        # Create a few chat sessions first
        chat_data = {"title": "Test Chat 1"}
        await client.post("/api/v1/chats/", json=chat_data, headers=authenticated_user["headers"])
        
        chat_data = {"title": "Test Chat 2"}
        await client.post("/api/v1/chats/", json=chat_data, headers=authenticated_user["headers"])
        
        # Get chat history
        response = await client.get("/api/v1/chats/", headers=authenticated_user["headers"])
        
        assert response.status_code == 200
        data = response.json()
        assert "chat_sessions" in data
        assert len(data["chat_sessions"]) >= 2
        assert data["total"] >= 2
        assert data["page"] == 1
    
    async def test_get_chat_history_pagination(self, client: AsyncClient, authenticated_user: dict):
        """Test chat history pagination"""
        # Create multiple chat sessions
        for i in range(5):
            chat_data = {"title": f"Test Chat {i+1}"}
            await client.post("/api/v1/chats/", json=chat_data, headers=authenticated_user["headers"])
        
        # Get first page
        response = await client.get(
            "/api/v1/chats/?page=1&size=3",
            headers=authenticated_user["headers"]
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["chat_sessions"]) == 3
        assert data["page"] == 1
        assert data["size"] == 3
        assert data["has_next"] is True
    
    async def test_get_specific_chat_session(self, client: AsyncClient, authenticated_user: dict):
        """Test getting a specific chat session"""
        # Create chat session
        chat_data = {"title": "Specific Test Chat"}
        create_response = await client.post(
            "/api/v1/chats/",
            json=chat_data,
            headers=authenticated_user["headers"]
        )
        chat_id = create_response.json()["id"]
        
        # Get specific chat
        response = await client.get(
            f"/api/v1/chats/{chat_id}",
            headers=authenticated_user["headers"]
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == chat_id
        assert data["title"] == chat_data["title"]
    
    async def test_get_nonexistent_chat_session(self, client: AsyncClient, authenticated_user: dict):
        """Test getting non-existent chat session"""
        fake_chat_id = "507f1f77bcf86cd799439011"  # Valid ObjectId format
        
        response = await client.get(
            f"/api/v1/chats/{fake_chat_id}",
            headers=authenticated_user["headers"]
        )
        
        assert response.status_code == 404
    
    async def test_update_chat_session(self, client: AsyncClient, authenticated_user: dict):
        """Test updating a chat session"""
        # Create chat session
        chat_data = {"title": "Original Title"}
        create_response = await client.post(
            "/api/v1/chats/",
            json=chat_data,
            headers=authenticated_user["headers"]
        )
        chat_id = create_response.json()["id"]
        
        # Update chat session
        update_data = {
            "title": "Updated Title",
            "tags": ["legal", "consultation"],
            "status": "active"
        }
        
        response = await client.put(
            f"/api/v1/chats/{chat_id}",
            json=update_data,
            headers=authenticated_user["headers"]
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == update_data["title"]
        assert data["tags"] == update_data["tags"]
    
    async def test_delete_chat_session(self, client: AsyncClient, authenticated_user: dict):
        """Test deleting a chat session"""
        # Create chat session
        chat_data = {"title": "Chat to Delete"}
        create_response = await client.post(
            "/api/v1/chats/",
            json=chat_data,
            headers=authenticated_user["headers"]
        )
        chat_id = create_response.json()["id"]
        
        # Delete chat session
        response = await client.delete(
            f"/api/v1/chats/{chat_id}",
            headers=authenticated_user["headers"]
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        # Verify chat is deleted (should return 404)
        get_response = await client.get(
            f"/api/v1/chats/{chat_id}",
            headers=authenticated_user["headers"]
        )
        assert get_response.status_code == 404
    
    async def test_send_message(self, client: AsyncClient, authenticated_user: dict):
        """Test sending a message in a chat session"""
        # Create chat session
        chat_data = {"title": "Message Test Chat"}
        create_response = await client.post(
            "/api/v1/chats/",
            json=chat_data,
            headers=authenticated_user["headers"]
        )
        chat_id = create_response.json()["id"]
        
        # Send message
        message_data = {
            "content": "What is the penalty for not wearing a helmet?",
            "role": "user"
        }
        
        response = await client.post(
            f"/api/v1/chats/{chat_id}/messages",
            json=message_data,
            headers=authenticated_user["headers"]
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["content"] == message_data["content"]
        assert data["role"] == message_data["role"]
        assert data["chat_session_id"] == chat_id
    
    async def test_send_empty_message(self, client: AsyncClient, authenticated_user: dict):
        """Test sending empty message"""
        # Create chat session
        chat_data = {"title": "Empty Message Test"}
        create_response = await client.post(
            "/api/v1/chats/",
            json=chat_data,
            headers=authenticated_user["headers"]
        )
        chat_id = create_response.json()["id"]
        
        # Send empty message
        message_data = {
            "content": "",
            "role": "user"
        }
        
        response = await client.post(
            f"/api/v1/chats/{chat_id}/messages",
            json=message_data,
            headers=authenticated_user["headers"]
        )
        
        assert response.status_code == 422  # Validation error
    
    async def test_get_chat_messages(self, client: AsyncClient, authenticated_user: dict):
        """Test getting messages from a chat session"""
        # Create chat session
        chat_data = {"title": "Messages Test Chat"}
        create_response = await client.post(
            "/api/v1/chats/",
            json=chat_data,
            headers=authenticated_user["headers"]
        )
        chat_id = create_response.json()["id"]
        
        # Send a few messages
        messages = [
            {"content": "First message", "role": "user"},
            {"content": "Second message", "role": "user"},
            {"content": "Third message", "role": "user"}
        ]
        
        for message in messages:
            await client.post(
                f"/api/v1/chats/{chat_id}/messages",
                json=message,
                headers=authenticated_user["headers"]
            )
        
        # Get messages
        response = await client.get(
            f"/api/v1/chats/{chat_id}/messages",
            headers=authenticated_user["headers"]
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "messages" in data
        assert len(data["messages"]) >= 3
        assert data["total"] >= 3
    
    async def test_search_messages(self, client: AsyncClient, authenticated_user: dict):
        """Test searching messages across chat sessions"""
        # Create chat session with searchable content
        chat_data = {"title": "Search Test Chat"}
        create_response = await client.post(
            "/api/v1/chats/",
            json=chat_data,
            headers=authenticated_user["headers"]
        )
        chat_id = create_response.json()["id"]
        
        # Send message with specific content
        message_data = {
            "content": "What is the penalty for overspeeding on highways?",
            "role": "user"
        }
        await client.post(
            f"/api/v1/chats/{chat_id}/messages",
            json=message_data,
            headers=authenticated_user["headers"]
        )
        
        # Search for messages
        response = await client.get(
            "/api/v1/chats/search?q=overspeeding",
            headers=authenticated_user["headers"]
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "messages" in data
        # Note: Search results depend on MongoDB text index being available
    
    async def test_search_messages_short_query(self, client: AsyncClient, authenticated_user: dict):
        """Test searching with too short query"""
        response = await client.get(
            "/api/v1/chats/search?q=ab",
            headers=authenticated_user["headers"]
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "3 characters" in data["error"]
    
    async def test_get_user_analytics(self, client: AsyncClient, authenticated_user: dict):
        """Test getting user chat analytics"""
        # Create some chat sessions and messages first
        for i in range(3):
            chat_data = {"title": f"Analytics Test Chat {i+1}"}
            create_response = await client.post(
                "/api/v1/chats/",
                json=chat_data,
                headers=authenticated_user["headers"]
            )
            chat_id = create_response.json()["id"]
            
            # Add some messages
            message_data = {"content": f"Test message {i+1}", "role": "user"}
            await client.post(
                f"/api/v1/chats/{chat_id}/messages",
                json=message_data,
                headers=authenticated_user["headers"]
            )
        
        # Get analytics
        response = await client.get(
            "/api/v1/chats/analytics/overview",
            headers=authenticated_user["headers"]
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "total_chats" in data
        assert "total_messages" in data
        assert "avg_messages_per_chat" in data
        assert data["total_chats"] >= 3
