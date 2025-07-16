#!/usr/bin/env python3
"""Test script for mesh gateway implementation validation.

This script validates the mesh gateway implementation by testing:
1. MeshInternetBridge HTTP server functionality
2. MeshAuthorityClient communication with gateway
3. API endpoint integration
4. Error handling and fallback mechanisms

Run with:
    python scripts/test_mesh_gateway.py
"""

import asyncio
import json
import sys
import time
from pathlib import Path
from typing import Dict, Any, List

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Import test modules (with mocking for mininet-wifi dependencies)
try:
    # Mock mininet-wifi imports for testing without actual installation
    import unittest.mock as mock
    
    # Create mock modules
    mock_mn_wifi = mock.MagicMock()
    mock_mininet = mock.MagicMock()
    
    sys.modules['mn_wifi'] = mock_mn_wifi
    sys.modules['mn_wifi.net'] = mock_mn_wifi
    sys.modules['mn_wifi.authority'] = mock_mn_wifi
    sys.modules['mn_wifi.client'] = mock_mn_wifi
    sys.modules['mn_wifi.link'] = mock_mn_wifi
    sys.modules['mn_wifi.wmediumdConnector'] = mock_mn_wifi
    sys.modules['mn_wifi.cli_fastpay'] = mock_mn_wifi
    sys.modules['mn_wifi.transport'] = mock_mn_wifi
    sys.modules['mn_wifi.baseTypes'] = mock_mn_wifi
    sys.modules['mn_wifi.examples.demoCommon'] = mock_mn_wifi
    sys.modules['mininet'] = mock_mininet
    sys.modules['mininet.log'] = mock_mininet
    sys.modules['mininet.node'] = mock_mininet
    
    # Mock the classes we need
    class MockWiFiAuthority:
        def __init__(self, name: str, port: int, **kwargs):
            self.name = name
            self.port = port
            self.committee_members = kwargs.get('committee_members', set())
            self.params = kwargs.get('params', {'position': [0, 0, 0]})
            
        def IP(self) -> str:
            return f"10.0.0.{10 + int(self.name[-1])}"
    
    mock_mn_wifi.WiFiAuthority = MockWiFiAuthority
    
    # Now import our modules
    from smart_pay.examples.fastpay_mesh_internet_demo import MeshInternetBridge
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Please ensure all dependencies are installed.")
    sys.exit(1)


class MeshGatewayTester:
    """Test suite for mesh gateway functionality."""
    
    def __init__(self):
        """Initialize the tester."""
        self.test_results: List[Dict[str, Any]] = []
        
    def log_test(self, test_name: str, success: bool, message: str = "", details: Dict[str, Any] = None):
        """Log test result.
        
        Args:
            test_name: Name of the test
            success: Whether the test passed
            message: Test result message
            details: Additional test details
        """
        result = {
            'test_name': test_name,
            'success': success,
            'message': message,
            'details': details or {},
            'timestamp': time.time()
        }
        self.test_results.append(result)
        
        status = "✅" if success else "❌"
        print(f"{status} {test_name}: {message}")
        
    async def test_mesh_bridge_initialization(self) -> None:
        """Test MeshInternetBridge initialization."""
        try:
            bridge = MeshInternetBridge(port=8080)
            
            # Verify initial state
            assert bridge.port == 8080
            assert bridge.authorities == {}
            assert not bridge.running
            assert bridge.server is None
            
            self.log_test(
                "Bridge Initialization",
                True,
                "Bridge initialized correctly with default parameters"
            )
            
        except Exception as e:
            self.log_test(
                "Bridge Initialization",
                False,
                f"Bridge initialization failed: {e}"
            )
            
    async def test_authority_registration(self) -> None:
        """Test authority registration with bridge."""
        try:
            bridge = MeshInternetBridge(port=8081)
            
            # Create mock authority
            authority = MockWiFiAuthority(
                name='auth1',
                port=8001,
                committee_members={'auth2', 'auth3'},
                params={'position': [45.0, 40.0, 0.0]}
            )
            
            # Register authority
            bridge.register_authority(authority)
            
            # Verify registration
            assert 'auth1' in bridge.authorities
            auth_data = bridge.authorities['auth1']
            assert auth_data['name'] == 'auth1'
            assert auth_data['ip'] == '10.0.0.11'
            assert auth_data['port'] == 8001
            assert auth_data['status'] == 'online'
            assert auth_data['position']['x'] == 45.0
            
            self.log_test(
                "Authority Registration",
                True,
                "Authority registered successfully with correct data",
                {"authority_count": len(bridge.authorities)}
            )
            
        except Exception as e:
            self.log_test(
                "Authority Registration",
                False,
                f"Authority registration failed: {e}"
            )
            
    async def test_bridge_server_lifecycle(self) -> None:
        """Test bridge server start/stop lifecycle."""
        try:
            bridge = MeshInternetBridge(port=8082)
            
            # Test start
            bridge.start_bridge_server()
            await asyncio.sleep(0.1)  # Allow server to start
            
            assert bridge.running
            assert bridge.server is not None
            assert bridge.server_thread is not None
            
            # Test stop
            bridge.stop_bridge_server()
            
            assert not bridge.running
            assert bridge.server is None
            
            self.log_test(
                "Bridge Server Lifecycle",
                True,
                "Bridge server started and stopped successfully"
            )
            
        except Exception as e:
            self.log_test(
                "Bridge Server Lifecycle",
                False,
                f"Bridge server lifecycle failed: {e}"
            )
            
    async def test_http_endpoints(self) -> None:
        """Test bridge HTTP endpoints."""
        try:
            import httpx
            
            bridge = MeshInternetBridge(port=8083)
            
            # Add some authorities
            for i in range(1, 4):
                authority = MockWiFiAuthority(
                    name=f'auth{i}',
                    port=8000 + i,
                    params={'position': [45.0 + i * 25, 40.0, 0.0]}
                )
                bridge.register_authority(authority)
            
            # Start bridge server
            bridge.start_bridge_server()
            await asyncio.sleep(0.2)  # Allow server to start
            
            try:
                async with httpx.AsyncClient(timeout=httpx.Timeout(5.0)) as client:
                    base_url = f"http://localhost:{bridge.port}"
                    
                    # Test authorities endpoint
                    response = await client.get(f"{base_url}/authorities")
                    assert response.status_code == 200
                    
                    data = response.json()
                    assert 'authorities' in data
                    assert len(data['authorities']) == 3
                    assert data['count'] == 3
                    
                    # Test health endpoint
                    response = await client.get(f"{base_url}/health")
                    assert response.status_code == 200
                    
                    health_data = response.json()
                    assert health_data['status'] == 'healthy'
                    assert health_data['bridge_port'] == 8083
                    
                    self.log_test(
                        "HTTP Endpoints",
                        True,
                        f"All HTTP endpoints working correctly",
                        {
                            "authorities_endpoint": "✅",
                            "health_endpoint": "✅",
                            "authority_count": len(data['authorities'])
                        }
                    )
                    
            finally:
                bridge.stop_bridge_server()
                
        except Exception as e:
            self.log_test(
                "HTTP Endpoints",
                False,
                f"HTTP endpoint test failed: {e}"
            )
            
    async def test_mesh_authority_client_integration(self) -> None:
        """Test mesh authority client integration with bridge."""
        try:
            # This test requires the backend dependencies
            from mininet_web.backend.app.services.mesh_authority_client import MeshAuthorityClient
            
            bridge = MeshInternetBridge(port=8084)
            
            # Add authorities
            for i in range(1, 3):
                authority = MockWiFiAuthority(
                    name=f'auth{i}',
                    port=8000 + i,
                    params={'position': [45.0 + i * 25, 40.0, 0.0]}
                )
                bridge.register_authority(authority)
            
            # Start bridge
            bridge.start_bridge_server()
            await asyncio.sleep(0.2)
            
            try:
                # Create and start mesh client
                mesh_client = MeshAuthorityClient(bridge_url=f"http://localhost:{bridge.port}")
                await mesh_client.start()
                
                try:
                    # Test authority discovery
                    authorities = await mesh_client.discover_mesh_authorities()
                    
                    assert len(authorities) == 2
                    auth_names = {auth.name for auth in authorities}
                    assert auth_names == {'auth1', 'auth2'}
                    
                    # Test gateway status
                    gateway_status = await mesh_client.get_mesh_gateway_status()
                    assert gateway_status['status'] == 'healthy'
                    
                    self.log_test(
                        "Mesh Client Integration",
                        True,
                        "Mesh authority client successfully integrated with bridge",
                        {
                            "discovered_authorities": len(authorities),
                            "gateway_status": gateway_status['status']
                        }
                    )
                    
                finally:
                    await mesh_client.stop()
                    
            finally:
                bridge.stop_bridge_server()
                
        except ImportError:
            self.log_test(
                "Mesh Client Integration",
                False,
                "Skipped: Backend dependencies not available in test environment"
            )
        except Exception as e:
            self.log_test(
                "Mesh Client Integration",
                False,
                f"Mesh client integration test failed: {e}"
            )
            
    async def test_error_handling(self) -> None:
        """Test error handling and fallback mechanisms."""
        try:
            # Test bridge with invalid port (should handle gracefully)
            bridge = MeshInternetBridge(port=-1)
            
            # This should not crash but handle the error
            bridge.start_bridge_server()
            
            # Bridge should not be running due to invalid port
            assert not bridge.running
            
            self.log_test(
                "Error Handling",
                True,
                "Bridge handles invalid configuration gracefully"
            )
            
        except Exception as e:
            self.log_test(
                "Error Handling",
                False,
                f"Error handling test failed: {e}"
            )
            
    def print_summary(self) -> None:
        """Print test summary."""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        
        print("\n" + "=" * 60)
        print("🧪 MESH GATEWAY TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ Failed Tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test_name']}: {result['message']}")
        
        print("=" * 60)
        
        # Save detailed results to file
        results_file = project_root / "test_results.json"
        with open(results_file, 'w') as f:
            json.dump(self.test_results, f, indent=2)
        print(f"📄 Detailed results saved to: {results_file}")
        
    async def run_all_tests(self) -> bool:
        """Run all tests.
        
        Returns:
            True if all tests passed, False otherwise
        """
        print("🚀 Starting Mesh Gateway Implementation Tests\n")
        
        # Run all test methods
        await self.test_mesh_bridge_initialization()
        await self.test_authority_registration()
        await self.test_bridge_server_lifecycle()
        await self.test_http_endpoints()
        await self.test_mesh_authority_client_integration()
        await self.test_error_handling()
        
        # Print summary
        self.print_summary()
        
        # Return overall success
        return all(result['success'] for result in self.test_results if 'Skipped' not in result['message'])


async def main():
    """Main test execution function."""
    try:
        tester = MeshGatewayTester()
        success = await tester.run_all_tests()
        
        if success:
            print("\n🎉 All tests passed! Phase 1 implementation is ready.")
            return 0
        else:
            print("\n💥 Some tests failed. Please check the implementation.")
            return 1
            
    except Exception as e:
        print(f"\n💥 Test execution failed: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    # Run the tests
    exit_code = asyncio.run(main())
    sys.exit(exit_code) 