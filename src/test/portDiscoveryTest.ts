/**
 * Port Discovery System Test
 * 
 * This test validates the port discovery and conflict resolution system
 */

import { portDiscoveryService } from '../services/portDiscovery';
import { healthCheckService } from '../services/healthCheck';
import { connectionResilienceService } from '../services/connectionResilience';

// Mock Tauri invoke function for testing
const mockInvoke = jest.fn();
jest.mock('@tauri-apps/api/core', () => ({
  invoke: mockInvoke,
}));

describe('Port Discovery System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Port Discovery Service', () => {
    it('should initialize successfully', async () => {
      mockInvoke.mockResolvedValueOnce(undefined); // init_port_manager
      mockInvoke.mockResolvedValueOnce(1421); // allocate_port
      
      await portDiscoveryService.initialize();
      
      expect(mockInvoke).toHaveBeenCalledWith('init_port_manager');
      expect(mockInvoke).toHaveBeenCalledWith('allocate_port', { serviceName: 'frontend-dev-server' });
    });

    it('should allocate port successfully', async () => {
      mockInvoke.mockResolvedValueOnce(1422);
      
      const port = await portDiscoveryService.allocatePort('test-service');
      
      expect(port).toBe(1422);
      expect(mockInvoke).toHaveBeenCalledWith('allocate_port', { serviceName: 'test-service' });
    });

    it('should check port availability', async () => {
      mockInvoke.mockResolvedValueOnce(true);
      
      const available = await portDiscoveryService.isPortAvailable(1421);
      
      expect(available).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('is_port_available', { port: 1421 });
    });

    it('should handle port conflicts', async () => {
      mockInvoke.mockResolvedValueOnce(1423); // try_reallocate_port
      
      const newPort = await portDiscoveryService.handlePortConflict('test-service');
      
      expect(newPort).toBe(1423);
      expect(mockInvoke).toHaveBeenCalledWith('try_reallocate_port', { serviceName: 'test-service' });
    });

    it('should perform health check', async () => {
      mockInvoke.mockResolvedValueOnce(true);
      
      const healthy = await portDiscoveryService.healthCheck('test-service');
      
      expect(healthy).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('port_health_check', { serviceName: 'test-service' });
    });
  });

  describe('Health Check Service', () => {
    beforeEach(() => {
      // Mock successful responses for health checks
      mockInvoke.mockImplementation((command, args) => {
        switch (command) {
          case 'health_check':
            return Promise.resolve(true);
          case 'get_system_info':
            return Promise.resolve({
              total_memory: 8000000000,
              used_memory: 4000000000,
              cpu_usage: 25,
            });
          case 'is_port_available':
            return Promise.resolve(true);
          case 'get_service_port':
            return Promise.resolve(1421);
          default:
            return Promise.resolve(undefined);
        }
      });
    });

    it('should perform complete health check', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
        })
      ) as jest.Mock;

      const healthStatus = await healthCheckService.performHealthCheck();
      
      expect(healthStatus.overall).toBe('healthy');
      expect(healthStatus.checks).toHaveLength(5);
      expect(healthStatus.checks[0].component).toBe('Port Manager');
      expect(healthStatus.checks[1].component).toBe('Dev Server');
      expect(healthStatus.checks[2].component).toBe('Tauri App');
      expect(healthStatus.checks[3].component).toBe('System Resources');
      expect(healthStatus.checks[4].component).toBe('Network');
    });

    it('should detect unhealthy port manager', async () => {
      mockInvoke.mockImplementation((command) => {
        if (command === 'get_service_port') {
          return Promise.resolve(null); // No port allocated
        }
        return Promise.resolve(undefined);
      });

      const healthStatus = await healthCheckService.performHealthCheck();
      
      expect(healthStatus.overall).toBe('unhealthy');
      const portCheck = healthStatus.checks.find(c => c.component === 'Port Manager');
      expect(portCheck?.status).toBe('unhealthy');
    });

    it('should detect system resource issues', async () => {
      mockInvoke.mockImplementation((command) => {
        if (command === 'get_system_info') {
          return Promise.resolve({
            total_memory: 8000000000,
            used_memory: 7500000000, // 93.75% usage
            cpu_usage: 95,
          });
        }
        return Promise.resolve(true);
      });

      const healthStatus = await healthCheckService.performHealthCheck();
      
      const systemCheck = healthStatus.checks.find(c => c.component === 'System Resources');
      expect(systemCheck?.status).toBe('unhealthy');
    });
  });

  describe('Connection Resilience Service', () => {
    it('should detect connection failure and start reconnection', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Connection failed'));
      
      const isConnected = await connectionResilienceService.checkConnection();
      
      expect(isConnected).toBe(false);
      
      const state = connectionResilienceService.getConnectionState();
      expect(state.isConnected).toBe(false);
      expect(state.lastError).toBe('Connection failed');
      expect(state.consecutiveFailures).toBe(1);
    });

    it('should calculate proper reconnection delays', async () => {
      const service = connectionResilienceService;
      service.setReconnectionConfig({
        maxRetries: 5,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffFactor: 2,
        jitter: false,
      });

      // Access private method through type assertion for testing
      const calculateDelay = (service as any).calculateDelay;
      
      expect(calculateDelay(0)).toBe(1000);
      expect(calculateDelay(1)).toBe(2000);
      expect(calculateDelay(2)).toBe(4000);
      expect(calculateDelay(3)).toBe(8000);
      expect(calculateDelay(4)).toBe(10000); // Capped at maxDelay
    });

    it('should track connection statistics', async () => {
      mockInvoke.mockResolvedValueOnce(true);
      
      await connectionResilienceService.checkConnection();
      
      const stats = connectionResilienceService.getConnectionStats();
      
      expect(stats.totalAttempts).toBe(1);
      expect(stats.successRate).toBe(100);
      expect(stats.consecutiveFailures).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    it('should handle port conflict and recovery', async () => {
      let portAllocated = 1421;
      
      mockInvoke.mockImplementation((command, args) => {
        switch (command) {
          case 'allocate_port':
            return Promise.resolve(portAllocated);
          case 'check_port_conflicts':
            return Promise.resolve(['frontend-dev-server']);
          case 'try_reallocate_port':
            portAllocated = 1422;
            return Promise.resolve(portAllocated);
          case 'get_service_port':
            return Promise.resolve(portAllocated);
          default:
            return Promise.resolve(true);
        }
      });

      // Initial allocation
      await portDiscoveryService.allocatePort('frontend-dev-server');
      expect(portAllocated).toBe(1421);

      // Detect conflict
      const conflicts = await portDiscoveryService.checkPortConflicts();
      expect(conflicts).toContain('frontend-dev-server');

      // Resolve conflict
      const newPort = await portDiscoveryService.handlePortConflict('frontend-dev-server');
      expect(newPort).toBe(1422);
    });

    it('should maintain health monitoring during port changes', async () => {
      let currentPort = 1421;
      
      mockInvoke.mockImplementation((command, args) => {
        switch (command) {
          case 'get_service_port':
            return Promise.resolve(currentPort);
          case 'is_port_available':
            return Promise.resolve(true);
          case 'try_reallocate_port':
            currentPort = 1422;
            return Promise.resolve(currentPort);
          case 'health_check':
            return Promise.resolve(true);
          case 'get_system_info':
            return Promise.resolve({
              total_memory: 8000000000,
              used_memory: 4000000000,
              cpu_usage: 25,
            });
          default:
            return Promise.resolve(true);
        }
      });

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
        })
      ) as jest.Mock;

      // Initial health check
      let healthStatus = await healthCheckService.performHealthCheck();
      expect(healthStatus.overall).toBe('healthy');

      // Simulate port change
      await portDiscoveryService.reallocatePort('frontend-dev-server');
      
      // Health check should still pass with new port
      healthStatus = await healthCheckService.performHealthCheck();
      expect(healthStatus.overall).toBe('healthy');
    });
  });
});

// Export for manual testing
export {
  portDiscoveryService,
  healthCheckService,
  connectionResilienceService,
};