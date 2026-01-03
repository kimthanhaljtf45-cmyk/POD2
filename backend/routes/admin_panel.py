"""
Admin Panel Routes
Simple admin panel for configuring owner and admin wallets
NO authentication required - direct access for private club
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter(prefix="/api/admin", tags=["admin"])

# Database dependency
db: Optional[AsyncIOMotorDatabase] = None

def set_db(database: AsyncIOMotorDatabase):
    global db
    db = database


class WalletConfig(BaseModel):
    owner_wallet: str
    admin_wallets: List[str]


@router.get("/settings")
async def get_admin_settings():
    """
    Get current wallet configuration
    """
    settings = await db.club_settings.find_one({})
    if not settings:
        return {
            "owner_wallet": "",
            "admin_wallets": []
        }
    
    return {
        "owner_wallet": settings.get("owner_wallet", ""),
        "admin_wallets": settings.get("admin_wallets", [])
    }


@router.post("/settings")
async def update_admin_settings(config: WalletConfig):
    """
    Update wallet configuration - NO AUTH REQUIRED
    Direct save for private club management
    """
    # Validate wallet addresses (basic check)
    if config.owner_wallet and not config.owner_wallet.startswith("0x"):
        raise HTTPException(status_code=400, detail="Invalid owner wallet address. Must start with 0x")
    
    for wallet in config.admin_wallets:
        if wallet and not wallet.startswith("0x"):
            raise HTTPException(status_code=400, detail=f"Invalid admin wallet address: {wallet}")
    
    # Filter empty wallets
    clean_admin_wallets = [w.lower() for w in config.admin_wallets if w and w.startswith("0x")]
    
    # Update settings
    await db.club_settings.update_one(
        {},
        {
            "$set": {
                "owner_wallet": config.owner_wallet.lower() if config.owner_wallet else "",
                "admin_wallets": clean_admin_wallets
            }
        },
        upsert=True
    )
    
    return {
        "success": True,
        "message": "Настройки сохранены!",
        "owner_wallet": config.owner_wallet.lower() if config.owner_wallet else "",
        "admin_wallets": clean_admin_wallets
    }


@router.get("/check-role/{wallet_address}")
async def check_wallet_role(wallet_address: str):
    """
    Check role for a wallet address
    """
    wallet = wallet_address.lower()
    
    settings = await db.club_settings.find_one({})
    if not settings:
        return {"role": "member", "is_admin": False, "is_owner": False}
    
    owner_wallet = settings.get("owner_wallet", "").lower()
    admin_wallets = [w.lower() for w in settings.get("admin_wallets", [])]
    
    is_owner = wallet == owner_wallet if owner_wallet else False
    is_admin = wallet in admin_wallets
    
    if is_owner:
        role = "owner"
    elif is_admin:
        role = "admin"
    else:
        role = "member"
    
    return {
        "role": role,
        "is_admin": is_admin or is_owner,
        "is_owner": is_owner
    }
