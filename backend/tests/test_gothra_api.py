"""
GOTHRA E-commerce API Tests
Tests for: Search, Products, Newsletter, Cart, and Checkout functionality
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://earth-commerce-2.preview.emergentagent.com').rstrip('/')

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def test_session_id():
    """Generate unique session ID for cart tests"""
    return f"test_session_{datetime.now().strftime('%H%M%S')}_{hash(datetime.now()) % 10000}"


class TestHealthAndRoot:
    """Basic API health checks"""
    
    def test_root_endpoint(self, api_client):
        """Test root API endpoint returns 200"""
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"Root endpoint response: {data}")


class TestProductsAPI:
    """Product listing and search tests"""
    
    def test_get_all_products(self, api_client):
        """Test GET /api/products returns all products"""
        response = api_client.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        products = response.json()
        assert isinstance(products, list)
        assert len(products) >= 39  # Should have 39 products now
        print(f"Total products: {len(products)}")
    
    def test_get_products_by_category_home_decor(self, api_client):
        """Test category filter for home-decor"""
        response = api_client.get(f"{BASE_URL}/api/products?category=home-decor")
        assert response.status_code == 200
        products = response.json()
        assert len(products) >= 6  # Jute curtains + planters
        for p in products:
            assert p["category"] == "home-decor"
        print(f"Home decor products: {len(products)}")
    
    def test_get_products_by_category_beauty(self, api_client):
        """Test category filter for beauty"""
        response = api_client.get(f"{BASE_URL}/api/products?category=beauty")
        assert response.status_code == 200
        products = response.json()
        assert len(products) >= 9  # Beauty products
        for p in products:
            assert p["category"] == "beauty"
        print(f"Beauty products: {len(products)}")
    
    def test_get_products_by_category_pantry(self, api_client):
        """Test category filter for pantry (herbs & spices)"""
        response = api_client.get(f"{BASE_URL}/api/products?category=pantry")
        assert response.status_code == 200
        products = response.json()
        assert len(products) >= 10  # Herbs & spices
        for p in products:
            assert p["category"] == "pantry"
        print(f"Pantry products: {len(products)}")
    
    def test_get_products_by_category_kitchen(self, api_client):
        """Test category filter for kitchen"""
        response = api_client.get(f"{BASE_URL}/api/products?category=kitchen")
        assert response.status_code == 200
        products = response.json()
        assert len(products) >= 6  # Pickles + punch
        for p in products:
            assert p["category"] == "kitchen"
        print(f"Kitchen products: {len(products)}")
    
    def test_search_products_pickle(self, api_client):
        """Test search for 'pickle' returns matching products"""
        response = api_client.get(f"{BASE_URL}/api/products?search=pickle")
        assert response.status_code == 200
        products = response.json()
        assert len(products) >= 6  # Should return 6 pickle products
        for p in products:
            assert "pickle" in p["name"].lower() or "pickle" in p["description"].lower()
        print(f"Pickle search results: {len(products)}")
    
    def test_search_products_coconut(self, api_client):
        """Test search for 'coconut' returns matching products"""
        response = api_client.get(f"{BASE_URL}/api/products?search=coconut")
        assert response.status_code == 200
        products = response.json()
        assert len(products) >= 1  # At least Virgin Coconut Oil
        print(f"Coconut search results: {len(products)}")
    
    def test_search_products_jute(self, api_client):
        """Test search for 'jute' returns matching products"""
        response = api_client.get(f"{BASE_URL}/api/products?search=jute")
        assert response.status_code == 200
        products = response.json()
        assert len(products) >= 5  # Jute curtains (some may not have 'jute' in name/description)
        print(f"Jute search results: {len(products)}")
    
    def test_search_products_turmeric(self, api_client):
        """Test search for 'turmeric' returns matching products"""
        response = api_client.get(f"{BASE_URL}/api/products?search=turmeric")
        assert response.status_code == 200
        products = response.json()
        assert len(products) >= 1  # Turmeric powder
        print(f"Turmeric search results: {len(products)}")
    
    def test_search_no_results(self, api_client):
        """Test search with no matching results"""
        response = api_client.get(f"{BASE_URL}/api/products?search=xyznonexistent")
        assert response.status_code == 200
        products = response.json()
        assert len(products) == 0
        print("No results search works correctly")
    
    def test_get_single_product(self, api_client):
        """Test GET /api/products/{product_id} returns product details"""
        response = api_client.get(f"{BASE_URL}/api/products/prod-011")  # Virgin Coconut Oil
        assert response.status_code == 200
        product = response.json()
        assert product["id"] == "prod-011"
        assert product["name"] == "Virgin Coconut Oil"
        assert "price" in product
        assert "description" in product
        assert "image_url" in product
        assert "category" in product
        print(f"Product detail: {product['name']} - ₹{product['price']}")
    
    def test_get_nonexistent_product(self, api_client):
        """Test GET /api/products/{invalid_id} returns 404"""
        response = api_client.get(f"{BASE_URL}/api/products/invalid-product-id")
        assert response.status_code == 404
        print("Non-existent product returns 404 correctly")


class TestNewsletterAPI:
    """Newsletter subscription tests"""
    
    def test_newsletter_subscribe_success(self, api_client):
        """Test POST /api/newsletter/subscribe with valid email"""
        test_email = f"test_{datetime.now().strftime('%H%M%S')}@example.com"
        response = api_client.post(f"{BASE_URL}/api/newsletter/subscribe", json={"email": test_email})
        assert response.status_code == 200
        data = response.json()
        assert data.get("subscribed") == True
        print(f"Newsletter subscription successful for: {test_email}")
    
    def test_newsletter_subscribe_duplicate(self, api_client):
        """Test duplicate subscription returns success (already subscribed)"""
        test_email = "duplicate_test@example.com"
        # First subscription
        api_client.post(f"{BASE_URL}/api/newsletter/subscribe", json={"email": test_email})
        # Second subscription (duplicate)
        response = api_client.post(f"{BASE_URL}/api/newsletter/subscribe", json={"email": test_email})
        assert response.status_code == 200
        data = response.json()
        assert data.get("subscribed") == True
        print("Duplicate subscription handled correctly")
    
    def test_newsletter_subscribe_invalid_email(self, api_client):
        """Test POST /api/newsletter/subscribe with invalid email"""
        response = api_client.post(f"{BASE_URL}/api/newsletter/subscribe", json={"email": "invalid-email"})
        assert response.status_code == 400
        print("Invalid email rejected correctly")
    
    def test_newsletter_subscribe_empty_email(self, api_client):
        """Test POST /api/newsletter/subscribe with empty email"""
        response = api_client.post(f"{BASE_URL}/api/newsletter/subscribe", json={"email": ""})
        assert response.status_code == 400
        print("Empty email rejected correctly")


class TestCartAPI:
    """Cart operations tests"""
    
    def test_get_empty_cart(self, api_client, test_session_id):
        """Test GET /api/cart/{session_id} returns empty cart"""
        response = api_client.get(f"{BASE_URL}/api/cart/{test_session_id}")
        assert response.status_code == 200
        cart = response.json()
        assert cart["items"] == []
        assert cart["total"] == 0
        print("Empty cart returned correctly")
    
    def test_add_item_to_cart(self, api_client, test_session_id):
        """Test POST /api/cart/add adds item to cart"""
        response = api_client.post(f"{BASE_URL}/api/cart/add", json={
            "session_id": test_session_id,
            "product_id": "prod-011",  # Virgin Coconut Oil
            "quantity": 2
        })
        assert response.status_code == 200
        data = response.json()
        assert "product" in data
        assert data["product"]["name"] == "Virgin Coconut Oil"
        print(f"Added to cart: {data['product']['name']}")
    
    def test_get_cart_with_items(self, api_client, test_session_id):
        """Test GET /api/cart/{session_id} returns cart with items"""
        response = api_client.get(f"{BASE_URL}/api/cart/{test_session_id}")
        assert response.status_code == 200
        cart = response.json()
        assert len(cart["items"]) >= 1
        assert cart["total"] > 0
        # Verify item details
        item = cart["items"][0]
        assert "product_id" in item
        assert "name" in item
        assert "price" in item
        assert "quantity" in item
        print(f"Cart total: ₹{cart['total']}")
    
    def test_update_cart_item_quantity(self, api_client, test_session_id):
        """Test POST /api/cart/update changes item quantity"""
        response = api_client.post(f"{BASE_URL}/api/cart/update", json={
            "session_id": test_session_id,
            "product_id": "prod-011",
            "quantity": 3
        })
        assert response.status_code == 200
        
        # Verify update
        cart_response = api_client.get(f"{BASE_URL}/api/cart/{test_session_id}")
        cart = cart_response.json()
        item = next((i for i in cart["items"] if i["product_id"] == "prod-011"), None)
        assert item is not None
        assert item["quantity"] == 3
        print("Cart item quantity updated correctly")
    
    def test_add_invalid_product_to_cart(self, api_client, test_session_id):
        """Test POST /api/cart/add with invalid product returns 404"""
        response = api_client.post(f"{BASE_URL}/api/cart/add", json={
            "session_id": test_session_id,
            "product_id": "invalid-product",
            "quantity": 1
        })
        assert response.status_code == 404
        print("Invalid product add rejected correctly")
    
    def test_remove_item_from_cart(self, api_client, test_session_id):
        """Test POST /api/cart/update with quantity 0 removes item"""
        response = api_client.post(f"{BASE_URL}/api/cart/update", json={
            "session_id": test_session_id,
            "product_id": "prod-011",
            "quantity": 0
        })
        assert response.status_code == 200
        print("Cart item removed correctly")
    
    def test_clear_cart(self, api_client, test_session_id):
        """Test DELETE /api/cart/{session_id} clears cart"""
        # First add an item
        api_client.post(f"{BASE_URL}/api/cart/add", json={
            "session_id": test_session_id,
            "product_id": "prod-001",
            "quantity": 1
        })
        
        # Clear cart
        response = api_client.delete(f"{BASE_URL}/api/cart/{test_session_id}")
        assert response.status_code == 200
        
        # Verify cart is empty
        cart_response = api_client.get(f"{BASE_URL}/api/cart/{test_session_id}")
        cart = cart_response.json()
        assert cart["items"] == []
        print("Cart cleared correctly")


class TestCheckoutAPI:
    """Checkout flow tests"""
    
    def test_checkout_empty_cart(self, api_client):
        """Test POST /api/checkout/create-session with empty cart returns 400"""
        response = api_client.post(f"{BASE_URL}/api/checkout/create-session", json={
            "session_id": "empty_cart_session",
            "origin_url": BASE_URL
        })
        assert response.status_code == 400
        print("Empty cart checkout rejected correctly")
    
    def test_checkout_create_session(self, api_client):
        """Test POST /api/checkout/create-session creates Stripe session"""
        checkout_session_id = f"checkout_test_{datetime.now().strftime('%H%M%S')}"
        
        # Add item to cart
        api_client.post(f"{BASE_URL}/api/cart/add", json={
            "session_id": checkout_session_id,
            "product_id": "prod-010",  # Beeswax Lip Balm
            "quantity": 1
        })
        
        # Create checkout session
        response = api_client.post(f"{BASE_URL}/api/checkout/create-session", json={
            "session_id": checkout_session_id,
            "origin_url": BASE_URL
        })
        assert response.status_code == 200
        data = response.json()
        assert "checkout_url" in data
        assert "session_id" in data
        assert data["checkout_url"].startswith("https://checkout.stripe.com")
        print(f"Checkout session created: {data['session_id'][:20]}...")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
