import { useState, useEffect, createContext, useContext, useCallback, useRef } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Link, useNavigate, useSearchParams, useParams } from "react-router-dom";
import axios from "axios";
import { ShoppingCart, Menu, X, Plus, Minus, Trash2, ArrowRight, MapPin, Phone, Mail, Instagram, Loader2, ZoomIn, Search, ChevronUp, Heart, ArrowLeft, Share2, Star } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./components/ui/sheet";
import { Button } from "./components/ui/button";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { Dialog, DialogContent } from "./components/ui/dialog";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Image Zoom Modal Component
const ImageZoomModal = ({ isOpen, onClose, imageUrl, productName }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[90vw] h-[90vh] p-0 bg-white border-none">
        <div className="relative w-full h-full flex items-center justify-center p-4">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-colors"
            data-testid="close-zoom-modal"
          >
            <X size={24} className="text-[#1A2421]" />
          </button>
          <img src={imageUrl} alt={productName} className="max-w-full max-h-full object-contain" />
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Cart Context
const CartContext = createContext();
const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};

const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [sessionId] = useState(() => {
    const stored = localStorage.getItem("gothra_session_id");
    if (stored) return stored;
    const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem("gothra_session_id", newId);
    return newId;
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/cart/${sessionId}`);
      setCart(response.data);
    } catch (e) {
      console.error("Failed to fetch cart:", e);
    }
  }, [sessionId]);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const addToCart = async (productId, quantity = 1) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API}/cart/add`, { session_id: sessionId, product_id: productId, quantity });
      toast.success(`${response.data.product.name} added to cart`);
      await fetchCart();
    } catch (e) {
      toast.error("Failed to add item to cart");
    } finally {
      setIsLoading(false);
    }
  };

  const updateCartItem = async (productId, quantity) => {
    setIsLoading(true);
    try {
      await axios.post(`${API}/cart/update`, { session_id: sessionId, product_id: productId, quantity });
      await fetchCart();
    } catch (e) {
      toast.error("Failed to update cart");
    } finally {
      setIsLoading(false);
    }
  };

  const clearCart = async () => {
    try {
      await axios.delete(`${API}/cart/${sessionId}`);
      setCart({ items: [], total: 0 });
    } catch (e) {
      console.error("Failed to clear cart:", e);
    }
  };

  const checkout = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API}/checkout/create-session`, { session_id: sessionId, origin_url: window.location.origin });
      window.location.href = response.data.checkout_url;
    } catch (e) {
      toast.error("Failed to initiate checkout");
      setIsLoading(false);
    }
  };

  return (
    <CartContext.Provider value={{ cart, sessionId, addToCart, updateCartItem, clearCart, checkout, isLoading, fetchCart }}>
      {children}
    </CartContext.Provider>
  );
};

// Search Overlay
const SearchOverlay = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (!isOpen) { setQuery(""); setResults([]); }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API}/products?search=${encodeURIComponent(query)}`);
        setResults(response.data);
      } catch (e) { console.error(e); }
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-[#1A2421]/60 backdrop-blur-sm" data-testid="search-overlay" onClick={onClose}>
      <div className="max-w-3xl mx-auto pt-24 px-6" onClick={(e) => e.stopPropagation()}>
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center gap-4 px-6 py-5 border-b border-[#EAD8C3]">
            <Search size={22} className="text-[#4A5D54] flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for jute curtains, herbs, spices..."
              className="flex-1 text-lg text-[#1A2421] placeholder:text-[#4A5D54]/50 outline-none bg-transparent"
              data-testid="search-input"
            />
            <button onClick={onClose} className="p-1 hover:bg-[#F3EBE1] rounded-full transition-colors" data-testid="close-search-btn">
              <X size={20} className="text-[#4A5D54]" />
            </button>
          </div>
          {loading && <div className="px-6 py-8 text-center"><Loader2 className="animate-spin mx-auto text-[#1E3F33]" size={24} /></div>}
          {!loading && results.length > 0 && (
            <div className="max-h-[60vh] overflow-auto">
              {results.map((product) => (
                <button
                  key={product.id}
                  onClick={() => { onClose(); navigate(`/product/${product.id}`); }}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-[#FAF8F5] transition-colors text-left border-b border-[#F3EBE1] last:border-0"
                  data-testid={`search-result-${product.id}`}
                >
                  <img src={product.image_url} alt={product.name} className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-[#1A2421] truncate">{product.name}</h4>
                    <p className="text-sm text-[#4A5D54] truncate">{product.description}</p>
                  </div>
                  <span className="text-[#C05A42] font-semibold flex-shrink-0">₹{product.price}</span>
                </button>
              ))}
            </div>
          )}
          {!loading && query.trim() && results.length === 0 && (
            <div className="px-6 py-12 text-center text-[#4A5D54]">
              <p className="text-lg">No products found for "{query}"</p>
              <p className="text-sm mt-2">Try searching for "turmeric", "jute", or "pickle"</p>
            </div>
          )}
          {!query.trim() && (
            <div className="px-6 py-8">
              <p className="text-xs uppercase tracking-widest text-[#4A5D54]/60 mb-4">Popular Searches</p>
              <div className="flex flex-wrap gap-2">
                {["Jute Curtains", "Herbs", "Pickles", "Coconut Oil", "Spices", "Beauty"].map((term) => (
                  <button key={term} onClick={() => setQuery(term)} className="px-4 py-2 bg-[#F3EBE1] text-[#1A2421] text-sm rounded-full hover:bg-[#EAD8C3] transition-colors">
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Header Component
const Header = () => {
  const { cart } = useCart();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
      if (e.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header data-testid="nav-header" className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "glass-header shadow-sm" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <nav className="flex items-center justify-between h-20">
            <Link to="/" className="heading-serif text-2xl md:text-3xl font-semibold tracking-tight text-[#1A2421]" data-testid="logo-link">
              GOTHRA
            </Link>
            <div className="hidden md:flex items-center gap-10">
              <Link to="/" className="nav-link text-sm font-medium tracking-wide text-[#4A5D54] hover:text-[#1A2421] transition-colors" data-testid="nav-home">Home</Link>
              <Link to="/about" className="nav-link text-sm font-medium tracking-wide text-[#4A5D54] hover:text-[#1A2421] transition-colors" data-testid="nav-about">About Us</Link>
              <Link to="/contact" className="nav-link text-sm font-medium tracking-wide text-[#4A5D54] hover:text-[#1A2421] transition-colors" data-testid="nav-contact">Contact Us</Link>
              <Link to="/shop" className="nav-link text-sm font-medium tracking-wide text-[#4A5D54] hover:text-[#1A2421] transition-colors" data-testid="nav-products">Products</Link>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setSearchOpen(true)} className="p-2 hover:bg-[#F3EBE1] rounded-full transition-colors" data-testid="search-btn">
                <Search size={20} className="text-[#1A2421]" />
              </button>
              <CartSheet itemCount={itemCount} />
              <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} data-testid="mobile-menu-btn">
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </nav>
          {mobileMenuOpen && (
            <div className="md:hidden absolute top-20 left-0 right-0 bg-[#FAF8F5] border-t border-[#EAD8C3] py-6 px-6 animate-fade-in shadow-lg">
              <div className="flex flex-col gap-4">
                <Link to="/" className="text-lg font-medium text-[#1A2421]" onClick={() => setMobileMenuOpen(false)}>Home</Link>
                <Link to="/about" className="text-lg font-medium text-[#1A2421]" onClick={() => setMobileMenuOpen(false)}>About Us</Link>
                <Link to="/contact" className="text-lg font-medium text-[#1A2421]" onClick={() => setMobileMenuOpen(false)}>Contact Us</Link>
                <Link to="/shop" className="text-lg font-medium text-[#1A2421]" onClick={() => setMobileMenuOpen(false)}>Products</Link>
              </div>
            </div>
          )}
        </div>
      </header>
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};

// Cart Sheet Component
const CartSheet = ({ itemCount }) => {
  const { cart, updateCartItem, checkout, isLoading } = useCart();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="relative p-2" data-testid="cart-btn">
          <ShoppingCart size={20} className="text-[#1A2421]" />
          {itemCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#C05A42] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
              {itemCount}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md bg-[#FAF8F5]">
        <SheetHeader>
          <SheetTitle className="heading-serif text-2xl">Your Cart</SheetTitle>
        </SheetHeader>
        <div className="mt-8 flex flex-col h-[calc(100vh-200px)]">
          {cart.items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[#4A5D54]">
              <ShoppingCart size={48} strokeWidth={1} />
              <p className="mt-4 text-lg">Your cart is empty</p>
              <Link to="/shop">
                <Button className="mt-6 bg-[#1E3F33] hover:bg-[#152D24] rounded-full px-8" data-testid="continue-shopping-btn">
                  Continue Shopping
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-auto space-y-4">
                {cart.items.map((item) => (
                  <div key={item.product_id} className="flex gap-4 p-4 bg-white rounded-lg" data-testid={`cart-item-${item.product_id}`}>
                    <img src={item.image_url} alt={item.name} className="w-20 h-20 object-cover rounded" />
                    <div className="flex-1">
                      <h4 className="font-medium text-[#1A2421]">{item.name}</h4>
                      <p className="text-sm text-[#4A5D54] mt-1">₹{item.price.toLocaleString()}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <button onClick={() => updateCartItem(item.product_id, item.quantity - 1)} className="p-1 hover:bg-[#F3EBE1] rounded" data-testid={`decrease-${item.product_id}`}>
                          <Minus size={16} />
                        </button>
                        <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                        <button onClick={() => updateCartItem(item.product_id, item.quantity + 1)} className="p-1 hover:bg-[#F3EBE1] rounded" data-testid={`increase-${item.product_id}`}>
                          <Plus size={16} />
                        </button>
                        <button onClick={() => updateCartItem(item.product_id, 0)} className="ml-auto p-1 text-[#C05A42] hover:bg-red-50 rounded" data-testid={`remove-${item.product_id}`}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#EAD8C3] pt-6 mt-4">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-lg font-medium">Total</span>
                  <span className="text-xl font-semibold heading-serif">₹{cart.total.toLocaleString()}</span>
                </div>
                <Button onClick={checkout} disabled={isLoading} className="w-full bg-[#1E3F33] hover:bg-[#152D24] rounded-full h-12 text-base" data-testid="checkout-btn">
                  {isLoading ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                  Proceed to Checkout
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

// Scroll to Top Button
const ScrollToTop = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!show) return null;
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-8 right-8 z-40 w-12 h-12 bg-[#1E3F33] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#152D24] transition-all hover:scale-110"
      data-testid="scroll-to-top-btn"
    >
      <ChevronUp size={22} />
    </button>
  );
};

// Hero Section
const HeroSection = () => (
  <section className="pt-20 relative min-h-[85vh]" data-testid="hero-section">
    <div className="absolute inset-0 z-0">
      <img src="https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/vu81syzr_gothra.jpeg" alt="GOTHRA" className="w-full h-full object-cover" />
    </div>
  </section>
);

// Home About Section
const HomeAboutSection = () => (
  <section className="py-16 bg-[#FAF8F5]" data-testid="home-about-section">
    <div className="w-full px-4 md:px-8">
      <div className="flex justify-center">
        <img 
          src="https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/di2od5vi_Screenshot%202026-04-14%20184653.png" 
          alt="GOTHRA About Us" 
          className="w-full max-w-[1400px] h-auto object-contain"
          data-testid="home-about-store-image"
        />
      </div>
    </div>
  </section>
);

// Home Products Section
const HomeProductsSection = () => {
  const [products, setProducts] = useState([]);
  const [zoomImage, setZoomImage] = useState(null);
  const { addToCart } = useCart();

  useEffect(() => {
    axios.get(`${API}/products`).then(r => setProducts(r.data)).catch(console.error);
  }, []);

  const juteCurtains = products.filter(p => p.subcategory === 'jute-curtains');
  const planters = products.filter(p => p.subcategory === 'planters');
  const beautyProducts = products.filter(p => p.category === 'beauty');
  const herbs = products.filter(p => p.category === 'pantry').slice(0, 6);
  const spices = products.filter(p => p.category === 'pantry').slice(6);
  const pickles = products.filter(p => p.category === 'kitchen' && p.name.toLowerCase().includes('pickle'));
  const punch = products.filter(p => p.category === 'kitchen' && (p.name.toLowerCase().includes('punch') || p.name.toLowerCase().includes('sarbath')));

  const SmallProductCard = ({ product }) => (
    <div className="bg-white p-3 text-center group" data-testid={`product-${product.id}`}>
      <div className="aspect-square overflow-hidden mb-3 cursor-pointer relative rounded-lg" onClick={() => setZoomImage({ url: product.image_url, name: product.name })}>
        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={24} />
        </div>
      </div>
      <Link to={`/product/${product.id}`} className="hover:underline">
        <h3 className="text-sm font-medium text-[#1A2421] line-clamp-1">{product.name}</h3>
      </Link>
      <p className="text-[#C05A42] text-sm font-semibold mt-1">₹{product.price}</p>
      <Button onClick={() => addToCart(product.id)} size="sm" className="mt-2 bg-[#1E3F33] hover:bg-[#152D24] rounded-full text-xs w-full">Add</Button>
    </div>
  );

  return (
    <div data-testid="home-products-section">
      <ImageZoomModal isOpen={!!zoomImage} onClose={() => setZoomImage(null)} imageUrl={zoomImage?.url} productName={zoomImage?.name} />

      {/* Jute Curtains */}
      <section className="py-16 bg-[#F3EBE1]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <h2 className="heading-serif text-4xl md:text-5xl text-[#1A2421] text-center mb-12">JUTE CURTAINS</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {juteCurtains.map((product) => (
              <div key={product.id} className="bg-white p-4 group">
                <div className="aspect-[3/4] overflow-hidden mb-4 cursor-pointer relative" onClick={() => setZoomImage({ url: product.image_url, name: product.name })}>
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={32} />
                  </div>
                </div>
                <Link to={`/product/${product.id}`} className="hover:underline"><h3 className="heading-serif text-xl font-semibold text-[#1A2421]">{product.name}</h3></Link>
                <p className="text-[#4A5D54] text-sm mt-2 line-clamp-2">{product.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[#C05A42] font-semibold">₹{product.price.toLocaleString()} approx</span>
                  <Button onClick={() => addToCart(product.id)} size="sm" className="bg-[#1E3F33] hover:bg-[#152D24] rounded-full text-xs">Add to Cart</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planters */}
      <section className="py-16 bg-[#FAF8F5]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <h2 className="heading-serif text-4xl md:text-5xl text-[#1A2421] text-center mb-12">PLANTERS</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {planters.map((product) => <SmallProductCard key={product.id} product={product} />)}
          </div>
        </div>
      </section>

      {/* Beauty Products */}
      <section className="py-16 bg-[#F3EBE1]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <h2 className="heading-serif text-4xl md:text-5xl text-[#1A2421] text-center mb-12">BEAUTY PRODUCTS</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {beautyProducts.map((product) => <SmallProductCard key={product.id} product={product} />)}
          </div>
        </div>
      </section>

      {/* Herbs */}
      <section className="py-16 bg-[#FAF8F5]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <h2 className="heading-serif text-4xl md:text-5xl text-[#1A2421] text-center mb-12">HERBS</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {herbs.map((product) => <SmallProductCard key={product.id} product={product} />)}
          </div>
        </div>
      </section>

      {/* Spices */}
      <section className="py-16 bg-[#F3EBE1]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <h2 className="heading-serif text-4xl md:text-5xl text-[#1A2421] text-center mb-12">SPICES</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {spices.map((product) => <SmallProductCard key={product.id} product={product} />)}
          </div>
        </div>
      </section>

      {/* Pickles */}
      <section className="py-16 bg-[#FAF8F5]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <h2 className="heading-serif text-4xl md:text-5xl text-[#1A2421] text-center mb-12">PICKLES</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {pickles.map((product) => <SmallProductCard key={product.id} product={product} />)}
          </div>
        </div>
      </section>

      {/* Punch */}
      <section className="py-16 bg-[#F3EBE1]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <h2 className="heading-serif text-4xl md:text-5xl text-[#1A2421] text-center mb-12">PUNCH</h2>
          <div className="grid grid-cols-3 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {punch.map((product) => <SmallProductCard key={product.id} product={product} />)}
          </div>
        </div>
      </section>
    </div>
  );
};

// Newsletter Section
const NewsletterSection = () => {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      await axios.post(`${API}/newsletter/subscribe`, { email });
      setSubscribed(true);
      toast.success("Welcome to the GOTHRA family!");
    } catch (e) {
      toast.error("Failed to subscribe. Please try again.");
    }
    setSubmitting(false);
  };

  return (
    <section className="py-20 bg-[#F3EBE1]" data-testid="newsletter-section">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <h2 className="heading-serif text-3xl md:text-4xl text-[#1A2421] mb-4">Stay Connected</h2>
        <p className="text-[#4A5D54] mb-8">Be the first to know about new collections, exclusive offers, and stories from our artisan communities.</p>
        {subscribed ? (
          <p className="text-[#1E3F33] font-medium text-lg" data-testid="newsletter-success">Thank you for subscribing!</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-3 max-w-lg mx-auto" data-testid="newsletter-form">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              required
              className="flex-1 px-5 py-3 rounded-full bg-white border border-[#EAD8C3] text-[#1A2421] placeholder:text-[#4A5D54]/50 outline-none focus:border-[#1E3F33] transition-colors"
              data-testid="newsletter-email-input"
            />
            <Button type="submit" disabled={submitting} className="bg-[#1E3F33] hover:bg-[#152D24] rounded-full px-8" data-testid="newsletter-submit-btn">
              {submitting ? <Loader2 className="animate-spin" size={18} /> : "Subscribe"}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
};

// Home Contact Section
const HomeContactSection = () => (
  <section className="py-20 bg-[#1E3F33] text-[#FAF8F5]" data-testid="home-contact-section">
    <div className="max-w-7xl mx-auto px-6 md:px-12">
      <div className="grid md:grid-cols-2 gap-12">
        <div>
          <h2 className="heading-serif text-4xl md:text-5xl mb-6">Contact Us</h2>
          <p className="text-[#F3EBE1]/80 leading-relaxed mb-8">Visit our store or reach out to us for inquiries about our indigenous, organic products.</p>
        </div>
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <MapPin size={24} className="mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-medium mb-1">Store Address</h3>
              <p className="text-[#F3EBE1]/80">EVRA 508, Nandanam Lane, Vazhuthacaud, Trivandrum-695014</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Phone size={24} />
            <div>
              <h3 className="font-medium mb-1">Phone</h3>
              <a href="tel:+919446014710" className="text-[#F3EBE1]/80 hover:text-white transition-colors">+91 9446014710</a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Mail size={24} />
            <div>
              <h3 className="font-medium mb-1">Email</h3>
              <a href="mailto:7gothra@gmail.com" className="text-[#F3EBE1]/80 hover:text-white transition-colors">7gothra@gmail.com</a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Instagram size={24} />
            <div>
              <h3 className="font-medium mb-1">Instagram</h3>
              <a href="https://instagram.com/_GOTHRA" target="_blank" rel="noopener noreferrer" className="text-[#F3EBE1]/80 hover:text-white transition-colors">@_GOTHRA</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// Footer
const Footer = () => (
  <footer className="bg-[#1E3F33] text-[#FAF8F5] py-24" data-testid="footer">
    <div className="max-w-7xl mx-auto px-6 md:px-12">
      <div className="grid md:grid-cols-4 gap-12">
        <div className="md:col-span-2">
          <h3 className="heading-serif text-3xl font-semibold mb-4">GOTHRA</h3>
          <p className="text-[#F3EBE1]/80 leading-relaxed max-w-md">Inducing an organic lifestyle through indigenous craft. Ethically sourced, cruelty-free products from women entrepreneurs across India.</p>
        </div>
        <div>
          <h4 className="font-medium mb-4">Quick Links</h4>
          <div className="space-y-2 text-[#F3EBE1]/80">
            <Link to="/shop" className="block hover:text-white transition-colors">Shop All</Link>
            <Link to="/about" className="block hover:text-white transition-colors">Our Mission</Link>
            <Link to="/contact" className="block hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
        <div>
          <h4 className="font-medium mb-4">Contact Us</h4>
          <div className="space-y-3 text-[#F3EBE1]/80">
            <div className="flex items-start gap-3"><MapPin size={18} className="mt-1 flex-shrink-0" /><p>EVRA 508, Nandanam Lane, Vazhuthacaud, Trivandrum-695014</p></div>
            <div className="flex items-center gap-3"><Phone size={18} /><a href="tel:+919446014710" className="hover:text-white transition-colors">+91 9446014710</a></div>
            <div className="flex items-center gap-3"><Mail size={18} /><a href="mailto:7gothra@gmail.com" className="hover:text-white transition-colors">7gothra@gmail.com</a></div>
            <div className="flex items-center gap-3"><Instagram size={18} /><a href="https://instagram.com/_GOTHRA" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">@_GOTHRA</a></div>
          </div>
        </div>
      </div>
      <div className="mt-16 pt-8 border-t border-[#F3EBE1]/20 text-center text-[#F3EBE1]/60 text-sm">
        <p>&copy; {new Date().getFullYear()} GOTHRA. All rights reserved. Crafted with love in India.</p>
      </div>
    </div>
  </footer>
);

// Home Page
const HomePage = () => (
  <>
    <HeroSection />
    <HomeAboutSection />
    <HomeProductsSection />
    <NewsletterSection />
    <HomeContactSection />
  </>
);

// Product Detail Page
const ProductDetailPage = () => {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zoomOpen, setZoomOpen] = useState(false);
  const { addToCart, isLoading } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/products/${productId}`);
        setProduct(res.data);
        const relRes = await axios.get(`${API}/products?category=${res.data.category}`);
        setRelated(relRes.data.filter(p => p.id !== productId).slice(0, 4));
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchProduct();
    window.scrollTo(0, 0);
  }, [productId]);

  if (loading) return (
    <div className="pt-28 min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#1E3F33]" size={40} /></div>
  );
  if (!product) return (
    <div className="pt-28 min-h-screen flex flex-col items-center justify-center">
      <p className="text-[#4A5D54] text-lg">Product not found</p>
      <Link to="/shop"><Button className="mt-4 bg-[#1E3F33] hover:bg-[#152D24] rounded-full">Back to Shop</Button></Link>
    </div>
  );

  return (
    <div className="pt-24 pb-20 min-h-screen" data-testid="product-detail-page">
      <ImageZoomModal isOpen={zoomOpen} onClose={() => setZoomOpen(false)} imageUrl={product.image_url} productName={product.name} />
      
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-[#4A5D54] mb-8">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 hover:text-[#1A2421] transition-colors" data-testid="back-btn">
            <ArrowLeft size={16} /> Back
          </button>
          <span>/</span>
          <Link to="/shop" className="hover:text-[#1A2421] transition-colors">Products</Link>
          <span>/</span>
          <span className="text-[#1A2421]">{product.name}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-12 lg:gap-20">
          {/* Product Image */}
          <div className="relative group cursor-pointer" onClick={() => setZoomOpen(true)} data-testid="product-detail-image">
            <div className="aspect-square overflow-hidden bg-white rounded-lg">
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            </div>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
              <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={36} />
            </div>
          </div>

          {/* Product Info */}
          <div className="flex flex-col justify-center">
            <p className="text-[#C05A42] text-sm font-medium tracking-widest uppercase mb-3">{product.category === 'home-decor' ? 'Home Decor' : product.category === 'beauty' ? 'Beauty' : product.category === 'pantry' ? 'Herbs & Spices' : 'Kitchen'}</p>
            <h1 className="heading-serif text-4xl md:text-5xl text-[#1A2421] mb-4" data-testid="product-detail-name">{product.name}</h1>
            <p className="heading-serif text-3xl text-[#C05A42] mb-6" data-testid="product-detail-price">₹{product.price.toLocaleString()}</p>
            <p className="text-[#4A5D54] text-lg leading-relaxed mb-8">{product.description}</p>
            
            <div className="flex gap-4 mb-8">
              <Button 
                onClick={() => addToCart(product.id)} 
                disabled={isLoading} 
                className="flex-1 bg-[#1E3F33] hover:bg-[#152D24] rounded-full h-14 text-base"
                data-testid="product-detail-add-to-cart"
              >
                {isLoading ? <Loader2 className="animate-spin mr-2" size={18} /> : <ShoppingCart className="mr-2" size={18} />}
                Add to Cart
              </Button>
            </div>

            <div className="border-t border-[#EAD8C3] pt-6 space-y-3">
              <div className="flex items-center gap-3 text-[#4A5D54] text-sm">
                <svg className="w-5 h-5 text-[#1E3F33]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>
                100% Organic & Natural
              </div>
              <div className="flex items-center gap-3 text-[#4A5D54] text-sm">
                <svg className="w-5 h-5 text-[#1E3F33]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>
                Ethically Sourced Materials
              </div>
              <div className="flex items-center gap-3 text-[#4A5D54] text-sm">
                <svg className="w-5 h-5 text-[#1E3F33]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>
                Eco-Friendly Packaging
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="mt-24">
            <h2 className="heading-serif text-3xl text-[#1A2421] mb-10">You May Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {related.map((p) => (
                <Link to={`/product/${p.id}`} key={p.id} className="group bg-white rounded-lg overflow-hidden" data-testid={`related-${p.id}`}>
                  <div className="aspect-square overflow-hidden">
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-[#1A2421] text-sm">{p.name}</h3>
                    <p className="text-[#C05A42] text-sm font-semibold mt-1">₹{p.price.toLocaleString()}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Shop Page
const ShopPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const url = activeCategory === "all" ? `${API}/products` : `${API}/products?category=${activeCategory}`;
        const response = await axios.get(url);
        setProducts(response.data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchProducts();
  }, [activeCategory]);

  const categories = [
    { key: "all", label: "All Products" },
    { key: "home-decor", label: "Home Decor" },
    { key: "beauty", label: "Beauty" },
    { key: "pantry", label: "Herbs & Spices" },
    { key: "kitchen", label: "Kitchen" },
  ];

  return (
    <div className="pt-24 pb-20 min-h-screen" data-testid="shop-page">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <h1 className="heading-serif text-4xl md:text-5xl text-[#1A2421] mb-4">Our Products</h1>
        <p className="text-[#4A5D54] mb-8">Discover our curated range of indigenous, organic products.</p>
        
        {/* Category Filter Tabs */}
        <div className="flex gap-2 mb-10 overflow-x-auto pb-2" data-testid="category-filters">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeCategory === cat.key ? "bg-[#1E3F33] text-white" : "bg-[#F3EBE1] text-[#4A5D54] hover:bg-[#EAD8C3]"}`}
              data-testid={`filter-${cat.key}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#1E3F33]" size={40} /></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-lg overflow-hidden group hover:shadow-lg transition-shadow" data-testid={`shop-product-${product.id}`}>
                <Link to={`/product/${product.id}`}>
                  <div className="aspect-square overflow-hidden">
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                </Link>
                <div className="p-4">
                  <Link to={`/product/${product.id}`}><h3 className="font-medium text-[#1A2421] hover:underline">{product.name}</h3></Link>
                  <p className="text-[#4A5D54] text-sm mt-1 line-clamp-2">{product.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[#C05A42] font-semibold">₹{product.price.toLocaleString()}</span>
                    <Button onClick={() => addToCart(product.id)} size="sm" className="bg-[#1E3F33] hover:bg-[#152D24] rounded-full text-xs">Add</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// About Page
const AboutPage = () => (
  <div className="pt-20" data-testid="about-page">
    <section className="relative h-[40vh] flex items-center justify-center">
      <div className="absolute inset-0 z-0">
        <img src="https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/vu81syzr_gothra.jpeg" alt="GOTHRA" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#1A2421]/50"></div>
      </div>
      <h1 className="heading-serif text-5xl md:text-6xl text-white relative z-10">About Us</h1>
    </section>
    <section className="py-16 bg-[#FAF8F5]">
      <div className="w-full px-4 md:px-8">
        <div className="flex justify-center">
          <img src="https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/di2od5vi_Screenshot%202026-04-14%20184653.png" alt="GOTHRA About Us" className="w-full max-w-[1400px] h-auto object-contain" data-testid="about-page-store-image" />
        </div>
      </div>
    </section>
    <section className="py-20 bg-[#F3EBE1]">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-8 bg-white rounded-lg">
            <div className="w-16 h-16 mx-auto mb-4 bg-[#FAF8F5] rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-[#1E3F33]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" /></svg>
            </div>
            <h3 className="heading-serif text-xl font-semibold text-[#1A2421] mb-3">Locally made</h3>
            <p className="text-[#4A5D54] text-sm leading-relaxed">Our products are crafted using oriental methods without compromising their authenticity.</p>
          </div>
          <div className="text-center p-8 bg-white rounded-lg">
            <div className="w-16 h-16 mx-auto mb-4 bg-[#FAF8F5] rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-[#1E3F33]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            </div>
            <h3 className="heading-serif text-xl font-semibold text-[#1A2421] mb-3">Ethically sourced materials</h3>
            <p className="text-[#4A5D54] text-sm leading-relaxed">Our techniques are cruelty-free, and our materials are purely organic.</p>
          </div>
          <div className="text-center p-8 bg-white rounded-lg">
            <div className="w-16 h-16 mx-auto mb-4 bg-[#FAF8F5] rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-[#1E3F33]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="heading-serif text-xl font-semibold text-[#1A2421] mb-3">Eco-friendly</h3>
            <p className="text-[#4A5D54] text-sm leading-relaxed">From the making to the packing, we are committed to the SDG Agenda of 2030</p>
          </div>
        </div>
      </div>
    </section>
  </div>
);

// Contact Page
const ContactPage = () => (
  <div className="pt-20 min-h-screen" data-testid="contact-page">
    <section className="py-20 bg-[#1E3F33] text-[#FAF8F5]">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h1 className="heading-serif text-5xl md:text-6xl mb-6">Contact Us</h1>
            <p className="text-[#F3EBE1]/80 leading-relaxed mb-8">Visit our store or reach out to us for inquiries about our indigenous, organic products.</p>
          </div>
          <div className="space-y-6">
            <div className="flex items-start gap-4"><MapPin size={24} className="mt-1 flex-shrink-0" /><div><h3 className="font-medium mb-1">Store Address</h3><p className="text-[#F3EBE1]/80">EVRA 508, Nandanam Lane, Vazhuthacaud, Trivandrum-695014</p></div></div>
            <div className="flex items-center gap-4"><Phone size={24} /><div><h3 className="font-medium mb-1">Phone</h3><a href="tel:+919446014710" className="text-[#F3EBE1]/80 hover:text-white transition-colors">+91 9446014710</a></div></div>
            <div className="flex items-center gap-4"><Mail size={24} /><div><h3 className="font-medium mb-1">Email</h3><a href="mailto:7gothra@gmail.com" className="text-[#F3EBE1]/80 hover:text-white transition-colors">7gothra@gmail.com</a></div></div>
            <div className="flex items-center gap-4"><Instagram size={24} /><div><h3 className="font-medium mb-1">Instagram</h3><a href="https://instagram.com/_GOTHRA" target="_blank" rel="noopener noreferrer" className="text-[#F3EBE1]/80 hover:text-white transition-colors">@_GOTHRA</a></div></div>
          </div>
        </div>
      </div>
    </section>
  </div>
);

// Checkout Success Page
const CheckoutSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading");
  const [paymentData, setPaymentData] = useState(null);
  const { fetchCart } = useCart();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!sessionId) { setStatus("error"); return; }
    const checkStatus = async () => {
      try {
        const response = await axios.get(`${API}/checkout/status/${sessionId}`);
        setPaymentData(response.data);
        if (response.data.payment_status === "paid") { setStatus("success"); await fetchCart(); }
        else if (response.data.status === "expired") { setStatus("expired"); }
        else { setStatus("pending"); setTimeout(checkStatus, 3000); }
      } catch (e) { setStatus("error"); }
    };
    checkStatus();
    const timeout = setTimeout(() => { if (status === "loading" || status === "pending") setStatus("timeout"); }, 30000);
    return () => clearTimeout(timeout);
  }, [sessionId, fetchCart, status]);

  return (
    <div className="pt-28 pb-24 min-h-screen" data-testid="checkout-success-page">
      <div className="max-w-lg mx-auto px-6 text-center">
        {(status === "loading" || status === "pending") && (
          <><Loader2 className="animate-spin mx-auto text-[#1E3F33]" size={48} /><p className="mt-6 text-[#4A5D54] text-lg">Verifying your payment...</p></>
        )}
        {status === "success" && (
          <>
            <div className="w-20 h-20 bg-[#1E3F33] rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h1 className="heading-serif text-4xl text-[#1A2421] mt-6">Thank You!</h1>
            <p className="mt-4 text-[#4A5D54] text-lg">Your order has been placed successfully.</p>
            {paymentData && <p className="mt-2 text-[#4A5D54]">Amount paid: ₹{(paymentData.amount_total / 100).toLocaleString()}</p>}
            <Link to="/"><Button className="mt-8 bg-[#1E3F33] hover:bg-[#152D24] rounded-full px-8" data-testid="continue-shopping-success-btn">Continue Shopping</Button></Link>
          </>
        )}
        {(status === "error" || status === "expired" || status === "timeout") && (
          <>
            <div className="w-20 h-20 bg-[#C05A42] rounded-full flex items-center justify-center mx-auto"><X className="w-10 h-10 text-white" /></div>
            <h1 className="heading-serif text-4xl text-[#1A2421] mt-6">Payment Issue</h1>
            <p className="mt-4 text-[#4A5D54] text-lg">{status === "expired" ? "Your payment session has expired." : "There was an issue processing your payment."}</p>
            <Link to="/"><Button className="mt-8 bg-[#1E3F33] hover:bg-[#152D24] rounded-full px-8" data-testid="return-home-btn">Return to Shop</Button></Link>
          </>
        )}
      </div>
    </div>
  );
};

// Main App
function App() {
  return (
    <div className="App bg-[#FAF8F5] min-h-screen">
      <BrowserRouter>
        <CartProvider>
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/product/:productId" element={<ProductDetailPage />} />
              <Route path="/category/:category" element={<ShopPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
            </Routes>
          </main>
          <Footer />
          <ScrollToTop />
          <Toaster position="bottom-right" />
        </CartProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
