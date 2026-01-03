"""
Referral System Routes
Invite friends with referral codes and earn XP bonuses
"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from uuid import uuid4
import random
import string

router = APIRouter(prefix="/api/referrals", tags=["referrals"])

# Database reference
db = None

def set_db(database):
    global db
    db = database

# XP Rewards
REFERRAL_XP_INVITER = 100  # XP for person who invited
REFERRAL_XP_INVITEE = 50   # XP bonus for new user

def generate_referral_code(length=8):
    """Generate unique referral code"""
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choice(chars) for _ in range(length))


class CreateReferralRequest(BaseModel):
    user_id: str
    user_name: Optional[str] = None


class UseReferralRequest(BaseModel):
    referral_code: str
    new_user_id: str
    new_user_name: Optional[str] = None


class ReferralStats(BaseModel):
    total_invites: int
    successful_invites: int
    pending_invites: int
    total_xp_earned: int


# ========== Referral Code Management ==========

@router.post("/generate")
async def generate_referral(request: CreateReferralRequest):
    """
    Generate or get existing referral code for user
    Each user gets one unique referral code
    """
    # Check if user already has a referral code
    existing = await db.referral_codes.find_one({"user_id": request.user_id})
    
    if existing:
        return {
            "referral_code": existing["code"],
            "referral_link": f"/join?ref={existing['code']}",
            "created_at": existing["created_at"],
            "uses_count": existing.get("uses_count", 0)
        }
    
    # Generate new unique code
    code = generate_referral_code()
    
    # Ensure uniqueness
    while await db.referral_codes.find_one({"code": code}):
        code = generate_referral_code()
    
    referral_doc = {
        "id": str(uuid4()),
        "user_id": request.user_id,
        "user_name": request.user_name,
        "code": code,
        "uses_count": 0,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.referral_codes.insert_one(referral_doc)
    
    return {
        "referral_code": code,
        "referral_link": f"/join?ref={code}",
        "created_at": referral_doc["created_at"],
        "uses_count": 0
    }


@router.get("/code/{user_id}")
async def get_user_referral_code(user_id: str):
    """Get user's referral code if exists"""
    referral = await db.referral_codes.find_one({"user_id": user_id})
    
    if not referral:
        return {"referral_code": None, "message": "No referral code generated yet"}
    
    return {
        "referral_code": referral["code"],
        "referral_link": f"/join?ref={referral['code']}",
        "uses_count": referral.get("uses_count", 0),
        "is_active": referral.get("is_active", True),
        "created_at": referral["created_at"]
    }


@router.get("/validate/{code}")
async def validate_referral_code(code: str):
    """Validate if referral code exists and is active"""
    referral = await db.referral_codes.find_one({"code": code.upper()})
    
    if not referral:
        return {"valid": False, "message": "Invalid referral code"}
    
    if not referral.get("is_active", True):
        return {"valid": False, "message": "Referral code is no longer active"}
    
    # Get inviter info
    inviter = await db.users.find_one({"id": referral["user_id"]})
    
    return {
        "valid": True,
        "inviter_id": referral["user_id"],
        "inviter_name": inviter.get("name", referral.get("user_name", "Unknown")),
        "bonus_xp": REFERRAL_XP_INVITEE
    }


@router.post("/use")
async def use_referral_code(request: UseReferralRequest):
    """
    Use referral code when new user joins
    Awards XP to both inviter and invitee
    """
    code = request.referral_code.upper()
    
    # Find referral code
    referral = await db.referral_codes.find_one({"code": code})
    
    if not referral:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid referral code"
        )
    
    if not referral.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Referral code is no longer active"
        )
    
    # Check if user already used a referral
    existing_use = await db.referral_uses.find_one({"invitee_id": request.new_user_id})
    if existing_use:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has already used a referral code"
        )
    
    # Check if user is trying to use their own code
    if referral["user_id"] == request.new_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot use your own referral code"
        )
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Record the referral use
    referral_use = {
        "id": str(uuid4()),
        "referral_code": code,
        "inviter_id": referral["user_id"],
        "invitee_id": request.new_user_id,
        "invitee_name": request.new_user_name,
        "status": "completed",
        "xp_awarded_inviter": REFERRAL_XP_INVITER,
        "xp_awarded_invitee": REFERRAL_XP_INVITEE,
        "created_at": now
    }
    
    await db.referral_uses.insert_one(referral_use)
    
    # Update referral code uses count
    await db.referral_codes.update_one(
        {"code": code},
        {
            "$inc": {"uses_count": 1},
            "$set": {"updated_at": now}
        }
    )
    
    # Award XP to inviter
    await db.users.update_one(
        {"id": referral["user_id"]},
        {"$inc": {"xp_total": REFERRAL_XP_INVITER}}
    )
    
    # Record XP transaction for inviter
    await db.xp_transactions.insert_one({
        "id": str(uuid4()),
        "user_id": referral["user_id"],
        "amount": REFERRAL_XP_INVITER,
        "reason": f"Referral bonus: {request.new_user_name or 'New user'} joined",
        "type": "referral_inviter",
        "created_at": now
    })
    
    # Award XP to invitee
    await db.users.update_one(
        {"id": request.new_user_id},
        {"$inc": {"xp_total": REFERRAL_XP_INVITEE}}
    )
    
    # Record XP transaction for invitee
    await db.xp_transactions.insert_one({
        "id": str(uuid4()),
        "user_id": request.new_user_id,
        "amount": REFERRAL_XP_INVITEE,
        "reason": "Welcome bonus: Joined via referral",
        "type": "referral_invitee",
        "created_at": now
    })
    
    # Create notification for inviter
    await db.notifications.insert_one({
        "id": str(uuid4()),
        "user_id": referral["user_id"],
        "title": "New referral!",
        "message": f"{request.new_user_name or 'Someone'} joined using your referral code! +{REFERRAL_XP_INVITER} XP",
        "type": "referral",
        "is_read": False,
        "created_at": now
    })
    
    return {
        "success": True,
        "message": "Referral code applied successfully",
        "xp_earned": REFERRAL_XP_INVITEE,
        "inviter_name": referral.get("user_name", "Unknown")
    }


# ========== Statistics ==========

@router.get("/stats/{user_id}")
async def get_referral_stats(user_id: str):
    """Get referral statistics for user"""
    # Get referral code
    referral = await db.referral_codes.find_one({"user_id": user_id})
    
    if not referral:
        return {
            "has_referral_code": False,
            "total_invites": 0,
            "successful_invites": 0,
            "total_xp_earned": 0,
            "invites": []
        }
    
    # Get all referral uses
    uses = await db.referral_uses.find(
        {"inviter_id": user_id}
    ).sort("created_at", -1).to_list(100)
    
    successful = len([u for u in uses if u.get("status") == "completed"])
    total_xp = successful * REFERRAL_XP_INVITER
    
    # Format invites list
    invites = [
        {
            "invitee_name": u.get("invitee_name", "Unknown"),
            "status": u.get("status"),
            "xp_earned": u.get("xp_awarded_inviter", 0),
            "date": u.get("created_at")
        }
        for u in uses
    ]
    
    return {
        "has_referral_code": True,
        "referral_code": referral["code"],
        "referral_link": f"/join?ref={referral['code']}",
        "total_invites": len(uses),
        "successful_invites": successful,
        "total_xp_earned": total_xp,
        "invites": invites
    }


@router.get("/leaderboard")
async def get_referral_leaderboard(limit: int = 10):
    """Get top referrers by successful invites"""
    # Aggregate referral uses by inviter
    pipeline = [
        {"$match": {"status": "completed"}},
        {"$group": {
            "_id": "$inviter_id",
            "total_invites": {"$sum": 1},
            "total_xp": {"$sum": "$xp_awarded_inviter"}
        }},
        {"$sort": {"total_invites": -1}},
        {"$limit": limit}
    ]
    
    results = await db.referral_uses.aggregate(pipeline).to_list(limit)
    
    # Get user details
    leaderboard = []
    for r in results:
        user = await db.users.find_one({"id": r["_id"]})
        if user:
            leaderboard.append({
                "user_id": r["_id"],
                "user_name": user.get("name", "Unknown"),
                "total_invites": r["total_invites"],
                "total_xp": r["total_xp"]
            })
    
    return {"leaderboard": leaderboard}


# ========== Referral History ==========

@router.get("/history/{user_id}")
async def get_referral_history(user_id: str, limit: int = 20):
    """Get detailed referral history for user"""
    # As inviter
    as_inviter = await db.referral_uses.find(
        {"inviter_id": user_id}
    ).sort("created_at", -1).to_list(limit)
    
    # As invitee (who invited this user)
    as_invitee = await db.referral_uses.find_one({"invitee_id": user_id})
    
    invited_by = None
    if as_invitee:
        inviter = await db.users.find_one({"id": as_invitee["inviter_id"]})
        invited_by = {
            "inviter_name": inviter.get("name") if inviter else "Unknown",
            "date": as_invitee.get("created_at"),
            "xp_received": as_invitee.get("xp_awarded_invitee", 0)
        }
    
    return {
        "invited_by": invited_by,
        "people_invited": [
            {
                "id": u.get("invitee_id"),
                "name": u.get("invitee_name", "Unknown"),
                "date": u.get("created_at"),
                "xp_earned": u.get("xp_awarded_inviter", 0),
                "status": u.get("status")
            }
            for u in as_inviter
        ]
    }
