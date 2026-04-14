import { useState, useEffect, createContext, useContext, useCallback } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { ShoppingCart, Menu, X, Plus, Minus, Trash2, ArrowRight, MapPin, Phone, Mail, Instagram, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./components/ui/sheet";
import { Button } from "./components/ui/button";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

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
      const response = await axios.post(`${API}/checkout/create-session`, {
        session_id: sessionId,
        origin_url: window.location.origin
      });
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

// Header Component
const Header = () => {
  const { cart } = useCart();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header data-testid="nav-header" className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "glass-header shadow-sm" : "bg-transparent"}`}>
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <nav className="flex items-center justify-between h-20">
          <Link to="/" className="heading-serif text-2xl md:text-3xl font-semibold tracking-tight text-[#1A2421]" data-testid="logo-link">
            GOTHRA
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-10">
            <Link to="/" className="nav-link text-sm font-medium tracking-wide text-[#4A5D54] hover:text-[#1A2421] transition-colors" data-testid="nav-home">Home</Link>
            <Link to="/category/beauty" className="nav-link text-sm font-medium tracking-wide text-[#4A5D54] hover:text-[#1A2421] transition-colors" data-testid="nav-beauty">Beauty</Link>
            <Link to="/category/home-decor" className="nav-link text-sm font-medium tracking-wide text-[#4A5D54] hover:text-[#1A2421] transition-colors" data-testid="nav-decor">Decor</Link>
            <Link to="/about" className="nav-link text-sm font-medium tracking-wide text-[#4A5D54] hover:text-[#1A2421] transition-colors" data-testid="nav-mission">Our Mission</Link>
          </div>

          <div className="flex items-center gap-4">
            <CartSheet itemCount={itemCount} />
            <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} data-testid="mobile-menu-btn">
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </nav>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 right-0 bg-[#FAF8F5] border-t border-[#EAD8C3] py-6 px-6 animate-fade-in">
            <div className="flex flex-col gap-4">
              <Link to="/" className="text-lg font-medium text-[#1A2421]" onClick={() => setMobileMenuOpen(false)}>Home</Link>
              <Link to="/category/beauty" className="text-lg font-medium text-[#1A2421]" onClick={() => setMobileMenuOpen(false)}>Beauty</Link>
              <Link to="/category/home-decor" className="text-lg font-medium text-[#1A2421]" onClick={() => setMobileMenuOpen(false)}>Decor</Link>
              <Link to="/about" className="text-lg font-medium text-[#1A2421]" onClick={() => setMobileMenuOpen(false)}>Our Mission</Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

// Cart Sheet Component
const CartSheet = ({ itemCount }) => {
  const { cart, updateCartItem, checkout, isLoading } = useCart();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="relative p-2" data-testid="cart-btn">
          <ShoppingCart size={22} className="text-[#1A2421]" />
          {itemCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#C05A42] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
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
              <Link to="/">
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

// Product Card Component
const ProductCard = ({ product }) => {
  const { addToCart, isLoading } = useCart();

  return (
    <div className="product-card bg-white group" data-testid={`product-card-${product.id}`}>
      <div className="product-image-wrapper relative aspect-[4/5]">
        <img src={product.image_url} alt={product.name} className="product-image w-full h-full object-cover" />
        <div className="product-overlay absolute inset-0 bg-[#1A2421]/60 flex flex-col items-center justify-center gap-4 px-6">
          <p className="text-white text-2xl heading-serif font-medium">₹{product.price.toLocaleString()}</p>
          <Button onClick={() => addToCart(product.id)} disabled={isLoading} className="bg-white text-[#1A2421] hover:bg-[#F3EBE1] rounded-full px-8" data-testid={`add-to-cart-${product.id}`}>
            Add to Cart
          </Button>
        </div>
      </div>
      <div className="p-4">
        <h3 className="heading-serif text-lg font-medium text-[#1A2421]">{product.name}</h3>
        <p className="text-sm text-[#4A5D54] mt-1 line-clamp-2">{product.description}</p>
      </div>
    </div>
  );
};

// Hero Section - Clean with background image only
const HeroSection = () => {
  return (
    <section className="pt-20 relative min-h-[85vh]" data-testid="hero-section">
      {/* Background Image - No overlay content */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/vu81syzr_gothra.jpeg" 
          alt="GOTHRA" 
          className="w-full h-full object-cover"
        />
      </div>
    </section>
  );
};

// Three Pillars Section - for homepage
const ThreePillarsSection = () => (
  <section className="py-20 bg-[#FAF8F5]" data-testid="pillars-section">
    <div className="max-w-7xl mx-auto px-6 md:px-12">
      <div className="grid md:grid-cols-3 gap-8">
        <div className="text-center p-8 bg-white rounded-lg">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#F3EBE1] rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-[#1E3F33]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
            </svg>
          </div>
          <h3 className="heading-serif text-xl font-semibold text-[#1A2421] mb-3">Locally made</h3>
          <p className="text-[#4A5D54] text-sm leading-relaxed">
            Our products are crafted using oriental methods without compromising their authenticity.
          </p>
        </div>
        <div className="text-center p-8 bg-white rounded-lg">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#F3EBE1] rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-[#1E3F33]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h3 className="heading-serif text-xl font-semibold text-[#1A2421] mb-3">Ethically sourced materials</h3>
          <p className="text-[#4A5D54] text-sm leading-relaxed">
            Our techniques are cruelty-free, and our materials are purely organic.
          </p>
        </div>
        <div className="text-center p-8 bg-white rounded-lg">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#F3EBE1] rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-[#1E3F33]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="heading-serif text-xl font-semibold text-[#1A2421] mb-3">Eco-friendly</h3>
          <p className="text-[#4A5D54] text-sm leading-relaxed">
            From the making to the packing, we are committed to the SDG Agenda of 2030
          </p>
        </div>
      </div>
    </div>
  </section>
);

// Jute Curtains Section (matching PDF template)
const JuteCurtainsSection = () => {
  const [curtains, setCurtains] = useState([]);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchCurtains = async () => {
      try {
        const response = await axios.get(`${API}/products?category=home-decor`);
        setCurtains(response.data.filter(p => p.subcategory === 'jute-curtains'));
      } catch (e) {
        console.error("Failed to fetch curtains:", e);
      }
    };
    fetchCurtains();
  }, []);

  return (
    <section className="py-16 bg-[#F3EBE1]" data-testid="jute-curtains-section">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="text-center mb-12">
          <h2 className="heading-serif text-4xl md:text-5xl text-[#1A2421]">JUTE CURTAINS</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {curtains.map((product) => (
            <div key={product.id} className="bg-white p-4" data-testid={`curtain-${product.id}`}>
              <div className="aspect-[3/4] overflow-hidden mb-4">
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
              </div>
              <h3 className="heading-serif text-xl font-semibold text-[#1A2421]">{product.name}</h3>
              <p className="text-[#4A5D54] text-sm mt-2 line-clamp-3">{product.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[#C05A42] font-semibold">₹{product.price.toLocaleString()} approx</span>
                <Button onClick={() => addToCart(product.id)} size="sm" className="bg-[#1E3F33] hover:bg-[#152D24] rounded-full text-xs" data-testid={`add-curtain-${product.id}`}>
                  Add to Cart
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Planters Section (matching PDF)
const PlantersSection = () => {
  const [planters, setPlanters] = useState([]);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchPlanters = async () => {
      try {
        const response = await axios.get(`${API}/products?category=home-decor`);
        setPlanters(response.data.filter(p => p.subcategory === 'planters'));
      } catch (e) {
        console.error("Failed to fetch planters:", e);
      }
    };
    fetchPlanters();
  }, []);

  return (
    <section className="py-16 bg-[#FAF8F5]" data-testid="planters-section">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="text-center mb-12">
          <h2 className="heading-serif text-4xl md:text-5xl text-[#1A2421]">PLANTERS</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {planters.map((product) => (
            <div key={product.id} className="bg-white p-4" data-testid={`planter-${product.id}`}>
              <div className="aspect-square overflow-hidden mb-4">
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
              </div>
              <h3 className="heading-serif text-lg font-semibold text-[#1A2421]">{product.name}</h3>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[#C05A42] font-semibold">₹{product.price.toLocaleString()}</span>
                <Button onClick={() => addToCart(product.id)} size="sm" className="bg-[#1E3F33] hover:bg-[#152D24] rounded-full text-xs" data-testid={`add-planter-${product.id}`}>
                  Add
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Beauty Products Section (matching PDF)
const BeautyProductsSection = () => {
  const [products, setProducts] = useState([]);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(`${API}/products?category=beauty`);
        setProducts(response.data);
      } catch (e) {
        console.error("Failed to fetch beauty products:", e);
      }
    };
    fetchProducts();
  }, []);

  return (
    <section className="py-16 bg-[#F3EBE1]" data-testid="beauty-section">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="text-center mb-12">
          <h2 className="heading-serif text-4xl md:text-5xl text-[#1A2421]">BEAUTY PRODUCTS</h2>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {products.slice(0, 9).map((product) => (
            <div key={product.id} className="bg-white p-3 text-center" data-testid={`beauty-${product.id}`}>
              <div className="aspect-square overflow-hidden mb-3 rounded-lg">
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
              </div>
              <h3 className="text-sm font-medium text-[#1A2421] line-clamp-1">{product.name}</h3>
              <p className="text-[#C05A42] text-sm font-semibold mt-1">₹{product.price}</p>
              <Button onClick={() => addToCart(product.id)} size="sm" className="mt-2 bg-[#1E3F33] hover:bg-[#152D24] rounded-full text-xs w-full" data-testid={`add-beauty-${product.id}`}>
                Add
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Herbs & Spices Section (matching PDF)
const HerbsSpicesSection = () => {
  const [products, setProducts] = useState([]);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(`${API}/products?category=pantry`);
        setProducts(response.data);
      } catch (e) {
        console.error("Failed to fetch herbs & spices:", e);
      }
    };
    fetchProducts();
  }, []);

  const herbs = products.slice(0, 6);
  const spices = products.slice(6, 12);

  return (
    <section className="py-16 bg-[#FAF8F5]" data-testid="herbs-spices-section">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Herbs */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="heading-serif text-4xl md:text-5xl text-[#1A2421]">HERBS</h2>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {herbs.map((product) => (
              <div key={product.id} className="bg-white p-3 text-center" data-testid={`herb-${product.id}`}>
                <div className="aspect-square overflow-hidden mb-3 rounded-lg">
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                </div>
                <h3 className="text-sm font-medium text-[#1A2421] line-clamp-1">{product.name}</h3>
                <p className="text-[#C05A42] text-sm font-semibold mt-1">₹{product.price}</p>
                <Button onClick={() => addToCart(product.id)} size="sm" className="mt-2 bg-[#1E3F33] hover:bg-[#152D24] rounded-full text-xs w-full" data-testid={`add-herb-${product.id}`}>
                  Add
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Spices */}
        <div>
          <div className="text-center mb-12">
            <h2 className="heading-serif text-4xl md:text-5xl text-[#1A2421]">SPICES</h2>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {spices.map((product) => (
              <div key={product.id} className="bg-white p-3 text-center" data-testid={`spice-${product.id}`}>
                <div className="aspect-square overflow-hidden mb-3 rounded-lg">
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                </div>
                <h3 className="text-sm font-medium text-[#1A2421] line-clamp-1">{product.name}</h3>
                <p className="text-[#C05A42] text-sm font-semibold mt-1">₹{product.price}</p>
                <Button onClick={() => addToCart(product.id)} size="sm" className="mt-2 bg-[#1E3F33] hover:bg-[#152D24] rounded-full text-xs w-full" data-testid={`add-spice-${product.id}`}>
                  Add
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// Pickles & Punch Section (matching PDF)
const PicklesPunchSection = () => {
  const [products, setProducts] = useState([]);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(`${API}/products?category=kitchen`);
        setProducts(response.data);
      } catch (e) {
        console.error("Failed to fetch pickles:", e);
      }
    };
    fetchProducts();
  }, []);

  const pickles = products.filter(p => p.name.toLowerCase().includes('pickle'));
  const punch = products.filter(p => p.name.toLowerCase().includes('punch') || p.name.toLowerCase().includes('sarbath'));

  return (
    <section className="py-16 bg-[#F3EBE1]" data-testid="pickles-punch-section">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Pickles */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="heading-serif text-4xl md:text-5xl text-[#1A2421]">PICKLES</h2>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {pickles.map((product) => (
              <div key={product.id} className="bg-white p-3 text-center" data-testid={`pickle-${product.id}`}>
                <div className="aspect-square overflow-hidden mb-3 rounded-lg">
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                </div>
                <h3 className="text-sm font-medium text-[#1A2421] line-clamp-1">{product.name}</h3>
                <p className="text-[#C05A42] text-sm font-semibold mt-1">₹{product.price}</p>
                <Button onClick={() => addToCart(product.id)} size="sm" className="mt-2 bg-[#1E3F33] hover:bg-[#152D24] rounded-full text-xs w-full" data-testid={`add-pickle-${product.id}`}>
                  Add
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Punch */}
        <div>
          <div className="text-center mb-12">
            <h2 className="heading-serif text-4xl md:text-5xl text-[#1A2421]">PUNCH</h2>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {punch.map((product) => (
              <div key={product.id} className="bg-white p-3 text-center" data-testid={`punch-${product.id}`}>
                <div className="aspect-square overflow-hidden mb-3 rounded-lg">
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                </div>
                <h3 className="text-sm font-medium text-[#1A2421] line-clamp-1">{product.name}</h3>
                <p className="text-[#C05A42] text-sm font-semibold mt-1">₹{product.price}</p>
                <Button onClick={() => addToCart(product.id)} size="sm" className="mt-2 bg-[#1E3F33] hover:bg-[#152D24] rounded-full text-xs w-full" data-testid={`add-punch-${product.id}`}>
                  Add
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// Categories Section
const CategoriesSection = () => {
  const categories = [
    { id: "home-decor", name: "Home Decor", image: "https://images.unsplash.com/photo-1743087367764-052d6483672d?w=800&q=85", desc: "Jute Curtains & Wooden Planters" },
    { id: "beauty", name: "Beauty & Wellness", image: "https://images.unsplash.com/photo-1589810353876-0497a89e5ad1?w=800&q=85", desc: "Lip Balms, Oils & Face Packs" },
    { id: "pantry", name: "Herbs & Spices", image: "https://images.unsplash.com/photo-1643067077447-78239a403a18?w=800&q=85", desc: "Teas, Tamarind & Cardamom" },
    { id: "kitchen", name: "Kitchen Essentials", image: "https://images.unsplash.com/photo-1573051038546-894db2283a05?w=800&q=85", desc: "Gourmet Pickles & Beverages" },
  ];

  return (
    <section className="py-24 md:py-32 bg-[#F3EBE1]" data-testid="categories-section">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="text-center mb-16">
          <h2 className="heading-serif text-4xl md:text-5xl text-[#1A2421]">Our Collections</h2>
          <p className="mt-4 text-[#4A5D54] max-w-lg mx-auto">Discover our range of indigenous, organic products crafted with love and tradition.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {categories.map((cat, idx) => (
            <Link to={`/category/${cat.id}`} key={cat.id} className={`category-card relative overflow-hidden ${idx === 0 ? "col-span-2 row-span-2" : ""}`} data-testid={`category-${cat.id}`}>
              <div className={`relative ${idx === 0 ? "aspect-square" : "aspect-[3/4]"}`}>
                <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                <div className="category-overlay absolute inset-0 flex flex-col justify-end p-6">
                  <h3 className="heading-serif text-xl md:text-2xl text-white font-medium">{cat.name}</h3>
                  <p className="text-white/80 text-sm mt-1">{cat.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

// About Section
const AboutSection = () => (
  <section className="py-24 md:py-32" data-testid="about-section">
    <div className="max-w-7xl mx-auto px-6 md:px-12">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div className="order-2 md:order-1">
          <p className="text-[#C05A42] text-sm font-medium tracking-widest uppercase mb-4">Our Story</p>
          <h2 className="heading-serif text-4xl md:text-5xl text-[#1A2421] leading-tight">Empowering Women Through Indigenous Craft</h2>
          <p className="mt-6 text-[#4A5D54] leading-relaxed">
            We gather women entrepreneurs from different walks of life to promote peace and non-violence through their craft. Each product tells a story of tradition, sustainability, and empowerment.
          </p>
          <p className="mt-4 text-[#4A5D54] leading-relaxed">
            We are committed to the Agenda of 2030, ensuring sustainability from making to packing. Our mission is to preserve indigenous knowledge while providing fair livelihoods to artisan communities.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <div className="w-12 h-[1px] bg-[#C05A42]"></div>
            <span className="text-[#C05A42] text-sm font-medium">Sustainable • Ethical • Indigenous</span>
          </div>
        </div>
        <div className="order-1 md:order-2">
          <img src="https://images.unsplash.com/photo-1768729340668-9b609873e796?w=800&q=85" alt="Woman artisan" className="w-full h-[500px] object-cover" />
        </div>
      </div>
    </div>
  </section>
);

// Coming Soon Section
const ComingSoonSection = () => (
  <section className="py-24 md:py-32 bg-[#1E3F33] relative overflow-hidden" data-testid="coming-soon-section">
    <div className="absolute inset-0 opacity-30">
      <img src="https://images.unsplash.com/photo-1765418933180-bc86d212ab88?w=1920&q=80" alt="Misty tea garden" className="w-full h-full object-cover" />
    </div>
    <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10 text-center">
      <p className="text-[#F3EBE1]/80 text-sm font-medium tracking-widest uppercase mb-4">Coming Soon</p>
      <h2 className="heading-serif text-4xl md:text-6xl text-[#FAF8F5] leading-tight">The Seven Sisters Collection</h2>
      <p className="mt-6 text-[#F3EBE1]/90 max-w-2xl mx-auto text-lg leading-relaxed">
        Original indigenous products from North-East India — Arunachal Pradesh, Assam, Manipur, Meghalaya, Mizoram, Nagaland, and Tripura. Featuring colorful threads, beads, and bamboo crafts.
      </p>
      <div className="mt-10 flex justify-center gap-6 flex-wrap">
        {["Arunachal", "Assam", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Tripura"].map((state) => (
          <span key={state} className="text-[#F3EBE1]/70 text-sm border border-[#F3EBE1]/30 px-4 py-2 rounded-full">{state}</span>
        ))}
      </div>
    </div>
  </section>
);

// Footer Component
const Footer = () => (
  <footer className="bg-[#1E3F33] text-[#FAF8F5] py-24" data-testid="footer">
    <div className="max-w-7xl mx-auto px-6 md:px-12">
      <div className="grid md:grid-cols-4 gap-12">
        <div className="md:col-span-2">
          <h3 className="heading-serif text-3xl font-semibold mb-4">GOTHRA</h3>
          <p className="text-[#F3EBE1]/80 leading-relaxed max-w-md">
            Inducing an organic lifestyle through indigenous craft. Ethically sourced, cruelty-free products from women entrepreneurs across India.
          </p>
        </div>
        <div>
          <h4 className="font-medium mb-4">Quick Links</h4>
          <div className="space-y-2 text-[#F3EBE1]/80">
            <Link to="/shop" className="block hover:text-white transition-colors">Shop All</Link>
            <Link to="/about" className="block hover:text-white transition-colors">Our Mission</Link>
            <Link to="/category/beauty" className="block hover:text-white transition-colors">Beauty</Link>
            <Link to="/category/pantry" className="block hover:text-white transition-colors">Pantry</Link>
          </div>
        </div>
        <div>
          <h4 className="font-medium mb-4">Contact Us</h4>
          <div className="space-y-3 text-[#F3EBE1]/80">
            <div className="flex items-start gap-3">
              <MapPin size={18} className="mt-1 flex-shrink-0" />
              <p>EVRA 508, Nandanam Lane, Vazhuthacaud, Trivandrum-695014</p>
            </div>
            <div className="flex items-center gap-3">
              <Phone size={18} />
              <a href="tel:+919446014710" className="hover:text-white transition-colors">+91 9446014710</a>
            </div>
            <div className="flex items-center gap-3">
              <Mail size={18} />
              <a href="mailto:7gothra@gmail.com" className="hover:text-white transition-colors">7gothra@gmail.com</a>
            </div>
            <div className="flex items-center gap-3">
              <Instagram size={18} />
              <a href="https://instagram.com/_GOTHRA" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">@_GOTHRA</a>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-16 pt-8 border-t border-[#F3EBE1]/20 text-center text-[#F3EBE1]/60 text-sm">
        <p>© {new Date().getFullYear()} GOTHRA. All rights reserved. Crafted with love in India.</p>
      </div>
    </div>
  </footer>
);

// Home Page - matching PDF template layout
const HomePage = () => (
  <>
    <HeroSection />
    <ThreePillarsSection />
    <JuteCurtainsSection />
    <PlantersSection />
    <BeautyProductsSection />
    <HerbsSpicesSection />
    <PicklesPunchSection />
    <ComingSoonSection />
  </>
);

// Shop Page
const ShopPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(`${API}/products`);
        setProducts(response.data);
      } catch (e) {
        console.error("Failed to fetch products:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <div className="pt-28 pb-24 min-h-screen" data-testid="shop-page">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <h1 className="heading-serif text-4xl md:text-5xl text-[#1A2421] mb-8">All Products</h1>
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-[#1E3F33]" size={40} />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Category Page
const CategoryPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const category = window.location.pathname.split("/").pop();
  
  const categoryNames = {
    "home-decor": "Home Decor",
    "beauty": "Beauty & Wellness",
    "pantry": "Herbs & Spices",
    "kitchen": "Kitchen Essentials"
  };

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API}/products?category=${category}`);
        setProducts(response.data);
      } catch (e) {
        console.error("Failed to fetch products:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [category]);

  return (
    <div className="pt-28 pb-24 min-h-screen" data-testid="category-page">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <h1 className="heading-serif text-4xl md:text-5xl text-[#1A2421] mb-8">{categoryNames[category] || category}</h1>
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-[#1E3F33]" size={40} />
          </div>
        ) : products.length === 0 ? (
          <p className="text-[#4A5D54] text-lg">No products found in this category.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// About Page - Full About Us content
const AboutPage = () => (
  <div className="pt-20" data-testid="about-page">
    {/* Hero Banner */}
    <section className="relative h-[40vh] flex items-center justify-center">
      <div className="absolute inset-0 z-0">
        <img 
          src="https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/vu81syzr_gothra.jpeg" 
          alt="GOTHRA" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[#1A2421]/50"></div>
      </div>
      <h1 className="heading-serif text-5xl md:text-6xl text-white relative z-10">About Us</h1>
    </section>

    {/* About Content with Store Image */}
    <section className="py-20 bg-[#FAF8F5]">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="flex justify-center">
          <img 
            src="https://customer-assets.emergentagent.com/job_earth-commerce-2/artifacts/di2od5vi_Screenshot%202026-04-14%20184653.png" 
            alt="GOTHRA Store Interior" 
            className="w-full max-w-4xl h-auto object-contain"
          />
        </div>
      </div>
    </section>

    {/* Three Pillars */}
    <section className="py-20 bg-[#F3EBE1]">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-8 bg-white rounded-lg">
            <div className="w-16 h-16 mx-auto mb-4 bg-[#FAF8F5] rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-[#1E3F33]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
              </svg>
            </div>
            <h3 className="heading-serif text-xl font-semibold text-[#1A2421] mb-3">Locally made</h3>
            <p className="text-[#4A5D54] text-sm leading-relaxed">
              Our products are crafted using oriental methods without compromising their authenticity.
            </p>
          </div>
          <div className="text-center p-8 bg-white rounded-lg">
            <div className="w-16 h-16 mx-auto mb-4 bg-[#FAF8F5] rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-[#1E3F33]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="heading-serif text-xl font-semibold text-[#1A2421] mb-3">Ethically sourced materials</h3>
            <p className="text-[#4A5D54] text-sm leading-relaxed">
              Our techniques are cruelty-free, and our materials are purely organic.
            </p>
          </div>
          <div className="text-center p-8 bg-white rounded-lg">
            <div className="w-16 h-16 mx-auto mb-4 bg-[#FAF8F5] rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-[#1E3F33]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="heading-serif text-xl font-semibold text-[#1A2421] mb-3">Eco-friendly</h3>
            <p className="text-[#4A5D54] text-sm leading-relaxed">
              From the making to the packing, we are committed to the SDG Agenda of 2030
            </p>
          </div>
        </div>
      </div>
    </section>

    <ComingSoonSection />
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
    if (!sessionId) {
      setStatus("error");
      return;
    }

    let attempts = 0;
    const maxAttempts = 5;
    const pollInterval = 2000;

    const pollStatus = async () => {
      try {
        const response = await axios.get(`${API}/checkout/status/${sessionId}`);
        setPaymentData(response.data);
        
        if (response.data.payment_status === "paid") {
          setStatus("success");
          fetchCart();
          return;
        } else if (response.data.status === "expired") {
          setStatus("expired");
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(pollStatus, pollInterval);
        } else {
          setStatus("timeout");
        }
      } catch (e) {
        console.error("Failed to check payment status:", e);
        setStatus("error");
      }
    };

    pollStatus();
  }, [sessionId, fetchCart]);

  return (
    <div className="pt-28 pb-24 min-h-screen flex items-center justify-center" data-testid="checkout-success-page">
      <div className="max-w-lg mx-auto px-6 text-center">
        {status === "loading" && (
          <>
            <Loader2 className="animate-spin text-[#1E3F33] mx-auto" size={48} />
            <p className="mt-6 text-lg text-[#4A5D54]">Processing your payment...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-20 h-20 bg-[#1E3F33] rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="heading-serif text-4xl text-[#1A2421] mt-6">Thank You!</h1>
            <p className="mt-4 text-[#4A5D54] text-lg">Your order has been placed successfully.</p>
            {paymentData && (
              <p className="mt-2 text-[#4A5D54]">
                Amount paid: ₹{(paymentData.amount_total / 100).toLocaleString()}
              </p>
            )}
            <Link to="/">
              <Button className="mt-8 bg-[#1E3F33] hover:bg-[#152D24] rounded-full px-8" data-testid="continue-shopping-success-btn">
                Continue Shopping
              </Button>
            </Link>
          </>
        )}
        {(status === "error" || status === "expired" || status === "timeout") && (
          <>
            <div className="w-20 h-20 bg-[#C05A42] rounded-full flex items-center justify-center mx-auto">
              <X className="w-10 h-10 text-white" />
            </div>
            <h1 className="heading-serif text-4xl text-[#1A2421] mt-6">Payment Issue</h1>
            <p className="mt-4 text-[#4A5D54] text-lg">
              {status === "expired" ? "Your payment session has expired." : "There was an issue processing your payment."}
            </p>
            <Link to="/">
              <Button className="mt-8 bg-[#1E3F33] hover:bg-[#152D24] rounded-full px-8" data-testid="return-home-btn">
                Return to Shop
              </Button>
            </Link>
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
              <Route path="/category/:category" element={<CategoryPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
            </Routes>
          </main>
          <Footer />
          <Toaster position="bottom-right" />
        </CartProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
