"""
Comments Routes - Handle podcast comments and replies
"""
from fastapi import APIRouter, HTTPException, Form
from typing import Optional
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/podcasts", tags=["comments"])


async def get_db():
    """Get database instance"""
    from server import db
    return db


@router.get("/{podcast_id}/comments")
async def get_podcast_comments(podcast_id: str):
    """Get all comments for a podcast"""
    db = await get_db()
    
    # Check if podcast exists
    podcast = await db.podcasts.find_one({"id": podcast_id})
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    
    # Get all comments for this podcast
    comments = await db.comments.find(
        {"podcast_id": podcast_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    return comments


@router.post("/{podcast_id}/comments")
async def add_comment(
    podcast_id: str,
    user_id: str = Form(...),
    username: str = Form(...),
    text: str = Form(...),
    wallet_address: Optional[str] = Form(None),
    parent_id: Optional[str] = Form(None)
):
    """Add a comment to a podcast"""
    db = await get_db()
    
    # Check if podcast exists
    podcast = await db.podcasts.find_one({"id": podcast_id})
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    
    # Create comment
    comment_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    comment = {
        "id": comment_id,
        "podcast_id": podcast_id,
        "user_id": user_id,
        "username": username,
        "wallet_address": wallet_address,
        "text": text,
        "parent_id": parent_id,
        "created_at": now,
        "likes_count": 0,
        "liked_by": [],
        "reactions": {},
        "replies": []
    }
    
    await db.comments.insert_one(comment)
    
    # Remove _id before returning
    if "_id" in comment:
        del comment["_id"]
    
    # Update podcast comment count
    await db.podcasts.update_one(
        {"id": podcast_id},
        {"$inc": {"comments_count": 1}}
    )
    
    # Broadcast new comment via WebSocket
    try:
        from routes.websocket import broadcast_new_comment
        await broadcast_new_comment(podcast_id, comment)
    except:
        pass
    
    # Trigger webhook
    try:
        from webhook_service import webhook_service
        await webhook_service.trigger_webhooks('comment.added', {
            'podcast_id': podcast_id,
            'comment_id': comment_id,
            'user_id': user_id
        })
    except:
        pass
    
    return comment


@router.post("/comments/{comment_id}/like")
async def like_comment(
    comment_id: str,
    user_id: str = Form(...)
):
    """Toggle like on a comment"""
    db = await get_db()
    
    comment = await db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    liked_by = comment.get("liked_by", [])
    
    if user_id in liked_by:
        # Unlike
        await db.comments.update_one(
            {"id": comment_id},
            {
                "$pull": {"liked_by": user_id},
                "$inc": {"likes_count": -1}
            }
        )
        return {"liked": False, "likes_count": comment.get("likes_count", 0) - 1}
    else:
        # Like
        await db.comments.update_one(
            {"id": comment_id},
            {
                "$addToSet": {"liked_by": user_id},
                "$inc": {"likes_count": 1}
            }
        )
        return {"liked": True, "likes_count": comment.get("likes_count", 0) + 1}


@router.post("/comments/{comment_id}/reaction")
async def add_comment_reaction(
    comment_id: str,
    user_id: str = Form(...),
    reaction_type: str = Form(...)  # 'fire', 'heart', 'like', etc.
):
    """Add reaction to a comment"""
    db = await get_db()
    
    comment = await db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Update reactions
    reactions = comment.get("reactions", {})
    reactions[reaction_type] = reactions.get(reaction_type, 0) + 1
    
    await db.comments.update_one(
        {"id": comment_id},
        {"$set": {"reactions": reactions}}
    )
    
    return {"reaction_type": reaction_type, "count": reactions[reaction_type]}


@router.delete("/comments/{comment_id}")
async def delete_comment(
    comment_id: str,
    user_id: str
):
    """Delete a comment (only by owner)"""
    db = await get_db()
    
    comment = await db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Check if user is owner
    if comment.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")
    
    # Delete comment
    await db.comments.delete_one({"id": comment_id})
    
    # Update podcast comment count
    await db.podcasts.update_one(
        {"id": comment.get("podcast_id")},
        {"$inc": {"comments_count": -1}}
    )
    
    return {"message": "Comment deleted"}
