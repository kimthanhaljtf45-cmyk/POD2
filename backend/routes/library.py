"""
Library Routes - Save/Like functionality
"""
from fastapi import APIRouter, Form, HTTPException
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/library", tags=["library"])


async def get_db():
    """Get database instance"""
    from server import db
    return db


@router.post("/save")
async def save_podcast(
    user_id: str = Form(...),
    podcast_id: str = Form(...)
):
    """Save podcast to user's library"""
    db = await get_db()
    
    # Check if already saved
    existing = await db.saved_podcasts.find_one({
        "user_id": user_id,
        "podcast_id": podcast_id
    })
    
    if existing:
        return {"message": "Already saved", "saved": True}
    
    # Save podcast
    save_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "podcast_id": podcast_id,
        "saved_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.saved_podcasts.insert_one(save_doc)
    
    # Increment saves count
    await db.podcasts.update_one(
        {"id": podcast_id},
        {"$inc": {"saves_count": 1}}
    )
    
    return {"message": "Podcast saved", "saved": True}


@router.delete("/saved/{podcast_id}")
async def unsave_podcast(
    podcast_id: str,
    user_id: str = Form(...)
):
    """Remove podcast from user's library"""
    db = await get_db()
    
    result = await db.saved_podcasts.delete_one({
        "user_id": user_id,
        "podcast_id": podcast_id
    })
    
    if result.deleted_count > 0:
        # Decrement saves count
        await db.podcasts.update_one(
            {"id": podcast_id},
            {"$inc": {"saves_count": -1}}
        )
        return {"message": "Podcast removed from library", "saved": False}
    
    return {"message": "Not found in library", "saved": False}


@router.get("/saved/{user_id}")
async def get_saved_podcasts(user_id: str):
    """Get all saved podcasts for a user"""
    db = await get_db()
    
    saved = await db.saved_podcasts.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("saved_at", -1).to_list(1000)
    
    if not saved:
        return []
    
    podcast_ids = [s["podcast_id"] for s in saved]
    podcasts = await db.podcasts.find(
        {"id": {"$in": podcast_ids}},
        {"_id": 0}
    ).to_list(1000)
    
    return podcasts


@router.get("/liked/{user_id}")
async def get_liked_podcasts(user_id: str):
    """Get all liked podcasts for a user"""
    db = await get_db()
    
    # Find podcasts where user_id is in likes array
    podcasts = await db.podcasts.find(
        {"likes": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    return podcasts
