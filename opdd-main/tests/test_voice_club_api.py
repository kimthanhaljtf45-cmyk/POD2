"""
Private Voice Club API Tests
Tests for Hand Raise, Speech Support, Members, Leaderboard APIs
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://talk-stream-5.preview.emergentagent.com')

# Test session ID from context
LIVE_SESSION_ID = "a85ac26d-a3c5-4309-a04c-dab4b9efb7d4"

# Test user IDs
TEST_USER_1 = "demo-author-123"
TEST_USER_2 = "demo-test-user-001"


class TestClubStats:
    """Club stats endpoint tests"""
    
    def test_get_club_stats(self):
        """Test GET /api/club/stats returns valid stats"""
        response = requests.get(f"{BASE_URL}/api/club/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_members" in data
        assert "roles" in data
        assert "levels" in data
        assert "total_xp_earned" in data
        assert "total_speeches" in data
        assert "total_badges_awarded" in data
        
        # Validate data types
        assert isinstance(data["total_members"], int)
        assert isinstance(data["total_xp_earned"], int)
        print(f"✓ Club stats: {data['total_members']} members, {data['total_xp_earned']} XP")


class TestMembersAPI:
    """Members/Users endpoint tests"""
    
    def test_get_all_users(self):
        """Test GET /api/users returns list of members"""
        response = requests.get(f"{BASE_URL}/api/users")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Validate user structure
        user = data[0]
        assert "id" in user
        assert "name" in user
        assert "level" in user
        assert "xp_total" in user
        assert "role" in user
        print(f"✓ Found {len(data)} members")
    
    def test_get_user_by_id(self):
        """Test GET /api/users/{user_id} returns specific user"""
        response = requests.get(f"{BASE_URL}/api/users/{TEST_USER_1}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == TEST_USER_1
        assert "name" in data
        assert "voice_stats" in data
        print(f"✓ User {data['name']} found with level {data['level']}")


class TestLeaderboardAPI:
    """Leaderboard endpoint tests"""
    
    def test_get_leaderboard_default(self):
        """Test GET /api/xp/leaderboard returns sorted leaderboard"""
        response = requests.get(f"{BASE_URL}/api/xp/leaderboard?limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert "leaderboard" in data
        assert isinstance(data["leaderboard"], list)
        
        # Validate leaderboard entry structure
        if len(data["leaderboard"]) > 0:
            entry = data["leaderboard"][0]
            assert "user_id" in entry
            assert "name" in entry
            assert "xp_total" in entry
            assert "rank" in entry
            assert "level" in entry
            
            # Verify sorted by XP (descending)
            if len(data["leaderboard"]) > 1:
                assert data["leaderboard"][0]["xp_total"] >= data["leaderboard"][1]["xp_total"]
        
        print(f"✓ Leaderboard has {len(data['leaderboard'])} entries")
    
    def test_get_leaderboard_by_engagement(self):
        """Test GET /api/xp/leaderboard?sort_by=engagement"""
        response = requests.get(f"{BASE_URL}/api/xp/leaderboard?limit=10&sort_by=engagement")
        assert response.status_code == 200
        
        data = response.json()
        assert data["sort_by"] == "engagement"
        print(f"✓ Leaderboard sorted by engagement")


class TestLiveSessionAPI:
    """Live session endpoint tests"""
    
    def test_get_live_session(self):
        """Test GET /api/live/session/{session_id} returns session info"""
        response = requests.get(f"{BASE_URL}/api/live/session/{LIVE_SESSION_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == LIVE_SESSION_ID
        assert "title" in data
        assert "is_live" in data
        assert data["is_live"] == True
        print(f"✓ Live session '{data['title']}' is active")
    
    def test_get_active_live_sessions(self):
        """Test GET /api/live/active/all returns active sessions"""
        response = requests.get(f"{BASE_URL}/api/live/active/all")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Found {len(data)} active live sessions")


class TestHandRaiseAPI:
    """Hand Raise system endpoint tests"""
    
    def test_get_hand_raise_queue(self):
        """Test GET /api/live/{session_id}/hand-raise-queue returns queue"""
        response = requests.get(f"{BASE_URL}/api/live/{LIVE_SESSION_ID}/hand-raise-queue")
        assert response.status_code == 200
        
        data = response.json()
        assert "live_session_id" in data
        assert "queue" in data
        assert "total" in data
        assert isinstance(data["queue"], list)
        print(f"✓ Hand raise queue has {data['total']} entries")
    
    def test_raise_hand_duplicate_error(self):
        """Test POST /api/live/{session_id}/hand-raise returns error for duplicate"""
        # First check if user already has hand raised
        queue_response = requests.get(f"{BASE_URL}/api/live/{LIVE_SESSION_ID}/hand-raise-queue")
        queue_data = queue_response.json()
        
        user_in_queue = any(item["user_id"] == TEST_USER_1 for item in queue_data["queue"])
        
        if user_in_queue:
            # Try to raise hand again - should fail
            response = requests.post(
                f"{BASE_URL}/api/live/{LIVE_SESSION_ID}/hand-raise?user_id={TEST_USER_1}"
            )
            assert response.status_code == 400
            assert "already" in response.json()["detail"].lower()
            print(f"✓ Duplicate hand raise correctly rejected")
        else:
            # Raise hand first time
            response = requests.post(
                f"{BASE_URL}/api/live/{LIVE_SESSION_ID}/hand-raise?user_id={TEST_USER_1}"
            )
            assert response.status_code == 200
            data = response.json()
            assert "hand_raise_id" in data
            assert "queue_position" in data
            assert "xp_earned" in data
            print(f"✓ Hand raised successfully, position: {data['queue_position']}")
    
    def test_raise_hand_invalid_session(self):
        """Test POST /api/live/{session_id}/hand-raise with invalid session"""
        response = requests.post(
            f"{BASE_URL}/api/live/invalid-session-id/hand-raise?user_id={TEST_USER_1}"
        )
        assert response.status_code == 404
        print(f"✓ Invalid session correctly returns 404")
    
    def test_raise_hand_invalid_user(self):
        """Test POST /api/live/{session_id}/hand-raise with invalid user"""
        response = requests.post(
            f"{BASE_URL}/api/live/{LIVE_SESSION_ID}/hand-raise?user_id=invalid-user-id"
        )
        assert response.status_code == 404
        print(f"✓ Invalid user correctly returns 404")
    
    def test_get_current_speaker(self):
        """Test GET /api/live/{session_id}/current-speaker"""
        response = requests.get(f"{BASE_URL}/api/live/{LIVE_SESSION_ID}/current-speaker")
        assert response.status_code == 200
        
        data = response.json()
        assert "current_speaker" in data
        print(f"✓ Current speaker endpoint works")


class TestSpeechSupportAPI:
    """Speech Support system endpoint tests"""
    
    def test_support_unapproved_speech_error(self):
        """Test POST /api/speeches/{speech_id}/support fails for unapproved speech"""
        # Get a pending hand raise ID from queue
        queue_response = requests.get(f"{BASE_URL}/api/live/{LIVE_SESSION_ID}/hand-raise-queue")
        queue_data = queue_response.json()
        
        if len(queue_data["queue"]) > 0:
            pending_hand_raise_id = queue_data["queue"][0]["hand_raise_id"]
            
            # Try to support unapproved speech - should fail
            response = requests.post(
                f"{BASE_URL}/api/speeches/{pending_hand_raise_id}/support?supporter_id={TEST_USER_2}&support_type=valuable"
            )
            assert response.status_code == 400
            assert "approved" in response.json()["detail"].lower()
            print(f"✓ Support for unapproved speech correctly rejected")
        else:
            pytest.skip("No pending hand raises to test")
    
    def test_support_invalid_type_error(self):
        """Test POST /api/speeches/{speech_id}/support with invalid support type"""
        response = requests.post(
            f"{BASE_URL}/api/speeches/some-speech-id/support?supporter_id={TEST_USER_2}&support_type=invalid_type"
        )
        assert response.status_code == 400
        assert "invalid" in response.json()["detail"].lower()
        print(f"✓ Invalid support type correctly rejected")
    
    def test_get_speech_supporters(self):
        """Test GET /api/speeches/{speech_id}/supporters"""
        # Use a known speech ID if available
        response = requests.get(f"{BASE_URL}/api/speeches/some-speech-id/supporters")
        # Either 200 with data or 404 if not found
        assert response.status_code in [200, 404]
        print(f"✓ Speech supporters endpoint responds correctly")
    
    def test_get_user_supported_speeches(self):
        """Test GET /api/users/{user_id}/supported-speeches"""
        response = requests.get(f"{BASE_URL}/api/users/{TEST_USER_1}/supported-speeches")
        assert response.status_code == 200
        
        data = response.json()
        assert "user_id" in data
        assert "supported_speeches" in data
        print(f"✓ User supported speeches: {data['total_supports_given']} supports given")
    
    def test_get_user_received_support(self):
        """Test GET /api/users/{user_id}/received-support"""
        response = requests.get(f"{BASE_URL}/api/users/{TEST_USER_1}/received-support")
        assert response.status_code == 200
        
        data = response.json()
        assert "user_id" in data
        assert "received_support" in data
        assert "support_breakdown" in data
        print(f"✓ User received support: {data['total_support_received']} total")


class TestUserHandRaiseHistory:
    """User hand raise history tests"""
    
    def test_get_user_hand_raise_history(self):
        """Test GET /api/users/{user_id}/hand-raise-history"""
        response = requests.get(f"{BASE_URL}/api/users/{TEST_USER_1}/hand-raise-history")
        assert response.status_code == 200
        
        data = response.json()
        assert "user_id" in data
        assert "history" in data
        assert "total_hand_raises" in data
        assert "success_rate" in data
        print(f"✓ User hand raise history: {data['total_hand_raises']} raises, {data['success_rate']} success rate")


class TestClubSettings:
    """Club settings endpoint tests"""
    
    def test_get_club_settings(self):
        """Test GET /api/club/settings returns club configuration"""
        response = requests.get(f"{BASE_URL}/api/club/settings")
        assert response.status_code == 200
        
        data = response.json()
        assert "club_name" in data
        print(f"✓ Club settings: {data.get('club_name', 'N/A')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
