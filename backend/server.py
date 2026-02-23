from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Request, UploadFile, File
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import qrcode
import io
import base64
from passlib.context import CryptContext
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "Treuepunkte API", "status": "running"}

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: str
    password: str
    business_name: str

class UserLogin(BaseModel):
    email: str
    password: str

class User(BaseModel):
    user_id: str
    email: str
    name: str
    business_name: Optional[str] = None
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LoyaltyCardCreate(BaseModel):
    card_name: str
    business_name: str
    primary_color: str = "#4F46E5"
    secondary_color: str = "#818CF8"
    text_color: str = "#FFFFFF"
    max_points: int = 10
    reward_description: str = "Gratis Kaffee"
    logo_base64: Optional[str] = None
    background_base64: Optional[str] = None  # Custom background image
    points_label: str = "Punkte"  # Customizable label (Punkte, Stempel, etc.)

class LoyaltyCardUpdate(BaseModel):
    card_name: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    text_color: Optional[str] = None
    max_points: Optional[int] = None
    reward_description: Optional[str] = None
    logo_base64: Optional[str] = None
    background_base64: Optional[str] = None
    points_label: Optional[str] = None

class LoyaltyCard(BaseModel):
    card_id: str
    user_id: str
    card_name: str
    business_name: str
    primary_color: str
    secondary_color: str
    text_color: str
    max_points: int
    reward_description: str
    logo_base64: Optional[str] = None
    background_base64: Optional[str] = None
    points_label: str = "Punkte"
    created_at: datetime
    active: bool = True

class CustomerCard(BaseModel):
    customer_card_id: str
    card_id: str
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    current_points: int = 0
    total_points_earned: int = 0
    rewards_redeemed: int = 0
    qr_code: str
    redemption_qr: Optional[str] = None
    created_at: datetime
    last_updated: datetime
    last_visit: Optional[datetime] = None
    visit_count: int = 0

class PointTransaction(BaseModel):
    transaction_id: str
    customer_card_id: str
    card_id: str
    user_id: str
    points: int
    type: str  # "add" or "redeem"
    created_at: datetime

class AddPointsRequest(BaseModel):
    customer_card_id: str
    points: int = 1

class RedeemRewardRequest(BaseModel):
    customer_card_id: str

class CustomerRegistration(BaseModel):
    card_id: str
    customer_name: str
    customer_email: Optional[str] = None

# ==================== AUTH HELPERS ====================

async def get_current_user(request: Request) -> User:
    # Check cookie first, then Authorization header
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find session
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user_doc)

def generate_qr_code(data: str) -> str:
    """Generate QR code and return as base64 string"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return base64.b64encode(buffer.getvalue()).decode()

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register")
async def register(user_data: UserCreate, response: Response):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="E-Mail bereits registriert")
    
    # Create user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed_password = pwd_context.hash(user_data.password)
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.business_name,
        "business_name": user_data.business_name,
        "password_hash": hashed_password,
        "picture": None,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.users.insert_one(user_doc)
    
    # Create session
    session_token = f"sess_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    return {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.business_name,
        "business_name": user_data.business_name,
        "session_token": session_token
    }

@api_router.post("/auth/login")
async def login(user_data: UserLogin, response: Response):
    # Find user
    user_doc = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Ungültige Anmeldedaten")
    
    # Verify password
    if not pwd_context.verify(user_data.password, user_doc.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Ungültige Anmeldedaten")
    
    # Create session
    session_token = f"sess_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_doc["user_id"],
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    return {
        "user_id": user_doc["user_id"],
        "email": user_doc["email"],
        "name": user_doc.get("name", ""),
        "business_name": user_doc.get("business_name", ""),
        "session_token": session_token
    }

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    """Exchange Emergent OAuth session_id for session_token"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent Auth
    async with httpx.AsyncClient() as client:
        try:
            auth_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            auth_response.raise_for_status()
            auth_data = auth_response.json()
        except Exception as e:
            logger.error(f"Auth error: {e}")
            raise HTTPException(status_code=401, detail="Authentication failed")
    
    # Check if user exists
    user_doc = await db.users.find_one({"email": auth_data["email"]}, {"_id": 0})
    
    if user_doc:
        user_id = user_doc["user_id"]
        # Update user info
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": auth_data["name"], "picture": auth_data.get("picture")}}
        )
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": auth_data["email"],
            "name": auth_data["name"],
            "business_name": auth_data["name"],
            "picture": auth_data.get("picture"),
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(user_doc)
    
    # Create session
    session_token = f"sess_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    # Get updated user
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user.get("name", ""),
        "business_name": user.get("business_name", ""),
        "picture": user.get("picture"),
        "session_token": session_token
    }

@api_router.get("/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(
        key="session_token",
        path="/",
        secure=True,
        samesite="none"
    )
    return {"message": "Logged out"}

# ==================== LOYALTY CARD ENDPOINTS ====================

@api_router.post("/cards", response_model=LoyaltyCard)
async def create_card(card_data: LoyaltyCardCreate, user: User = Depends(get_current_user)):
    card_id = f"card_{uuid.uuid4().hex[:12]}"
    
    card_doc = {
        "card_id": card_id,
        "user_id": user.user_id,
        "card_name": card_data.card_name,
        "business_name": card_data.business_name,
        "primary_color": card_data.primary_color,
        "secondary_color": card_data.secondary_color,
        "text_color": card_data.text_color,
        "max_points": card_data.max_points,
        "reward_description": card_data.reward_description,
        "logo_base64": card_data.logo_base64,
        "background_base64": card_data.background_base64,
        "points_label": card_data.points_label,
        "created_at": datetime.now(timezone.utc),
        "active": True
    }
    
    await db.loyalty_cards.insert_one(card_doc)
    return LoyaltyCard(**card_doc)

@api_router.get("/cards", response_model=List[LoyaltyCard])
async def get_cards(user: User = Depends(get_current_user)):
    cards = await db.loyalty_cards.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).to_list(100)
    return [LoyaltyCard(**card) for card in cards]

@api_router.get("/cards/{card_id}", response_model=LoyaltyCard)
async def get_card(card_id: str, user: User = Depends(get_current_user)):
    card = await db.loyalty_cards.find_one(
        {"card_id": card_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if not card:
        raise HTTPException(status_code=404, detail="Karte nicht gefunden")
    return LoyaltyCard(**card)

@api_router.get("/cards/{card_id}/qrcode")
async def get_card_qrcode(card_id: str, user: User = Depends(get_current_user)):
    """Generate QR code for customer registration"""
    card = await db.loyalty_cards.find_one(
        {"card_id": card_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if not card:
        raise HTTPException(status_code=404, detail="Karte nicht gefunden")
    
    # Generate registration URL
    # This URL will be scanned by customers
    registration_url = f"https://merchant-loyalty-1.preview.emergentagent.com/register/{card_id}"
    qr_code = generate_qr_code(registration_url)
    
    return {
        "card_id": card_id,
        "registration_url": registration_url,
        "qr_code": qr_code
    }

@api_router.put("/cards/{card_id}", response_model=LoyaltyCard)
async def update_card(card_id: str, card_data: LoyaltyCardUpdate, user: User = Depends(get_current_user)):
    update_data = {k: v for k, v in card_data.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Keine Änderungen angegeben")
    
    result = await db.loyalty_cards.update_one(
        {"card_id": card_id, "user_id": user.user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Karte nicht gefunden")
    
    card = await db.loyalty_cards.find_one(
        {"card_id": card_id},
        {"_id": 0}
    )
    return LoyaltyCard(**card)

@api_router.delete("/cards/{card_id}")
async def delete_card(card_id: str, user: User = Depends(get_current_user)):
    result = await db.loyalty_cards.delete_one(
        {"card_id": card_id, "user_id": user.user_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Karte nicht gefunden")
    
    # Also delete all customer cards
    await db.customer_cards.delete_many({"card_id": card_id})
    
    return {"message": "Karte gelöscht"}

# ==================== CUSTOMER CARD ENDPOINTS ====================

@api_router.post("/customers/register")
async def register_customer(data: CustomerRegistration):
    """Register a new customer for a loyalty card - public endpoint"""
    # Verify card exists
    card = await db.loyalty_cards.find_one(
        {"card_id": data.card_id, "active": True},
        {"_id": 0}
    )
    if not card:
        raise HTTPException(status_code=404, detail="Karte nicht gefunden")
    
    customer_card_id = f"cc_{uuid.uuid4().hex[:12]}"
    qr_data = f"loyalty:{customer_card_id}"
    qr_code = generate_qr_code(qr_data)
    now = datetime.now(timezone.utc)
    
    customer_card = {
        "customer_card_id": customer_card_id,
        "card_id": data.card_id,
        "customer_name": data.customer_name,
        "customer_email": data.customer_email,
        "customer_phone": getattr(data, 'customer_phone', None),
        "current_points": 0,
        "total_points_earned": 0,
        "rewards_redeemed": 0,
        "qr_code": qr_code,
        "redemption_qr": None,
        "created_at": now,
        "last_updated": now,
        "last_visit": now,
        "visit_count": 1
    }
    
    await db.customer_cards.insert_one(customer_card)
    
    return {
        "customer_card_id": customer_card_id,
        "card_id": data.card_id,
        "customer_name": data.customer_name,
        "qr_code": qr_code,
        "current_points": 0,
        "max_points": card["max_points"],
        "reward_description": card["reward_description"],
        "business_name": card["business_name"],
        "points_label": card.get("points_label", "Punkte"),
        "card_design": {
            "card_name": card["card_name"],
            "primary_color": card["primary_color"],
            "secondary_color": card["secondary_color"],
            "text_color": card["text_color"],
            "logo_base64": card.get("logo_base64"),
            "background_base64": card.get("background_base64")
        }
    }

@api_router.get("/customers/{customer_card_id}/card")
async def get_customer_card_public(customer_card_id: str):
    """Get customer card details - public endpoint for wallet"""
    customer_card = await db.customer_cards.find_one(
        {"customer_card_id": customer_card_id},
        {"_id": 0}
    )
    if not customer_card:
        raise HTTPException(status_code=404, detail="Kundenkarte nicht gefunden")
    
    card = await db.loyalty_cards.find_one(
        {"card_id": customer_card["card_id"]},
        {"_id": 0}
    )
    if not card:
        raise HTTPException(status_code=404, detail="Treuekarte nicht gefunden")
    
    return {
        **customer_card,
        "max_points": card["max_points"],
        "reward_description": card["reward_description"],
        "business_name": card["business_name"],
        "card_design": {
            "card_name": card["card_name"],
            "primary_color": card["primary_color"],
            "secondary_color": card["secondary_color"],
            "text_color": card["text_color"],
            "logo_base64": card.get("logo_base64")
        }
    }

@api_router.get("/cards/{card_id}/customers", response_model=List[CustomerCard])
async def get_card_customers(card_id: str, user: User = Depends(get_current_user)):
    """Get all customers for a specific card"""
    # Verify card belongs to user
    card = await db.loyalty_cards.find_one(
        {"card_id": card_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if not card:
        raise HTTPException(status_code=404, detail="Karte nicht gefunden")
    
    customers = await db.customer_cards.find(
        {"card_id": card_id},
        {"_id": 0}
    ).sort("last_visit", -1).to_list(1000)
    
    # Add transaction history for each customer
    result = []
    for c in customers:
        # Get recent transactions
        transactions = await db.point_transactions.find(
            {"customer_card_id": c["customer_card_id"]},
            {"_id": 0}
        ).sort("created_at", -1).limit(10).to_list(10)
        c["recent_transactions"] = transactions
        result.append(c)
    
    return result

@api_router.get("/customers/{customer_card_id}/details")
async def get_customer_details(customer_card_id: str, user: User = Depends(get_current_user)):
    """Get detailed customer information including transaction history"""
    customer_card = await db.customer_cards.find_one(
        {"customer_card_id": customer_card_id},
        {"_id": 0}
    )
    if not customer_card:
        raise HTTPException(status_code=404, detail="Kundenkarte nicht gefunden")
    
    # Verify the card belongs to this business
    card = await db.loyalty_cards.find_one(
        {"card_id": customer_card["card_id"], "user_id": user.user_id},
        {"_id": 0}
    )
    if not card:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    # Get all transactions
    transactions = await db.point_transactions.find(
        {"customer_card_id": customer_card_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {
        **customer_card,
        "card_name": card["card_name"],
        "max_points": card["max_points"],
        "reward_description": card["reward_description"],
        "transactions": transactions
    }

@api_router.post("/points/add")
async def add_points(data: AddPointsRequest, user: User = Depends(get_current_user)):
    """Add points to a customer card"""
    customer_card = await db.customer_cards.find_one(
        {"customer_card_id": data.customer_card_id},
        {"_id": 0}
    )
    if not customer_card:
        raise HTTPException(status_code=404, detail="Kundenkarte nicht gefunden")
    
    # Verify the card belongs to this business
    card = await db.loyalty_cards.find_one(
        {"card_id": customer_card["card_id"], "user_id": user.user_id},
        {"_id": 0}
    )
    if not card:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    now = datetime.now(timezone.utc)
    new_points = customer_card["current_points"] + data.points
    total_earned = customer_card["total_points_earned"] + data.points
    visit_count = customer_card.get("visit_count", 0) + 1
    
    update_data = {
        "current_points": new_points,
        "total_points_earned": total_earned,
        "last_updated": now,
        "last_visit": now,
        "visit_count": visit_count
    }
    
    # Check if card is full - generate redemption QR
    if new_points >= card["max_points"]:
        redemption_code = f"redeem:{data.customer_card_id}:{uuid.uuid4().hex[:8]}"
        update_data["redemption_qr"] = generate_qr_code(redemption_code)
    
    await db.customer_cards.update_one(
        {"customer_card_id": data.customer_card_id},
        {"$set": update_data}
    )
    
    # Log the transaction
    await db.point_transactions.insert_one({
        "transaction_id": f"tx_{uuid.uuid4().hex[:12]}",
        "customer_card_id": data.customer_card_id,
        "card_id": customer_card["card_id"],
        "user_id": user.user_id,
        "points": data.points,
        "type": "add",
        "created_at": now
    })
    
    return {
        "success": True,
        "new_points": new_points,
        "max_points": card["max_points"],
        "is_full": new_points >= card["max_points"],
        "reward_description": card["reward_description"] if new_points >= card["max_points"] else None
    }

@api_router.post("/rewards/redeem")
async def redeem_reward(data: RedeemRewardRequest, user: User = Depends(get_current_user)):
    """Redeem a full card"""
    customer_card = await db.customer_cards.find_one(
        {"customer_card_id": data.customer_card_id},
        {"_id": 0}
    )
    if not customer_card:
        raise HTTPException(status_code=404, detail="Kundenkarte nicht gefunden")
    
    # Verify the card belongs to this business
    card = await db.loyalty_cards.find_one(
        {"card_id": customer_card["card_id"], "user_id": user.user_id},
        {"_id": 0}
    )
    if not card:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    if customer_card["current_points"] < card["max_points"]:
        raise HTTPException(status_code=400, detail="Nicht genug Punkte")
    
    # Reset points
    await db.customer_cards.update_one(
        {"customer_card_id": data.customer_card_id},
        {"$set": {
            "current_points": 0,
            "redemption_qr": None,
            "rewards_redeemed": customer_card["rewards_redeemed"] + 1,
            "last_updated": datetime.now(timezone.utc)
        }}
    )
    
    # Log redemption
    await db.point_transactions.insert_one({
        "transaction_id": f"tx_{uuid.uuid4().hex[:12]}",
        "customer_card_id": data.customer_card_id,
        "card_id": customer_card["card_id"],
        "user_id": user.user_id,
        "points": -card["max_points"],
        "type": "redeem",
        "created_at": datetime.now(timezone.utc)
    })
    
    return {
        "success": True,
        "message": f"Belohnung eingelöst: {card['reward_description']}",
        "rewards_redeemed": customer_card["rewards_redeemed"] + 1
    }

@api_router.get("/scan/{qr_data}")
async def scan_qr(qr_data: str, user: User = Depends(get_current_user)):
    """Process scanned QR code"""
    # Parse QR data
    if qr_data.startswith("loyalty:"):
        customer_card_id = qr_data.replace("loyalty:", "")
        customer_card = await db.customer_cards.find_one(
            {"customer_card_id": customer_card_id},
            {"_id": 0}
        )
        if not customer_card:
            raise HTTPException(status_code=404, detail="Kundenkarte nicht gefunden")
        
        # Verify card belongs to this business
        card = await db.loyalty_cards.find_one(
            {"card_id": customer_card["card_id"], "user_id": user.user_id},
            {"_id": 0}
        )
        if not card:
            raise HTTPException(status_code=403, detail="Diese Karte gehört nicht zu Ihrem Geschäft")
        
        return {
            "type": "customer_card",
            "customer_card_id": customer_card_id,
            "customer_name": customer_card["customer_name"],
            "current_points": customer_card["current_points"],
            "max_points": card["max_points"],
            "can_redeem": customer_card["current_points"] >= card["max_points"]
        }
    
    elif qr_data.startswith("redeem:"):
        parts = qr_data.split(":")
        if len(parts) >= 2:
            customer_card_id = parts[1]
            return {
                "type": "redemption",
                "customer_card_id": customer_card_id,
                "action": "confirm_redeem"
            }
    
    raise HTTPException(status_code=400, detail="Ungültiger QR-Code")

# ==================== STATISTICS ====================

@api_router.get("/stats")
async def get_stats(user: User = Depends(get_current_user)):
    """Get business statistics"""
    # Get all cards for this user
    cards = await db.loyalty_cards.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).to_list(100)
    
    card_ids = [c["card_id"] for c in cards]
    
    # Count customers
    total_customers = await db.customer_cards.count_documents(
        {"card_id": {"$in": card_ids}}
    )
    
    # Count total points given
    pipeline = [
        {"$match": {"card_id": {"$in": card_ids}, "type": "add"}},
        {"$group": {"_id": None, "total": {"$sum": "$points"}}}
    ]
    points_result = await db.point_transactions.aggregate(pipeline).to_list(1)
    total_points = points_result[0]["total"] if points_result else 0
    
    # Count redemptions
    total_redemptions = await db.point_transactions.count_documents(
        {"card_id": {"$in": card_ids}, "type": "redeem"}
    )
    
    # Recent transactions
    recent = await db.point_transactions.find(
        {"card_id": {"$in": card_ids}},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "total_cards": len(cards),
        "total_customers": total_customers,
        "total_points_given": total_points,
        "total_redemptions": total_redemptions,
        "recent_transactions": recent
    }

# ==================== PUBLIC CARD INFO ====================

@api_router.get("/public/card/{card_id}")
async def get_public_card_info(card_id: str):
    """Get public card info for customer registration"""
    card = await db.loyalty_cards.find_one(
        {"card_id": card_id, "active": True},
        {"_id": 0}
    )
    if not card:
        raise HTTPException(status_code=404, detail="Karte nicht gefunden")
    
    return {
        "card_id": card["card_id"],
        "card_name": card["card_name"],
        "business_name": card["business_name"],
        "max_points": card["max_points"],
        "reward_description": card["reward_description"],
        "primary_color": card["primary_color"],
        "secondary_color": card["secondary_color"],
        "text_color": card["text_color"],
        "logo_base64": card.get("logo_base64")
    }

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
