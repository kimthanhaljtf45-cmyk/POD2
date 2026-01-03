"""
Admin Security & XP/Badges API Tests
Tests for: Admin endpoint protection, XP system, Badges system

Security Implementation:
- Admin endpoints check X-Wallet-Address header
- If wallet is present and starts with 0x, validates against club_settings
- Non-admin wallets get 403 Forbidden
- NOTE: Without header, requests pass through (backward compatibility)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://talk-stream-5.preview.emergentagent.com').rstrip('/')

# Test wallets
RANDOM_NON_ADMIN_WALLET = "0x1234567890abcdef1234567890abcdef12345678"
ADMIN_WALLET = "0x4fffa18390b3c06b69fe4d3f0e06cee6537255af"  # From club_settings


class TestAdminEndpointProtection:
    """Test that admin endpoints reject non-admin wallets with 403"""
    
    def test_create_session_rejects_non_admin_wallet(self):
        """POST /api/live-sessions/sessions should reject non-admin wallets with 403"""
        payload = {
            "title": f"Security Test {uuid.uuid4().hex[:6]}",
            "description": "Testing admin protection"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/live-sessions/sessions",
            json=payload,
            headers={
                "Content-Type": "application/json",
                "X-Wallet-Address": RANDOM_NON_ADMIN_WALLET
            }
        )
        
        assert response.status_code == 403, f"Expected 403 for non-admin wallet, got {response.status_code}: {response.text}"
        data = response.json()
        assert "admin" in data.get("detail", "").lower() or "access" in data.get("detail", "").lower(), \
            f"Error message should mention admin access: {data}"
        print(f"✅ POST /sessions correctly rejects non-admin wallet with 403")
    
    def test_create_session_allows_admin_wallet(self):
        """POST /api/live-sessions/sessions should allow admin wallets"""
        payload = {
            "title": f"Admin Test {uuid.uuid4().hex[:6]}",
            "description": "Testing admin access"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/live-sessions/sessions",
            json=payload,
            headers={
                "Content-Type": "application/json",
                "X-Wallet-Address": ADMIN_WALLET
            }
        )
        
        assert response.status_code == 200, f"Expected 200 for admin wallet, got {response.status_code}: {response.text}"
        data = response.json()
        assert "session_id" in data, "Response should contain session_id"
        
        # Cleanup - delete the created session
        session_id = data["session_id"]
        requests.delete(
            f"{BASE_URL}/api/live-sessions/sessions/{session_id}",
            headers={"X-Wallet-Address": ADMIN_WALLET}
        )
        print(f"✅ POST /sessions allows admin wallet - created and cleaned up session")
    
    def test_start_session_rejects_non_admin_wallet(self):
        """POST /api/live-sessions/sessions/{id}/start should reject non-admin wallets"""
        # First create a session without wallet header (backward compatibility)
        create_payload = {
            "title": f"Start Security Test {uuid.uuid4().hex[:6]}",
            "description": "Testing start protection"
        }
        create_resp = requests.post(
            f"{BASE_URL}/api/live-sessions/sessions",
            json=create_payload,
            headers={"Content-Type": "application/json"}
        )
        
        if create_resp.status_code != 200:
            pytest.skip("Could not create test session")
        
        session_id = create_resp.json()["session_id"]
        
        try:
            # Try to start with non-admin wallet
            response = requests.post(
                f"{BASE_URL}/api/live-sessions/sessions/{session_id}/start",
                headers={"X-Wallet-Address": RANDOM_NON_ADMIN_WALLET}
            )
            
            assert response.status_code == 403, f"Expected 403 for non-admin wallet, got {response.status_code}: {response.text}"
            print(f"✅ POST /sessions/{session_id}/start correctly rejects non-admin wallet with 403")
        finally:
            # Cleanup
            requests.delete(f"{BASE_URL}/api/live-sessions/sessions/{session_id}")
    
    def test_end_session_rejects_non_admin_wallet(self):
        """POST /api/live-sessions/sessions/{id}/end should reject non-admin wallets"""
        # Create and start a session
        create_payload = {
            "title": f"End Security Test {uuid.uuid4().hex[:6]}",
            "description": "Testing end protection"
        }
        create_resp = requests.post(
            f"{BASE_URL}/api/live-sessions/sessions",
            json=create_payload,
            headers={"Content-Type": "application/json"}
        )
        
        if create_resp.status_code != 200:
            pytest.skip("Could not create test session")
        
        session_id = create_resp.json()["session_id"]
        
        try:
            # Start the session (without wallet header)
            requests.post(f"{BASE_URL}/api/live-sessions/sessions/{session_id}/start")
            
            # Try to end with non-admin wallet
            response = requests.post(
                f"{BASE_URL}/api/live-sessions/sessions/{session_id}/end",
                headers={"X-Wallet-Address": RANDOM_NON_ADMIN_WALLET}
            )
            
            assert response.status_code == 403, f"Expected 403 for non-admin wallet, got {response.status_code}: {response.text}"
            print(f"✅ POST /sessions/{session_id}/end correctly rejects non-admin wallet with 403")
        finally:
            # Cleanup - end and delete
            requests.post(f"{BASE_URL}/api/live-sessions/sessions/{session_id}/end")
            requests.delete(f"{BASE_URL}/api/live-sessions/sessions/{session_id}")
    
    def test_delete_session_rejects_non_admin_wallet(self):
        """DELETE /api/live-sessions/sessions/{id} should reject non-admin wallets"""
        # Create a session
        create_payload = {
            "title": f"Delete Security Test {uuid.uuid4().hex[:6]}",
            "description": "Testing delete protection"
        }
        create_resp = requests.post(
            f"{BASE_URL}/api/live-sessions/sessions",
            json=create_payload,
            headers={"Content-Type": "application/json"}
        )
        
        if create_resp.status_code != 200:
            pytest.skip("Could not create test session")
        
        session_id = create_resp.json()["session_id"]
        
        try:
            # Try to delete with non-admin wallet
            response = requests.delete(
                f"{BASE_URL}/api/live-sessions/sessions/{session_id}",
                headers={"X-Wallet-Address": RANDOM_NON_ADMIN_WALLET}
            )
            
            assert response.status_code == 403, f"Expected 403 for non-admin wallet, got {response.status_code}: {response.text}"
            print(f"✅ DELETE /sessions/{session_id} correctly rejects non-admin wallet with 403")
        finally:
            # Cleanup with no wallet header
            requests.delete(f"{BASE_URL}/api/live-sessions/sessions/{session_id}")
    
    def test_get_sessions_allows_everyone(self):
        """GET /api/live-sessions/sessions should work for everyone (read access)"""
        # Test without wallet header
        response1 = requests.get(f"{BASE_URL}/api/live-sessions/sessions")
        assert response1.status_code == 200, f"Expected 200 without wallet, got {response1.status_code}"
        
        # Test with non-admin wallet
        response2 = requests.get(
            f"{BASE_URL}/api/live-sessions/sessions",
            headers={"X-Wallet-Address": RANDOM_NON_ADMIN_WALLET}
        )
        assert response2.status_code == 200, f"Expected 200 with non-admin wallet, got {response2.status_code}"
        
        # Test with admin wallet
        response3 = requests.get(
            f"{BASE_URL}/api/live-sessions/sessions",
            headers={"X-Wallet-Address": ADMIN_WALLET}
        )
        assert response3.status_code == 200, f"Expected 200 with admin wallet, got {response3.status_code}"
        
        print(f"✅ GET /sessions allows everyone (read access)")


class TestXPSystem:
    """Test XP system endpoints"""
    
    def test_get_leaderboard(self):
        """GET /api/xp/leaderboard returns user rankings"""
        response = requests.get(f"{BASE_URL}/api/xp/leaderboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "leaderboard" in data, "Response should contain 'leaderboard'"
        assert "sort_by" in data, "Response should contain 'sort_by'"
        assert "total" in data, "Response should contain 'total'"
        assert isinstance(data["leaderboard"], list), "Leaderboard should be a list"
        
        # Check leaderboard entry structure if not empty
        if len(data["leaderboard"]) > 0:
            entry = data["leaderboard"][0]
            assert "user_id" in entry, "Entry should have user_id"
            assert "name" in entry, "Entry should have name"
            assert "xp_total" in entry, "Entry should have xp_total"
            assert "level" in entry, "Entry should have level"
            assert "rank" in entry, "Entry should have rank"
        
        print(f"✅ GET /xp/leaderboard returns {data['total']} users")
    
    def test_get_leaderboard_with_sort(self):
        """GET /api/xp/leaderboard with sort_by parameter"""
        # Test engagement sort
        response = requests.get(f"{BASE_URL}/api/xp/leaderboard?sort_by=engagement")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["sort_by"] == "engagement", "Sort should be by engagement"
        
        # Test speeches sort
        response = requests.get(f"{BASE_URL}/api/xp/leaderboard?sort_by=speeches")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["sort_by"] == "speeches", "Sort should be by speeches"
        
        print(f"✅ GET /xp/leaderboard supports sort_by parameter")
    
    def test_get_leaderboard_with_limit(self):
        """GET /api/xp/leaderboard with limit parameter"""
        response = requests.get(f"{BASE_URL}/api/xp/leaderboard?limit=5")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert len(data["leaderboard"]) <= 5, "Should return at most 5 users"
        print(f"✅ GET /xp/leaderboard supports limit parameter")
    
    def test_get_levels(self):
        """GET /api/xp/levels returns level definitions"""
        response = requests.get(f"{BASE_URL}/api/xp/levels")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "levels" in data, "Response should contain 'levels'"
        assert isinstance(data["levels"], list), "Levels should be a list"
        assert len(data["levels"]) >= 5, "Should have at least 5 levels"
        
        # Check level structure
        for level in data["levels"]:
            assert "level" in level, "Level should have level number"
            assert "name" in level, "Level should have name"
            assert "xp_required" in level, "Level should have xp_required"
            assert "benefits" in level, "Level should have benefits"
        
        # Verify level names
        level_names = [l["name"] for l in data["levels"]]
        assert "Observer" in level_names, "Should have Observer level"
        assert "Core Voice" in level_names, "Should have Core Voice level"
        
        print(f"✅ GET /xp/levels returns {len(data['levels'])} level definitions")


class TestBadgesSystem:
    """Test badges system endpoints"""
    
    def test_get_available_badges(self):
        """GET /api/badges/available lists all badges"""
        response = requests.get(f"{BASE_URL}/api/badges/available")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "participation_badges" in data, "Response should contain 'participation_badges'"
        assert "contribution_badges" in data, "Response should contain 'contribution_badges'"
        assert "authority_badges" in data, "Response should contain 'authority_badges'"
        assert "total" in data, "Response should contain 'total'"
        
        # Check badge structure
        for badge in data["participation_badges"]:
            assert "key" in badge, "Badge should have key"
            assert "name" in badge, "Badge should have name"
            assert "description" in badge, "Badge should have description"
            assert "type" in badge, "Badge should have type"
        
        # Verify some expected badges exist
        participation_keys = [b["key"] for b in data["participation_badges"]]
        assert "early_member" in participation_keys, "Should have early_member badge"
        assert "first_speaker" in participation_keys, "Should have first_speaker badge"
        
        print(f"✅ GET /badges/available returns {data['total']} badges")
    
    def test_get_badge_leaderboard(self):
        """GET /api/badges/leaderboard returns users with most badges"""
        response = requests.get(f"{BASE_URL}/api/badges/leaderboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "leaderboard" in data, "Response should contain 'leaderboard'"
        assert "total" in data, "Response should contain 'total'"
        assert isinstance(data["leaderboard"], list), "Leaderboard should be a list"
        
        # Check entry structure if not empty
        if len(data["leaderboard"]) > 0:
            entry = data["leaderboard"][0]
            assert "rank" in entry, "Entry should have rank"
            assert "user_id" in entry, "Entry should have user_id"
            assert "total_badges" in entry, "Entry should have total_badges"
            assert "badge_breakdown" in entry, "Entry should have badge_breakdown"
        
        print(f"✅ GET /badges/leaderboard returns {data['total']} users")


class TestAdminSettings:
    """Test admin settings endpoints"""
    
    def test_get_admin_settings(self):
        """GET /api/admin/settings returns wallet configuration"""
        response = requests.get(f"{BASE_URL}/api/admin/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "owner_wallet" in data, "Response should contain 'owner_wallet'"
        assert "admin_wallets" in data, "Response should contain 'admin_wallets'"
        assert isinstance(data["admin_wallets"], list), "admin_wallets should be a list"
        
        print(f"✅ GET /admin/settings returns wallet config: owner={data['owner_wallet']}, admins={len(data['admin_wallets'])}")
    
    def test_check_wallet_role_admin(self):
        """GET /api/admin/check-role/{wallet} returns correct role for admin"""
        response = requests.get(f"{BASE_URL}/api/admin/check-role/{ADMIN_WALLET}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("is_admin") == True, "Admin wallet should have is_admin=True"
        assert data.get("role") == "admin", f"Admin wallet should have role=admin, got {data.get('role')}"
        
        print(f"✅ GET /admin/check-role/{ADMIN_WALLET[:10]}... returns admin role")
    
    def test_check_wallet_role_member(self):
        """GET /api/admin/check-role/{wallet} returns member role for non-admin"""
        response = requests.get(f"{BASE_URL}/api/admin/check-role/{RANDOM_NON_ADMIN_WALLET}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("is_admin") == False, "Non-admin wallet should have is_admin=False"
        assert data.get("role") == "member", f"Non-admin wallet should have role=member, got {data.get('role')}"
        
        print(f"✅ GET /admin/check-role/{RANDOM_NON_ADMIN_WALLET[:10]}... returns member role")


class TestBackwardCompatibility:
    """Test that endpoints work without wallet header (backward compatibility)
    
    NOTE: This is a potential security concern - admin endpoints work without auth
    """
    
    def test_create_session_without_wallet_header(self):
        """POST /api/live-sessions/sessions works without wallet header (backward compat)"""
        payload = {
            "title": f"No Wallet Test {uuid.uuid4().hex[:6]}",
            "description": "Testing backward compatibility"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/live-sessions/sessions",
            json=payload,
            headers={"Content-Type": "application/json"}
            # No X-Wallet-Address header
        )
        
        # This should work due to backward compatibility
        assert response.status_code == 200, f"Expected 200 without wallet header, got {response.status_code}: {response.text}"
        
        # Cleanup
        session_id = response.json()["session_id"]
        requests.delete(f"{BASE_URL}/api/live-sessions/sessions/{session_id}")
        
        print(f"⚠️ POST /sessions works without wallet header (backward compatibility)")
    
    def test_start_session_without_wallet_header(self):
        """POST /api/live-sessions/sessions/{id}/start works without wallet header"""
        # Create session
        create_resp = requests.post(
            f"{BASE_URL}/api/live-sessions/sessions",
            json={"title": f"Start No Wallet {uuid.uuid4().hex[:6]}"},
            headers={"Content-Type": "application/json"}
        )
        session_id = create_resp.json()["session_id"]
        
        try:
            # Start without wallet header
            response = requests.post(f"{BASE_URL}/api/live-sessions/sessions/{session_id}/start")
            assert response.status_code == 200, f"Expected 200 without wallet header, got {response.status_code}"
            print(f"⚠️ POST /sessions/{session_id}/start works without wallet header")
        finally:
            requests.post(f"{BASE_URL}/api/live-sessions/sessions/{session_id}/end")
            requests.delete(f"{BASE_URL}/api/live-sessions/sessions/{session_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
