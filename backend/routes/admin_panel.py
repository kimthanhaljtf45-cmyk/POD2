"""
Admin Panel Routes
Simple admin panel for configuring owner and admin wallets
Protected by wallet-based authentication
Supports bootstrap mode for initial setup
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from middleware.auth import require_admin, require_owner, AuthUser, get_current_user
import os

router = APIRouter(prefix="/api/admin", tags=["admin"])

# Bootstrap password - can be set via environment or use default for initial setup
BOOTSTRAP_PASSWORD = os.environ.get("ADMIN_BOOTSTRAP_PASSWORD", "fomo2025admin")

# Database dependency
db: Optional[AsyncIOMotorDatabase] = None

def set_db(database: AsyncIOMotorDatabase):
    global db
    db = database


class WalletConfig(BaseModel):
    owner_wallet: str
    admin_wallets: List[str]


class BootstrapConfig(BaseModel):
    password: str
    owner_wallet: str
    admin_wallets: List[str] = []


@router.get("/settings")
async def get_admin_settings():
    """
    Get current wallet configuration
    """
    settings = await db.club_settings.find_one({})
    if not settings:
        return {
            "owner_wallet": "",
            "admin_wallets": [],
            "bootstrap_mode": True  # No owner set - bootstrap mode available
        }
    
    owner_wallet = settings.get("owner_wallet", "")
    return {
        "owner_wallet": owner_wallet,
        "admin_wallets": settings.get("admin_wallets", []),
        "bootstrap_mode": not bool(owner_wallet)  # Bootstrap if no owner
    }


@router.post("/bootstrap")
async def bootstrap_admin(config: BootstrapConfig):
    """
    Initial setup - set owner wallet without requiring wallet auth.
    Only works if no owner is currently set (bootstrap mode).
    Requires bootstrap password for security.
    """
    # Check bootstrap password
    if config.password != BOOTSTRAP_PASSWORD:
        raise HTTPException(status_code=403, detail="Invalid bootstrap password")
    
    # Check if owner already exists
    settings = await db.club_settings.find_one({})
    if settings and settings.get("owner_wallet"):
        raise HTTPException(
            status_code=400, 
            detail="Owner already configured. Use wallet authentication to modify settings."
        )
    
    # Validate wallet addresses
    if not config.owner_wallet or not config.owner_wallet.startswith("0x"):
        raise HTTPException(status_code=400, detail="Invalid owner wallet address. Must start with 0x")
    
    for wallet in config.admin_wallets:
        if not wallet.startswith("0x"):
            raise HTTPException(status_code=400, detail=f"Invalid admin wallet address: {wallet}")
    
    # Set initial owner and admins
    result = await db.club_settings.update_one(
        {},
        {
            "$set": {
                "owner_wallet": config.owner_wallet.lower(),
                "admin_wallets": [w.lower() for w in config.admin_wallets]
            }
        },
        upsert=True
    )
    
    return {
        "success": True,
        "message": "Bootstrap complete! Owner wallet configured.",
        "owner_wallet": config.owner_wallet.lower(),
        "admin_wallets": [w.lower() for w in config.admin_wallets]
    }


@router.post("/settings")
async def update_admin_settings(
    config: WalletConfig,
    request: Request
):
    """
    Update wallet configuration.
    - If no owner set (bootstrap mode): allows initial setup without auth
    - If owner exists: requires owner authentication
    """
    # Check current settings
    settings = await db.club_settings.find_one({})
    current_owner = settings.get("owner_wallet", "") if settings else ""
    
    # If owner exists, require owner auth
    if current_owner:
        user = await get_current_user(request)
        if not user or not user.is_owner:
            raise HTTPException(
                status_code=403, 
                detail="Owner authentication required. Connect your owner wallet via MetaMask."
            )
    
    # Validate wallet addresses (basic check)
    if config.owner_wallet and not config.owner_wallet.startswith("0x"):
        raise HTTPException(status_code=400, detail="Invalid owner wallet address")
    
    for wallet in config.admin_wallets:
        if not wallet.startswith("0x"):
            raise HTTPException(status_code=400, detail=f"Invalid admin wallet address: {wallet}")
    
    # Update settings
    result = await db.club_settings.update_one(
        {},
        {
            "$set": {
                "owner_wallet": config.owner_wallet.lower(),
                "admin_wallets": [w.lower() for w in config.admin_wallets]
            }
        },
        upsert=True
    )
    
    return {
        "success": True,
        "message": "Wallet configuration updated",
        "owner_wallet": config.owner_wallet.lower(),
        "admin_wallets": [w.lower() for w in config.admin_wallets]
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
