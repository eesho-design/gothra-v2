from fastapi import FastAPI, APIRouter, HTTPException, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Stripe setup
stripe_api_key = os.environ.get('STRIPE_API_KEY')

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Product Models
class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    category: str
    image_url: str
    in_stock: bool = True

class CartItem(BaseModel):
    product_id: str
    quantity: int

class Cart(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    items: List[CartItem] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AddToCartRequest(BaseModel):
    session_id: str
    product_id: str
    quantity: int = 1

class UpdateCartRequest(BaseModel):
    session_id: str
    product_id: str
    quantity: int

class CheckoutRequest(BaseModel):
    session_id: str
    origin_url: str

class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    stripe_session_id: str
    cart_session_id: str
    amount: float
    currency: str = "inr"
    status: str = "pending"
    payment_status: str = "pending"
    items: List[Dict] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Products data with correct names and prices from GOTHRA catalog
PRODUCTS = [
    # Home Decor
    {"id": "prod-001", "name": "Subtlety - Jute Curtain", "description": "Elegant minimalist jute curtain with natural earthy tones. Perfect for creating a serene and organic living space.", "price": 4999.00, "category": "home-decor", "image_url": "https://images.unsplash.com/photo-1585412727339-54e4bae3bbf9?w=600"},
    {"id": "prod-002", "name": "Traditions Alive - Jute Curtain", "description": "Traditional jute curtain with brass anklet bead highlights. A beautiful blend of heritage and modern aesthetics.", "price": 5999.00, "category": "home-decor", "image_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600"},
    {"id": "prod-003", "name": "Shimmer - Jute Curtain", "description": "Jute curtain with subtle golden shimmer threads. Adds a touch of elegance to any room.", "price": 6499.00, "category": "home-decor", "image_url": "https://images.unsplash.com/photo-1518893883800-45cd0954574b?w=600"},
    {"id": "prod-004", "name": "Wooden Planter Set", "description": "Handcrafted wooden planters made from sustainable sources. Perfect for indoor plants.", "price": 1299.00, "category": "home-decor", "image_url": "https://images.unsplash.com/photo-1743087367764-052d6483672d?w=600"},
    
    # Beauty & Wellness
    {"id": "prod-005", "name": "Beeswax Lip Balm", "description": "Paraben-free, cruelty-free lip balm made with pure beeswax. Keeps lips soft and hydrated.", "price": 249.00, "category": "beauty", "image_url": "https://images.unsplash.com/photo-1599305090598-fe179d501227?w=600"},
    {"id": "prod-006", "name": "Virgin Coconut Oil", "description": "Cold-pressed virgin coconut oil extracted using authentic oriental methods. Multi-purpose for skin and hair.", "price": 399.00, "category": "beauty", "image_url": "https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=600"},
    {"id": "prod-007", "name": "Herbal Face Pack", "description": "Natural face pack made from indigenous herbs. Rejuvenates skin and provides natural glow.", "price": 349.00, "category": "beauty", "image_url": "https://images.unsplash.com/photo-1589810353876-0497a89e5ad1?w=600"},
    
    # Herbs & Spices
    {"id": "prod-008", "name": "Blue Tea (Butterfly Pea)", "description": "Organic blue tea from butterfly pea flowers. Rich in antioxidants with a natural blue hue.", "price": 299.00, "category": "pantry", "image_url": "https://images.unsplash.com/photo-1558160074-4d7d8bdf4256?w=600"},
    {"id": "prod-009", "name": "Hibiscus Tea", "description": "Sun-dried hibiscus flowers for a refreshing tangy tea. Naturally caffeine-free.", "price": 279.00, "category": "pantry", "image_url": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600"},
    {"id": "prod-010", "name": "Malabar Tamarind", "description": "Premium quality Malabar tamarind, handpicked and sun-dried. Essential for authentic Kerala cuisine.", "price": 199.00, "category": "pantry", "image_url": "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=600"},
    {"id": "prod-011", "name": "Whole Cardamom", "description": "Aromatic green cardamom pods from Kerala hills. Premium quality, intense flavor.", "price": 599.00, "category": "pantry", "image_url": "https://images.unsplash.com/photo-1643067077447-78239a403a18?w=600"},
    
    # Kitchen Essentials
    {"id": "prod-012", "name": "Curry Leaf Pickle", "description": "Gourmet pickle made with fresh curry leaves. A unique Kerala delicacy with aromatic spices.", "price": 299.00, "category": "kitchen", "image_url": "https://images.unsplash.com/photo-1573051038546-894db2283a05?w=600"},
    {"id": "prod-013", "name": "Star Fruit Pickle", "description": "Tangy star fruit pickle made using traditional recipes. Perfect accompaniment for rice dishes.", "price": 329.00, "category": "kitchen", "image_url": "https://images.unsplash.com/photo-1601312317079-71e0e4f5df24?w=600"},
    {"id": "prod-014", "name": "Nutmeg Pickle", "description": "Rare nutmeg pickle with authentic Kerala spices. A gourmet treat for pickle lovers.", "price": 399.00, "category": "kitchen", "image_url": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600"},
    {"id": "prod-015", "name": "Pomegranate Punch", "description": "Refreshing pomegranate concentrate made from fresh fruits. Perfect for summer drinks.", "price": 449.00, "category": "kitchen", "image_url": "https://images.unsplash.com/photo-1553787499-6f9133860278?w=600"},
]

# Seed products on startup
@app.on_event("startup")
async def seed_products():
    existing = await db.products.count_documents({})
    if existing == 0:
        for product in PRODUCTS:
            await db.products.insert_one(product)
        logger.info(f"Seeded {len(PRODUCTS)} products")

# Product Routes
@api_router.get("/products", response_model=List[Product])
async def get_products(category: Optional[str] = None):
    query = {} if not category else {"category": category}
    products = await db.products.find(query, {"_id": 0}).to_list(100)
    return products

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

# Cart Routes
@api_router.get("/cart/{session_id}")
async def get_cart(session_id: str):
    cart = await db.carts.find_one({"session_id": session_id}, {"_id": 0})
    if not cart:
        return {"session_id": session_id, "items": [], "total": 0}
    
    # Calculate total and get product details
    cart_items = []
    total = 0
    for item in cart.get("items", []):
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if product:
            item_total = product["price"] * item["quantity"]
            total += item_total
            cart_items.append({
                "product_id": item["product_id"],
                "name": product["name"],
                "price": product["price"],
                "quantity": item["quantity"],
                "image_url": product["image_url"],
                "item_total": item_total
            })
    
    return {"session_id": session_id, "items": cart_items, "total": total}

@api_router.post("/cart/add")
async def add_to_cart(request: AddToCartRequest):
    cart = await db.carts.find_one({"session_id": request.session_id})
    
    # Verify product exists
    product = await db.products.find_one({"id": request.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if not cart:
        # Create new cart
        new_cart = {
            "id": str(uuid.uuid4()),
            "session_id": request.session_id,
            "items": [{"product_id": request.product_id, "quantity": request.quantity}],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.carts.insert_one(new_cart)
    else:
        # Update existing cart
        existing_item = next((item for item in cart.get("items", []) if item["product_id"] == request.product_id), None)
        if existing_item:
            await db.carts.update_one(
                {"session_id": request.session_id, "items.product_id": request.product_id},
                {"$inc": {"items.$.quantity": request.quantity}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
            )
        else:
            await db.carts.update_one(
                {"session_id": request.session_id},
                {"$push": {"items": {"product_id": request.product_id, "quantity": request.quantity}}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
            )
    
    return {"message": "Item added to cart", "product": product}

@api_router.post("/cart/update")
async def update_cart_item(request: UpdateCartRequest):
    if request.quantity <= 0:
        # Remove item
        await db.carts.update_one(
            {"session_id": request.session_id},
            {"$pull": {"items": {"product_id": request.product_id}}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Item removed from cart"}
    
    await db.carts.update_one(
        {"session_id": request.session_id, "items.product_id": request.product_id},
        {"$set": {"items.$.quantity": request.quantity, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Cart updated"}

@api_router.delete("/cart/{session_id}")
async def clear_cart(session_id: str):
    await db.carts.delete_one({"session_id": session_id})
    return {"message": "Cart cleared"}

# Checkout Routes
@api_router.post("/checkout/create-session")
async def create_checkout_session(request: CheckoutRequest, http_request: Request):
    cart = await db.carts.find_one({"session_id": request.session_id})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    # Calculate total
    total = 0.0
    items_detail = []
    for item in cart["items"]:
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if product:
            item_total = product["price"] * item["quantity"]
            total += item_total
            items_detail.append({
                "product_id": item["product_id"],
                "name": product["name"],
                "price": product["price"],
                "quantity": item["quantity"]
            })
    
    # Create Stripe checkout session
    host_url = str(http_request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    success_url = f"{request.origin_url}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{request.origin_url}/cart"
    
    checkout_request = CheckoutSessionRequest(
        amount=total,
        currency="inr",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "cart_session_id": request.session_id,
            "items_count": str(len(items_detail))
        }
    )
    
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    transaction = {
        "id": str(uuid.uuid4()),
        "stripe_session_id": session.session_id,
        "cart_session_id": request.session_id,
        "amount": total,
        "currency": "inr",
        "status": "pending",
        "payment_status": "pending",
        "items": items_detail,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(transaction)
    
    return {"checkout_url": session.url, "session_id": session.session_id}

@api_router.get("/checkout/status/{stripe_session_id}")
async def get_checkout_status(stripe_session_id: str, http_request: Request):
    host_url = str(http_request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    try:
        checkout_status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(stripe_session_id)
        
        # Update transaction status
        new_status = "completed" if checkout_status.payment_status == "paid" else checkout_status.status
        await db.payment_transactions.update_one(
            {"stripe_session_id": stripe_session_id},
            {"$set": {"status": new_status, "payment_status": checkout_status.payment_status}}
        )
        
        # If payment successful, clear the cart
        if checkout_status.payment_status == "paid":
            transaction = await db.payment_transactions.find_one({"stripe_session_id": stripe_session_id}, {"_id": 0})
            if transaction:
                await db.carts.delete_one({"session_id": transaction.get("cart_session_id")})
        
        return {
            "status": checkout_status.status,
            "payment_status": checkout_status.payment_status,
            "amount_total": checkout_status.amount_total,
            "currency": checkout_status.currency
        }
    except Exception as e:
        logger.error(f"Error getting checkout status: {e}")
        # Check if we have a local transaction record
        transaction = await db.payment_transactions.find_one({"stripe_session_id": stripe_session_id}, {"_id": 0})
        if transaction:
            return {
                "status": transaction.get("status", "pending"),
                "payment_status": transaction.get("payment_status", "pending"),
                "amount_total": int(transaction.get("amount", 0) * 100),
                "currency": transaction.get("currency", "inr")
            }
        raise HTTPException(status_code=404, detail="Checkout session not found")

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            await db.payment_transactions.update_one(
                {"stripe_session_id": webhook_response.session_id},
                {"$set": {"status": "completed", "payment_status": "paid"}}
            )
            
            # Clear cart
            if webhook_response.metadata:
                cart_session_id = webhook_response.metadata.get("cart_session_id")
                if cart_session_id:
                    await db.carts.delete_one({"session_id": cart_session_id})
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "GOTHRA API - Organic & Indigenous Products"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
