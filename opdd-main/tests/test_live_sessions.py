"""
Live Sessions API and WebSocket Tests
Tests for: WebSocket connection, chat, reactions, hand raise, room state, LiveKit token
"""
import pytest
import requests
import json
import asyncio
import websockets
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://talk-stream-5.preview.emergentagent.com').rstrip('/')

# Test session ID from main agent context
TEST_SESSION_ID = "49064898-580a-4b27-8eab-016299308687"


class TestLiveSessionsAPI:
    """Test Live Sessions REST API endpoints"""
    
    def test_get_sessions_list(self):
        """Test GET /api/live-sessions/sessions - list all sessions"""
        response = requests.get(f"{BASE_URL}/api/live-sessions/sessions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "sessions" in data, "Response should contain 'sessions' key"
        assert isinstance(data["sessions"], list), "Sessions should be a list"
        print(f"✅ GET sessions list: {len(data['sessions'])} sessions found")
    
    def test_get_live_sessions_filter(self):
        """Test GET /api/live-sessions/sessions?status=live - filter by status"""
        response = requests.get(f"{BASE_URL}/api/live-sessions/sessions?status=live")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "sessions" in data
        # All returned sessions should be live
        for session in data["sessions"]:
            assert session.get("status") == "live", f"Expected live status, got {session.get('status')}"
        print(f"✅ GET live sessions filter: {len(data['sessions'])} live sessions")
    
    def test_get_specific_session(self):
        """Test GET /api/live-sessions/sessions/{session_id}"""
        response = requests.get(f"{BASE_URL}/api/live-sessions/sessions/{TEST_SESSION_ID}")
        
        if response.status_code == 404:
            pytest.skip("Test session not found - may have been deleted")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("id") == TEST_SESSION_ID, "Session ID should match"
        assert "title" in data, "Session should have title"
        assert "status" in data, "Session should have status"
        print(f"✅ GET specific session: {data.get('title')} - Status: {data.get('status')}")
    
    def test_get_room_state(self):
        """Test GET /api/live-sessions/room/{session_id}/state"""
        response = requests.get(f"{BASE_URL}/api/live-sessions/room/{TEST_SESSION_ID}/state")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "session_id" in data, "Response should have session_id"
        assert "participants" in data, "Response should have participants"
        assert "speakers" in data, "Response should have speakers"
        assert "listeners" in data, "Response should have listeners"
        assert "hand_raised" in data, "Response should have hand_raised"
        assert "stats" in data, "Response should have stats"
        
        stats = data["stats"]
        assert "total_participants" in stats
        assert "speakers_count" in stats
        assert "listeners_count" in stats
        assert "hand_raised_count" in stats
        print(f"✅ GET room state: {stats['total_participants']} participants, {stats['speakers_count']} speakers")
    
    def test_livekit_token(self):
        """Test POST /api/live-sessions/livekit/token - returns token (real or mock)"""
        payload = {
            "session_id": TEST_SESSION_ID,
            "user_id": f"test_user_{uuid.uuid4().hex[:8]}",
            "username": "TestUser",
            "role": "listener"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/live-sessions/livekit/token",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "mock_mode" in data, "Response should have mock_mode"
        assert "room" in data, "Response should have room"
        assert data["room"] == TEST_SESSION_ID, "Room should match session_id"
        
        if data["mock_mode"]:
            print(f"✅ LiveKit token endpoint: mock_mode=True (LiveKit not configured)")
        else:
            assert "token" in data and data["token"], "Real mode should have token"
            assert "url" in data and data["url"], "Real mode should have url"
            print(f"✅ LiveKit token endpoint: mock_mode=False (LiveKit configured)")
    
    def test_create_session(self):
        """Test POST /api/live-sessions/sessions - create new session"""
        payload = {
            "title": f"Test Session {uuid.uuid4().hex[:6]}",
            "description": "Automated test session"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/live-sessions/sessions",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "session_id" in data, "Response should have session_id"
        assert "rtmp_url" in data, "Response should have rtmp_url"
        assert "stream_key" in data, "Response should have stream_key"
        assert data.get("status") == "scheduled", "New session should be scheduled"
        
        # Store for cleanup
        self.created_session_id = data["session_id"]
        print(f"✅ Created session: {data['session_id']}")
        return data["session_id"]
    
    def test_start_session(self):
        """Test POST /api/live-sessions/sessions/{id}/start"""
        # First create a session
        create_payload = {
            "title": f"Start Test {uuid.uuid4().hex[:6]}",
            "description": "Test starting session"
        }
        create_resp = requests.post(
            f"{BASE_URL}/api/live-sessions/sessions",
            json=create_payload,
            headers={"Content-Type": "application/json"}
        )
        assert create_resp.status_code == 200
        session_id = create_resp.json()["session_id"]
        
        # Start the session
        response = requests.post(f"{BASE_URL}/api/live-sessions/sessions/{session_id}/start")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Start should succeed"
        assert data.get("status") == "live", "Status should be live"
        print(f"✅ Started session: {session_id}")
        
        # Cleanup - end the session
        requests.post(f"{BASE_URL}/api/live-sessions/sessions/{session_id}/end")
        return session_id
    
    def test_end_session(self):
        """Test POST /api/live-sessions/sessions/{id}/end"""
        # Create and start a session
        create_payload = {
            "title": f"End Test {uuid.uuid4().hex[:6]}",
            "description": "Test ending session"
        }
        create_resp = requests.post(
            f"{BASE_URL}/api/live-sessions/sessions",
            json=create_payload,
            headers={"Content-Type": "application/json"}
        )
        session_id = create_resp.json()["session_id"]
        
        # Start it
        requests.post(f"{BASE_URL}/api/live-sessions/sessions/{session_id}/start")
        
        # End it
        response = requests.post(f"{BASE_URL}/api/live-sessions/sessions/{session_id}/end")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "End should succeed"
        assert data.get("status") == "ended", "Status should be ended"
        print(f"✅ Ended session: {session_id}")
    
    def test_delete_session(self):
        """Test DELETE /api/live-sessions/sessions/{id}"""
        # Create a session
        create_payload = {
            "title": f"Delete Test {uuid.uuid4().hex[:6]}",
            "description": "Test deleting session"
        }
        create_resp = requests.post(
            f"{BASE_URL}/api/live-sessions/sessions",
            json=create_payload,
            headers={"Content-Type": "application/json"}
        )
        session_id = create_resp.json()["session_id"]
        
        # Delete it (should work since it's scheduled, not live)
        response = requests.delete(f"{BASE_URL}/api/live-sessions/sessions/{session_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Delete should succeed"
        print(f"✅ Deleted session: {session_id}")
        
        # Verify deletion
        verify_resp = requests.get(f"{BASE_URL}/api/live-sessions/sessions/{session_id}")
        assert verify_resp.status_code == 404, "Session should not exist after deletion"


async def wait_for_message_type(ws, expected_type, timeout=5, max_messages=5):
    """Helper to wait for a specific message type, skipping others"""
    for _ in range(max_messages):
        try:
            message = await asyncio.wait_for(ws.recv(), timeout=timeout)
            data = json.loads(message)
            if data.get("type") == expected_type:
                return data
        except asyncio.TimeoutError:
            break
    return None


class TestWebSocketConnection:
    """Test WebSocket connection and messaging"""
    
    @pytest.mark.asyncio
    async def test_websocket_connect_and_receive_room_state(self):
        """Test WebSocket connection and initial room_state message"""
        ws_url = BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://')
        user_id = f"test_ws_{uuid.uuid4().hex[:8]}"
        username = "WSTestUser"
        
        uri = f"{ws_url}/api/live-sessions/ws/{TEST_SESSION_ID}?user_id={user_id}&username={username}&role=listener"
        
        try:
            async with websockets.connect(uri, open_timeout=10, close_timeout=5) as ws:
                # May receive user_joined first (broadcast), then room_state (direct)
                data = await wait_for_message_type(ws, "room_state", timeout=5, max_messages=3)
                
                assert data is not None, "Should receive room_state message"
                assert "participants" in data, "room_state should have participants"
                assert "speakers" in data, "room_state should have speakers"
                assert "listeners" in data, "room_state should have listeners"
                assert "stats" in data, "room_state should have stats"
                print(f"✅ WebSocket connected and received room_state")
                
        except Exception as e:
            pytest.fail(f"WebSocket connection failed: {e}")
    
    @pytest.mark.asyncio
    async def test_websocket_chat_message(self):
        """Test sending and receiving chat messages via WebSocket"""
        ws_url = BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://')
        user_id = f"test_chat_{uuid.uuid4().hex[:8]}"
        username = "ChatTestUser"
        
        uri = f"{ws_url}/api/live-sessions/ws/{TEST_SESSION_ID}?user_id={user_id}&username={username}&role=listener"
        
        try:
            async with websockets.connect(uri, open_timeout=10, close_timeout=5) as ws:
                # Wait for room_state first
                await wait_for_message_type(ws, "room_state", timeout=5, max_messages=3)
                
                # Send chat message
                test_message = f"Test message {uuid.uuid4().hex[:6]}"
                await ws.send(json.dumps({
                    "type": "chat",
                    "message": test_message
                }))
                
                # Should receive chat_message broadcast
                data = await wait_for_message_type(ws, "chat_message", timeout=5, max_messages=3)
                
                assert data is not None, "Should receive chat_message"
                assert "message" in data, "Should have message object"
                assert data["message"].get("message") == test_message, "Message content should match"
                assert data["message"].get("username") == username, "Username should match"
                print(f"✅ Chat message sent and received: {test_message}")
                
        except Exception as e:
            pytest.fail(f"WebSocket chat test failed: {e}")
    
    @pytest.mark.asyncio
    async def test_websocket_reaction(self):
        """Test sending emoji reactions via WebSocket"""
        ws_url = BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://')
        user_id = f"test_react_{uuid.uuid4().hex[:8]}"
        username = "ReactTestUser"
        
        uri = f"{ws_url}/api/live-sessions/ws/{TEST_SESSION_ID}?user_id={user_id}&username={username}&role=listener"
        
        try:
            async with websockets.connect(uri, open_timeout=10, close_timeout=5) as ws:
                # Wait for room_state first
                await wait_for_message_type(ws, "room_state", timeout=5, max_messages=3)
                
                # Send reaction
                await ws.send(json.dumps({
                    "type": "reaction",
                    "emoji": "🔥"
                }))
                
                # Should receive reaction broadcast
                data = await wait_for_message_type(ws, "reaction", timeout=5, max_messages=3)
                
                assert data is not None, "Should receive reaction"
                assert data.get("emoji") == "🔥", "Emoji should match"
                assert data.get("username") == username, "Username should match"
                print(f"✅ Reaction sent and received: 🔥")
                
        except Exception as e:
            pytest.fail(f"WebSocket reaction test failed: {e}")
    
    @pytest.mark.asyncio
    async def test_websocket_hand_raise(self):
        """Test hand raise/lower via WebSocket"""
        ws_url = BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://')
        user_id = f"test_hand_{uuid.uuid4().hex[:8]}"
        username = "HandTestUser"
        
        uri = f"{ws_url}/api/live-sessions/ws/{TEST_SESSION_ID}?user_id={user_id}&username={username}&role=listener"
        
        try:
            async with websockets.connect(uri, open_timeout=10, close_timeout=5) as ws:
                # Wait for room_state first
                await wait_for_message_type(ws, "room_state", timeout=5, max_messages=3)
                
                # Raise hand
                await ws.send(json.dumps({
                    "type": "hand_raise",
                    "action": "raise"
                }))
                
                # Should receive hand_raised_update
                data = await wait_for_message_type(ws, "hand_raised_update", timeout=5, max_messages=3)
                
                assert data is not None, "Should receive hand_raised_update"
                assert data.get("action") == "raise", "Action should be raise"
                assert user_id in data.get("hand_raised", []), "User should be in hand_raised list"
                print(f"✅ Hand raised successfully")
                
                # Lower hand
                await ws.send(json.dumps({
                    "type": "hand_raise",
                    "action": "lower"
                }))
                
                data = await wait_for_message_type(ws, "hand_raised_update", timeout=5, max_messages=3)
                
                assert data is not None, "Should receive hand_raised_update for lower"
                assert data.get("action") == "lower", "Action should be lower"
                assert user_id not in data.get("hand_raised", []), "User should not be in hand_raised list"
                print(f"✅ Hand lowered successfully")
                
        except Exception as e:
            pytest.fail(f"WebSocket hand raise test failed: {e}")
    
    @pytest.mark.asyncio
    async def test_websocket_ping_pong(self):
        """Test ping/pong heartbeat"""
        ws_url = BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://')
        user_id = f"test_ping_{uuid.uuid4().hex[:8]}"
        username = "PingTestUser"
        
        uri = f"{ws_url}/api/live-sessions/ws/{TEST_SESSION_ID}?user_id={user_id}&username={username}&role=listener"
        
        try:
            async with websockets.connect(uri, open_timeout=10, close_timeout=5) as ws:
                # Wait for room_state first
                await wait_for_message_type(ws, "room_state", timeout=5, max_messages=3)
                
                # Send ping
                await ws.send(json.dumps({"type": "ping"}))
                
                # Should receive pong
                data = await wait_for_message_type(ws, "pong", timeout=5, max_messages=3)
                
                assert data is not None, "Should receive pong"
                print(f"✅ Ping/pong heartbeat working")
                
        except Exception as e:
            pytest.fail(f"WebSocket ping test failed: {e}")
    
    @pytest.mark.asyncio
    async def test_websocket_multi_user_broadcast(self):
        """Test that messages are broadcast to multiple users"""
        ws_url = BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://')
        
        user1_id = f"test_multi1_{uuid.uuid4().hex[:8]}"
        user2_id = f"test_multi2_{uuid.uuid4().hex[:8]}"
        
        uri1 = f"{ws_url}/api/live-sessions/ws/{TEST_SESSION_ID}?user_id={user1_id}&username=User1&role=listener"
        uri2 = f"{ws_url}/api/live-sessions/ws/{TEST_SESSION_ID}?user_id={user2_id}&username=User2&role=listener"
        
        try:
            async with websockets.connect(uri1, open_timeout=10, close_timeout=5) as ws1:
                # Wait for room_state for user1
                await wait_for_message_type(ws1, "room_state", timeout=5, max_messages=3)
                
                async with websockets.connect(uri2, open_timeout=10, close_timeout=5) as ws2:
                    # Wait for room_state for user2
                    await wait_for_message_type(ws2, "room_state", timeout=5, max_messages=3)
                    
                    # User1 should receive user_joined for user2
                    data1 = await wait_for_message_type(ws1, "user_joined", timeout=5, max_messages=3)
                    assert data1 is not None, "User1 should receive user_joined"
                    
                    # User2 sends a chat message
                    test_msg = f"Broadcast test {uuid.uuid4().hex[:6]}"
                    await ws2.send(json.dumps({
                        "type": "chat",
                        "message": test_msg
                    }))
                    
                    # Both users should receive the chat message
                    data1 = await wait_for_message_type(ws1, "chat_message", timeout=5, max_messages=3)
                    assert data1 is not None, "User1 should receive chat_message"
                    assert data1["message"]["message"] == test_msg
                    
                    data2 = await wait_for_message_type(ws2, "chat_message", timeout=5, max_messages=3)
                    assert data2 is not None, "User2 should receive chat_message"
                    assert data2["message"]["message"] == test_msg
                    
                    print(f"✅ Multi-user broadcast working")
                    
        except Exception as e:
            pytest.fail(f"WebSocket multi-user test failed: {e}")


class TestSessionLifecycle:
    """Test full session lifecycle: create -> start -> end -> delete"""
    
    def test_full_session_lifecycle(self):
        """Test complete session lifecycle"""
        # 1. Create session
        create_payload = {
            "title": f"Lifecycle Test {uuid.uuid4().hex[:6]}",
            "description": "Full lifecycle test"
        }
        create_resp = requests.post(
            f"{BASE_URL}/api/live-sessions/sessions",
            json=create_payload,
            headers={"Content-Type": "application/json"}
        )
        assert create_resp.status_code == 200
        session_id = create_resp.json()["session_id"]
        print(f"1. Created session: {session_id}")
        
        # 2. Verify scheduled status
        get_resp = requests.get(f"{BASE_URL}/api/live-sessions/sessions/{session_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["status"] == "scheduled"
        print(f"2. Verified scheduled status")
        
        # 3. Start session
        start_resp = requests.post(f"{BASE_URL}/api/live-sessions/sessions/{session_id}/start")
        assert start_resp.status_code == 200
        assert start_resp.json()["status"] == "live"
        print(f"3. Started session - now live")
        
        # 4. Verify live status
        get_resp = requests.get(f"{BASE_URL}/api/live-sessions/sessions/{session_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["status"] == "live"
        assert get_resp.json().get("started_at") is not None
        print(f"4. Verified live status with started_at")
        
        # 5. End session
        end_resp = requests.post(f"{BASE_URL}/api/live-sessions/sessions/{session_id}/end")
        assert end_resp.status_code == 200
        assert end_resp.json()["status"] == "ended"
        print(f"5. Ended session")
        
        # 6. Verify ended status
        get_resp = requests.get(f"{BASE_URL}/api/live-sessions/sessions/{session_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["status"] == "ended"
        assert get_resp.json().get("ended_at") is not None
        print(f"6. Verified ended status with ended_at")
        
        # 7. Delete session
        delete_resp = requests.delete(f"{BASE_URL}/api/live-sessions/sessions/{session_id}")
        assert delete_resp.status_code == 200
        print(f"7. Deleted session")
        
        # 8. Verify deletion
        verify_resp = requests.get(f"{BASE_URL}/api/live-sessions/sessions/{session_id}")
        assert verify_resp.status_code == 404
        print(f"8. Verified deletion (404)")
        
        print(f"✅ Full session lifecycle test passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
