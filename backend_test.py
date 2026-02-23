#!/usr/bin/env python3
"""
Treuepunkte (Loyalty Points) API Backend Testing Suite

Tests all backend APIs in the specified flow:
1. Auth Flow (register, login, me)
2. Loyalty Card CRUD
3. Customer Registration
4. Points System
5. Statistics
"""

import requests
import json
import sys
from datetime import datetime

# Base URL from frontend .env
BASE_URL = "https://merchant-loyalty-1.preview.emergentagent.com/api"

class TreuepunkteAPITester:
    def __init__(self):
        self.session_token = None
        self.auth_headers = {}
        self.test_results = []
        
    def log_test(self, test_name, success, details="", response_data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        if response_data:
            print(f"   Response: {json.dumps(response_data, indent=2)}")
        print()
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "response": response_data
        })
    
    def make_request(self, method, endpoint, data=None, headers=None, auth_required=False):
        """Make HTTP request with proper error handling"""
        url = f"{BASE_URL}{endpoint}"
        
        # Add auth headers if required
        request_headers = headers or {}
        if auth_required and self.session_token:
            request_headers["Authorization"] = f"Bearer {self.session_token}"
        
        try:
            if method == "GET":
                response = requests.get(url, headers=request_headers, timeout=30)
            elif method == "POST":
                response = requests.post(url, json=data, headers=request_headers, timeout=30)
            elif method == "PUT":
                response = requests.put(url, json=data, headers=request_headers, timeout=30)
            elif method == "DELETE":
                response = requests.delete(url, headers=request_headers, timeout=30)
            
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request error: {e}")
            return None
    
    # ==================== AUTH FLOW TESTS ====================
    
    def test_auth_register(self):
        """Test user registration"""
        test_user = {
            "email": "testbusiness@example.com",
            "password": "SecurePass123!",
            "business_name": "Test Café München"
        }
        
        response = self.make_request("POST", "/auth/register", test_user)
        
        if not response:
            self.log_test("User Registration", False, "Request failed")
            return False
        
        if response.status_code == 200:
            data = response.json()
            if "user_id" in data and "email" in data:
                self.log_test("User Registration", True, f"User created with ID: {data['user_id']}", data)
                return True
            else:
                self.log_test("User Registration", False, "Missing required fields in response", data)
                return False
        else:
            error_msg = response.text if response else "No response"
            self.log_test("User Registration", False, f"HTTP {response.status_code}: {error_msg}")
            return False
    
    def test_auth_login(self):
        """Test user login and session token extraction"""
        login_data = {
            "email": "testbusiness@example.com",
            "password": "SecurePass123!"
        }
        
        response = self.make_request("POST", "/auth/login", login_data)
        
        if not response:
            self.log_test("User Login", False, "Request failed")
            return False
        
        if response.status_code == 200:
            data = response.json()
            
            # Try to extract session_token from cookies or headers
            cookies = response.cookies
            if 'session_token' in cookies:
                self.session_token = cookies['session_token']
                self.auth_headers = {"Authorization": f"Bearer {self.session_token}"}
                self.log_test("User Login", True, f"Login successful, session_token extracted from cookies", data)
                return True
            
            # If no cookie, check if token is in response
            if 'session_token' in data:
                self.session_token = data['session_token']
                self.auth_headers = {"Authorization": f"Bearer {self.session_token}"}
                self.log_test("User Login", True, f"Login successful, session_token in response", data)
                return True
            
            # Login successful but no token found - this might still be valid if cookies are httpOnly
            self.log_test("User Login", True, "Login successful, but session token extraction unclear (httpOnly cookies?)", data)
            return True
        else:
            error_msg = response.text if response else "No response"
            self.log_test("User Login", False, f"HTTP {response.status_code}: {error_msg}")
            return False
    
    def test_auth_me(self):
        """Test authenticated user info retrieval"""
        response = self.make_request("GET", "/auth/me", auth_required=True)
        
        if not response:
            self.log_test("Get Current User", False, "Request failed")
            return False
        
        if response.status_code == 200:
            data = response.json()
            if "user_id" in data and "email" in data:
                self.log_test("Get Current User", True, f"User info retrieved for: {data['email']}", data)
                return True
            else:
                self.log_test("Get Current User", False, "Missing user fields in response", data)
                return False
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Get Current User", False, f"HTTP {response.status_code}: {error_msg}")
            return False
    
    # ==================== LOYALTY CARD CRUD TESTS ====================
    
    def test_create_loyalty_card(self):
        """Test creating a loyalty card"""
        card_data = {
            "card_name": "Café Treuekarte",
            "business_name": "Test Café München",
            "primary_color": "#8B4513",
            "secondary_color": "#DEB887", 
            "text_color": "#FFFFFF",
            "max_points": 10,
            "reward_description": "Gratis Cappuccino"
        }
        
        response = self.make_request("POST", "/cards", card_data, auth_required=True)
        
        if not response:
            self.log_test("Create Loyalty Card", False, "Request failed")
            return False, None
        
        if response.status_code == 200:
            data = response.json()
            if "card_id" in data:
                self.card_id = data["card_id"]  # Store for later tests
                self.log_test("Create Loyalty Card", True, f"Card created with ID: {data['card_id']}", data)
                return True, data["card_id"]
            else:
                self.log_test("Create Loyalty Card", False, "Missing card_id in response", data)
                return False, None
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Create Loyalty Card", False, f"HTTP {response.status_code}: {error_msg}")
            return False, None
    
    def test_get_all_cards(self):
        """Test retrieving all loyalty cards"""
        response = self.make_request("GET", "/cards", auth_required=True)
        
        if not response:
            self.log_test("Get All Cards", False, "Request failed")
            return False
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_test("Get All Cards", True, f"Retrieved {len(data)} cards", {"card_count": len(data)})
                return True
            else:
                self.log_test("Get All Cards", False, "Response is not a list", data)
                return False
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Get All Cards", False, f"HTTP {response.status_code}: {error_msg}")
            return False
    
    def test_get_single_card(self, card_id):
        """Test retrieving a single loyalty card"""
        response = self.make_request("GET", f"/cards/{card_id}", auth_required=True)
        
        if not response:
            self.log_test("Get Single Card", False, "Request failed")
            return False
        
        if response.status_code == 200:
            data = response.json()
            if "card_id" in data and data["card_id"] == card_id:
                self.log_test("Get Single Card", True, f"Retrieved card: {data['card_name']}", data)
                return True
            else:
                self.log_test("Get Single Card", False, "Card ID mismatch or missing", data)
                return False
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Get Single Card", False, f"HTTP {response.status_code}: {error_msg}")
            return False
    
    def test_update_card(self, card_id):
        """Test updating a loyalty card"""
        update_data = {
            "card_name": "Updated Café Treuekarte",
            "reward_description": "Gratis Espresso + Gebäck"
        }
        
        response = self.make_request("PUT", f"/cards/{card_id}", update_data, auth_required=True)
        
        if not response:
            self.log_test("Update Card", False, "Request failed")
            return False
        
        if response.status_code == 200:
            data = response.json()
            if data.get("card_name") == update_data["card_name"]:
                self.log_test("Update Card", True, "Card updated successfully", data)
                return True
            else:
                self.log_test("Update Card", False, "Card update not reflected", data)
                return False
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Update Card", False, f"HTTP {response.status_code}: {error_msg}")
            return False
    
    # ==================== CUSTOMER REGISTRATION TESTS ====================
    
    def test_register_customer(self, card_id):
        """Test registering a customer for a loyalty card"""
        customer_data = {
            "card_id": card_id,
            "customer_name": "Max Müller",
            "customer_email": "max.mueller@example.com"
        }
        
        response = self.make_request("POST", "/customers/register", customer_data)
        
        if not response:
            self.log_test("Register Customer", False, "Request failed")
            return False, None
        
        if response.status_code == 200:
            data = response.json()
            if "customer_card_id" in data and "qr_code" in data:
                customer_card_id = data["customer_card_id"]
                self.log_test("Register Customer", True, f"Customer registered with ID: {customer_card_id}", data)
                return True, customer_card_id
            else:
                self.log_test("Register Customer", False, "Missing required fields in response", data)
                return False, None
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Register Customer", False, f"HTTP {response.status_code}: {error_msg}")
            return False, None
    
    def test_get_customer_card_public(self, customer_card_id):
        """Test getting customer card details (public endpoint)"""
        response = self.make_request("GET", f"/customers/{customer_card_id}/card")
        
        if not response:
            self.log_test("Get Customer Card (Public)", False, "Request failed")
            return False
        
        if response.status_code == 200:
            data = response.json()
            if "customer_card_id" in data and "current_points" in data:
                self.log_test("Get Customer Card (Public)", True, f"Customer card retrieved: {data['customer_name']}", data)
                return True
            else:
                self.log_test("Get Customer Card (Public)", False, "Missing required fields", data)
                return False
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Get Customer Card (Public)", False, f"HTTP {response.status_code}: {error_msg}")
            return False
    
    # ==================== POINTS SYSTEM TESTS ====================
    
    def test_add_points(self, customer_card_id):
        """Test adding points to a customer card"""
        points_data = {
            "customer_card_id": customer_card_id,
            "points": 3
        }
        
        response = self.make_request("POST", "/points/add", points_data, auth_required=True)
        
        if not response:
            self.log_test("Add Points", False, "Request failed")
            return False
        
        if response.status_code == 200:
            data = response.json()
            if "success" in data and data["success"] and "new_points" in data:
                self.log_test("Add Points", True, f"Added {points_data['points']} points, new total: {data['new_points']}", data)
                return True
            else:
                self.log_test("Add Points", False, "Unexpected response format", data)
                return False
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Add Points", False, f"HTTP {response.status_code}: {error_msg}")
            return False
    
    def test_scan_qr_code(self, customer_card_id):
        """Test scanning QR code for customer identification"""
        qr_data = f"loyalty:{customer_card_id}"
        
        response = self.make_request("GET", f"/scan/{qr_data}", auth_required=True)
        
        if not response:
            self.log_test("Scan QR Code", False, "Request failed")
            return False
        
        if response.status_code == 200:
            data = response.json()
            if "type" in data and data["type"] == "customer_card":
                self.log_test("Scan QR Code", True, f"QR scan successful: {data['customer_name']}", data)
                return True
            else:
                self.log_test("Scan QR Code", False, "Unexpected QR scan response", data)
                return False
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Scan QR Code", False, f"HTTP {response.status_code}: {error_msg}")
            return False
    
    def test_fill_and_redeem_card(self, customer_card_id):
        """Test filling a card to max points and redeeming it"""
        # First, add enough points to fill the card (assuming max 10 points, already has some)
        for i in range(8):  # Add 8 more points (already has 3 from previous test)
            points_data = {
                "customer_card_id": customer_card_id,
                "points": 1
            }
            response = self.make_request("POST", "/points/add", points_data, auth_required=True)
            
            if not response or response.status_code != 200:
                self.log_test("Fill Card (Preparation)", False, f"Failed to add point {i+1}")
                return False
        
        # Now try to redeem the full card
        redeem_data = {
            "customer_card_id": customer_card_id
        }
        
        response = self.make_request("POST", "/rewards/redeem", redeem_data, auth_required=True)
        
        if not response:
            self.log_test("Redeem Reward", False, "Request failed")
            return False
        
        if response.status_code == 200:
            data = response.json()
            if "success" in data and data["success"]:
                self.log_test("Redeem Reward", True, f"Reward redeemed: {data.get('message', 'Success')}", data)
                return True
            else:
                self.log_test("Redeem Reward", False, "Redemption failed", data)
                return False
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Redeem Reward", False, f"HTTP {response.status_code}: {error_msg}")
            return False
    
    # ==================== STATISTICS TESTS ====================
    
    def test_get_statistics(self):
        """Test getting business statistics"""
        response = self.make_request("GET", "/stats", auth_required=True)
        
        if not response:
            self.log_test("Get Statistics", False, "Request failed")
            return False
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ["total_cards", "total_customers", "total_points_given", "total_redemptions"]
            if all(field in data for field in required_fields):
                self.log_test("Get Statistics", True, f"Stats retrieved: {data['total_cards']} cards, {data['total_customers']} customers", data)
                return True
            else:
                self.log_test("Get Statistics", False, "Missing required statistics fields", data)
                return False
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Get Statistics", False, f"HTTP {response.status_code}: {error_msg}")
            return False
    
    def test_delete_card(self, card_id):
        """Test deleting a loyalty card (last test)"""
        response = self.make_request("DELETE", f"/cards/{card_id}", auth_required=True)
        
        if not response:
            self.log_test("Delete Card", False, "Request failed")
            return False
        
        if response.status_code == 200:
            data = response.json()
            if "message" in data:
                self.log_test("Delete Card", True, f"Card deleted: {data['message']}", data)
                return True
            else:
                self.log_test("Delete Card", False, "Unexpected delete response", data)
                return False
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Delete Card", False, f"HTTP {response.status_code}: {error_msg}")
            return False
    
    def run_all_tests(self):
        """Run all tests in the specified order"""
        print(f"🧪 Starting Treuepunkte API Tests")
        print(f"📍 Base URL: {BASE_URL}")
        print(f"⏰ Test started at: {datetime.now().isoformat()}")
        print("=" * 60)
        print()
        
        # 1. Auth Flow Tests
        print("🔐 AUTHENTICATION FLOW TESTS")
        print("-" * 40)
        
        if not self.test_auth_register():
            print("❌ Registration failed - cannot continue with auth tests")
            return self.generate_summary()
        
        if not self.test_auth_login():
            print("❌ Login failed - cannot continue with auth-required tests")
            return self.generate_summary()
        
        if not self.test_auth_me():
            print("⚠️ Auth verification failed - continuing with other tests")
        
        print()
        
        # 2. Loyalty Card CRUD Tests
        print("💳 LOYALTY CARD CRUD TESTS")
        print("-" * 40)
        
        success, card_id = self.test_create_loyalty_card()
        if not success:
            print("❌ Card creation failed - cannot continue with card-dependent tests")
            return self.generate_summary()
        
        self.test_get_all_cards()
        self.test_get_single_card(card_id)
        self.test_update_card(card_id)
        
        print()
        
        # 3. Customer Registration Tests
        print("👥 CUSTOMER REGISTRATION TESTS")
        print("-" * 40)
        
        success, customer_card_id = self.test_register_customer(card_id)
        if not success:
            print("❌ Customer registration failed - cannot continue with points tests")
            return self.generate_summary()
        
        self.test_get_customer_card_public(customer_card_id)
        
        print()
        
        # 4. Points System Tests
        print("⭐ POINTS SYSTEM TESTS")
        print("-" * 40)
        
        self.test_add_points(customer_card_id)
        self.test_scan_qr_code(customer_card_id)
        self.test_fill_and_redeem_card(customer_card_id)
        
        print()
        
        # 5. Statistics Tests
        print("📊 STATISTICS TESTS")
        print("-" * 40)
        
        self.test_get_statistics()
        
        print()
        
        # 6. Cleanup - Delete the test card
        print("🧹 CLEANUP")
        print("-" * 40)
        
        self.test_delete_card(card_id)
        
        return self.generate_summary()
    
    def generate_summary(self):
        """Generate test summary"""
        print("\n" + "=" * 60)
        print("📋 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        print()
        
        if failed_tests > 0:
            print("❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   • {result['test']}: {result['details']}")
        
        print()
        return {
            "total": total_tests,
            "passed": passed_tests,
            "failed": failed_tests,
            "success_rate": passed_tests/total_tests*100 if total_tests > 0 else 0,
            "results": self.test_results
        }

def main():
    """Main test runner"""
    tester = TreuepunkteAPITester()
    summary = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if summary["failed"] == 0 else 1)

if __name__ == "__main__":
    main()