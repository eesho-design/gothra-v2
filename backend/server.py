from fastapi import FastAPI, APIRouter, HTTPException, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
import resend
import razorpay
import hmac
import hashlib

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Stripe setup
stripe_api_key = os.environ.get('STRIPE_API_KEY')

# Resend email setup
resend.api_key = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
STORE_EMAIL = os.environ.get('STORE_EMAIL', '7gothra@gmail.com')

# Razorpay setup
razorpay_key_id = os.environ.get('RAZORPAY_KEY_ID')
razorpay_key_secret = os.environ.get('RAZORPAY_KEY_SECRET')
razorpay_client = razorpay.Client(auth=(razorpay_key_id, razorpay_key_secret))

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
    gst_rate: float = 5.0

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
    customer_email: Optional[str] = None
    customer_name: Optional[str] = None

class RazorpayCreateOrderRequest(BaseModel):
    session_id: str
    customer_email: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    address_line: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None

class RazorpayVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    session_id: str

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
    # Jute Curtains (Home Decor) - 18% GST
    {"id": "prod-001", "name": "Subtlety", "description": "100% raw jute, self-embroidered with clay bead highlights available in sheer as well as dimouts. 7ft-2pcs", "price": 4600.00, "category": "home-decor", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/8910apx5_Subtlety.png", "subcategory": "jute-curtains", "gst_rate": 18},
    {"id": "prod-002", "name": "Traditions Alive", "description": "Jute curtain with elephant mascot application and brass anklet beads. A surprisingly delightful encounter on raw jute background. 7ft-2pcs", "price": 5999.00, "category": "home-decor", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/klf2iwua_Screenshot%202025-10-15%20221632.png", "subcategory": "jute-curtains", "gst_rate": 18},
    {"id": "prod-003", "name": "Shimmer", "description": "Zari borders reminds exotic saris of India. Can be customised in any unique border to match the colour scheme and decor of your space. 7ft-2pcs", "price": 2699.00, "category": "home-decor", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/l2ea3lmw_Screenshot%202025-10-15%20222821.png", "subcategory": "jute-curtains", "gst_rate": 18},
    {"id": "prod-004", "name": "Black is Beautiful", "description": "Jute curtain with black satin ribbon. Customisation of change in colour of ribbon (blue, grey, brown) sheer and dim out versions. 7ft-2pcs", "price": 2225.00, "category": "home-decor", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/8pzpco95_Screenshot%202025-10-15%20221555.png", "subcategory": "jute-curtains", "gst_rate": 18},
    {"id": "prod-005", "name": "Colonial Cousins", "description": "Jute curtain with white lace work. Engagement with global influences accommodating the best from both ends. 7ft-2pcs", "price": 3499.00, "category": "home-decor", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/w7k5q5w6_Screenshot%202025-10-15%20223018.png", "subcategory": "jute-curtains", "gst_rate": 18},
    {"id": "prod-006", "name": "Earths Joy", "description": "Raw jute with terracotta beads and bamboo embellishments. Panels can be customised. 7ft-2pcs", "price": 4599.00, "category": "home-decor", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/skfa2cza_Screenshot%202025-10-15%20223811.png", "subcategory": "jute-curtains", "gst_rate": 18},
    
    # Planters - 18% GST
    {"id": "prod-007", "name": "Terrarium", "description": "Handcrafted wooden terrarium planter with candle holder. Perfect for indoor plants.", "price": 1999.00, "category": "home-decor", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/q3llc4nq_Screenshot%202025-10-15%20220940.png", "subcategory": "planters", "gst_rate": 18},
    {"id": "prod-008", "name": "Tulsi Thara", "description": "Natural wood log planter. Traditional Tulsi planter crafted from natural wood.", "price": 3999.00, "category": "home-decor", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/ya0idb2s_Screenshot%202025-10-15%20223940.png", "subcategory": "planters", "gst_rate": 18},
    {"id": "prod-009", "name": "Wooden Planter", "description": "Natural wood planter with multiple plant holders. Perfect for succulents and small plants.", "price": 2500.00, "category": "home-decor", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/0g8f7lpe_Screenshot%202025-10-15%20223832.png", "subcategory": "planters", "gst_rate": 18},
    
    # Beauty Products - 18% GST (except VCO at 5%)
    {"id": "prod-010", "name": "Beeswax Lip Balm", "description": "Paraben-free lip balm with beeswax, virgin coconut oil and vitamin E. Keeps lips soft and hydrated. 8g/.28 oz", "price": 140.00, "category": "beauty", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/fzgjafin_Beeswax%20Lip%20Balm.png", "gst_rate": 18},
    {"id": "prod-011", "name": "Virgin Coconut Oil", "description": "Cold-pressed virgin coconut oil extracted using authentic oriental methods. Multi-purpose for skin and hair.", "price": 359.00, "category": "beauty", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/20dptwav_Oval%20VCO.png", "gst_rate": 5},
    {"id": "prod-012", "name": "Herbal Face Pack", "description": "Natural face pack with Chandanam, Rakta Chandanam, Honey & Multani Mitti. 45g/1.59oz", "price": 300.00, "category": "beauty", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/7o4z86k0_HERBAL%20FACE%20MASK.png", "gst_rate": 18},
    {"id": "prod-013", "name": "Kasturi Manjal", "description": "Wild turmeric powder (Curcuma aromatica) for skin brightening and natural glow. Net 170g", "price": 210.00, "category": "beauty", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/sxfuodew_Kasturi%20Manjal.png", "gst_rate": 18},
    {"id": "prod-014", "name": "Multani Mitti", "description": "100% Natural Fuller's Earth clay for deep cleansing face masks. Net 170g", "price": 150.00, "category": "beauty", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/k9641yrt_Multani%20Mitti.png", "gst_rate": 18},
    {"id": "prod-015", "name": "Moringa Powder", "description": "100% Organic nutrient-rich moringa powder for health and beauty. Net 170g", "price": 350.00, "category": "beauty", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/x66g7cty_Moringa%20Powder.png", "gst_rate": 5},
    {"id": "prod-016", "name": "Henna Powder", "description": "Natural henna powder (Lawsonia inermis) for hair coloring and conditioning. Net 170g", "price": 100.00, "category": "beauty", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/v5icmldq_Henna%20Powder.png", "gst_rate": 18},
    {"id": "prod-017", "name": "Indigo Powder", "description": "100% Natural Hair Color indigo powder. Net 170g", "price": 150.00, "category": "beauty", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/dam9r3af_Indigo%20Powder.png", "gst_rate": 18},
    {"id": "prod-018", "name": "Amla Powder", "description": "Indian gooseberry powder (Emblica officinalis) for hair growth and health. Net 170g", "price": 210.00, "category": "beauty", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/a8cak0cy_Amla%20Powder.png", "gst_rate": 18},
    
    # Herbs & Spices (Pantry) - 5% GST
    {"id": "prod-019", "name": "Blue Tea", "description": "Blue Butterfly Pea Flower tea. Rich in antioxidants with a natural blue hue. Net 100g", "price": 250.00, "category": "pantry", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/cmts4kzm_Blue%20tea.png", "gst_rate": 5},
    {"id": "prod-020", "name": "Kappi", "description": "Traditional blend with Jaggery, Dry Ginger & Pepper. Net 100g", "price": 60.00, "category": "pantry", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/mlc7xarg_Kappi.png", "gst_rate": 5},
    {"id": "prod-021", "name": "Hibiscus Tea", "description": "Caffeine-free Herbal Infusion. Refreshing tangy tea. Net 100g", "price": 250.00, "category": "pantry", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/nsiacpvn_Hibiscus%20Tea.png", "gst_rate": 5},
    {"id": "prod-022", "name": "Turmeric Powder", "description": "Pure organic turmeric powder from Kerala. Net 100g", "price": 200.00, "category": "pantry", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/p0c7k8ts_Turmeric.png", "gst_rate": 5},
    {"id": "prod-039", "name": "Myrrh", "description": "Whole Myrrh Resin. Traditional aromatic resin. Net 100g", "price": 350.00, "category": "pantry", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/0frogqsd_Screenshot%202026-01-25%20214526.png", "gst_rate": 5},
    {"id": "prod-023", "name": "Honey", "description": "100% Natural pure wild honey. 500ml/16.9oz", "price": 599.00, "category": "pantry", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/kf97qa1r_Honey.png", "gst_rate": 5},
    {"id": "prod-024", "name": "Cloves", "description": "Whole Cloves from Kerala spice gardens. Net 100g", "price": 260.00, "category": "pantry", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/unam37wl_Cloves.png", "gst_rate": 5},
    {"id": "prod-025", "name": "Pepper", "description": "Whole Black Peppercorns - the king of spices from Malabar. Net 100g", "price": 200.00, "category": "pantry", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/bpyhcfuh_Pepper.png", "gst_rate": 5},
    {"id": "prod-026", "name": "Cardamom", "description": "Whole Cardamom Pods from Kerala hills. Premium quality, intense flavor. Net 100g", "price": 510.00, "category": "pantry", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/xlwmfnjt_Cardamom.png", "gst_rate": 5},
    {"id": "prod-027", "name": "Nutmeg", "description": "Whole Nutmeg with Fibers for authentic Kerala cuisine. Net 100g", "price": 125.00, "category": "pantry", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/coz6kvpd_Whole%20Nutmeg.png", "gst_rate": 5},
    {"id": "prod-028", "name": "Malabar Tamarind", "description": "Garcinie Cambogia - Premium quality Malabar tamarind, handpicked and sun-dried. Net 100g", "price": 150.00, "category": "pantry", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/uu8buodq_Malabar%20Tamarind.png", "gst_rate": 5},
    {"id": "prod-029", "name": "Cinnamon", "description": "Whole Cinnamon Bark with sweet aroma. Net 100g", "price": 150.00, "category": "pantry", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/xl87rko0_Cinnamon.png", "gst_rate": 5},
    
    # Kitchen Essentials (Pickles & Punch) - 5% GST
    {"id": "prod-030", "name": "Curry Leaf Pickle", "description": "100% Natural curry leaf pickle. A unique Kerala delicacy. 200gm/7.05oz", "price": 220.00, "category": "kitchen", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/3z98em8m_Curry%20Leaf-200gm%20%281%29.png", "gst_rate": 5},
    {"id": "prod-031", "name": "Nutmeg Pickle", "description": "100% Natural nutmeg pickle with authentic Kerala spices. 200gm/7.05oz", "price": 249.00, "category": "kitchen", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/r7d78p40_Nutmeg-200gm.png", "gst_rate": 5},
    {"id": "prod-032", "name": "Carrot Pickle", "description": "100% Natural carrot pickle with Kerala spices. 200gm/7.05oz", "price": 229.00, "category": "kitchen", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/if7itlsh_Carrot-200gm%20%281%29.png", "gst_rate": 5},
    {"id": "prod-033", "name": "Star Fruit Pickle", "description": "100% Natural tangy star fruit pickle. Perfect accompaniment for rice dishes. 200gm/7.05oz", "price": 220.00, "category": "kitchen", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/412u5j3u_starfruit.jpeg", "gst_rate": 5},
    {"id": "prod-034", "name": "Raisins Pickle", "description": "100% Natural unique sweet and tangy raisins pickle. 200gm/7.05oz", "price": 310.00, "category": "kitchen", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/v1bd64y8_Raisins%20pickle.jpeg", "gst_rate": 5},
    {"id": "prod-035", "name": "Lime and Dates Pickle", "description": "100% Natural sweet and sour lime with dates pickle. 200gm/7.05oz", "price": 229.00, "category": "kitchen", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/wsbueoco_lime%20and%20dates.jpeg", "gst_rate": 5},
    {"id": "prod-036", "name": "Water Apple Punch", "description": "Refreshing water apple concentrate. 500ml/16.9oz", "price": 599.00, "category": "kitchen", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/bnp8i9vk_Water%20apple%20punch.png", "gst_rate": 5},
    {"id": "prod-037", "name": "Pomegranate Punch", "description": "Refreshing pomegranate concentrate made from fresh fruits. 500ml/16.9oz", "price": 510.00, "category": "kitchen", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/8n7s9mhp_pom%20punch.png", "gst_rate": 5},
    {"id": "prod-038", "name": "Naruneendi Sarbath", "description": "Traditional Kerala herbal drink concentrate. 500ml/16.9oz", "price": 130.00, "category": "kitchen", "image_url": "https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/4zhtlqeb_Naruneendi.png", "gst_rate": 5},
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
async def get_products(category: Optional[str] = None, search: Optional[str] = None):
    query = {}
    if category:
        query["category"] = category
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"category": {"$regex": search, "$options": "i"}},
        ]
    products = await db.products.find(query, {"_id": 0}).to_list(100)
    return products

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@api_router.post("/newsletter/subscribe")
async def subscribe_newsletter(request: Request):
    body = await request.json()
    email = body.get("email", "").strip()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Valid email required")
    existing = await db.newsletter.find_one({"email": email})
    if existing:
        return {"message": "Already subscribed", "subscribed": True}
    await db.newsletter.insert_one({
        "email": email,
        "subscribed_at": datetime.now(timezone.utc).isoformat()
    })
    return {"message": "Successfully subscribed!", "subscribed": True}

# Cart Routes
@api_router.get("/cart/{session_id}")
async def get_cart(session_id: str):
    cart = await db.carts.find_one({"session_id": session_id}, {"_id": 0})
    if not cart:
        return {"session_id": session_id, "items": [], "total": 0}
    
    # Calculate total and get product details - batch query for performance
    cart_items = []
    total = 0
    total_gst = 0
    
    # Collect all product IDs and fetch in single query
    product_ids = [item["product_id"] for item in cart.get("items", [])]
    if product_ids:
        products_cursor = db.products.find({"id": {"$in": product_ids}}, {"_id": 0})
        products_list = await products_cursor.to_list(None)
        products = {p["id"]: p for p in products_list}
        
        for item in cart.get("items", []):
            product = products.get(item["product_id"])
            if product:
                gst_rate = product.get("gst_rate", 5)
                item_total = product["price"] * item["quantity"]
                gst_amount = round(item_total * gst_rate / 100, 2)
                total += item_total
                total_gst += gst_amount
                cart_items.append({
                    "product_id": item["product_id"],
                    "name": product["name"],
                    "price": product["price"],
                    "quantity": item["quantity"],
                    "image_url": product["image_url"],
                    "gst_rate": gst_rate,
                    "gst_amount": gst_amount,
                    "item_total": item_total
                })
    
    return {"session_id": session_id, "items": cart_items, "subtotal": total, "gst": total_gst, "total": round(total + total_gst, 2)}

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

# Email sending helpers
async def send_owner_notification(order_id: str, items: List[Dict], total: float, customer_email: str, customer_name: str):
    """Send order notification email to store owner"""
    try:
        items_rows = ""
        for item in items:
            items_rows += f"""<tr>
                <td style="padding:10px 12px;border-bottom:1px solid #EAD8C3;font-family:sans-serif;font-size:14px;color:#1A2421;">{item['name']}</td>
                <td style="padding:10px 12px;border-bottom:1px solid #EAD8C3;font-family:sans-serif;font-size:14px;color:#4A5D54;text-align:center;">{item['quantity']}</td>
                <td style="padding:10px 12px;border-bottom:1px solid #EAD8C3;font-family:sans-serif;font-size:14px;color:#C05A42;text-align:right;">₹{item['price'] * item['quantity']:,.0f}</td>
            </tr>"""

        html = f"""
        <div style="max-width:600px;margin:0 auto;font-family:sans-serif;">
            <div style="background:#1E3F33;padding:24px;text-align:center;">
                <h1 style="color:#FAF8F5;margin:0;font-size:24px;">New Order Received!</h1>
            </div>
            <div style="padding:24px;background:#FAF8F5;">
                <p style="color:#1A2421;font-size:16px;margin-bottom:4px;"><strong>Order ID:</strong> {order_id}</p>
                <p style="color:#4A5D54;font-size:14px;margin-bottom:4px;"><strong>Customer:</strong> {customer_name or 'Guest'}</p>
                <p style="color:#4A5D54;font-size:14px;margin-bottom:16px;"><strong>Email:</strong> {customer_email or 'Not provided'}</p>
                <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;">
                    <thead><tr style="background:#F3EBE1;">
                        <th style="padding:10px 12px;text-align:left;font-family:sans-serif;font-size:13px;color:#4A5D54;">Item</th>
                        <th style="padding:10px 12px;text-align:center;font-family:sans-serif;font-size:13px;color:#4A5D54;">Qty</th>
                        <th style="padding:10px 12px;text-align:right;font-family:sans-serif;font-size:13px;color:#4A5D54;">Amount</th>
                    </tr></thead>
                    <tbody>{items_rows}</tbody>
                </table>
                <div style="margin-top:16px;padding:16px;background:#1E3F33;border-radius:8px;text-align:right;">
                    <span style="color:#FAF8F5;font-size:18px;font-weight:bold;">Total: ₹{total:,.0f}</span>
                </div>
                <p style="color:#4A5D54;font-size:12px;margin-top:16px;">Order placed on {datetime.now(timezone.utc).strftime('%d %b %Y, %I:%M %p')} UTC</p>
            </div>
        </div>"""

        params = {
            "from": SENDER_EMAIL,
            "to": [STORE_EMAIL],
            "subject": f"GOTHRA - New Order #{order_id[:8]} (₹{total:,.0f})",
            "html": html
        }
        await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Owner notification sent for order {order_id}")
    except Exception as e:
        logger.error(f"Failed to send owner notification: {e}")


async def send_customer_confirmation(customer_email: str, customer_name: str, order_id: str, items: List[Dict], total: float):
    """Send order confirmation email to customer"""
    if not customer_email:
        return
    try:
        items_rows = ""
        for item in items:
            items_rows += f"""<tr>
                <td style="padding:10px 12px;border-bottom:1px solid #EAD8C3;font-family:sans-serif;font-size:14px;color:#1A2421;">{item['name']}</td>
                <td style="padding:10px 12px;border-bottom:1px solid #EAD8C3;font-family:sans-serif;font-size:14px;color:#4A5D54;text-align:center;">{item['quantity']}</td>
                <td style="padding:10px 12px;border-bottom:1px solid #EAD8C3;font-family:sans-serif;font-size:14px;color:#C05A42;text-align:right;">₹{item['price'] * item['quantity']:,.0f}</td>
            </tr>"""

        html = f"""
        <div style="max-width:600px;margin:0 auto;font-family:sans-serif;">
            <div style="background:#1E3F33;padding:24px;text-align:center;">
                <h1 style="color:#FAF8F5;margin:0;font-size:24px;">Thank you for your order!</h1>
            </div>
            <div style="padding:24px;background:#FAF8F5;">
                <p style="color:#1A2421;font-size:16px;">Hi {customer_name or 'there'},</p>
                <p style="color:#4A5D54;font-size:14px;">Your order has been confirmed. Here's a summary:</p>
                <p style="color:#4A5D54;font-size:13px;margin-bottom:16px;"><strong>Order ID:</strong> {order_id}</p>
                <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;">
                    <thead><tr style="background:#F3EBE1;">
                        <th style="padding:10px 12px;text-align:left;font-family:sans-serif;font-size:13px;color:#4A5D54;">Item</th>
                        <th style="padding:10px 12px;text-align:center;font-family:sans-serif;font-size:13px;color:#4A5D54;">Qty</th>
                        <th style="padding:10px 12px;text-align:right;font-family:sans-serif;font-size:13px;color:#4A5D54;">Amount</th>
                    </tr></thead>
                    <tbody>{items_rows}</tbody>
                </table>
                <div style="margin-top:16px;padding:16px;background:#1E3F33;border-radius:8px;text-align:right;">
                    <span style="color:#FAF8F5;font-size:18px;font-weight:bold;">Total: ₹{total:,.0f}</span>
                </div>
                <div style="margin-top:24px;padding:16px;background:#fff;border-radius:8px;border:1px solid #EAD8C3;">
                    <p style="color:#1A2421;font-size:14px;margin:0 0 8px 0;font-weight:bold;">Need help?</p>
                    <p style="color:#4A5D54;font-size:13px;margin:0;">Email us at <a href="mailto:7gothra@gmail.com" style="color:#1E3F33;">7gothra@gmail.com</a> or call <a href="tel:+919446014710" style="color:#1E3F33;">+91 9446014710</a></p>
                </div>
                <p style="color:#4A5D54;font-size:12px;margin-top:20px;text-align:center;">GOTHRA — Inducing an organic lifestyle through indigenous craft</p>
            </div>
        </div>"""

        params = {
            "from": SENDER_EMAIL,
            "to": [customer_email],
            "subject": f"GOTHRA - Order Confirmed #{order_id[:8]}",
            "html": html
        }
        await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Customer confirmation sent to {customer_email} for order {order_id}")
    except Exception as e:
        logger.error(f"Failed to send customer confirmation: {e}")


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
        "customer_email": (request.customer_email or "").strip().lower(),
        "customer_name": request.customer_name or "",
        "email_sent": False,
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
        
        # If payment successful, clear the cart and send emails
        if checkout_status.payment_status == "paid":
            transaction = await db.payment_transactions.find_one({"stripe_session_id": stripe_session_id}, {"_id": 0})
            if transaction:
                await db.carts.delete_one({"session_id": transaction.get("cart_session_id")})
                # Send emails only once
                if not transaction.get("email_sent"):
                    order_id = transaction.get("id", "N/A")
                    items = transaction.get("items", [])
                    total = transaction.get("amount", 0)
                    customer_email = transaction.get("customer_email", "")
                    customer_name = transaction.get("customer_name", "")
                    # Fire emails in background (don't block response)
                    asyncio.create_task(send_owner_notification(order_id, items, total, customer_email, customer_name))
                    asyncio.create_task(send_customer_confirmation(customer_email, customer_name, order_id, items, total))
                    await db.payment_transactions.update_one(
                        {"stripe_session_id": stripe_session_id},
                        {"$set": {"email_sent": True}}
                    )
        
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
            
            # Send emails and clear cart
            transaction = await db.payment_transactions.find_one({"stripe_session_id": webhook_response.session_id}, {"_id": 0})
            if transaction and not transaction.get("email_sent"):
                order_id = transaction.get("id", "N/A")
                items = transaction.get("items", [])
                total = transaction.get("amount", 0)
                customer_email = transaction.get("customer_email", "")
                customer_name = transaction.get("customer_name", "")
                asyncio.create_task(send_owner_notification(order_id, items, total, customer_email, customer_name))
                asyncio.create_task(send_customer_confirmation(customer_email, customer_name, order_id, items, total))
                await db.payment_transactions.update_one(
                    {"stripe_session_id": webhook_response.session_id},
                    {"$set": {"email_sent": True}}
                )

            if webhook_response.metadata:
                cart_session_id = webhook_response.metadata.get("cart_session_id")
                if cart_session_id:
                    await db.carts.delete_one({"session_id": cart_session_id})
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}

# Razorpay Checkout Routes
@api_router.post("/razorpay/create-order")
async def razorpay_create_order(request: RazorpayCreateOrderRequest):
    cart = await db.carts.find_one({"session_id": request.session_id})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    # Calculate total with GST
    subtotal = 0.0
    total_gst = 0.0
    items_detail = []
    product_ids = [item["product_id"] for item in cart["items"]]
    products_cursor = db.products.find({"id": {"$in": product_ids}}, {"_id": 0})
    products_list = await products_cursor.to_list(None)
    products = {p["id"]: p for p in products_list}
    
    for item in cart["items"]:
        product = products.get(item["product_id"])
        if product:
            gst_rate = product.get("gst_rate", 5)
            item_total = product["price"] * item["quantity"]
            gst_amount = round(item_total * gst_rate / 100, 2)
            subtotal += item_total
            total_gst += gst_amount
            items_detail.append({
                "product_id": item["product_id"],
                "name": product["name"],
                "price": product["price"],
                "quantity": item["quantity"],
                "gst_rate": gst_rate
            })
    
    total = round(subtotal + total_gst, 2)
    amount_paise = int(total * 100)
    if amount_paise < 100:
        raise HTTPException(status_code=400, detail="Minimum order amount is ₹1")
    
    try:
        order_data = {
            "amount": amount_paise,
            "currency": "INR",
            "receipt": f"order_{uuid.uuid4().hex[:12]}",
        }
        razorpay_order = await asyncio.to_thread(razorpay_client.order.create, data=order_data)
        
        # Store transaction with address
        transaction = {
            "id": str(uuid.uuid4()),
            "razorpay_order_id": razorpay_order["id"],
            "cart_session_id": request.session_id,
            "subtotal": subtotal,
            "gst": total_gst,
            "amount": total,
            "currency": "inr",
            "status": "created",
            "payment_status": "pending",
            "payment_method": "razorpay",
            "items": items_detail,
            "customer_email": (request.customer_email or "").strip().lower(),
            "customer_name": request.customer_name or "",
            "customer_phone": request.customer_phone or "",
            "shipping_address": {
                "line": request.address_line or "",
                "city": request.city or "",
                "state": request.state or "",
                "pincode": request.pincode or ""
            },
            "email_sent": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payment_transactions.insert_one(transaction)
        
        return {
            "order_id": razorpay_order["id"],
            "amount": amount_paise,
            "currency": "INR",
            "key_id": razorpay_key_id
        }
    except Exception as e:
        logger.error(f"Razorpay create order error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create payment order")


@api_router.post("/razorpay/verify-payment")
async def razorpay_verify_payment(request: RazorpayVerifyRequest):
    # Verify signature using HMAC-SHA256
    message = f"{request.razorpay_order_id}|{request.razorpay_payment_id}"
    generated_signature = hmac.new(
        razorpay_key_secret.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    
    if generated_signature != request.razorpay_signature:
        logger.warning(f"Razorpay signature mismatch for order {request.razorpay_order_id}")
        raise HTTPException(status_code=400, detail="Payment verification failed")
    
    # Update transaction
    transaction = await db.payment_transactions.find_one(
        {"razorpay_order_id": request.razorpay_order_id}, {"_id": 0}
    )
    
    await db.payment_transactions.update_one(
        {"razorpay_order_id": request.razorpay_order_id},
        {"$set": {
            "status": "completed",
            "payment_status": "paid",
            "razorpay_payment_id": request.razorpay_payment_id,
            "razorpay_signature": request.razorpay_signature
        }}
    )
    
    # Clear cart
    await db.carts.delete_one({"session_id": request.session_id})
    
    # Send emails
    if transaction and not transaction.get("email_sent"):
        order_id = transaction.get("id", "N/A")
        items = transaction.get("items", [])
        total = transaction.get("amount", 0)
        customer_email = transaction.get("customer_email", "")
        customer_name = transaction.get("customer_name", "")
        asyncio.create_task(send_owner_notification(order_id, items, total, customer_email, customer_name))
        asyncio.create_task(send_customer_confirmation(customer_email, customer_name, order_id, items, total))
        await db.payment_transactions.update_one(
            {"razorpay_order_id": request.razorpay_order_id},
            {"$set": {"email_sent": True}}
        )
    
    return {
        "status": "success",
        "payment_id": request.razorpay_payment_id,
        "order_id": request.razorpay_order_id
    }


# Customer Order History
@api_router.get("/orders/lookup")
async def lookup_orders(email: str):
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Valid email required")
    orders = await db.payment_transactions.find(
        {"customer_email": email.strip().lower(), "payment_status": "paid"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return orders

# Admin API Routes
@api_router.get("/admin/orders")
async def get_admin_orders():
    orders = await db.payment_transactions.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return orders

@api_router.get("/admin/stats")
async def get_admin_stats():
    total_orders = await db.payment_transactions.count_documents({"payment_status": "paid"})
    pipeline = [
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": None, "total_revenue": {"$sum": "$amount"}}}
    ]
    revenue_result = await db.payment_transactions.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total_revenue"] if revenue_result else 0
    total_products = await db.products.count_documents({})
    total_subscribers = await db.newsletter.count_documents({})
    return {
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "total_products": total_products,
        "total_subscribers": total_subscribers
    }

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
