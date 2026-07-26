// gothra-api — Cloudflare Worker (Service Worker format)
const PRODUCTS = [
  {id:"prod-001",name:"Subtlety",description:"100% raw jute, self-embroidered with clay bead highlights available in sheer as well as dimouts. 7ft-2pcs",price:4600,category:"home-decor",image_url:"/images/8910apx5_Subtlety.webp",subcategory:"jute-curtains",gst_rate:18},
  {id:"prod-002",name:"Traditions Alive",description:"Jute curtain with elephant mascot application and brass anklet beads. 7ft-2pcs",price:5999,category:"home-decor",image_url:"/images/klf2iwua_Screenshot 2025-10-15 221632.webp",subcategory:"jute-curtains",gst_rate:18},
  {id:"prod-003",name:"Shimmer",description:"Zari borders reminds exotic saris of India. 7ft-2pcs",price:2699,category:"home-decor",image_url:"/images/l2ea3lmw_Screenshot 2025-10-15 222821.webp",subcategory:"jute-curtains",gst_rate:18},
  {id:"prod-004",name:"Black is Beautiful",description:"Jute curtain with black satin ribbon. 7ft-2pcs",price:2225,category:"home-decor",image_url:"/images/8pzpco95_Screenshot 2025-10-15 221555.webp",subcategory:"jute-curtains",gst_rate:18},
  {id:"prod-005",name:"Colonial Cousins",description:"Jute curtain with white lace work. 7ft-2pcs",price:3499,category:"home-decor",image_url:"/images/w7k5q5w6_Screenshot 2025-10-15 223018.webp",subcategory:"jute-curtains",gst_rate:18},
  {id:"prod-006",name:"Earths Joy",description:"Raw jute with terracotta beads and bamboo embellishments. 7ft-2pcs",price:4599,category:"home-decor",image_url:"/images/skfa2cza_Screenshot 2025-10-15 223811.webp",subcategory:"jute-curtains",gst_rate:18},
  {id:"prod-007",name:"Terrarium",description:"Handcrafted wooden terrarium planter with candle holder.",price:1999,category:"home-decor",image_url:"/images/q3llc4nq_Screenshot 2025-10-15 220940.webp",subcategory:"planters",gst_rate:18},
  {id:"prod-008",name:"Tulsi Thara",description:"Natural wood log planter. Traditional Tulsi planter from natural wood.",price:3999,category:"home-decor",image_url:"/images/ya0idb2s_Screenshot 2025-10-15 223940.webp",subcategory:"planters",gst_rate:18},
  {id:"prod-009",name:"Wooden Planter",description:"Natural wood planter with multiple plant holders.",price:2500,category:"home-decor",image_url:"/images/0g8f7lpe_Screenshot 2025-10-15 223832.webp",subcategory:"planters",gst_rate:18},
  {id:"prod-010",name:"Beeswax Lip Balm",description:"Paraben-free lip balm with beeswax, virgin coconut oil and vitamin E. 8g/.28 oz",price:140,category:"beauty",image_url:"/images/fzgjafin_Beeswax Lip Balm.webp",gst_rate:18},
  {id:"prod-011",name:"Virgin Coconut Oil",description:"Cold-pressed virgin coconut oil extracted using authentic oriental methods.",price:359,category:"beauty",image_url:"/images/20dptwav_Oval VCO.webp",gst_rate:5},
  {id:"prod-012",name:"Herbal Face Pack",description:"Natural face pack with Chandanam, Rakta Chandanam, Honey & Multani Mitti. 45g/1.59oz",price:300,category:"beauty",image_url:"/images/7o4z86k0_HERBAL FACE MASK.webp",gst_rate:18},
  {id:"prod-013",name:"Kasturi Manjal",description:"Wild turmeric powder for skin brightening. Net 170g",price:210,category:"beauty",image_url:"/images/sxfuodew_Kasturi Manjal.webp",gst_rate:18},
  {id:"prod-014",name:"Multani Mitti",description:"100% Natural Fuller's Earth clay. Net 170g",price:150,category:"beauty",image_url:"/images/k9641yrt_Multani Mitti.webp",gst_rate:18},
  {id:"prod-015",name:"Moringa Powder",description:"100% Organic nutrient-rich moringa powder. Net 170g",price:350,category:"beauty",image_url:"/images/x66g7cty_Moringa Powder.webp",gst_rate:5},
  {id:"prod-016",name:"Henna Powder",description:"Natural henna powder for hair coloring. Net 170g",price:100,category:"beauty",image_url:"/images/v5icmldq_Henna Powder.webp",gst_rate:18},
  {id:"prod-017",name:"Indigo Powder",description:"100% Natural Hair Color indigo powder. Net 170g",price:150,category:"beauty",image_url:"/images/dam9r3af_Indigo Powder.webp",gst_rate:18},
  {id:"prod-018",name:"Amla Powder",description:"Indian gooseberry powder for hair growth. Net 170g",price:210,category:"beauty",image_url:"/images/a8cak0cy_Amla Powder.webp",gst_rate:18},
  {id:"prod-019",name:"Blue Tea",description:"Blue Butterfly Pea Flower tea. Net 100g",price:250,category:"pantry",image_url:"/images/cmts4kzm_Blue tea.webp",gst_rate:5},
  {id:"prod-020",name:"Kappi",description:"Traditional blend with Jaggery, Dry Ginger & Pepper. Net 100g",price:60,category:"pantry",image_url:"/images/mlc7xarg_Kappi.webp",gst_rate:5},
  {id:"prod-021",name:"Hibiscus Tea",description:"Caffeine-free Herbal Infusion. Net 100g",price:250,category:"pantry",image_url:"/images/nsiacpvn_Hibiscus Tea.webp",gst_rate:5},
  {id:"prod-022",name:"Turmeric Powder",description:"Pure organic turmeric powder from Kerala. Net 100g",price:200,category:"pantry",image_url:"/images/p0c7k8ts_Turmeric.webp",gst_rate:5},
  {id:"prod-023",name:"Honey",description:"100% Natural pure wild honey. 500ml/16.9oz",price:599,category:"pantry",image_url:"/images/kf97qa1r_Honey.webp",gst_rate:5},
  {id:"prod-024",name:"Cloves",description:"Whole Cloves from Kerala spice gardens. Net 100g",price:260,category:"pantry",image_url:"/images/unam37wl_Cloves.webp",gst_rate:5},
  {id:"prod-025",name:"Pepper",description:"Whole Black Peppercorns from Malabar. Net 100g",price:200,category:"pantry",image_url:"/images/bpyhcfuh_Pepper.webp",gst_rate:5},
  {id:"prod-026",name:"Cardamom",description:"Whole Cardamom Pods from Kerala hills. Net 100g",price:510,category:"pantry",image_url:"/images/xlwmfnjt_Cardamom.webp",gst_rate:5},
  {id:"prod-027",name:"Nutmeg",description:"Whole Nutmeg with Fibers. Net 100g",price:125,category:"pantry",image_url:"/images/coz6kvpd_Whole Nutmeg.webp",gst_rate:5},
  {id:"prod-028",name:"Malabar Tamarind",description:"Garcinia Cambogia - Premium quality. Net 100g",price:150,category:"pantry",image_url:"/images/uu8buodq_Malabar Tamarind.webp",gst_rate:5},
  {id:"prod-029",name:"Cinnamon",description:"Whole Cinnamon Bark. Net 100g",price:150,category:"pantry",image_url:"/images/xl87rko0_Cinnamon.webp",gst_rate:5},
  {id:"prod-030",name:"Curry Leaf Pickle",description:"100% Natural curry leaf pickle. 200gm/7.05oz",price:220,category:"kitchen",image_url:"/images/3z98em8m_Curry Leaf-200gm (1).webp",gst_rate:5},
  {id:"prod-031",name:"Nutmeg Pickle",description:"100% Natural nutmeg pickle. 200gm/7.05oz",price:249,category:"kitchen",image_url:"/images/r7d78p40_Nutmeg-200gm.webp",gst_rate:5},
  {id:"prod-032",name:"Carrot Pickle",description:"100% Natural carrot pickle. 200gm/7.05oz",price:229,category:"kitchen",image_url:"/images/if7itlsh_Carrot-200gm (1).webp",gst_rate:5},
  {id:"prod-033",name:"Star Fruit Pickle",description:"100% Natural tangy star fruit pickle. 200gm/7.05oz",price:220,category:"kitchen",image_url:"/images/412u5j3u_starfruit.webp",gst_rate:5},
  {id:"prod-034",name:"Raisins Pickle",description:"100% Natural unique sweet and tangy raisins pickle. 200gm/7.05oz",price:310,category:"kitchen",image_url:"/images/v1bd64y8_Raisins pickle.webp",gst_rate:5},
  {id:"prod-035",name:"Lime and Dates Pickle",description:"100% Natural sweet and sour lime with dates pickle. 200gm/7.05oz",price:229,category:"kitchen",image_url:"/images/wsbueoco_lime and dates.webp",gst_rate:5},
  {id:"prod-036",name:"Water Apple Punch",description:"Refreshing water apple concentrate. 500ml/16.9oz",price:599,category:"kitchen",image_url:"/images/bnp8i9vk_Water apple punch.webp",gst_rate:5},
  {id:"prod-037",name:"Pomegranate Punch",description:"Refreshing pomegranate concentrate. 500ml/16.9oz",price:510,category:"kitchen",image_url:"/images/8n7s9mhp_pom punch.webp",gst_rate:5},
  {id:"prod-038",name:"Naruneendi Sarbath",description:"Traditional Kerala herbal drink concentrate. 500ml/16.9oz",price:130,category:"kitchen",image_url:"/images/4zhtlqeb_Naruneendi.webp",gst_rate:5},
  {id:"prod-039",name:"Myrrh",description:"Whole Myrrh Resin. Net 100g",price:350,category:"pantry",image_url:"/images/0frogqsd_Screenshot 2026-01-25 214526.webp",gst_rate:5},
];

// In-memory stores
const carts = {}, transactions = [], newsletter = [];
const uuid = () => crypto.randomUUID();
const cors = (origin) => ({
  'Access-Control-Allow-Origin': (origin||'').includes('gothra.org')||(origin||'').includes('localhost')||(origin||'').includes('netlify.app')||(origin||'').includes('workers.dev') ? origin : 'https://gothra.org',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Credentials': 'true',
});

function json(data, status=200, origin) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors(origin) } });
}
function err(msg, status=500, origin) { return json({error: msg}, status, origin); }

function calc(items) {
  if (!items?.length) return null;
  const pmap = {}; PRODUCTS.forEach(p=>pmap[p.id]=p);
  let sub=0, gst=0, det=[];
  for (const i of items) {
    const p = pmap[i.product_id||i.id]; if (!p) continue;
    const r = p.gst_rate??5, t = p.price*i.quantity, g = Math.round(t*r)/100;
    sub+=t; gst+=g;
    det.push({product_id:p.id, name:p.name, price:p.price, quantity:i.quantity, gst_rate:r, image_url:p.image_url});
  }
  const total = Math.round((sub+gst)*100)/100;
  return {subtotal:Math.round(sub*100)/100, gst:Math.round(gst*100)/100, total, items:det};
}

async function razorFetch(path, opts={}) {
  const kid = (RAZORPAY_KEY_ID || 'rzp_live_SnwbqPh0ryr5Ik').trim();
  const sec = (RAZORPAY_KEY_SECRET || 'DhpZyljanoTTecMrReGiUNCe').trim();
  const basic = btoa(`${kid}:${sec}`);
  return fetch(`https://api.razorpay.com/v1${path}`, {...opts, headers:{'Authorization':`Basic ${basic}`,'Content-Type':'application/json',...opts.headers}});
}

// Environment variables — set via Cloudflare dashboard
let RAZORPAY_KEY_ID = '', RAZORPAY_KEY_SECRET = '', RESEND_API_KEY = '';

addEventListener('fetch', event => {
  RAZORPAY_KEY_ID = (typeof RAZORPAY_KEY_ID_CF !== 'undefined' ? RAZORPAY_KEY_ID_CF : '') || '';
  RAZORPAY_KEY_SECRET = (typeof RAZORPAY_KEY_SECRET_CF !== 'undefined' ? RAZORPAY_KEY_SECRET_CF : '') || '';
  RESEND_API_KEY = (typeof RESEND_API_KEY_CF !== 'undefined' ? RESEND_API_KEY_CF : '') || '';
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const origin = request.headers.get('Origin');
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors(origin) });

  let body;
  try { body = request.method !== 'GET' && request.method !== 'DELETE' ? await request.json() : {}; } catch { body = {}; }

  try {
    // Root
    if (path === '/' || path === '/api') return json({ message: 'GOTHRA API - Organic & Indigenous Products', version: 'cf-worker' }, 200, origin);

    // Products list
    if (path === '/api/products' && request.method === 'GET') {
      let r = [...PRODUCTS];
      if (url.searchParams.get('category')) r = r.filter(p => p.category === url.searchParams.get('category'));
      if (url.searchParams.get('search')) { const q = url.searchParams.get('search').toLowerCase(); r = r.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)); }
      return json(r, 200, origin);
    }

    // Single product
    const pm = path.match(/^\/api\/products\/(.+)$/);
    if (pm && request.method === 'GET') {
      const p = PRODUCTS.find(p => p.id === pm[1]);
      return p ? json(p, 200, origin) : err('Product not found', 404, origin);
    }

    // Newsletter
    if (path === '/api/newsletter/subscribe' && request.method === 'POST') {
      const email = (body.email||'').trim().toLowerCase();
      if (!email.includes('@')) return err('Valid email required', 400, origin);
      if (newsletter.find(e => e.email === email)) return json({message:'Already subscribed',subscribed:true}, 200, origin);
      newsletter.push({email,subscribed_at:new Date().toISOString()});
      return json({message:'Successfully subscribed!',subscribed:true}, 200, origin);
    }

    // Cart
    const cg = path.match(/^\/api\/cart\/(.+)$/);
    if (cg && request.method === 'GET') {
      const cart = carts[cg[1]] || {session_id:cg[1],items:[]};
      const totals = calc(cart.items);
      return json(totals ? {session_id:cg[1],...totals} : {session_id:cg[1],items:[],total:0}, 200, origin);
    }
    if (path === '/api/cart/calculate' && request.method === 'POST') {
      const totals = calc(body.items);
      return totals ? json(totals, 200, origin) : err('Cart is empty', 400, origin);
    }
    if (path === '/api/cart/add' && request.method === 'POST') {
      const {session_id,product_id,quantity=1} = body;
      if (!session_id||!product_id) return err('session_id and product_id required', 400, origin);
      if (!PRODUCTS.find(p=>p.id===product_id)) return err('Product not found', 404, origin);
      const cart = carts[session_id]||{session_id,items:[]};
      const ex = cart.items.find(i=>i.product_id===product_id);
      ex ? ex.quantity+=quantity : cart.items.push({product_id,quantity});
      carts[session_id] = cart;
      return json({message:'Item added to cart',product:PRODUCTS.find(p=>p.id===product_id)}, 200, origin);
    }
    if (path === '/api/cart/update' && request.method === 'POST') {
      const {session_id,product_id,quantity} = body;
      if (!session_id||!product_id) return err('Missing fields', 400, origin);
      const cart = carts[session_id]||{session_id,items:[]};
      if (quantity<=0) cart.items = cart.items.filter(i=>i.product_id!==product_id);
      else {const ex=cart.items.find(i=>i.product_id===product_id); if(ex)ex.quantity=quantity;}
      carts[session_id] = cart;
      return json({message:'Cart updated'}, 200, origin);
    }
    const cd = path.match(/^\/api\/cart\/(.+)$/);
    if (cd && request.method === 'DELETE') { delete carts[cd[1]]; return json({message:'Cart cleared'}, 200, origin); }

    // Razorpay — create order
    // CRITICAL: Cloudflare Workers have in-memory storage that resets on cold start.
    // We MUST receive cart items directly in the request body, not rely on server-side session.
    if (path === '/api/razorpay/create-order' && request.method === 'POST') {
      let totals = null;
      // Try to calculate from items in request body first (preferred — survives cold starts)
      if (body.items && Array.isArray(body.items) && body.items.length > 0) {
        totals = calc(body.items);
      }
      // Fallback: try in-memory cart (may be lost on cold start)
      if (!totals && body.session_id) {
        totals = calc((carts[body.session_id] || {}).items);
      }
      if (!totals?.items.length) return err('Cart is empty. Please re-add items and try again.', 400, origin);
      const amt = Math.round(totals.total*100);
      if (amt<100) return err('Minimum order amount is ₹1', 400, origin);
      const r = await razorFetch('/orders',{method:'POST',body:JSON.stringify({amount:amt,currency:'INR',receipt:`order_${uuid().replace(/-/g,'').slice(0,12)}`})});
      const o = await r.json();
      if (!r.ok) return err(o?.error?.description||o?.error?.code||'Razorpay error', 500, origin);
      const tx = {id:uuid(),razorpay_order_id:o.id,cart_session_id:body.session_id,subtotal:totals.subtotal,gst:totals.gst,amount:totals.total,currency:'inr',status:'created',payment_status:'pending',payment_method:'razorpay',items:totals.items,customer_email:(body.customer_email||'').trim().toLowerCase(),customer_name:body.customer_name||'',customer_phone:body.customer_phone||'',shipping_address:{line:body.address_line||'',city:body.city||'',state:body.state||'',pincode:body.pincode||''},email_sent:false,created_at:new Date().toISOString()};
      transactions.push(tx);
      // Also save cart to in-memory store for fallback
      if (body.session_id && body.items?.length) {
        carts[body.session_id] = {session_id: body.session_id, items: body.items};
      }
      return json({order_id:o.id,amount:amt,currency:'INR',key_id:RAZORPAY_KEY_ID||'rzp_live_SnwbqPh0ryr5Ik'}, 200, origin);
    }

    if (path === '/api/razorpay/verify-payment' && request.method === 'POST') {
      const {razorpay_order_id,razorpay_payment_id,razorpay_signature,session_id} = body;
      const sec = (RAZORPAY_KEY_SECRET||'DhpZyljanoTTecMrReGiUNCe').trim();
      const msg = `${razorpay_order_id}|${razorpay_payment_id}`;
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey('raw',enc.encode(sec),{name:'HMAC',hash:'SHA-256'},false,['sign']);
      const sig = await crypto.subtle.sign('HMAC',key,enc.encode(msg));
      const gen = Array.from(new Uint8Array(sig)).map(b=>b.toString(16).padStart(2,'0')).join('');
      if (gen.toLowerCase()!==razorpay_signature.toLowerCase()) return err('Payment verification failed', 400, origin);
      const tx = transactions.find(t=>t.razorpay_order_id===razorpay_order_id);
      if (tx) {
        tx.status='completed';tx.payment_status='paid';tx.razorpay_payment_id=razorpay_payment_id;tx.razorpay_signature=razorpay_signature;
        delete carts[session_id];
        if (!tx.email_sent) {tx.email_sent=true; sendEmails(tx);}
      }
      return json({status:'success',payment_id:razorpay_payment_id,order_id:razorpay_order_id}, 200, origin);
    }

    const ck = path.match(/^\/api\/razorpay\/check-order\/(.+)$/);
    if (ck && request.method === 'GET') {
      const tx = transactions.find(t=>t.razorpay_order_id===ck[1]||t.order_id===ck[1]);
      if (!tx) return json({paid:false,status:'not_found'}, 200, origin);
      try {
        const r = await razorFetch(`/orders/${ck[1]}`);
        const o = await r.json();
        const paid = o.status==='paid';
        if (paid&&tx.payment_status!=='paid'){tx.status='completed';tx.payment_status='paid';}
        return json({paid,status:o.status,order_status:tx.payment_status}, 200, origin);
      } catch { return json({paid:tx.payment_status==='paid',status:tx.payment_status}, 200, origin); }
    }

    // UPI orders
    if (path === '/api/orders/create' && request.method === 'POST') {
      const totals = body.items?.length ? calc(body.items) : calc((carts[body.session_id]||{}).items);
      if (!totals?.items.length) return err('Cart is empty', 400, origin);
      const amt = Math.round(totals.total*100);
      if (amt<100) return err('Minimum order amount is ₹1', 400, origin);
      const oid = `ORD${uuid().replace(/-/g,'').slice(0,10).toUpperCase()}`;
      const tx = {id:uuid(),order_id:oid,cart_session_id:body.session_id,subtotal:totals.subtotal,gst:totals.gst,amount:totals.total,currency:'inr',status:'created',payment_status:'pending',payment_method:'upi',items:totals.items,customer_email:(body.customer_email||'').trim().toLowerCase(),customer_name:body.customer_name||'',customer_phone:body.customer_phone||'',shipping_address:{line:body.address_line||'',city:body.city||'',state:body.state||'',pincode:body.pincode||''},email_sent:false,created_at:new Date().toISOString()};
      transactions.push(tx);
      return json({order_id:oid,amount:amt,currency:'INR'}, 200, origin);
    }

    // Order lookup
    if (path==='/api/orders/lookup' && request.method==='GET') {
      const em=url.searchParams.get('email');
      if (!em?.includes('@')) return err('Valid email required',400,origin);
      return json(transactions.filter(t=>t.customer_email===em.trim().toLowerCase()&&t.payment_status==='paid').sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)), 200, origin);
    }

    // Admin
    if (path==='/api/admin/orders' && request.method==='GET') return json(transactions.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)), 200, origin);
    if (path==='/api/admin/stats' && request.method==='GET') {
      const paid=transactions.filter(t=>t.payment_status==='paid');
      return json({total_orders:paid.length,total_revenue:paid.reduce((s,t)=>s+(t.amount||0),0),total_products:PRODUCTS.length,total_subscribers:newsletter.length}, 200, origin);
    }

    // DB status
    if (path==='/api/db-status' && request.method==='GET') return json({timestamp:new Date().toISOString(),isMock:true,dbName:'InMemory',isConnected:true,productsCount:PRODUCTS.length,env:'cloudflare-worker'}, 200, origin);

    return err('Not found', 404, origin);
  } catch (e) {
    console.error('worker error', e);
    return err(e.message||'Internal error', 500, origin);
  }
}

async function sendEmails(tx) {
  if (!RESEND_API_KEY) return;
  const sender = 'onboarding@resend.dev', store = '7gothra@gmail.com';
  const {id:orderId,items,total:amt,customer_email:email,customer_name:name,customer_phone:phone,shipping_address:addr} = tx;
  const rows = items.map(i=>`<tr><td style="padding:8px;border-bottom:1px solid #ddd">${i.name}</td><td style="text-align:center;padding:8px;border-bottom:1px solid #ddd">${i.quantity}</td><td style="text-align:right;padding:8px;border-bottom:1px solid #ddd">₹${(i.price*i.quantity).toLocaleString()}</td></tr>`).join('');
  const addrBlock = addr ? `<div style="margin-top:16px;padding:16px;background:#fff;border-radius:8px"><h3 style="margin:0 0 8px;color:#1A2421">Shipping Address</h3><p style="margin:0;color:#4A5D54;line-height:1.6">${[addr.line,addr.city,addr.state,addr.pincode].filter(Boolean).join('<br/>')}</p></div>` : '';
  const custBlock = `<div style="margin-top:16px;padding:16px;background:#fff;border-radius:8px"><h3 style="margin:0 0 8px;color:#1A2421">Customer Details</h3><p style="margin:0;color:#4A5D54;line-height:1.6">${[name&&`<strong>Name:</strong> ${name}`,phone&&`<strong>Phone:</strong> ${phone}`,email&&`<strong>Email:</strong> ${email}`].filter(Boolean).join('<br/>')}</p></div>`;
  const body = (owner) => `<div style="max-width:600px;margin:0 auto;font-family:sans-serif"><div style="background:#1E3F33;padding:24px;text-align:center"><h1 style="color:#FAF8F5;margin:0">${owner?'New Order Received!':'Thank you for your order!'}</h1></div><div style="padding:24px;background:#FAF8F5"><p style="margin:0 0 16px">${owner?`<strong>Order:</strong> ${orderId}`:`Hi ${name||'there'}, your order is confirmed.`}</p><table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px"><thead><tr style="background:#F3EBE1"><th style="padding:8px;text-align:left">Item</th><th style="padding:8px">Qty</th><th style="padding:8px;text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table><div style="margin-top:16px;padding:16px;background:#1E3F33;border-radius:8px;text-align:right"><span style="color:#FAF8F5;font-size:18px;font-weight:bold">Total: ₹${amt.toLocaleString()}</span></div>${owner?custBlock+addrBlock:''}</div></div>`;
  try {
    await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Authorization':`Bearer ${RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:sender,to:store,subject:`GOTHRA - New Order #${(orderId||'').slice(0,8)} (₹${(amt||0).toLocaleString()})`,html:body(true)})});
    if (email) await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Authorization':`Bearer ${RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:sender,to:email,subject:`GOTHRA - Order Confirmed #${(orderId||'').slice(0,8)}`,html:body(false)})});
  } catch(e) { console.error('email send failed',e); }
}
