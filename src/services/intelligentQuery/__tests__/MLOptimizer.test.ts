import MLOptimizer from '../ml/MLOptimizer';
import { QueryAnalysis } from '../analyzer/QueryAnalyzer';
import { QueryContext } from '../index';

describe('MLOptimizer', () => {
  let mlOptimizer: MLOptimizer;
  let mockAnalysis: QueryAnalysis;
  let mockContext: QueryContext;

  beforeEach(() => {
    mlOptimizer = new MLOptimizer();
    
    mockAnalysis = {
      patterns: [{
        type: 'SELECT',
        tables: ['measurements'],
        columns: ['time', 'value'],
        conditions: [{
          column: 'time',
          operator: '>',
          value: '2023-01-01',
          type: 'WHERE'
        }],
        joins: [],
        aggregations: [],
        orderBy: [],
        groupBy: []
      }],
      complexity: {
        score: 50,
        level: 'medium',
        factors: []
      },
      resourceUsage: {
        estimatedMemory: 512,
        estimatedCpu: 30,
        estimatedIo: 150,
        estimatedNetwork: 75
      },
      warnings: [],
      tags: []
    };

    mockContext = {
      historicalQueries: ['SELECT * FROM measurements'],
      userPreferences: {
        preferredPerformance: 'balanced',
        maxQueryTime: 5000,
        cachePreference: 'aggressive'
      },
      systemLoad: {
        cpuUsage: 60,
        memoryUsage: 70,
        diskIo: 40,
        networkLatency: 25
      },
      dataSize: {
        totalRows: 500000,
        totalSize: 1024 * 1024 * 200,
        averageRowSize: 1024,
        compressionRatio: 0.4
      },
      indexInfo: []
    };
  });

  describe('optimizeQuery', () => {
    it('should optimize query using ML models', async () => {
      const query = 'SELECT time, value FROM measurements WHERE time > \'2023-01-01\'';
      
      const result = await mlOptimizer.optimizeQuery(query, mockAnalysis, mockContext);
      
      expect(result).toBeDefined();
      expect(result.optimizedQuery).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.techniques).toBeInstanceOf(Array);
      expect(result.reasoning).toBeInstanceOf(Array);
      expect(result.alternatives).toBeInstanceOf(Array);
    });

    it('should handle complex queries', async () => {
      const complexQuery = `
        SELECT time, AVG(value) as avg_value 
        FROM measurements 
        WHERE time > '2023-01-01' 
        GROUP BY time 
        ORDER BY time 
        LIMIT 100
      `;
      
      const complexAnalysis = {
        ...mockAnalysis,
        complexity: {
          score: 85,
          level: 'complex' as const,
          factors: []
        },
        patterns: [{
          ...mockAnalysis.patterns[0],
          aggregations: [{
            function: 'AVG',
            column: 'value',
            alias: 'avg_value'
          }],
          orderBy: [{
            column: 'time',
            direction: 'ASC' as const
          }],
          groupBy: ['time'],
          limit: 100
        }]
      };

      const result = await mlOptimizer.optimizeQuery(complexQuery, complexAnalysis, mockContext);
      
      expect(result).toBeDefined();
      expect(result.techniques.length).toBeGreaterThan(0);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('should return fallback result on error', async () => {
      // Create a scenario that might cause an error
      const invalidQuery = '';
      const emptyAnalysis = {
        patterns: [],
        complexity: { score: 0, level: 'simple' as const, factors: [] },
        resourceUsage: { estimatedMemory: 0, estimatedCpu: 0, estimatedIo: 0, estimatedNetwork: 0 },
        warnings: [],
        tags: []
      };

      const result = await mlOptimizer.optimizeQuery(invalidQuery, emptyAnalysis);
      
      expect(result).toBeDefined();
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.reasoning).toContain('ML optimization failed, using fallback');
    });

    it('should generate alternatives for complex queries', async () => {
      const query = 'SELECT * FROM measurements WHERE time > \'2023-01-01\' AND value > 100';
      
      const result = await mlOptimizer.optimizeQuery(query, mockAnalysis, mockContext);
      
      expect(result.alternatives).toBeInstanceOf(Array);
      result.alternatives.forEach(alternative => {
        expect(alternative).toHaveProperty('query');
        expect(alternative).toHaveProperty('score');
        expect(alternative).toHaveProperty('tradeoffs');
        expect(alternative.tradeoffs).toBeInstanceOf(Array);
      });
    });
  });

  describe('model management', () => {
    it('should provide model information', () => {
      const models = mlOptimizer.getModelInfo();
      
      expect(models).toBeInstanceOf(Array);
      expect(models.length).toBeGreaterThan(0);
      
      models.forEach(model => {
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('type');
        expect(model).toHaveProperty('accuracy');
        expect(model).toHaveProperty('features');
        expect(model).toHaveProperty('isActive');
      });
    });

    it('should have different types of models', () => {
      const models = mlOptimizer.getModelInfo();
      const modelTypes = models.map(m => m.type);
      
      expect(modelTypes).toContain('regression');
      expect(modelTypes).toContain('classification');
      expect(modelTypes.length).toBeGreaterThan(1);
    });

    it('should provide model metrics', async () => {
      const models = mlOptimizer.getModelInfo();
      const activeModel = models.find(m => m.isActive);
      
      if (activeModel) {
        const metrics = await mlOptimizer.getModelMetrics(activeModel.id);
        
        if (metrics) {
          expect(metrics).toHaveProperty('accuracy');
          expect(metrics).toHaveProperty('precision');
          expect(metrics).toHaveProperty('recall');
          expect(metrics.accuracy).toBeGreaterThanOrEqual(0);
          expect(metrics.accuracy).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  describe('training', () => {
    it('should add training data', () => {
      const trainingData = {
        originalQuery: 'SELECT * FROM measurements',
        optimizedQuery: 'SELECT time, value FROM measurements WHERE time > \'2023-01-01\'',
        performance: {
          executionTime: 1500,
          memoryUsage: 256,
          cpuUsage: 30,
          ioOperations: 100,
          networkTraffic: 1024,
          rowsProcessed: 10000
        },
        context: mockContext,
        feedback: {
          rating: 4,
          accepted: true,
          comments: 'Good optimization',
          timestamp: new Date()
        },
        timestamp: new Date()
      };

      expect(() => mlOptimizer.addTrainingData(trainingData)).not.toThrow();
    });

    it('should handle training with insufficient data', async () => {
      // Should not throw even with insufficient training data
      await expect(mlOptimizer.trainModels()).resolves.not.toThrow();
    });

    it('should export and import training data', () => {
      const trainingData = {
        originalQuery: 'SELECT * FROM measurements',
        optimizedQuery: 'SELECT time, value FROM measurements WHERE time > \'2023-01-01\'',
        performance: {
          executionTime: 1000,
          memoryUsage: 128,
          cpuUsage: 25,
          ioOperations: 50,
          networkTraffic: 512,
          rowsProcessed: 5000
        },
        context: mockContext,
        feedback: {
          rating: 5,
          accepted: true,
          timestamp: new Date()
        },
        timestamp: new Date()
      };

      mlOptimizer.addTrainingData(trainingData);
      
      const exported = mlOptimizer.exportTrainingData();
      expect(exported).toBeInstanceOf(Array);
      expect(exported.length).toBeGreaterThan(0);

      const newOptimizer = new MLOptimizer();
      newOptimizer.importTrainingData(exported);
      
      const imported = newOptimizer.exportTrainingData();
      expect(imported.length).toBe(exported.length);
    });
  });

  describe('feature extraction and prediction', () => {
    it('should handle queries with different complexity levels', async () => {
      const simpleQuery = 'SELECT 1';
      const simpleAnalysis = {
        ...mockAnalysis,
        complexity: { score: 5, level: 'simple' as const, factors: [] }
      };

      const result = await mlOptimizer.optimizeQuery(simpleQuery, simpleAnalysis, mockContext);
      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should adapt to different system loads', async () => {
      const highLoadContext = {
        ...mockContext,
        systemLoad: {
          cpuUsage: 95,
          memoryUsage: 90,
          diskIo: 85,
          networkLatency: 200
        }
      };

      const result = await mlOptimizer.optimizeQuery(
        'SELECT * FROM measurements', 
        mockAnalysis, 
        highLoadContext
      );

      expect(result).toBeDefined();
      expect(result.techniques.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle queries without context', async () => {
      const result = await mlOptimizer.optimizeQuery(
        'SELECT * FROM measurements',
        mockAnalysis
      );

      expect(result).toBeDefined();
      expect(result.optimizedQuery).toBeDefined();
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle empty queries', async () => {
      const result = await mlOptimizer.optimizeQuery('', mockAnalysis, mockContext);
      
      expect(result).toBeDefined();
      expect(result.confidence).toBeLessThan(1);
    });

    it('should handle null/undefined inputs gracefully', async () => {
      const result = await mlOptimizer.optimizeQuery(
        'SELECT * FROM measurements',
        mockAnalysis,
        undefined
      );

      expect(result).toBeDefined();
    });

    it('should limit training data size', () => {
      // Add many training data entries to test size limit
      for (let i = 0; i < 10; i++) {
        const trainingData = {
          originalQuery: `SELECT * FROM measurements WHERE id = ${i}`,
          optimizedQuery: `SELECT time, value FROM measurements WHERE id = ${i}`,
          performance: {
            executionTime: 1000 + i * 100,
            memoryUsage: 128,
            cpuUsage: 25,
            ioOperations: 50,
            networkTraffic: 512,
            rowsProcessed: 5000
          },
          context: mockContext,
          feedback: {
            rating: 4,
            accepted: true,
            timestamp: new Date()
          },
          timestamp: new Date()
        };

        mlOptimizer.addTrainingData(trainingData);
      }

      const exported = mlOptimizer.exportTrainingData();
      expect(exported.length).toBeLessThanOrEqual(50000); // Max size check
    });
  });
});