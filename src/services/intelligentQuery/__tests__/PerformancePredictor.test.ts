import PerformancePredictor from '../predictor/PerformancePredictor';
import { QueryContext, QueryExecutionResult } from '../index';

describe('PerformancePredictor', () => {
  let predictor: PerformancePredictor;
  let mockContext: QueryContext;

  beforeEach(() => {
    predictor = new PerformancePredictor();
    
    mockContext = {
      historicalQueries: ['SELECT * FROM measurements'],
      userPreferences: {
        preferredPerformance: 'balanced',
        maxQueryTime: 5000,
        cachePreference: 'aggressive'
      },
      systemLoad: {
        cpuUsage: 50,
        memoryUsage: 60,
        diskIo: 30,
        networkLatency: 20
      },
      dataSize: {
        totalRows: 100000,
        totalSize: 1024 * 1024 * 100,
        averageRowSize: 1024,
        compressionRatio: 0.3
      },
      indexInfo: []
    };
  });

  describe('predict', () => {
    it('should predict performance for simple query', async () => {
      const query = 'SELECT time, value FROM measurements WHERE time > \'2023-01-01\'';
      
      const prediction = await predictor.predict(query, mockContext);
      
      expect(prediction).toBeDefined();
      expect(prediction.estimatedDuration).toBeGreaterThan(0);
      expect(prediction.estimatedMemoryUsage).toBeGreaterThan(0);
      expect(prediction.estimatedCpuUsage).toBeGreaterThanOrEqual(0);
      expect(prediction.estimatedIoOperations).toBeGreaterThan(0);
      expect(prediction.estimatedNetworkTraffic).toBeGreaterThan(0);
      expect(prediction.confidence).toBeGreaterThan(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
      expect(prediction.bottlenecks).toBeInstanceOf(Array);
      expect(prediction.recommendations).toBeInstanceOf(Array);
      expect(prediction.riskFactors).toBeInstanceOf(Array);
    });

    it('should predict performance for complex query', async () => {
      const complexQuery = `
        SELECT time, AVG(value) as avg_value, COUNT(*) as count
        FROM measurements m1
        JOIN metadata m2 ON m1.id = m2.id
        WHERE time > '2023-01-01' AND value > 100
        GROUP BY time
        ORDER BY time
        LIMIT 1000
      `;
      
      const prediction = await predictor.predict(complexQuery, mockContext);
      
      expect(prediction.estimatedDuration).toBeGreaterThan(0);
      expect(prediction.bottlenecks.length).toBeGreaterThanOrEqual(0);
      expect(prediction.recommendations.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle queries without context', async () => {
      const query = 'SELECT * FROM measurements';
      
      const prediction = await predictor.predict(query);
      
      expect(prediction).toBeDefined();
      expect(prediction.estimatedDuration).toBeGreaterThan(0);
      expect(prediction.confidence).toBeGreaterThan(0);
    });

    it('should identify bottlenecks correctly', async () => {
      const heavyQuery = `
        SELECT time, value, metadata 
        FROM measurements 
        WHERE time > '2023-01-01' 
        ORDER BY time, value 
        LIMIT 10000
      `;
      
      const highLoadContext = {
        ...mockContext,
        systemLoad: {
          cpuUsage: 90,
          memoryUsage: 85,
          diskIo: 95,
          networkLatency: 150
        }
      };

      const prediction = await predictor.predict(heavyQuery, highLoadContext);
      
      expect(prediction.bottlenecks.length).toBeGreaterThan(0);
      
      const bottleneckTypes = prediction.bottlenecks.map(b => b.type);
      expect(bottleneckTypes).toContain('cpu');
      expect(bottleneckTypes).toContain('memory');
      expect(bottleneckTypes).toContain('disk');
    });

    it('should provide appropriate recommendations', async () => {
      const query = 'SELECT * FROM measurements WHERE time > \'2023-01-01\'';
      
      const prediction = await predictor.predict(query, mockContext);
      
      if (prediction.recommendations.length > 0) {
        prediction.recommendations.forEach(rec => {
          expect(rec).toHaveProperty('type');
          expect(rec).toHaveProperty('priority');
          expect(rec).toHaveProperty('title');
          expect(rec).toHaveProperty('description');
          expect(rec).toHaveProperty('expectedImprovement');
          expect(rec).toHaveProperty('implementationCost');
          expect(['low', 'medium', 'high']).toContain(rec.priority);
          expect(['optimization', 'resource', 'configuration', 'architecture']).toContain(rec.type);
        });
      }
    });

    it('should cache predictions', async () => {
      const query = 'SELECT * FROM measurements';
      
      // First prediction
      const prediction1 = await predictor.predict(query, mockContext);
      
      // Second prediction (should be cached)
      const prediction2 = await predictor.predict(query, mockContext);
      
      expect(prediction1).toEqual(prediction2);
    });

    it('should return conservative estimate on error', async () => {
      // This should trigger the fallback mechanism
      const invalidQuery = 'INVALID SQL QUERY !!!';
      
      const prediction = await predictor.predict(invalidQuery, mockContext);
      
      expect(prediction).toBeDefined();
      expect(prediction.confidence).toBeLessThan(1);
      expect(prediction.recommendations.length).toBeGreaterThan(0);
      expect(prediction.recommendations[0].title).toContain('Performance analysis unavailable');
    });
  });

  describe('estimateDuration', () => {
    it('should estimate duration for execution steps', () => {
      const steps = [
        {
          id: 'scan_1',
          operation: 'TABLE_SCAN',
          description: 'Scan table measurements',
          estimatedCost: 1000,
          dependencies: [],
          canParallelize: true
        },
        {
          id: 'filter_1',
          operation: 'FILTER',
          description: 'Apply WHERE conditions',
          estimatedCost: 200,
          dependencies: ['scan_1'],
          canParallelize: true
        }
      ];

      const resourceRequirements = {
        minMemory: 256,
        maxMemory: 1024,
        cpuIntensive: false,
        ioIntensive: true,
        networkIntensive: false
      };

      const duration = predictor.estimateDuration(steps, resourceRequirements, mockContext);
      
      expect(duration).toBeGreaterThan(0);
      expect(duration).toBeGreaterThanOrEqual(10); // Minimum duration
    });

    it('should adjust for system load', () => {
      const steps = [{
        id: 'scan_1',
        operation: 'TABLE_SCAN',
        description: 'Scan table measurements',
        estimatedCost: 1000,
        dependencies: [],
        canParallelize: false
      }];

      const resourceRequirements = {
        minMemory: 256,
        maxMemory: 1024,
        cpuIntensive: true,
        ioIntensive: true,
        networkIntensive: false
      };

      const highLoadContext = {
        ...mockContext,
        systemLoad: {
          cpuUsage: 90,
          memoryUsage: 85,
          diskIo: 95,
          networkLatency: 200
        }
      };

      const normalDuration = predictor.estimateDuration(steps, resourceRequirements, mockContext);
      const highLoadDuration = predictor.estimateDuration(steps, resourceRequirements, highLoadContext);
      
      expect(highLoadDuration).toBeGreaterThan(normalDuration);
    });

    it('should optimize for parallelizable steps', () => {
      const parallelSteps = [
        {
          id: 'scan_1',
          operation: 'TABLE_SCAN',
          description: 'Scan table measurements',
          estimatedCost: 1000,
          dependencies: [],
          canParallelize: true
        },
        {
          id: 'scan_2',
          operation: 'TABLE_SCAN',
          description: 'Scan table metadata',
          estimatedCost: 1000,
          dependencies: [],
          canParallelize: true
        }
      ];

      const sequentialSteps = [
        {
          id: 'scan_1',
          operation: 'TABLE_SCAN',
          description: 'Scan table measurements',
          estimatedCost: 1000,
          dependencies: [],
          canParallelize: false
        },
        {
          id: 'scan_2',
          operation: 'TABLE_SCAN',
          description: 'Scan table metadata',
          estimatedCost: 1000,
          dependencies: ['scan_1'],
          canParallelize: false
        }
      ];

      const resourceRequirements = {
        minMemory: 256,
        maxMemory: 1024,
        cpuIntensive: false,
        ioIntensive: true,
        networkIntensive: false
      };

      const parallelDuration = predictor.estimateDuration(parallelSteps, resourceRequirements, mockContext);
      const sequentialDuration = predictor.estimateDuration(sequentialSteps, resourceRequirements, mockContext);
      
      expect(parallelDuration).toBeLessThan(sequentialDuration);
    });
  });

  describe('model management', () => {
    it('should update model with execution results', async () => {
      const query = 'SELECT * FROM measurements';
      const executionResult: QueryExecutionResult = {
        executionTime: 1500,
        rowsAffected: 10000,
        memoryUsed: 256,
        diskReads: 100,
        diskWrites: 10,
        networkBytes: 1024,
        success: true
      };

      await expect(predictor.updateModel(query, executionResult, mockContext)).resolves.not.toThrow();
    });

    it('should provide model metrics', () => {
      const metrics = predictor.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics).toHaveProperty('accuracy');
      expect(metrics).toHaveProperty('precision');
      expect(metrics).toHaveProperty('recall');
      expect(metrics).toHaveProperty('f1Score');
      expect(metrics).toHaveProperty('predictionCount');
      expect(metrics).toHaveProperty('lastEvaluated');
    });

    it('should provide model information', () => {
      const modelInfo = predictor.getModelInfo();
      
      expect(modelInfo).toBeInstanceOf(Array);
      expect(modelInfo.length).toBeGreaterThan(0);
      
      modelInfo.forEach(model => {
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('version');
        expect(model).toHaveProperty('accuracy');
        expect(model).toHaveProperty('features');
        expect(model).toHaveProperty('lastUpdated');
      });
    });

    it('should clear cache', () => {
      expect(() => predictor.clearCache()).not.toThrow();
    });

    it('should export and import training data', () => {
      const exported = predictor.exportTrainingData();
      expect(exported).toBeInstanceOf(Array);

      const newPredictor = new PerformancePredictor();
      expect(() => newPredictor.importTrainingData(exported)).not.toThrow();
    });
  });

  describe('risk assessment', () => {
    it('should identify risk factors', async () => {
      const complexQuery = `
        SELECT time, value, metadata 
        FROM measurements 
        WHERE time > '2023-01-01' 
        AND value > 100 
        ORDER BY time, value 
        LIMIT 10000
      `;
      
      const riskContext = {
        ...mockContext,
        systemLoad: {
          cpuUsage: 85,
          memoryUsage: 90,
          diskIo: 80,
          networkLatency: 100
        }
      };

      const prediction = await predictor.predict(complexQuery, riskContext);
      
      expect(prediction.riskFactors.length).toBeGreaterThan(0);
      
      prediction.riskFactors.forEach(risk => {
        expect(risk).toHaveProperty('factor');
        expect(risk).toHaveProperty('riskLevel');
        expect(risk).toHaveProperty('description');
        expect(risk).toHaveProperty('probability');
        expect(risk).toHaveProperty('impact');
        expect(['low', 'medium', 'high']).toContain(risk.riskLevel);
        expect(risk.probability).toBeGreaterThan(0);
        expect(risk.probability).toBeLessThanOrEqual(1);
      });
    });

    it('should assess query complexity risks', async () => {
      const veryComplexQuery = `
        SELECT 
          time, 
          AVG(value) as avg_value,
          COUNT(*) as count,
          MIN(value) as min_value,
          MAX(value) as max_value
        FROM measurements m1
        JOIN metadata m2 ON m1.id = m2.id
        JOIN tags t ON m1.tag_id = t.id
        WHERE time > '2023-01-01' 
        AND value > 100
        AND metadata LIKE '%test%'
        GROUP BY time, m2.category
        HAVING COUNT(*) > 10
        ORDER BY time, avg_value
        LIMIT 1000
      `;
      
      const prediction = await predictor.predict(veryComplexQuery, mockContext);
      
      const complexityRisk = prediction.riskFactors.find(r => r.factor === 'Query Complexity');
      expect(complexityRisk).toBeDefined();
      if (complexityRisk) {
        expect(complexityRisk.riskLevel).toBe('high');
      }
    });
  });
});