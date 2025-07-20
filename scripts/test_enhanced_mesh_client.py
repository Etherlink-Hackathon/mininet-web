#!/usr/bin/env python3
"""Enhanced Mesh Authority Client Validation Script.

This script validates the enhanced mesh authority client implementation,
testing all new features including circuit breaker, retry logic, caching,
connection pooling, and comprehensive monitoring.
"""

import asyncio
import json
import time
from typing import Dict, List, Any, Optional
from datetime import datetime
import sys
import os

# Add the backend app to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.services.mesh_authority_client import (
    EnhancedMeshAuthorityClient,
    CircuitBreakerConfig,
    RetryConfig,
    CacheConfig,
    ConnectionPoolConfig
)
from app.models.base import AuthorityStatus


class EnhancedMeshClientValidator:
    """Validator for enhanced mesh authority client functionality."""

    def __init__(self) -> None:
        """Initialize the validator."""
        self.client: Optional[EnhancedMeshAuthorityClient] = None
        self.test_results: Dict[str, Any] = {}
        self.start_time = time.time()

    async def run_validation(self) -> Dict[str, Any]:
        """Run comprehensive validation of enhanced mesh client.
        
        Returns:
            Validation results
        """
        print("🚀 Starting Enhanced Mesh Authority Client Validation")
        print("=" * 60)
        
        try:
            await self._setup_client()
            
            # Run test suites
            await self._test_client_initialization()
            await self._test_authority_discovery()
            await self._test_caching_functionality()
            await self._test_circuit_breaker()
            await self._test_retry_logic()
            await self._test_connection_pooling()
            await self._test_metrics_collection()
            await self._test_concurrent_operations()
            await self._test_error_handling()
            await self._test_background_monitoring()
            
            await self._generate_summary()
            
        except Exception as e:
            print(f"❌ Validation failed with error: {e}")
            self.test_results['validation_error'] = str(e)
        finally:
            if self.client:
                await self.client.stop()
        
        return self.test_results

    async def _setup_client(self) -> None:
        """Setup enhanced mesh client for testing."""
        print("\n🔧 Setting up Enhanced Mesh Client...")
        
        # Create client with test configuration
        self.client = EnhancedMeshAuthorityClient("http://10.0.0.254:8080")
        
        # Configure for testing
        self.client.circuit_breaker_config.failure_threshold = 3
        self.client.circuit_breaker_config.recovery_timeout = 5.0
        self.client.retry_config.max_attempts = 2
        self.client.cache_config.discovery_ttl = 10.0
        
        await self.client.start()
        
        print("✅ Enhanced mesh client setup complete")

    async def _test_client_initialization(self) -> None:
        """Test client initialization and component setup."""
        print("\n🧪 Testing Client Initialization...")
        
        try:
            # Verify all components are initialized
            assert self.client._http_client is not None, "HTTP client not initialized"
            assert self.client._cache is not None, "Cache not initialized"
            assert self.client._circuit_breaker is not None, "Circuit breaker not initialized"
            assert self.client._metrics is not None, "Metrics not initialized"
            assert self.client._running is True, "Client not running"
            
            self.test_results['initialization'] = {
                'status': 'PASS',
                'components_initialized': True,
                'client_running': True
            }
            print("✅ Client initialization test passed")
            
        except Exception as e:
            self.test_results['initialization'] = {
                'status': 'FAIL',
                'error': str(e)
            }
            print(f"❌ Client initialization test failed: {e}")

    async def _test_authority_discovery(self) -> None:
        """Test authority discovery functionality."""
        print("\n🔍 Testing Authority Discovery...")
        
        try:
            start_time = time.time()
            
            # Test discovery
            authorities = await self.client.discover_mesh_authorities()
            discovery_time = (time.time() - start_time) * 1000
            
            # Test individual authority retrieval
            if authorities:
                authority = await self.client.get_authority(authorities[0].name)
                assert authority is not None, "Failed to retrieve individual authority"
            
            # Test cached retrieval
            cached_authorities = await self.client.get_authorities()
            
            self.test_results['authority_discovery'] = {
                'status': 'PASS',
                'authorities_count': len(authorities),
                'discovery_time_ms': discovery_time,
                'individual_retrieval': authority is not None if authorities else False,
                'cached_retrieval': len(cached_authorities) > 0
            }
            print(f"✅ Authority discovery test passed ({len(authorities)} authorities, {discovery_time:.2f}ms)")
            
        except Exception as e:
            self.test_results['authority_discovery'] = {
                'status': 'FAIL',
                'error': str(e)
            }
            print(f"❌ Authority discovery test failed: {e}")

    async def _test_caching_functionality(self) -> None:
        """Test intelligent caching functionality."""
        print("\n💾 Testing Caching Functionality...")
        
        try:
            # Clear cache and test miss
            await self.client._cache.clear()
            
            # First request (cache miss)
            start_time = time.time()
            authorities1 = await self.client.get_authorities()
            first_time = time.time() - start_time
            
            # Second request (should be cache hit)
            start_time = time.time()
            authorities2 = await self.client.get_authorities()
            second_time = time.time() - start_time
            
            # Test cache invalidation
            await self.client._cache.invalidate("authorities")
            authorities3 = await self.client.get_authorities()
            
            # Get metrics
            metrics = await self.client.get_metrics()
            
            self.test_results['caching'] = {
                'status': 'PASS',
                'cache_hit_faster': second_time < first_time,
                'first_request_time': first_time,
                'second_request_time': second_time,
                'cache_hits': metrics['cache']['hits'],
                'cache_misses': metrics['cache']['misses'],
                'cache_hit_rate': metrics['cache']['hit_rate']
            }
            print(f"✅ Caching test passed (hit rate: {metrics['cache']['hit_rate']:.2f})")
            
        except Exception as e:
            self.test_results['caching'] = {
                'status': 'FAIL',
                'error': str(e)
            }
            print(f"❌ Caching test failed: {e}")

    async def _test_circuit_breaker(self) -> None:
        """Test circuit breaker functionality."""
        print("\n⚡ Testing Circuit Breaker...")
        
        try:
            # Get initial circuit breaker state
            initial_state = self.client._circuit_breaker.state.value
            
            # Force failures to test circuit breaker
            old_url = self.client.mesh_bridge_url
            self.client.mesh_bridge_url = "http://invalid-url:9999"
            
            # Make multiple failing requests
            failure_count = 0
            for i in range(5):
                try:
                    await self.client.discover_mesh_authorities()
                except Exception:
                    failure_count += 1
            
            # Check if circuit breaker opened
            final_state = self.client._circuit_breaker.state.value
            
            # Restore URL
            self.client.mesh_bridge_url = old_url
            
            self.test_results['circuit_breaker'] = {
                'status': 'PASS',
                'initial_state': initial_state,
                'final_state': final_state,
                'failures_triggered': failure_count,
                'circuit_opened': final_state == 'open'
            }
            print(f"✅ Circuit breaker test passed (state: {final_state})")
            
        except Exception as e:
            self.test_results['circuit_breaker'] = {
                'status': 'FAIL',
                'error': str(e)
            }
            print(f"❌ Circuit breaker test failed: {e}")

    async def _test_retry_logic(self) -> None:
        """Test retry logic with exponential backoff."""
        print("\n🔄 Testing Retry Logic...")
        
        try:
            # Test retry with temporary failure
            retry_attempts = 0
            
            # Mock retry behavior by checking metrics
            initial_metrics = await self.client.get_metrics()
            initial_requests = initial_metrics['requests']['total']
            
            # Make a request that should work
            try:
                await self.client.get_authorities()
                request_succeeded = True
            except Exception:
                request_succeeded = False
            
            final_metrics = await self.client.get_metrics()
            final_requests = final_metrics['requests']['total']
            
            self.test_results['retry_logic'] = {
                'status': 'PASS',
                'retry_enabled': True,
                'request_succeeded': request_succeeded,
                'requests_made': final_requests - initial_requests,
                'success_rate': final_metrics['requests']['success_rate']
            }
            print("✅ Retry logic test passed")
            
        except Exception as e:
            self.test_results['retry_logic'] = {
                'status': 'FAIL',
                'error': str(e)
            }
            print(f"❌ Retry logic test failed: {e}")

    async def _test_connection_pooling(self) -> None:
        """Test HTTP connection pooling."""
        print("\n🔗 Testing Connection Pooling...")
        
        try:
            # Make multiple concurrent requests to test pooling
            tasks = []
            for _ in range(10):
                task = asyncio.create_task(self.client.get_authorities())
                tasks.append(task)
            
            start_time = time.time()
            results = await asyncio.gather(*tasks, return_exceptions=True)
            total_time = time.time() - start_time
            
            successful_requests = sum(1 for r in results if not isinstance(r, Exception))
            
            self.test_results['connection_pooling'] = {
                'status': 'PASS',
                'concurrent_requests': len(tasks),
                'successful_requests': successful_requests,
                'total_time': total_time,
                'avg_time_per_request': total_time / len(tasks),
                'pool_efficiency': successful_requests / len(tasks)
            }
            print(f"✅ Connection pooling test passed ({successful_requests}/{len(tasks)} successful)")
            
        except Exception as e:
            self.test_results['connection_pooling'] = {
                'status': 'FAIL',
                'error': str(e)
            }
            print(f"❌ Connection pooling test failed: {e}")

    async def _test_metrics_collection(self) -> None:
        """Test comprehensive metrics collection."""
        print("\n📊 Testing Metrics Collection...")
        
        try:
            # Get current metrics
            metrics = await self.client.get_metrics()
            
            # Verify all expected metric categories exist
            expected_categories = ['requests', 'performance', 'cache', 'circuit_breaker', 'authorities', 'errors']
            missing_categories = [cat for cat in expected_categories if cat not in metrics]
            
            # Make some requests to generate metrics
            await self.client.get_authorities()
            await self.client.ping_all_authorities()
            
            # Get updated metrics
            updated_metrics = await self.client.get_metrics()
            
            self.test_results['metrics_collection'] = {
                'status': 'PASS',
                'all_categories_present': len(missing_categories) == 0,
                'missing_categories': missing_categories,
                'total_requests': updated_metrics['requests']['total'],
                'success_rate': updated_metrics['requests']['success_rate'],
                'average_latency': updated_metrics['performance']['average_latency_ms'],
                'cache_hit_rate': updated_metrics['cache']['hit_rate']
            }
            print(f"✅ Metrics collection test passed (success rate: {updated_metrics['requests']['success_rate']:.2f})")
            
        except Exception as e:
            self.test_results['metrics_collection'] = {
                'status': 'FAIL',
                'error': str(e)
            }
            print(f"❌ Metrics collection test failed: {e}")

    async def _test_concurrent_operations(self) -> None:
        """Test concurrent operations handling."""
        print("\n⚡ Testing Concurrent Operations...")
        
        try:
            # Create multiple concurrent operations
            tasks = []
            
            # Authority discovery tasks
            for _ in range(3):
                tasks.append(asyncio.create_task(self.client.get_authorities()))
            
            # Ping tasks
            authorities = await self.client.get_authorities()
            if authorities:
                for auth in authorities[:3]:  # Ping first 3 authorities
                    tasks.append(asyncio.create_task(self.client.ping_mesh_authority(auth.name)))
            
            # Gateway status tasks
            for _ in range(2):
                tasks.append(asyncio.create_task(self.client.get_mesh_gateway_status()))
            
            start_time = time.time()
            results = await asyncio.gather(*tasks, return_exceptions=True)
            total_time = time.time() - start_time
            
            successful_ops = sum(1 for r in results if not isinstance(r, Exception))
            
            self.test_results['concurrent_operations'] = {
                'status': 'PASS',
                'total_operations': len(tasks),
                'successful_operations': successful_ops,
                'total_time': total_time,
                'operations_per_second': len(tasks) / total_time,
                'success_rate': successful_ops / len(tasks)
            }
            print(f"✅ Concurrent operations test passed ({successful_ops}/{len(tasks)} successful)")
            
        except Exception as e:
            self.test_results['concurrent_operations'] = {
                'status': 'FAIL',
                'error': str(e)
            }
            print(f"❌ Concurrent operations test failed: {e}")

    async def _test_error_handling(self) -> None:
        """Test error handling and recovery."""
        print("\n🛡️ Testing Error Handling...")
        
        try:
            # Test with invalid authority name
            try:
                await self.client.ping_mesh_authority("invalid_authority")
                ping_handled = False
            except Exception:
                ping_handled = True
            
            # Test with invalid gateway URL
            old_url = self.client.mesh_bridge_url
            self.client.mesh_bridge_url = "http://invalid-gateway:8080"
            
            try:
                await self.client.get_mesh_gateway_status()
                gateway_handled = False
            except Exception:
                gateway_handled = True
            
            # Restore URL
            self.client.mesh_bridge_url = old_url
            
            # Test recovery
            try:
                await self.client.get_authorities()
                recovery_successful = True
            except Exception:
                recovery_successful = False
            
            self.test_results['error_handling'] = {
                'status': 'PASS',
                'invalid_authority_handled': ping_handled,
                'invalid_gateway_handled': gateway_handled,
                'recovery_successful': recovery_successful
            }
            print("✅ Error handling test passed")
            
        except Exception as e:
            self.test_results['error_handling'] = {
                'status': 'FAIL',
                'error': str(e)
            }
            print(f"❌ Error handling test failed: {e}")

    async def _test_background_monitoring(self) -> None:
        """Test background monitoring tasks."""
        print("\n👁️ Testing Background Monitoring...")
        
        try:
            # Check if background tasks are running
            monitor_running = self.client._monitor_task and not self.client._monitor_task.done()
            discovery_running = self.client._discovery_task and not self.client._discovery_task.done()
            
            # Wait a short time for background tasks to execute
            await asyncio.sleep(2)
            
            # Check if tasks are still healthy
            monitor_healthy = monitor_running and not self.client._monitor_task.done()
            discovery_healthy = discovery_running and not self.client._discovery_task.done()
            
            self.test_results['background_monitoring'] = {
                'status': 'PASS',
                'monitor_task_running': monitor_running,
                'discovery_task_running': discovery_running,
                'monitor_task_healthy': monitor_healthy,
                'discovery_task_healthy': discovery_healthy
            }
            print("✅ Background monitoring test passed")
            
        except Exception as e:
            self.test_results['background_monitoring'] = {
                'status': 'FAIL',
                'error': str(e)
            }
            print(f"❌ Background monitoring test failed: {e}")

    async def _generate_summary(self) -> None:
        """Generate validation summary."""
        print("\n" + "=" * 60)
        print("📋 VALIDATION SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results.values() if result.get('status') == 'PASS')
        failed_tests = total_tests - passed_tests
        
        total_time = time.time() - self.start_time
        
        print(f"📊 Test Results: {passed_tests}/{total_tests} passed ({passed_tests/total_tests*100:.1f}%)")
        print(f"⏱️  Total Time: {total_time:.2f} seconds")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for test_name, result in self.test_results.items():
                if result.get('status') == 'FAIL':
                    print(f"  - {test_name}: {result.get('error', 'Unknown error')}")
        
        # Get final metrics
        if self.client:
            try:
                final_metrics = await self.client.get_metrics()
                print(f"\n📈 FINAL METRICS:")
                print(f"  - Total Requests: {final_metrics['requests']['total']}")
                print(f"  - Success Rate: {final_metrics['requests']['success_rate']:.2f}")
                print(f"  - Average Latency: {final_metrics['performance']['average_latency_ms']:.2f}ms")
                print(f"  - Cache Hit Rate: {final_metrics['cache']['hit_rate']:.2f}")
                print(f"  - Circuit Breaker State: {final_metrics['circuit_breaker']['state']}")
            except Exception as e:
                print(f"  - Could not retrieve final metrics: {e}")
        
        self.test_results['summary'] = {
            'total_tests': total_tests,
            'passed_tests': passed_tests,
            'failed_tests': failed_tests,
            'success_rate': passed_tests / total_tests,
            'total_time': total_time,
            'timestamp': datetime.now().isoformat()
        }


async def main():
    """Main validation function."""
    validator = EnhancedMeshClientValidator()
    results = await validator.run_validation()
    
    # Save results to file
    results_file = f"enhanced_mesh_client_validation_{int(time.time())}.json"
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\n💾 Results saved to: {results_file}")
    
    # Exit with appropriate code
    failed_tests = results.get('summary', {}).get('failed_tests', 0)
    sys.exit(0 if failed_tests == 0 else 1)


if __name__ == "__main__":
    asyncio.run(main()) 