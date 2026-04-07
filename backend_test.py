import requests
import sys
import json
from datetime import datetime

class GothraAPITester:
    def __init__(self, base_url="https://earth-commerce-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session_id = f"test_session_{datetime.now().strftime('%H%M%S')}_{hash(datetime.now()) % 10000}"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "status": "PASSED" if success else "FAILED",
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                try:
                    error_data = response.json()
                    details += f", Response: {error_data}"
                except:
                    details += f", Response: {response.text[:200]}"
            
            self.log_test(name, success, details)
            return success, response.json() if success and response.content else {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API Endpoint", "GET", "", 200)

    def test_get_all_products(self):
        """Test getting all products"""
        success, response = self.run_test("Get All Products", "GET", "products", 200)
        if success:
            products = response
            if len(products) == 15:
                self.log_test("Product Count Verification", True, f"Found {len(products)} products")
            else:
                self.log_test("Product Count Verification", False, f"Expected 15 products, got {len(products)}")
            return products
        return []

    def test_get_products_by_category(self):
        """Test getting products by category"""
        categories = ["beauty", "home-decor", "pantry", "kitchen"]
        expected_counts = {"beauty": 3, "home-decor": 4, "pantry": 4, "kitchen": 4}
        
        for category in categories:
            success, response = self.run_test(
                f"Get Products - {category}", 
                "GET", 
                "products", 
                200, 
                params={"category": category}
            )
            if success:
                products = response
                expected = expected_counts[category]
                if len(products) == expected:
                    self.log_test(f"Category {category} Count", True, f"Found {len(products)} products")
                else:
                    self.log_test(f"Category {category} Count", False, f"Expected {expected}, got {len(products)}")

    def test_get_single_product(self):
        """Test getting a single product"""
        return self.run_test("Get Single Product", "GET", "products/prod-001", 200)

    def test_get_nonexistent_product(self):
        """Test getting a non-existent product"""
        return self.run_test("Get Non-existent Product", "GET", "products/invalid-id", 404)

    def test_cart_operations(self):
        """Test cart operations"""
        # Test empty cart
        success, response = self.run_test("Get Empty Cart", "GET", f"cart/{self.session_id}", 200)
        if success and response.get("items") == []:
            self.log_test("Empty Cart Verification", True, "Cart is empty as expected")
        else:
            self.log_test("Empty Cart Verification", False, f"Expected empty cart, got: {response}")

        # Add item to cart
        add_data = {
            "session_id": self.session_id,
            "product_id": "prod-001",
            "quantity": 2
        }
        success, response = self.run_test("Add Item to Cart", "POST", "cart/add", 200, data=add_data)
        
        if success:
            # Get cart after adding item
            success, cart_response = self.run_test("Get Cart After Add", "GET", f"cart/{self.session_id}", 200)
            if success:
                items = cart_response.get("items", [])
                if len(items) == 1 and items[0]["quantity"] == 2:
                    self.log_test("Cart Item Verification", True, "Item added correctly")
                else:
                    self.log_test("Cart Item Verification", False, f"Unexpected cart state: {items}")

        # Update cart item
        update_data = {
            "session_id": self.session_id,
            "product_id": "prod-001",
            "quantity": 3
        }
        self.run_test("Update Cart Item", "POST", "cart/update", 200, data=update_data)

        # Remove item by setting quantity to 0
        remove_data = {
            "session_id": self.session_id,
            "product_id": "prod-001",
            "quantity": 0
        }
        self.run_test("Remove Cart Item", "POST", "cart/update", 200, data=remove_data)

        # Clear cart
        self.run_test("Clear Cart", "DELETE", f"cart/{self.session_id}", 200)

    def test_checkout_flow(self):
        """Test checkout flow"""
        # Add item to cart first
        add_data = {
            "session_id": self.session_id,
            "product_id": "prod-005",  # Beeswax Lip Balm
            "quantity": 1
        }
        success, _ = self.run_test("Add Item for Checkout", "POST", "cart/add", 200, data=add_data)
        
        if success:
            # Create checkout session
            checkout_data = {
                "session_id": self.session_id,
                "origin_url": "https://earth-commerce-2.preview.emergentagent.com"
            }
            success, response = self.run_test("Create Checkout Session", "POST", "checkout/create-session", 200, data=checkout_data)
            
            if success and "checkout_url" in response:
                self.log_test("Checkout URL Generation", True, "Checkout URL created")
                session_id = response.get("session_id")
                if session_id:
                    # Test checkout status (will likely be pending)
                    self.run_test("Get Checkout Status", "GET", f"checkout/status/{session_id}", 200)
            else:
                self.log_test("Checkout URL Generation", False, "No checkout URL in response")

    def test_invalid_operations(self):
        """Test invalid operations"""
        # Add non-existent product to cart
        invalid_add = {
            "session_id": self.session_id,
            "product_id": "invalid-product",
            "quantity": 1
        }
        self.run_test("Add Invalid Product", "POST", "cart/add", 404, data=invalid_add)

        # Checkout with empty cart
        empty_checkout = {
            "session_id": f"empty_{self.session_id}",
            "origin_url": "https://earth-commerce-2.preview.emergentagent.com"
        }
        self.run_test("Checkout Empty Cart", "POST", "checkout/create-session", 400, data=empty_checkout)

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting GOTHRA API Tests...")
        print(f"📍 Testing against: {self.base_url}")
        print(f"🔑 Session ID: {self.session_id}")
        print("-" * 60)

        # Basic API tests
        self.test_root_endpoint()
        
        # Product tests
        products = self.test_get_all_products()
        self.test_get_products_by_category()
        self.test_get_single_product()
        self.test_get_nonexistent_product()
        
        # Cart tests
        self.test_cart_operations()
        
        # Checkout tests
        self.test_checkout_flow()
        
        # Invalid operation tests
        self.test_invalid_operations()

        print("-" * 60)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = GothraAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())