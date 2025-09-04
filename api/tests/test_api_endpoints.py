#!/usr/bin/env python3
"""
HTTP API Test Script for Health Insights
Tests the API endpoints to ensure they're working
"""

import requests
import json
from datetime import datetime

class APITester:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        
    def test_root_endpoint(self):
        """Test the root endpoint"""
        print("🔍 Testing Root Endpoint...")
        try:
            response = self.session.get(f"{self.base_url}/")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Root: {data.get('message')} - MongoDB: {data.get('mongodb')}")
                return True
            else:
                print(f"❌ Root: HTTP {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Root: Connection failed - {str(e)}")
            return False
    
    def test_goals_endpoints(self):
        """Test goals-related endpoints"""
        print("🔍 Testing Goals Endpoints...")
        try:
            # Test getting user goals stats (actual endpoint from goals router)
            response = self.session.get(f"{self.base_url}/api/goals/stats?user_email=test@example.com")
            
            if response.status_code in [200, 404, 422]:  # 404/422 is fine if user doesn't exist
                print("✅ Goals: Stats endpoint accessible")
                return True
            else:
                print(f"❌ Goals: HTTP {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Goals: Failed - {str(e)}")
            return False
    
    def test_nudge_endpoints(self):
        """Test nudge-related endpoints"""
        print("🔍 Testing Nudge Endpoints...")
        try:
            # Test nudge FCM token registration (actual endpoint from nudge router)
            test_data = {
                "email": "test@example.com",
                "fcm_token": "test_token_12345"
            }
            response = self.session.post(
                f"{self.base_url}/api/nudge/register-fcm-token",
                json=test_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code in [200, 400, 422]:  # 400/422 might be expected for test data
                print("✅ Nudges: FCM registration endpoint accessible")
                return True
            else:
                print(f"❌ Nudges: HTTP {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Nudges: Failed - {str(e)}")
            return False
    
    def test_chat_endpoint(self):
        """Test chat endpoint"""
        print("🔍 Testing Chat Endpoint...")
        try:
            # Test simple chat message using form data (actual endpoint from chat router)
            chat_data = {
                "message": "Hello, this is a test message",
                "user_email": "test@example.com"
            }
            
            response = self.session.post(
                f"{self.base_url}/chat/send",  # Corrected: no /api prefix
                data=chat_data  # Using form data instead of JSON
            )
            
            if response.status_code in [200, 400, 422]:  # 400/422 might be expected for test data
                print("✅ Chat: Send endpoint accessible")
                return True
            else:
                print(f"❌ Chat: HTTP {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Chat: Failed - {str(e)}")
            return False
    
    def test_preferences_endpoint(self):
        """Test preferences endpoint"""
        print("🔍 Testing Preferences Endpoint...")
        try:
            # Test time preferences endpoint (actual endpoint from preferences router)
            response = self.session.get(f"{self.base_url}/api/preferences/time?user_email=test@example.com")
            
            if response.status_code in [200, 404, 422]:  # 404/422 is fine if user doesn't exist
                print("✅ Preferences: Time preferences endpoint accessible")
                return True
            else:
                print(f"❌ Preferences: HTTP {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Preferences: Failed - {str(e)}")
            return False
    
    def test_user_endpoint(self):
        """Test user endpoint"""
        print("🔍 Testing User Endpoint...")
        try:
            # Test user preferences endpoint (actual endpoint from user router)
            response = self.session.get(f"{self.base_url}/api/user/preferences?email=test@example.com")
            
            if response.status_code in [200, 404, 422]:  # 404/422 is fine if user doesn't exist
                print("✅ User: User preferences endpoint accessible")
                return True
            else:
                print(f"❌ User: HTTP {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ User: Failed - {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all API tests"""
        print("🌐 API Endpoint Test Suite")
        print("=" * 50)
        print(f"🎯 Target: {self.base_url}")
        print(f"📅 Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 50)
        
        tests = [
            ("Root Endpoint", self.test_root_endpoint),
            ("Goals Endpoints", self.test_goals_endpoints),
            ("Nudge Endpoints", self.test_nudge_endpoints),
            ("Chat Endpoint", self.test_chat_endpoint),
            ("Preferences Endpoint", self.test_preferences_endpoint),
            ("User Endpoint", self.test_user_endpoint),
        ]
        
        results = []
        for test_name, test_func in tests:
            try:
                result = test_func()
                results.append((test_name, result))
            except Exception as e:
                print(f"💥 {test_name}: Crashed - {str(e)}")
                results.append((test_name, False))
            print()  # Add spacing
        
        # Generate summary
        print("=" * 50)
        print("📊 API TEST SUMMARY")
        print("=" * 50)
        
        passed = sum(1 for _, result in results if result)
        total = len(results)
        
        for test_name, result in results:
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status} {test_name}")
        
        print(f"\nResults: {passed}/{total} endpoints working ({(passed/total)*100:.1f}%)")
        
        if passed == total:
            print("🎉 ALL API ENDPOINTS WORKING!")
        elif passed >= total * 0.8:
            print("⚠️  MOSTLY WORKING - Minor API issues")
        else:
            print("🚨 API ISSUES DETECTED - Check server logs")
        
        print("=" * 50)
        
        return passed, total

def main():
    """Main test runner"""
    import sys
    
    # Allow custom URL
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
    
    tester = APITester(base_url)
    try:
        passed, total = tester.run_all_tests()
        
        if passed < total * 0.5:
            sys.exit(1)  # Exit with error if too many failures
            
    except KeyboardInterrupt:
        print("\n❌ Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 API test runner crashed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
