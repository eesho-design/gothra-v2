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
    subcategory: Optional[str] = None

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

# Products data with correct names and prices from GOTHRA catalog PDF
PRODUCTS = [
    # Jute Curtains (Home Decor) - Using actual product images
    {"id": "prod-001", "name": "Subtlety", "description": "100% raw jute, self-embroidered with clay bead highlights available in sheer as well as dimouts. 7ft-2pcs", "price": 4600.00, "category": "home-decor", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/ff0k952e_Screenshot%202026-04-07%20143917.png", "subcategory": "jute-curtains"},
    {"id": "prod-002", "name": "Traditions Alive", "description": "Cannot think of traditions without the mascot application and brass anklet beads which is more to be experienced surprisingly delightful encounter. What better background than raw jute? 7ft-2pcs", "price": 5999.00, "category": "home-decor", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/s93qvs18_Screenshot%202026-04-07%20144057.png", "subcategory": "jute-curtains"},
    {"id": "prod-003", "name": "Shimmer", "description": "Zari borders reminds exotic saris of India. Can be customised in any unique border to match the colour scheme and decor of your space, whether it is formal or homely jute encompass everything. 7ft-2pcs", "price": 2699.00, "category": "home-decor", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/iqapi7p9_Screenshot%202026-04-07%20144249.png", "subcategory": "jute-curtains"},
    {"id": "prod-004", "name": "Black is Beautiful", "description": "Talk about formals black Satin takes care of it in the most official form. Customisation of change in colour of ribbon (blue, grey, brown) sheer and dim out versions. 7ft-2pcs", "price": 2225.00, "category": "home-decor", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/i0f3m2uw_Screenshot%202026-04-07%20144356.png", "subcategory": "jute-curtains"},
    {"id": "prod-005", "name": "Colonial Cousins", "description": "Engagement with global influences was always in vogue. It is our responsibility to accommodate and conceive the best from both ends. (Lace and pearl work). 7ft-2pcs", "price": 3499.00, "category": "home-decor", "image_url": "https://images.unsplash.com/photo-1582609978967-7857a3fa93d8?w=600", "subcategory": "jute-curtains"},
    {"id": "prod-006", "name": "Earths Joy", "description": "Earth the planet with life. Raw jute with terracotta beads and bamboo embellishments is always a joy to be with. One never gets tired off. Panels can be customised. 7ft-2pcs", "price": 4599.00, "category": "home-decor", "image_url": "https://images.unsplash.com/photo-1672658553156-97d09a74c801?w=600", "subcategory": "jute-curtains"},
    
    # Planters
    {"id": "prod-007", "name": "Terrarium", "description": "Handcrafted wooden terrarium planter for indoor plants.", "price": 1999.00, "category": "home-decor", "image_url": "https://images.unsplash.com/photo-1619926833625-cf0a5774d520?w=600", "subcategory": "planters"},
    {"id": "prod-008", "name": "Tulsi Thara", "description": "Traditional Tulsi planter crafted from wood.", "price": 3999.00, "category": "home-decor", "image_url": "https://images.unsplash.com/photo-1628702112865-77f718dc76e0?w=600", "subcategory": "planters"},
    {"id": "prod-009", "name": "Wooden Planter", "description": "Simple elegant wooden planter for your green space.", "price": 2500.00, "category": "home-decor", "image_url": "https://images.unsplash.com/photo-1772551935759-0e6137056107?w=600", "subcategory": "planters"},
    
    # Beauty Products
    {"id": "prod-010", "name": "Beeswax Lip Balm", "description": "Paraben-free, cruelty-free lip balm made with pure beeswax. Keeps lips soft and hydrated.", "price": 140.00, "category": "beauty", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/tt36c8nh_Beeswax%20Lip%20Balm.png"},
    {"id": "prod-011", "name": "Virgin Coconut Oil", "description": "Cold-pressed virgin coconut oil extracted using authentic oriental methods. Multi-purpose for skin and hair.", "price": 359.00, "category": "beauty", "image_url": "https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=600"},
    {"id": "prod-012", "name": "Herbal Face Pack", "description": "Natural face pack made from indigenous herbs. Rejuvenates skin and provides natural glow.", "price": 300.00, "category": "beauty", "image_url": "https://images.unsplash.com/photo-1589810353876-0497a89e5ad1?w=600"},
    {"id": "prod-013", "name": "Kasturi Manjal", "description": "Wild turmeric powder for skin brightening and natural glow.", "price": 210.00, "category": "beauty", "image_url": "https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=600"},
    {"id": "prod-014", "name": "Multani Mitti", "description": "Fuller's earth clay for deep cleansing face masks.", "price": 150.00, "category": "beauty", "image_url": "https://images.unsplash.com/photo-1556229010-aa3f7ff66b24?w=600"},
    {"id": "prod-015", "name": "Moringa Powder", "description": "Nutrient-rich moringa powder for health and beauty.", "price": 350.00, "category": "beauty", "image_url": "https://images.unsplash.com/photo-1719557553229-9a39d8ea2bc6?w=600"},
    {"id": "prod-016", "name": "Henna Powder", "description": "Natural henna powder for hair coloring and conditioning.", "price": 100.00, "category": "beauty", "image_url": "https://images.unsplash.com/photo-1650886585834-cb10e7b17b21?w=600"},
    {"id": "prod-017", "name": "Indigo Powder", "description": "Natural indigo powder for achieving dark hair color.", "price": 150.00, "category": "beauty", "image_url": "https://images.unsplash.com/photo-1704230155478-88cbd270c6c6?w=600"},
    {"id": "prod-018", "name": "Amla Powder", "description": "Indian gooseberry powder for hair growth and health.", "price": 210.00, "category": "beauty", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/ayzc3fh7_Amla%20Powder.png"},
    
    # Herbs & Spices (Pantry)
    {"id": "prod-019", "name": "Blue Tea", "description": "Organic blue tea from butterfly pea flowers. Rich in antioxidants with a natural blue hue.", "price": 250.00, "category": "pantry", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/w7ykmbfa_Blue%20tea.png"},
    {"id": "prod-020", "name": "Kappi", "description": "Traditional South Indian coffee powder.", "price": 60.00, "category": "pantry", "image_url": "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600"},
    {"id": "prod-021", "name": "Hibiscus Tea", "description": "Sun-dried hibiscus flowers for a refreshing tangy tea. Naturally caffeine-free.", "price": 250.00, "category": "pantry", "image_url": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600"},
    {"id": "prod-022", "name": "Turmeric Powder", "description": "Pure organic turmeric powder from Kerala.", "price": 200.00, "category": "pantry", "image_url": "https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=600"},
    {"id": "prod-023", "name": "Honey", "description": "Pure wild honey collected from forest beehives.", "price": 599.00, "category": "pantry", "image_url": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600"},
    {"id": "prod-024", "name": "Cloves", "description": "Aromatic whole cloves from Kerala spice gardens.", "price": 260.00, "category": "pantry", "image_url": "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=600"},
    {"id": "prod-025", "name": "Pepper", "description": "Black pepper - the king of spices from Malabar.", "price": 200.00, "category": "pantry", "image_url": "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=600"},
    {"id": "prod-026", "name": "Cardamom", "description": "Aromatic green cardamom pods from Kerala hills. Premium quality, intense flavor.", "price": 510.00, "category": "pantry", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/a5foaxrr_Cardamom.png"},
    {"id": "prod-027", "name": "Nutmeg", "description": "Whole nutmeg for authentic Kerala cuisine.", "price": 125.00, "category": "pantry", "image_url": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600"},
    {"id": "prod-028", "name": "Malabar Tamarind", "description": "Premium quality Malabar tamarind, handpicked and sun-dried. Essential for authentic Kerala cuisine.", "price": 150.00, "category": "pantry", "image_url": "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=600"},
    {"id": "prod-029", "name": "Cinnamon", "description": "True Ceylon cinnamon sticks with sweet aroma.", "price": 150.00, "category": "pantry", "image_url": "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=600"},
    
    # Kitchen Essentials (Pickles & Punch)
    {"id": "prod-030", "name": "Curry Leaf Pickle", "description": "Gourmet pickle made with fresh curry leaves. A unique Kerala delicacy with aromatic spices.", "price": 120.00, "category": "kitchen", "image_url": "https://images.unsplash.com/photo-1573051038546-894db2283a05?w=600"},
    {"id": "prod-031", "name": "Nutmeg Pickle", "description": "Rare nutmeg pickle with authentic Kerala spices. A gourmet treat for pickle lovers.", "price": 149.00, "category": "kitchen", "image_url": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600"},
    {"id": "prod-032", "name": "Carrot Pickle", "description": "Traditional carrot pickle with Kerala spices.", "price": 129.00, "category": "kitchen", "image_url": "https://images.unsplash.com/photo-1601312317079-71e0e4f5df24?w=600"},
    {"id": "prod-033", "name": "Star Fruit Pickle", "description": "Tangy star fruit pickle made using traditional recipes. Perfect accompaniment for rice dishes.", "price": 120.00, "category": "kitchen", "image_url": "https://images.unsplash.com/photo-1601312317079-71e0e4f5df24?w=600"},
    {"id": "prod-034", "name": "Raisins Pickle", "description": "Unique sweet and tangy raisins pickle.", "price": 210.00, "category": "kitchen", "image_url": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600"},
    {"id": "prod-035", "name": "Lime and Dates Pickle", "description": "Sweet and sour lime with dates pickle.", "price": 129.00, "category": "kitchen", "image_url": "https://images.unsplash.com/photo-1573051038546-894db2283a05?w=600"},
    {"id": "prod-036", "name": "Water Apple Punch", "description": "Refreshing water apple concentrate.", "price": 599.00, "category": "kitchen", "image_url": "https://images.unsplash.com/photo-1553787499-6f9133860278?w=600"},
    {"id": "prod-037", "name": "Pomegranate Punch", "description": "Refreshing pomegranate concentrate made from fresh fruits. Perfect for summer drinks.", "price": 510.00, "category": "kitchen", "image_url": "https://images.unsplash.com/photo-1553787499-6f9133860278?w=600"},
    {"id": "prod-038", "name": "Naruneendi Sarbath", "description": "Traditional Kerala herbal drink concentrate.", "price": 130.00, "category": "kitchen", "image_url": "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600"},
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
    
    # Calculate total and get product details - batch query for performance
    cart_items = []
    total = 0
    
    # Collect all product IDs and fetch in single query
    product_ids = [item["product_id"] for item in cart.get("items", [])]
    if product_ids:
        products_cursor = db.products.find({"id": {"$in": product_ids}}, {"_id": 0})
        products_list = await products_cursor.to_list(None)
        products = {p["id"]: p for p in products_list}
        
        for item in cart.get("items", []):
            product = products.get(item["product_id"])
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
    
    # Calculate total - batch query for performance
    total = 0.0
    items_detail = []
    
    # Collect all product IDs and fetch in single query
    product_ids = [item["product_id"] for item in cart["items"]]
    products_cursor = db.products.find({"id": {"$in": product_ids}}, {"_id": 0})
    products_list = await products_cursor.to_list(None)
    products = {p["id"]: p for p in products_list}
    
    for item in cart["items"]:
        product = products.get(item["product_id"])
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
