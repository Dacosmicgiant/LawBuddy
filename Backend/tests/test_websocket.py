# tests/test_websocket.py
import pytest
import json
from httpx import AsyncClient
from fastapi.testclient import TestClient
from app.main import app

class TestWebSocket:
    """Test WebSocket functionality"""
    
    def test_websocket_connection_without_token(self):
        """Test WebSocket connection without authentication token"""
        client = TestClient(app)
        
        with pytest.raises(Exception):  # Should fail to connect
            with client.websocket_connect("/ws/chat"):
                pass
    
    def test_websocket_connection_invalid_token(self):
        """Test WebSocket connection with invalid token"""
        client = TestClient(app)
        
        with pytest.raises(Exception):  # Should fail to connect
            with client.websocket_connect("/ws/chat?token=invalid_token"):
                pass
    
    def test_websocket_test_endpoint(self):
        """Test WebSocket test endpoint"""
        client = TestClient(app)
        
        with client.websocket_connect("/ws/test") as websocket:
            # Should receive connection test message
            data = websocket.receive_text()
            message = json.loads(data)
            assert message["type"] == "connection_test"
            
            # Send echo test
            test_message = {"type": "test", "content": "hello"}
            websocket.send_text(json.dumps(test_message))
            
            # Should receive echo
            response = websocket.receive_text()
            echo_message = json.loads(response)
            assert echo_message["type"] == "echo"
            assert echo_message["original_message"] == test_message
