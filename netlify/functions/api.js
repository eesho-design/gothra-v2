const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_API_KEY || 'sk_test_dummy');
const Razorpay = require('razorpay');
const { Resend } = require('resend');
const crypto = require('crypto');
const serverless = require('serverless-http');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors({ origin: true, credentials: true }));

// Parse raw body for Stripe webhook, otherwise JSON
app.use((req, res, next) => {
  if (req.originalUrl === '/api/webhook/stripe' || req.originalUrl === '/webhook/stripe') {
    express.raw({ type: 'application/json' })(req, res, next);
  } else {
    express.json()(req, res, next);
  }
});

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy123456789');
const razorpay = new Razorpay({
  key_id: (process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_dummy').trim(),
  key_secret: (process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_dummy').trim()
});

const PRODUCTS = [
  // Jute Curtains (Home Decor) - 18% GST
  {"id": "prod-001", "name": "Subtlety", "description": "100% raw jute, self-embroidered with clay bead highlights available in sheer as well as dimouts. 7ft-2pcs", "price": 4600.00, "category": "home-decor", "image_url": "/images/8910apx5_Subtlety.webp", "subcategory": "jute-curtains", "gst_rate": 18},
  {"id": "prod-002", "name": "Traditions Alive", "description": "Jute curtain with elephant mascot application and brass anklet beads. A surprisingly delightful encounter on raw jute background. 7ft-2pcs", "price": 5999.00, "category": "home-decor", "image_url": "/images/klf2iwua_Screenshot 2025-10-15 221632.webp", "subcategory": "jute-curtains", "gst_rate": 18},
  {"id": "prod-003", "name": "Shimmer", "description": "Zari borders reminds exotic saris of India. Can be customised in any unique border to match the colour scheme and decor of your space. 7ft-2pcs", "price": 2699.00, "category": "home-decor", "image_url": "/images/l2ea3lmw_Screenshot 2025-10-15 222821.webp", "subcategory": "jute-curtains", "gst_rate": 18},
  {"id": "prod-004", "name": "Black is Beautiful", "description": "Jute curtain with black satin ribbon. Customisation of change in colour of ribbon (blue, grey, brown) sheer and dim out versions. 7ft-2pcs", "price": 2225.00, "category": "home-decor", "image_url": "/images/8pzpco95_Screenshot 2025-10-15 221555.webp", "subcategory": "jute-curtains", "gst_rate": 18},
  {"id": "prod-005", "name": "Colonial Cousins", "description": "Jute curtain with white lace work. Engagement with global influences accommodating the best from both ends. 7ft-2pcs", "price": 3499.00, "category": "home-decor", "image_url": "/images/w7k5q5w6_Screenshot 2025-10-15 223018.webp", "subcategory": "jute-curtains", "gst_rate": 18},
  {"id": "prod-006", "name": "Earths Joy", "description": "Raw jute with terracotta beads and bamboo embellishments. Panels can be customised. 7ft-2pcs", "price": 4599.00, "category": "home-decor", "image_url": "/images/skfa2cza_Screenshot 2025-10-15 223811.webp", "subcategory": "jute-curtains", "gst_rate": 18},
  {"id": "prod-007", "name": "Terrarium", "description": "Handcrafted wooden terrarium planter with candle holder. Perfect for indoor plants.", "price": 1999.00, "category": "home-decor", "image_url": "/images/q3llc4nq_Screenshot 2025-10-15 220940.webp", "subcategory": "planters", "gst_rate": 18},
  {"id": "prod-008", "name": "Tulsi Thara", "description": "Natural wood log planter. Traditional Tulsi planter crafted from natural wood.", "price": 3999.00, "category": "home-decor", "image_url": "/images/ya0idb2s_Screenshot 2025-10-15 223940.webp", "subcategory": "planters", "gst_rate": 18},
  {"id": "prod-009", "name": "Wooden Planter", "description": "Natural wood planter with multiple plant holders. Perfect for succulents and small plants.", "price": 2500.00, "category": "home-decor", "image_url": "/images/0g8f7lpe_Screenshot 2025-10-15 223832.webp", "subcategory": "planters", "gst_rate": 18},
  {"id": "prod-010", "name": "Beeswax Lip Balm", "description": "Paraben-free lip balm with beeswax, virgin coconut oil and vitamin E. Keeps lips soft and hydrated. 8g/.28 oz", "price": 140.00, "category": "beauty", "image_url": "/images/fzgjafin_Beeswax Lip Balm.webp", "gst_rate": 18},
  {"id": "prod-011", "name": "Virgin Coconut Oil", "description": "Cold-pressed virgin coconut oil extracted using authentic oriental methods. Multi-purpose for skin and hair.", "price": 359.00, "category": "beauty", "image_url": "/images/20dptwav_Oval VCO.webp", "gst_rate": 5},
  {"id": "prod-012", "name": "Herbal Face Pack", "description": "Natural face pack with Chandanam, Rakta Chandanam, Honey & Multani Mitti. 45g/1.59oz", "price": 300.00, "category": "beauty", "image_url": "/images/7o4z86k0_HERBAL FACE MASK.webp", "gst_rate": 18},
  {"id": "prod-013", "name": "Kasturi Manjal", "description": "Wild turmeric powder (Curcuma aromatica) for skin brightening and natural glow. Net 170g", "price": 210.00, "category": "beauty", "image_url": "/images/sxfuodew_Kasturi Manjal.webp", "gst_rate": 18},
  {"id": "prod-014", "name": "Multani Mitti", "description": "100% Natural Fuller's Earth clay for deep cleansing face masks. Net 170g", "price": 150.00, "category": "beauty", "image_url": "/images/k9641yrt_Multani Mitti.webp", "gst_rate": 18},
  {"id": "prod-015", "name": "Moringa Powder", "description": "100% Organic nutrient-rich moringa powder for health and beauty. Net 170g", "price": 350.00, "category": "beauty", "image_url": "/images/x66g7cty_Moringa Powder.webp", "gst_rate": 5},
  {"id": "prod-016", "name": "Henna Powder", "description": "Natural henna powder (Lawsonia inermis) for hair coloring and conditioning. Net 170g", "price": 100.00, "category": "beauty", "image_url": "/images/v5icmldq_Henna Powder.webp", "gst_rate": 18},
  {"id": "prod-017", "name": "Indigo Powder", "description": "100% Natural Hair Color indigo powder. Net 170g", "price": 150.00, "category": "beauty", "image_url": "/images/dam9r3af_Indigo Powder.webp", "gst_rate": 18},
  {"id": "prod-018", "name": "Amla Powder", "description": "Indian gooseberry powder (Emblica officinalis) for hair growth and health. Net 170g", "price": 210.00, "category": "beauty", "image_url": "/images/a8cak0cy_Amla Powder.webp", "gst_rate": 18},
  {"id": "prod-019", "name": "Blue Tea", "description": "Blue Butterfly Pea Flower tea. Rich in antioxidants with a natural blue hue. Net 100g", "price": 250.00, "category": "pantry", "image_url": "/images/cmts4kzm_Blue tea.webp", "gst_rate": 5},
  {"id": "prod-020", "name": "Kappi", "description": "Traditional blend with Jaggery, Dry Ginger & Pepper. Net 100g", "price": 60.00, "category": "pantry", "image_url": "/images/mlc7xarg_Kappi.webp", "gst_rate": 5},
  {"id": "prod-021", "name": "Hibiscus Tea", "description": "Caffeine-free Herbal Infusion. Refreshing tangy tea. Net 100g", "price": 250.00, "category": "pantry", "image_url": "/images/nsiacpvn_Hibiscus Tea.webp", "gst_rate": 5},
  {"id": "prod-022", "name": "Turmeric Powder", "description": "Pure organic turmeric powder from Kerala. Net 100g", "price": 200.00, "category": "pantry", "image_url": "/images/p0c7k8ts_Turmeric.webp", "gst_rate": 5},
  {"id": "prod-039", "name": "Myrrh", "description": "Whole Myrrh Resin. Traditional aromatic resin. Net 100g", "price": 350.00, "category": "pantry", "image_url": "/images/0frogqsd_Screenshot 2026-01-25 214526.webp", "gst_rate": 5},
  {"id": "prod-023", "name": "Honey", "description": "100% Natural pure wild honey. 500ml/16.9oz", "price": 599.00, "category": "pantry", "image_url": "/images/kf97qa1r_Honey.webp", "gst_rate": 5},
  {"id": "prod-024", "name": "Cloves", "description": "Whole Cloves from Kerala spice gardens. Net 100g", "price": 260.00, "category": "pantry", "image_url": "/images/unam37wl_Cloves.webp", "gst_rate": 5},
  {"id": "prod-025", "name": "Pepper", "description": "Whole Black Peppercorns - the king of spices from Malabar. Net 100g", "price": 200.00, "category": "pantry", "image_url": "/images/bpyhcfuh_Pepper.webp", "gst_rate": 5},
  {"id": "prod-026", "name": "Cardamom", "description": "Whole Cardamom Pods from Kerala hills. Premium quality, intense flavor. Net 100g", "price": 510.00, "category": "pantry", "image_url": "/images/xlwmfnjt_Cardamom.webp", "gst_rate": 5},
  {"id": "prod-027", "name": "Nutmeg", "description": "Whole Nutmeg with Fibers for authentic Kerala cuisine. Net 100g", "price": 125.00, "category": "pantry", "image_url": "/images/coz6kvpd_Whole Nutmeg.webp", "gst_rate": 5},
  {"id": "prod-028", "name": "Malabar Tamarind", "description": "Garcinie Cambogia - Premium quality Malabar tamarind, handpicked and sun-dried. Net 100g", "price": 150.00, "category": "pantry", "image_url": "/images/uu8buodq_Malabar Tamarind.webp", "gst_rate": 5},
  {"id": "prod-029", "name": "Cinnamon", "description": "Whole Cinnamon Bark with sweet aroma. Net 100g", "price": 150.00, "category": "pantry", "image_url": "/images/xl87rko0_Cinnamon.webp", "gst_rate": 5},
  {"id": "prod-030", "name": "Curry Leaf Pickle", "description": "100% Natural curry leaf pickle. A unique Kerala delicacy. 200gm/7.05oz", "price": 220.00, "category": "kitchen", "image_url": "/images/3z98em8m_Curry Leaf-200gm (1).webp", "gst_rate": 5},
  {"id": "prod-031", "name": "Nutmeg Pickle", "description": "100% Natural nutmeg pickle with authentic Kerala spices. 200gm/7.05oz", "price": 249.00, "category": "kitchen", "image_url": "/images/r7d78p40_Nutmeg-200gm.webp", "gst_rate": 5},
  {"id": "prod-032", "name": "Carrot Pickle", "description": "100% Natural carrot pickle with Kerala spices. 200gm/7.05oz", "price": 229.00, "category": "kitchen", "image_url": "/images/if7itlsh_Carrot-200gm (1).webp", "gst_rate": 5},
  {"id": "prod-033", "name": "Star Fruit Pickle", "description": "100% Natural tangy star fruit pickle. Perfect accompaniment for rice dishes. 200gm/7.05oz", "price": 220.00, "category": "kitchen", "image_url": "/images/412u5j3u_starfruit.webp", "gst_rate": 5},
  {"id": "prod-034", "name": "Raisins Pickle", "description": "100% Natural unique sweet and tangy raisins pickle. 200gm/7.05oz", "price": 310.00, "category": "kitchen", "image_url": "/images/v1bd64y8_Raisins pickle.webp", "gst_rate": 5},
  {"id": "prod-035", "name": "Lime and Dates Pickle", "description": "100% Natural sweet and sour lime with dates pickle. 200gm/7.05oz", "price": 229.00, "category": "kitchen", "image_url": "/images/wsbueoco_lime and dates.webp", "gst_rate": 5},
  {"id": "prod-036", "name": "Water Apple Punch", "description": "Refreshing water apple concentrate. 500ml/16.9oz", "price": 599.00, "category": "kitchen", "image_url": "/images/bnp8i9vk_Water apple punch.webp", "gst_rate": 5},
  {"id": "prod-037", "name": "Pomegranate Punch", "description": "Refreshing pomegranate concentrate made from fresh fruits. 500ml/16.9oz", "price": 510.00, "category": "kitchen", "image_url": "/images/8n7s9mhp_pom punch.webp", "gst_rate": 5},
  {"id": "prod-038", "name": "Naruneendi Sarbath", "description": "Traditional Kerala herbal drink concentrate. 500ml/16.9oz", "price": 130.00, "category": "kitchen", "image_url": "/images/4zhtlqeb_Naruneendi.webp", "gst_rate": 5},

];

// In-memory collections simulation for serverless fallback
const MEMORY_DB = {
  products: [...PRODUCTS],
  carts: [],
  newsletter: [],
  payment_transactions: []
};

class MongoCollectionMock {
  constructor(name) {
    this.name = name;
  }

  get data() {
    return MEMORY_DB[this.name];
  }

  async countDocuments(query = {}) {
    return this.data.length;
  }

  async insertMany(docs) {
    this.data.push(...docs);
    return { insertedCount: docs.length };
  }

  async insertOne(doc) {
    this.data.push(doc);
    return { insertedId: doc.id || doc._id };
  }

  async findOne(query) {
    return this.data.find(item => {
      for (const key in query) {
        if (key.includes('.')) continue; // skip complex subdocument queries in findOne matching
        if (query[key] && typeof query[key] === 'object' && '$in' in query[key]) {
          if (!query[key].$in.includes(item[key])) return false;
        } else if (item[key] !== query[key]) {
          return false;
        }
      }
      return true;
    }) || null;
  }

  find(query) {
    let results = this.data.filter(item => {
      for (const key in query) {
        if (key === '$or') {
          const matches = query['$or'].some(cond => {
            const condKey = Object.keys(cond)[0];
            const regex = cond[condKey].$regex;
            const val = item[condKey] || '';
            return new RegExp(regex, 'i').test(val);
          });
          if (!matches) return false;
        } else if (query[key] && typeof query[key] === 'object' && '$in' in query[key]) {
          if (!query[key].$in.includes(item[key])) return false;
        } else if (item[key] !== query[key]) {
          return false;
        }
      }
      return true;
    });

    const cursor = {
      toArray: async () => results,
      sort: (sortQuery) => {
        if (sortQuery.created_at === -1) {
          results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
        return cursor;
      }
    };
    return cursor;
  }

  async updateOne(query, update) {
    const item = await this.findOne(query);
    if (!item) return { matchedCount: 0, modifiedCount: 0 };

    if (update.$set) {
      for (const key in update.$set) {
        if (key.includes('.')) {
          const [parent, indexField, child] = key.split('.');
          const productId = query['items.product_id'] || query.product_id;
          const cartItem = item.items && item.items.find(i => i.product_id === productId);
          if (cartItem && child === 'quantity') {
            cartItem.quantity = update.$set[key];
          }
        } else {
          item[key] = update.$set[key];
        }
      }
    }
    if (update.$inc) {
      for (const key in update.$inc) {
        if (key.includes('.')) {
          const productId = query['items.product_id'] || query.product_id;
          const cartItem = item.items && item.items.find(i => i.product_id === productId);
          if (cartItem) {
            cartItem.quantity += update.$inc[key];
          }
        }
      }
    }
    if (update.$push) {
      for (const key in update.$push) {
        if (!item[key]) item[key] = [];
        item[key].push(update.$push[key]);
      }
    }
    if (update.$pull) {
      for (const key in update.$pull) {
        const pullQuery = update.$pull[key];
        const pullKey = Object.keys(pullQuery)[0];
        if (item[key]) {
          item[key] = item[key].filter(subItem => subItem[pullKey] !== pullQuery[pullKey]);
        }
      }
    }
    return { matchedCount: 1, modifiedCount: 1 };
  }

  async deleteOne(query) {
    const idx = this.data.findIndex(item => {
      for (const key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });
    if (idx !== -1) {
      this.data.splice(idx, 1);
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }

  aggregate(pipeline) {
    let totalRevenue = 0;
    if (pipeline[0] && pipeline[0].$match && pipeline[0].$match.payment_status === 'paid') {
      totalRevenue = this.data
        .filter(item => item.payment_status === 'paid')
        .reduce((sum, item) => sum + (item.amount || 0), 0);
    }
    return {
      toArray: async () => [{ total_revenue: totalRevenue }]
    };
  }
}

const mockDb = {
  collection: (name) => new MongoCollectionMock(name)
};

let dbInstance = null;
async function getDb() {
  const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_URL || process.env.MONGODB_URI;
  if (!mongoUrl) {
    console.log("MONGO_URL/MONGODB_URL env variable not set! Using in-memory fallback database.");
    return mockDb;
  }
  if (dbInstance) return dbInstance;
  const dbName = process.env.DB_NAME || 'gothra';
  const client = new MongoClient(mongoUrl);
  await client.connect();
  dbInstance = client.db(dbName);
  
  // Sync products to MongoDB so that any new or updated products (like pickles and punches) are correctly populated.
  try {
    for (const product of PRODUCTS) {
      await dbInstance.collection('products').updateOne(
        { id: product.id },
        { $set: product },
        { upsert: true }
      );
    }
    console.log(`Synced ${PRODUCTS.length} products to database`);
  } catch (syncErr) {
    console.error("Failed to sync products to database:", syncErr);
  }
  
  return dbInstance;
}

// Helper: Calculate cart totals
async function calculateCartTotals(db, sessionId) {
  const cart = await db.collection('carts').findOne({ session_id: sessionId });
  if (!cart || !cart.items || cart.items.length === 0) return null;
  
  const productIds = cart.items.map(item => item.product_id);
  const products = await db.collection('products').find({ id: { $in: productIds } }).toArray();
  const productMap = {};
  products.forEach(p => productMap[p.id] = p);
  
  let subtotal = 0;
  let gst = 0;
  const itemsDetail = [];
  
  for (const item of cart.items) {
    const product = productMap[item.product_id];
    if (product) {
      const gstRate = product.gst_rate !== undefined ? product.gst_rate : 5;
      const itemTotal = product.price * item.quantity;
      const gstAmount = Math.round(itemTotal * gstRate) / 100;
      subtotal += itemTotal;
      gst += gstAmount;
      itemsDetail.push({
        product_id: item.product_id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        gst_rate: gstRate,
        image_url: product.image_url
      });
    }
  }
  
  return {
    subtotal,
    gst,
    total: Math.round((subtotal + gst) * 100) / 100,
    items: itemsDetail
  };
}

function calculateCartTotalsFromItems(itemsInput) {
  if (!itemsInput || itemsInput.length === 0) return { subtotal: 0, gst: 0, total: 0, items: [] };
  
  const productMap = {};
  PRODUCTS.forEach(p => productMap[p.id] = p);
  
  let subtotal = 0;
  let gst = 0;
  const itemsDetail = [];
  
  for (const item of itemsInput) {
    const productId = item.product_id || item.id;
    const quantity = item.quantity;
    const product = productMap[productId];
    if (product) {
      const gstRate = product.gst_rate !== undefined ? product.gst_rate : 5;
      const itemTotal = product.price * quantity;
      const gstAmount = Math.round(itemTotal * gstRate) / 100;
      subtotal += itemTotal;
      gst += gstAmount;
      itemsDetail.push({
        product_id: productId,
        name: product.name,
        price: product.price,
        quantity: quantity,
        gst_rate: gstRate,
        image_url: product.image_url
      });
    }
  }
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    gst: Math.round(gst * 100) / 100,
    total: Math.round((subtotal + gst) * 100) / 100,
    items: itemsDetail
  };
}


// Helper: send order notification emails
async function sendOwnerNotification(orderId, items, total, customerEmail, customerName, customerPhone) {
  const senderEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
  const storeEmail = process.env.STORE_EMAIL || '7gothra@gmail.com';
  try {
    let itemsRows = "";
    for (const item of items) {
      itemsRows += `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #EAD8C3;font-family:sans-serif;font-size:14px;color:#1A2421;">${item.name}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #EAD8C3;font-family:sans-serif;font-size:14px;color:#4A5D54;text-align:center;">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #EAD8C3;font-family:sans-serif;font-size:14px;color:#C05A42;text-align:right;">₹${(item.price * item.quantity).toLocaleString()}</td>
      </tr>`;
    }
    const html = `
    <div style="max-width:600px;margin:0 auto;font-family:sans-serif;">
      <div style="background:#1E3F33;padding:24px;text-align:center;">
        <h1 style="color:#FAF8F5;margin:0;font-size:24px;">New Order Received!</h1>
      </div>
      <div style="padding:24px;background:#FAF8F5;">
        <p style="color:#1A2421;font-size:16px;margin-bottom:4px;"><strong>Order ID:</strong> ${orderId}</p>
        <p style="color:#4A5D54;font-size:14px;margin-bottom:4px;"><strong>Customer:</strong> ${customerName || 'Guest'}</p>
        <p style="color:#4A5D54;font-size:14px;margin-bottom:4px;"><strong>Phone:</strong> ${customerPhone || 'Not provided'}</p>
        <p style="color:#4A5D54;font-size:14px;margin-bottom:16px;"><strong>Email:</strong> ${customerEmail || 'Not provided'}</p>
        <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;">
          <thead><tr style="background:#F3EBE1;">
            <th style="padding:10px 12px;text-align:left;font-family:sans-serif;font-size:13px;color:#4A5D54;">Item</th>
            <th style="padding:10px 12px;text-align:center;font-family:sans-serif;font-size:13px;color:#4A5D54;">Qty</th>
            <th style="padding:10px 12px;text-align:right;font-family:sans-serif;font-size:13px;color:#4A5D54;">Amount</th>
          </tr></thead>
          <tbody>${itemsRows}</tbody>
        </table>
        <div style="margin-top:16px;padding:16px;background:#1E3F33;border-radius:8px;text-align:right;">
          <span style="color:#FAF8F5;font-size:18px;font-weight:bold;">Total: ₹${total.toLocaleString()}</span>
        </div>
      </div>
    </div>`;
    await resend.emails.send({
      from: senderEmail,
      to: storeEmail,
      subject: `GOTHRA - New Order #${orderId.slice(0, 8)} (₹${total.toLocaleString()})`,
      html
    });
    console.log(`Owner notification sent for order ${orderId}`);
  } catch (err) {
    console.error("Failed to send owner notification:", err);
  }
}

async function sendCustomerConfirmation(customerEmail, customerName, orderId, items, total) {
  if (!customerEmail) return;
  const senderEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
  try {
    let itemsRows = "";
    for (const item of items) {
      itemsRows += `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #EAD8C3;font-family:sans-serif;font-size:14px;color:#1A2421;">${item.name}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #EAD8C3;font-family:sans-serif;font-size:14px;color:#4A5D54;text-align:center;">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #EAD8C3;font-family:sans-serif;font-size:14px;color:#C05A42;text-align:right;">₹${(item.price * item.quantity).toLocaleString()}</td>
      </tr>`;
    }
    const html = `
    <div style="max-width:600px;margin:0 auto;font-family:sans-serif;">
      <div style="background:#1E3F33;padding:24px;text-align:center;">
        <h1 style="color:#FAF8F5;margin:0;font-size:24px;">Thank you for your order!</h1>
      </div>
      <div style="padding:24px;background:#FAF8F5;">
        <p style="color:#1A2421;font-size:16px;">Hi ${customerName || 'there'},</p>
        <p style="color:#4A5D54;font-size:14px;">Your order has been confirmed. Here's a summary:</p>
        <p style="color:#4A5D54;font-size:13px;margin-bottom:16px;"><strong>Order ID:</strong> ${orderId}</p>
        <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;">
          <thead><tr style="background:#F3EBE1;">
            <th style="padding:10px 12px;text-align:left;font-family:sans-serif;font-size:13px;color:#4A5D54;">Item</th>
            <th style="padding:10px 12px;text-align:center;font-family:sans-serif;font-size:13px;color:#4A5D54;">Qty</th>
            <th style="padding:10px 12px;text-align:right;font-family:sans-serif;font-size:13px;color:#4A5D54;">Amount</th>
          </tr></thead>
          <tbody>${itemsRows}</tbody>
        </table>
        <div style="margin-top:16px;padding:16px;background:#1E3F33;border-radius:8px;text-align:right;">
          <span style="color:#FAF8F5;font-size:18px;font-weight:bold;">Total: ₹${total.toLocaleString()}</span>
        </div>
      </div>
    </div>`;
    await resend.emails.send({
      from: senderEmail,
      to: customerEmail,
      subject: `GOTHRA - Order Confirmed #${orderId.slice(0, 8)}`,
      html
    });
    console.log(`Customer confirmation sent to ${customerEmail}`);
  } catch (err) {
    console.error("Failed to send customer confirmation:", err);
  }
}

async function triggerOrderEmails(db, transaction, idField, idValue) {
  if (transaction.email_sent) return;
  const orderId = transaction.id || "N/A";
  const items = transaction.items || [];
  const total = transaction.amount || 0;
  const customerEmail = transaction.customer_email || "";
  const customerName = transaction.customer_name || "";
  const customerPhone = transaction.customer_phone || "";
  
  // Fire-and-forget email sends
  sendOwnerNotification(orderId, items, total, customerEmail, customerName, customerPhone);
  sendCustomerConfirmation(customerEmail, customerName, orderId, items, total);
  
  await db.collection('payment_transactions').updateOne({ [idField]: idValue }, { $set: { email_sent: true } });
}

// ROUTER SETUPS (Supports relative paths like /products as well as absolute paths /api/products)
const router = express.Router();

router.get('/products', async (req, res) => {
  try {
    const db = await getDb();
    const category = req.query.category;
    const search = req.query.search;
    let query = {};
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }
    const products = await db.collection('products').find(query, { projection: { _id: 0 } }).toArray();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/products/:product_id', async (req, res) => {
  try {
    const db = await getDb();
    const product = await db.collection('products').findOne({ id: req.params.product_id }, { projection: { _id: 0 } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/newsletter/subscribe', async (req, res) => {
  try {
    const db = await getDb();
    const email = (req.body.email || "").trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }
    const existing = await db.collection('newsletter').findOne({ email });
    if (existing) return res.json({ message: 'Already subscribed', subscribed: true });
    await db.collection('newsletter').insertOne({
      email,
      subscribed_at: new Date().toISOString()
    });
    res.json({ message: 'Successfully subscribed!', subscribed: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/cart/:session_id', async (req, res) => {
  try {
    const db = await getDb();
    const totals = await calculateCartTotals(db, req.params.session_id);
    if (!totals) {
      return res.json({ session_id: req.params.session_id, items: [], total: 0 });
    }
    res.json({
      session_id: req.params.session_id,
      items: totals.items,
      subtotal: totals.subtotal,
      gst: totals.gst,
      total: totals.total
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/cart/calculate', async (req, res) => {
  try {
    const { items } = req.body;
    const totals = calculateCartTotalsFromItems(items);
    res.json({
      items: totals.items,
      subtotal: totals.subtotal,
      gst: totals.gst,
      total: totals.total
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/cart/add', async (req, res) => {
  try {
    const db = await getDb();
    const { session_id, product_id, quantity = 1 } = req.body;
    const product = await db.collection('products').findOne({ id: product_id }, { projection: { _id: 0 } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    const cart = await db.collection('carts').findOne({ session_id });
    if (!cart) {
      await db.collection('carts').insertOne({
        id: uuidv4(),
        session_id,
        items: [{ product_id, quantity }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } else {
      const item = cart.items.find(i => i.product_id === product_id);
      if (item) {
        await db.collection('carts').updateOne(
          { session_id, 'items.product_id': product_id },
          { $inc: { 'items.$.quantity': quantity }, $set: { updated_at: new Date().toISOString() } }
        );
      } else {
        await db.collection('carts').updateOne(
          { session_id },
          { $push: { items: { product_id, quantity } }, $set: { updated_at: new Date().toISOString() } }
        );
      }
    }
    res.json({ message: 'Item added to cart', product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/cart/update', async (req, res) => {
  try {
    const db = await getDb();
    const { session_id, product_id, quantity } = req.body;
    if (quantity <= 0) {
      await db.collection('carts').updateOne(
        { session_id },
        { $pull: { items: { product_id } }, $set: { updated_at: new Date().toISOString() } }
      );
      return res.json({ message: 'Item removed from cart' });
    }
    await db.collection('carts').updateOne(
      { session_id, 'items.product_id': product_id },
      { $set: { 'items.$.quantity': quantity, updated_at: new Date().toISOString() } }
    );
    res.json({ message: 'Cart updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/cart/:session_id', async (req, res) => {
  try {
    const db = await getDb();
    await db.collection('carts').deleteOne({ session_id: req.params.session_id });
    res.json({ message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/checkout/create-session', async (req, res) => {
  try {
    const db = await getDb();
    const { session_id, items: itemsInput, origin_url, customer_email, customer_name } = req.body;
    let totals;
    if (itemsInput && itemsInput.length > 0) {
      totals = calculateCartTotalsFromItems(itemsInput);
    } else {
      totals = await calculateCartTotals(db, session_id);
    }
    if (!totals || totals.items.length === 0) return res.status(400).json({ error: 'Cart is empty' });
    
    const host_url = `${req.protocol}://${req.get('host')}`;
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'inr',
          product_data: { name: 'GOTHRA Store Purchase' },
          unit_amount: Math.round(totals.total * 100)
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${origin_url}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin_url}/cart`,
      customer_email: customer_email ? customer_email.trim().toLowerCase() : undefined,
      metadata: {
        cart_session_id: session_id,
        items_count: String(totals.items.length)
      }
    });
    
    await db.collection('payment_transactions').insertOne({
      id: uuidv4(),
      stripe_session_id: session.id,
      cart_session_id: session_id,
      amount: totals.total,
      currency: 'inr',
      status: 'pending',
      payment_status: 'pending',
      items: totals.items,
      customer_email: (customer_email || '').trim().toLowerCase(),
      customer_name: customer_name || '',
      email_sent: false,
      created_at: new Date().toISOString()
    });
    
    res.json({ checkout_url: session.url, session_id: session.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/checkout/status/:stripe_session_id', async (req, res) => {
  try {
    const db = await getDb();
    const stripeSessionId = req.params.stripe_session_id;
    const session = await stripe.checkout.sessions.retrieve(stripeSessionId);
    
    const newStatus = session.payment_status === 'paid' ? 'completed' : session.status;
    await db.collection('payment_transactions').updateOne(
      { stripe_session_id: stripeSessionId },
      { $set: { status: newStatus, payment_status: session.payment_status } }
    );
    
    if (session.payment_status === 'paid') {
      const transaction = await db.collection('payment_transactions').findOne({ stripe_session_id: stripeSessionId });
      if (transaction) {
        await db.collection('carts').deleteOne({ session_id: transaction.cart_session_id });
        await triggerOrderEmails(db, transaction, 'stripe_session_id', stripeSessionId);
      }
    }
    
    res.json({
      status: session.status,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      currency: session.currency
    });
  } catch (err) {
    const db = await getDb();
    const transaction = await db.collection('payment_transactions').findOne({ stripe_session_id: req.params.stripe_session_id });
    if (transaction) {
      return res.json({
        status: transaction.status,
        payment_status: transaction.payment_status,
        amount_total: Math.round(transaction.amount * 100),
        currency: transaction.currency || 'inr'
      });
    }
    res.status(404).json({ error: 'Checkout session not found' });
  }
});

router.post('/webhook/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe Webhook Error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const db = await getDb();
    await db.collection('payment_transactions').updateOne(
      { stripe_session_id: session.id },
      { $set: { status: 'completed', payment_status: 'paid' } }
    );
    const transaction = await db.collection('payment_transactions').findOne({ stripe_session_id: session.id });
    if (transaction) {
      await db.collection('carts').deleteOne({ session_id: transaction.cart_session_id });
      await triggerOrderEmails(db, transaction, 'stripe_session_id', session.id);
    }
  }
  res.json({ received: true });
});

router.post('/razorpay/create-order', async (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error("[RAZORPAY] Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET env vars");
      return res.status(500).json({ error: "Razorpay keys not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Render dashboard > Environment.", code: "MISSING_KEYS" });
    }
    const db = await getDb();
    const { session_id, items: itemsInput, customer_email, customer_name, customer_phone, address_line, city, state, pincode } = req.body;
    let totals;
    if (itemsInput && itemsInput.length > 0) {
      totals = calculateCartTotalsFromItems(itemsInput);
    } else {
      totals = await calculateCartTotals(db, session_id);
    }
    if (!totals || totals.items.length === 0) return res.status(400).json({ error: 'Cart is empty' });
    
    const amountPaise = Math.round(totals.total * 100);
    if (amountPaise < 100) return res.status(400).json({ error: 'Minimum order amount is ₹1' });
    
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `order_${uuidv4().replace(/-/g, '').slice(0, 12)}`
    });
    
    await db.collection('payment_transactions').insertOne({
      id: uuidv4(),
      razorpay_order_id: order.id,
      cart_session_id: session_id,
      subtotal: totals.subtotal,
      gst: totals.gst,
      amount: totals.total,
      currency: 'inr',
      status: 'created',
      payment_status: 'pending',
      payment_method: 'razorpay',
      items: totals.items,
      customer_email: (customer_email || '').trim().toLowerCase(),
      customer_name: customer_name || '',
      customer_phone: customer_phone || '',
      shipping_address: {
        line: address_line || '',
        city: city || '',
        state: state || '',
        pincode: pincode || ''
      },
      email_sent: false,
      created_at: new Date().toISOString()
    });
    
    res.json({ order_id: order.id, amount: amountPaise, currency: 'INR', key_id: process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_dummy' });
  } catch (err) {
    console.error("[RAZORPAY create-order error]", err?.response?.data || err?.message || err);
    const statusCode = err?.response?.statusCode || err?.statusCode || 500;
    const detail = err?.response?.data?.error?.description || err?.response?.data?.error?.code || err?.message || "Payment gateway error";
    res.status(statusCode).json({ error: detail, code: err?.response?.data?.error?.code || err?.error?.code || "UNKNOWN", keys_configured: !!process.env.RAZORPAY_KEY_ID });
  }
});

// Direct UPI/GPay order — no Razorpay, just store order + generate UPI link
router.post('/orders/create', async (req, res) => {
  try {
    const db = await getDb();
    const { session_id, items: itemsInput, customer_email, customer_name, customer_phone, address_line, city, state, pincode } = req.body;
    let totals;
    if (itemsInput && itemsInput.length > 0) {
      totals = calculateCartTotalsFromItems(itemsInput);
    } else {
      totals = await calculateCartTotals(db, session_id);
    }
    if (!totals || totals.items.length === 0) return res.status(400).json({ error: 'Cart is empty' });
    
    const amountPaise = Math.round(totals.total * 100);
    if (amountPaise < 100) return res.status(400).json({ error: 'Minimum order amount is ₹1' });
    
    const orderId = `ORD${uuidv4().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
    
    await db.collection('payment_transactions').insertOne({
      id: uuidv4(),
      order_id: orderId,
      cart_session_id: session_id,
      subtotal: totals.subtotal,
      gst: totals.gst,
      amount: totals.total,
      currency: 'inr',
      status: 'created',
      payment_status: 'pending',
      payment_method: 'upi',
      items: totals.items,
      customer_email: (customer_email || '').trim().toLowerCase(),
      customer_name: customer_name || '',
      customer_phone: customer_phone || '',
      shipping_address: {
        line: address_line || '',
        city: city || '',
        state: state || '',
        pincode: pincode || ''
      },
      email_sent: false,
      created_at: new Date().toISOString()
    });
    
    res.json({ order_id: orderId, amount: amountPaise, currency: 'INR' });
  } catch (err) {
    console.error("[UPI create-order error]", err?.message || err);
    res.status(500).json({ error: err?.message || "Failed to create order" });
  }
});

router.post('/razorpay/verify-payment', async (req, res) => {
  try {
    const db = await getDb();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, session_id } = req.body;
    const message = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(message)
      .digest('hex');
      
    if (generatedSignature.toLowerCase() !== razorpay_signature.toLowerCase()) {
      return res.status(400).json({ error: 'Payment verification failed' });
    }
    
    await db.collection('payment_transactions').updateOne(
      { razorpay_order_id },
      { $set: { status: 'completed', payment_status: 'paid', razorpay_payment_id, razorpay_signature } }
    );
    
    await db.collection('carts').deleteOne({ session_id });
    
    const transaction = await db.collection('payment_transactions').findOne({ razorpay_order_id });
    if (transaction) {
      await triggerOrderEmails(db, transaction, 'razorpay_order_id', razorpay_order_id);
    }
    
    res.json({ status: 'success', payment_id: razorpay_payment_id, order_id: razorpay_order_id });
  } catch (err) {
    console.error("[RAZORPAY verify-payment error]", err?.response?.data || err?.message || err);
    const detail = err?.response?.data?.error?.description || err?.message || "Payment verification error";
    res.status(500).json({ error: detail });
  }
});

// Check payment status for UPI/GPay orders (polled by frontend)
router.get('/razorpay/check-order/:order_id', async (req, res) => {
  try {
    const db = await getDb();
    const tx = await db.collection('payment_transactions').findOne({
      $or: [
        { razorpay_order_id: req.params.order_id },
        { order_id: req.params.order_id }
      ]
    });
    if (!tx) return res.json({ paid: false, status: 'not_found' });

    // Check Razorpay API for payment status
    try {
      const razorpayOrder = await razorpay.orders.fetch(req.params.order_id);
      const status = razorpayOrder.status;
      const isPaid = status === 'paid';
      if (isPaid && tx.payment_status !== 'paid') {
        // Update our DB if Razorpay says it's paid but we missed the webhook
        await db.collection('payment_transactions').updateOne(
          { razorpay_order_id: req.params.order_id },
          { $set: { status: 'completed', payment_status: 'paid' } }
        );
      }
      return res.json({ paid: isPaid, status, order_status: tx.payment_status });
    } catch (razErr) {
      // Fall back to local DB status
      return res.json({ paid: tx.payment_status === 'paid', status: tx.payment_status });
    }
  } catch (err) {
    console.error("[check-order error]", err?.message || err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/orders/lookup', async (req, res) => {
  try {
    const db = await getDb();
    const email = req.query.email;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }
    const orders = await db.collection('payment_transactions')
      .find({ customer_email: email.trim().toLowerCase(), payment_status: 'paid' }, { projection: { _id: 0 } })
      .sort({ created_at: -1 })
      .toArray();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/orders', async (req, res) => {
  try {
    const db = await getDb();
    const orders = await db.collection('payment_transactions').find({}, { projection: { _id: 0 } }).sort({ created_at: -1 }).toArray();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/stats', async (req, res) => {
  try {
    const db = await getDb();
    const totalOrders = await db.collection('payment_transactions').countDocuments({ payment_status: 'paid' });
    const revenueResult = await db.collection('payment_transactions').aggregate([
      { $match: { payment_status: 'paid' } },
      { $group: { _id: null, total_revenue: { $sum: '$amount' } } }
    ]).toArray();
    const totalRevenue = revenueResult[0] ? revenueResult[0].total_revenue : 0;
    const totalProducts = await db.collection('products').countDocuments({});
    const totalSubscribers = await db.collection('newsletter').countDocuments({});
    res.json({
      total_orders: totalOrders,
      total_revenue: totalRevenue,
      total_products: totalProducts,
      total_subscribers: totalSubscribers
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/log-error', (req, res) => {
  console.error('[CLIENT_ERROR]', JSON.stringify(req.body, null, 2));
  res.json({ received: true });
});

router.get('/db-status', async (req, res) => {
  const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_URL || process.env.MONGODB_URI;
  const isMock = !mongoUrl;
  let isConnected = false;
  let dbName = null;
  let productsCount = 0;
  
  try {
    const db = await getDb();
    if (db) {
      dbName = db.databaseName || (db.collection ? 'MockDB' : 'Unknown');
      if (isMock) {
        productsCount = MEMORY_DB.products.length;
        isConnected = true;
      } else {
        productsCount = await db.collection('products').countDocuments({});
        isConnected = true;
      }
    }
  } catch (err) {
    dbName = err.message;
  }
  
  res.json({
    timestamp: new Date().toISOString(),
    commit: "3be2918-db-status-v1",
    isMock,
    dbName,
    isConnected,
    productsCount,
    nodeEnv: process.env.NODE_ENV || 'development'
  });
});

router.get('/', (req, res) => {
  res.json({ message: 'GOTHRA API - Organic & Indigenous Products' });
});

// Bind routing to both prefixes so it supports relative and absolute paths
app.use('/api', router);
app.use('/', router);

// Wrap app in serverless handler for Netlify Lambda
module.exports.handler = serverless(app);
module.exports.app = app;

