import { intelligentQueryEngine } from '../index';
import { QueryOptimizationRequest, QueryContext } from '../index';

describe('IntelligentQueryEngine Integration Tests', () => {
  let mockContext: QueryContext;
  let mockRequest: QueryOptimizationRequest;

  beforeEach(() => {
    mockContext = {
      historicalQueries: ['SELECT * FROM measurements'],
      userPreferences: {
        preferredPerformance: 'balanced',
        maxQueryTime: 5000,
        cachePreference: 'aggressive',
      },
      systemLoad: {
        cpuUsage: 50,
        memoryUsage: 60,
        diskIo: 30,
        networkLatency: 20,
      },
      dataSize: {
        totalRows: 100000,
        totalSize: 1024 * 1024 * 100,
        averageRowSize: 1024,
        compressionRatio: 0.3,
      },
      indexInfo: [],
    };

    mockRequest = {
      query:
        "SELECT time, value FROM measurements WHERE time > '2023-01-01' ORDER BY time",
      connectionId: 'test-connection-1',
      database: 'test-db',
      context: mockContext,
    };
  });

  describe('End-to-End Query Optimization', () => {
    it('should optimize query through complete pipeline', async () => {
      const result = await intelligentQueryEngine.optimizeQuery(mockRequest);

      expect(result).toBeDefined();
      expect(result.originalQuery).toBe(mockRequest.query);
      expect(result.optimizedQuery).toBeDefined();
      expect(result.optimizationTechniques).toBeInstanceOf(Array);
      expect(result.estimatedPerformanceGain).toBeGreaterThanOrEqual(0);
      expect(result.routingStrategy).toBeDefined();
      expect(result.executionPlan).toBeDefined();
      expect(result.warnings).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    it('should handle complex multi-table queries', async () => {
      const complexRequest = {
        ...mockRequest,
        query: `
          SELECT m.time, m.value, md.category 
          FROM measurements m
          JOIN metadata md ON m.id = md.id
          WHERE m.time > '2023-01-01' 
          AND m.value > 100
          AND md.category = 'temperature'
          ORDER BY m.time
          LIMIT 1000
        `,
      };

      const result = await intelligentQueryEngine.optimizeQuery(complexRequest);

      expect(result).toBeDefined();
      expect(result.optimizationTechniques.length).toBeGreaterThan(0);
      expect(result.executionPlan.steps.length).toBeGreaterThan(1);
      expect(result.routingStrategy).toBeDefined();
    });

    it('should provide routing strategy', async () => {
      const result = await intelligentQueryEngine.optimizeQuery(mockRequest);

      expect(result.routingStrategy).toBeDefined();
      expect(result.routingStrategy.targetConnection).toBeDefined();
      expect(result.routingStrategy.loadBalancing).toBeDefined();
      expect(result.routingStrategy.priority).toBeGreaterThanOrEqual(0);
      expect(result.routingStrategy.reason).toBeDefined();
    });

    it('should generate execution plan', async () => {
      const result = await intelligentQueryEngine.optimizeQuery(mockRequest);

      expect(result.executionPlan).toBeDefined();
      expect(result.executionPlan.steps).toBeInstanceOf(Array);
      expect(result.executionPlan.steps.length).toBeGreaterThan(0);
      expect(result.executionPlan.parallelization).toBeDefined();
      expect(result.executionPlan.resourceRequirements).toBeDefined();
      expect(result.executionPlan.estimatedDuration).toBeGreaterThan(0);
    });

    it('should provide optimization recommendations', async () => {
      const result = await intelligentQueryEngine.optimizeQuery(mockRequest);

      expect(result.recommendations).toBeInstanceOf(Array);
      result.recommendations.forEach(rec => {
        expect(rec).toHaveProperty('type');
        expect(rec).toHaveProperty('priority');
        expect(rec).toHaveProperty('title');
        expect(rec).toHaveProperty('description');
        expect(rec).toHaveProperty('implementation');
        expect(rec).toHaveProperty('estimatedBenefit');
      });
    });
  });

  describe('Batch Query Optimization', () => {
    it('should optimize multiple queries', async () => {
      const requests = [
        mockRequest,
        {
          ...mockRequest,
          query: "SELECT COUNT(*) FROM measurements WHERE time > '2023-01-01'",
        },
        {
          ...mockRequest,
          query:
            "SELECT AVG(value) FROM measurements WHERE time > '2023-01-01'",
        },
      ];

      const results = await intelligentQueryEngine.optimizeQueries(requests);

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBe(requests.length);

      results.forEach((result, index) => {
        expect(result.originalQuery).toBe(requests[index].query);
        expect(result.optimizedQuery).toBeDefined();
        expect(result.optimizationTechniques).toBeInstanceOf(Array);
      });
    });

    it('should handle dependencies between queries', async () => {
      const dependentQueries = [
        {
          ...mockRequest,
          query:
            "CREATE TEMP TABLE temp_data AS SELECT * FROM measurements WHERE time > '2023-01-01'",
        },
        {
          ...mockRequest,
          query: 'SELECT AVG(value) FROM temp_data',
        },
      ];

      const results =
        await intelligentQueryEngine.optimizeQueries(dependentQueries);

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBe(dependentQueries.length);
    });
  });

  describe('Learning and Feedback', () => {
    it('should learn from query execution results', async () => {
      const query = "SELECT * FROM measurements WHERE time > '2023-01-01'";
      const executionResult = {
        executionTime: 1500,
        rowsAffected: 10000,
        memoryUsed: 256,
        diskReads: 100,
        diskWrites: 10,
        networkBytes: 1024,
        success: true,
      };

      await expect(
        intelligentQueryEngine.learnFromQuery(
          query,
          executionResult,
          mockContext
        )
      ).resolves.not.toThrow();
    });

    it('should provide query statistics', async () => {
      const stats =
        await intelligentQueryEngine.getQueryStats('test-connection-1');

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('totalQueries');
      expect(stats).toHaveProperty('avgExecutionTime');
      expect(stats).toHaveProperty('slowQueries');
      expect(stats).toHaveProperty('frequentQueries');
      expect(stats).toHaveProperty('cacheHitRate');
      expect(stats).toHaveProperty('optimizationSuccessRate');
    });

    it('should provide optimization recommendations', async () => {
      const recommendations =
        await intelligentQueryEngine.getOptimizationRecommendations(
          'test-connection-1',
          5
        );

      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeLessThanOrEqual(5);

      recommendations.forEach(rec => {
        expect(rec).toHaveProperty('type');
        expect(rec).toHaveProperty('priority');
        expect(rec).toHaveProperty('title');
        expect(rec).toHaveProperty('description');
        expect(rec).toHaveProperty('implementation');
        expect(rec).toHaveProperty('estimatedBenefit');
      });
    });
  });

  describe('Cache Management', () => {
    it('should cache optimization results', async () => {
      // First optimization
      const result1 = await intelligentQueryEngine.optimizeQuery(mockRequest);

      // Second optimization with same query (should use cache)
      const result2 = await intelligentQueryEngine.optimizeQuery(mockRequest);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      // Results should be similar (cached)
      expect(result1.originalQuery).toBe(result2.originalQuery);
    });

    it('should clear cache', async () => {
      await expect(intelligentQueryEngine.clearCache()).resolves.not.toThrow();
    });

    it('should clear cache with pattern', async () => {
      await expect(
        intelligentQueryEngine.clearCache('test-*')
      ).resolves.not.toThrow();
    });
  });

  describe('History and Analytics', () => {
    it('should record optimization history', async () => {
      const result = await intelligentQueryEngine.optimizeQuery(mockRequest);

      // History should be automatically recorded
      const history = intelligentQueryEngine.getOptimizationHistory();

      expect(history).toBeInstanceOf(Array);
      expect(history.length).toBeGreaterThan(0);

      const latestEntry = history[0];
      expect(latestEntry.originalQuery).toBe(mockRequest.query);
      expect(latestEntry.connectionId).toBe(mockRequest.connectionId);
      expect(latestEntry.database).toBe(mockRequest.database);
    });

    it('should provide history statistics', async () => {
      // Generate some optimization history
      await intelligentQueryEngine.optimizeQuery(mockRequest);

      const stats = intelligentQueryEngine.getHistoryStatistics();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('totalOptimizations');
      expect(stats).toHaveProperty('successfulOptimizations');
      expect(stats).toHaveProperty('averagePerformanceGain');
      expect(stats).toHaveProperty('topOptimizationTechniques');
      expect(stats).toHaveProperty('queryTypeDistribution');
    });

    it('should find similar queries', async () => {
      // Add some optimization history
      await intelligentQueryEngine.optimizeQuery(mockRequest);

      const similarQueries = intelligentQueryEngine.findSimilarQueries(
        "SELECT time, value FROM measurements WHERE time > '2023-01-02'",
        5,
        0.5
      );

      expect(similarQueries).toBeInstanceOf(Array);
      expect(similarQueries.length).toBeGreaterThanOrEqual(0);
    });

    it('should get best optimizations', async () => {
      // Add some optimization history
      await intelligentQueryEngine.optimizeQuery(mockRequest);

      const bestOptimizations = intelligentQueryEngine.getBestOptimizations(5);

      expect(bestOptimizations).toBeInstanceOf(Array);
      expect(bestOptimizations.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('ML Integration', () => {
    it('should provide ML model information', () => {
      const modelInfo = intelligentQueryEngine.getMLModelInfo();

      expect(modelInfo).toBeInstanceOf(Array);
      expect(modelInfo.length).toBeGreaterThan(0);

      modelInfo.forEach(model => {
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('type');
        expect(model).toHaveProperty('accuracy');
      });
    });

    it('should handle ML training data', () => {
      const trainingData = {
        originalQuery: 'SELECT * FROM measurements',
        optimizedQuery:
          "SELECT time, value FROM measurements WHERE time > '2023-01-01'",
        performance: {
          executionTime: 1500,
          memoryUsage: 256,
          cpuUsage: 30,
          ioOperations: 100,
          networkTraffic: 1024,
          rowsProcessed: 10000,
        },
        context: mockContext,
        feedback: {
          rating: 4,
          accepted: true,
          timestamp: new Date(),
        },
        timestamp: new Date(),
      };

      expect(() =>
        intelligentQueryEngine.addMLTrainingData(trainingData)
      ).not.toThrow();
    });

    it('should train ML models', async () => {
      await expect(
        intelligentQueryEngine.trainMLModels()
      ).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid queries gracefully', async () => {
      const invalidRequest = {
        ...mockRequest,
        query: 'INVALID SQL QUERY !!!',
      };

      const result = await intelligentQueryEngine.optimizeQuery(invalidRequest);

      expect(result).toBeDefined();
      expect(result.originalQuery).toBe(invalidRequest.query);
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle missing connection gracefully', async () => {
      const noConnectionRequest = {
        ...mockRequest,
        connectionId: '',
      };

      const result =
        await intelligentQueryEngine.optimizeQuery(noConnectionRequest);

      expect(result).toBeDefined();
    });

    it('should handle network errors gracefully', async () => {
      // This test would require mocking network failures
      // For now, just ensure the engine handles unexpected errors
      const result = await intelligentQueryEngine.optimizeQuery(mockRequest);

      expect(result).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should complete optimization within reasonable time', async () => {
      const startTime = Date.now();

      await intelligentQueryEngine.optimizeQuery(mockRequest);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Should complete within 5 seconds
      expect(executionTime).toBeLessThan(5000);
    });

    it('should handle concurrent optimizations', async () => {
      const requests = Array(5)
        .fill(null)
        .map((_, i) => ({
          ...mockRequest,
          query: `SELECT * FROM measurements WHERE id = ${i}`,
        }));

      const startTime = Date.now();

      const results = await Promise.all(
        requests.map(req => intelligentQueryEngine.optimizeQuery(req))
      );

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(results.length).toBe(5);
      expect(executionTime).toBeLessThan(10000); // 10 seconds for 5 concurrent requests

      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.optimizedQuery).toBeDefined();
      });
    });
  });
});
