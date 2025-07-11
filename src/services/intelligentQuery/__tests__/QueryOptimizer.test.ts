import { QueryOptimizer } from '../optimizer/QueryOptimizer';
import { QueryAnalysis } from '../analyzer/QueryAnalyzer';
import { QueryContext } from '../index';

describe('QueryOptimizer', () => {
  let optimizer: QueryOptimizer;
  let mockAnalysis: QueryAnalysis;
  let mockContext: QueryContext;

  beforeEach(() => {
    optimizer = new QueryOptimizer();
    
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
        score: 30,
        level: 'medium',
        factors: []
      },
      resourceUsage: {
        estimatedMemory: 256,
        estimatedCpu: 20,
        estimatedIo: 100,
        estimatedNetwork: 50
      },
      warnings: [],
      tags: []
    };

    mockContext = {
      historicalQueries: [],
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

  describe('optimize', () => {
    it('should optimize a simple SELECT query', async () => {
      const query = 'SELECT time, value FROM measurements WHERE time > \'2023-01-01\'';
      
      const result = await optimizer.optimize(query, mockAnalysis, mockContext);
      
      expect(result).toBeDefined();
      expect(result.query).toBe(query);
      expect(result.techniques).toBeInstanceOf(Array);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.estimatedImprovement).toBeGreaterThanOrEqual(0);
    });

    it('should apply rule-based optimizations', async () => {
      const query = 'SELECT * FROM measurements WHERE time > \'2023-01-01\' ORDER BY time';
      
      const result = await optimizer.optimize(query, mockAnalysis, mockContext);
      
      expect(result.techniques.length).toBeGreaterThan(0);
      expect(result.techniques.some(t => t.name.includes('predicate') || t.name.includes('limit'))).toBe(true);
    });

    it('should handle complex queries with joins', async () => {
      const complexAnalysis = {
        ...mockAnalysis,
        patterns: [{
          ...mockAnalysis.patterns[0],
          joins: [{
            type: 'INNER' as const,
            leftTable: 'measurements',
            rightTable: 'metadata',
            condition: 'measurements.id = metadata.id'
          }]
        }],
        complexity: {
          score: 80,
          level: 'complex' as const,
          factors: []
        }
      };

      const query = 'SELECT m.time, m.value FROM measurements m INNER JOIN metadata md ON m.id = md.id';
      
      const result = await optimizer.optimize(query, complexAnalysis, mockContext);
      
      expect(result.techniques.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should generate execution steps', async () => {
      const query = 'SELECT time, value FROM measurements WHERE time > \'2023-01-01\' ORDER BY time';
      
      const steps = await optimizer.generateSteps(query, mockAnalysis);
      
      expect(steps).toBeInstanceOf(Array);
      expect(steps.length).toBeGreaterThan(0);
      expect(steps[0].operation).toBe('TABLE_SCAN');
      expect(steps.every(step => step.id && step.operation && step.description)).toBe(true);
    });

    it('should analyze parallelization opportunities', async () => {
      const steps = await optimizer.generateSteps('SELECT * FROM measurements', mockAnalysis);
      
      const parallelization = optimizer.analyzeParallelization(steps);
      
      expect(parallelization).toBeDefined();
      expect(parallelization.maxDegreeOfParallelism).toBeGreaterThanOrEqual(1);
      expect(parallelization.parallelSteps).toBeInstanceOf(Array);
      expect(parallelization.bottlenecks).toBeInstanceOf(Array);
    });

    it('should calculate resource requirements', async () => {
      const steps = await optimizer.generateSteps('SELECT * FROM measurements', mockAnalysis);
      
      const requirements = optimizer.calculateResourceRequirements(steps, mockContext);
      
      expect(requirements).toBeDefined();
      expect(requirements.minMemory).toBeGreaterThan(0);
      expect(requirements.maxMemory).toBeGreaterThan(requirements.minMemory);
      expect(typeof requirements.cpuIntensive).toBe('boolean');
      expect(typeof requirements.ioIntensive).toBe('boolean');
    });

    it('should recommend indexes', async () => {
      const query = 'SELECT * FROM measurements WHERE time > \'2023-01-01\' AND value > 100';
      
      const recommendations = await optimizer.recommendIndexes(query, mockAnalysis);
      
      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].type).toBe('index');
      expect(recommendations[0].priority).toBeDefined();
    });

    it('should recommend query rewrites', async () => {
      const query = 'SELECT DISTINCT time FROM measurements WHERE EXISTS (SELECT 1 FROM metadata WHERE metadata.id = measurements.id)';
      
      const recommendations = await optimizer.recommendRewrites(query, mockAnalysis);
      
      expect(recommendations).toBeInstanceOf(Array);
      if (recommendations.length > 0) {
        expect(recommendations[0].type).toBe('query_rewrite');
        expect(recommendations[0].priority).toBeDefined();
      }
    });

    it('should handle ML optimization gracefully', async () => {
      const query = 'SELECT * FROM measurements';
      
      const result = await optimizer.optimize(query, mockAnalysis, mockContext);
      
      // Should not throw even if ML optimization fails
      expect(result).toBeDefined();
      expect(result.techniques).toBeInstanceOf(Array);
    });

    it('should provide ML model information', async () => {
      const modelInfo = optimizer.getMLModelInfo();
      
      expect(modelInfo).toBeInstanceOf(Array);
      expect(modelInfo.length).toBeGreaterThan(0);
      expect(modelInfo[0]).toHaveProperty('id');
      expect(modelInfo[0]).toHaveProperty('name');
      expect(modelInfo[0]).toHaveProperty('accuracy');
    });

    it('should handle training data', async () => {
      const trainingData = {
        originalQuery: 'SELECT * FROM measurements',
        optimizedQuery: 'SELECT time, value FROM measurements WHERE time > \'2023-01-01\'',
        performanceGain: 25,
        context: mockContext
      };

      expect(() => optimizer.addMLTrainingData(trainingData)).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle invalid queries gracefully', async () => {
      const invalidQuery = 'INVALID SQL QUERY';
      
      const result = await optimizer.optimize(invalidQuery, mockAnalysis, mockContext);
      
      expect(result).toBeDefined();
      expect(result.query).toBe(invalidQuery);
    });

    it('should handle empty analysis', async () => {
      const emptyAnalysis = {
        patterns: [],
        complexity: { score: 0, level: 'simple' as const, factors: [] },
        resourceUsage: { estimatedMemory: 0, estimatedCpu: 0, estimatedIo: 0, estimatedNetwork: 0 },
        warnings: [],
        tags: []
      };

      const result = await optimizer.optimize('SELECT 1', emptyAnalysis, mockContext);
      
      expect(result).toBeDefined();
    });

    it('should handle missing context', async () => {
      const query = 'SELECT * FROM measurements';
      
      const result = await optimizer.optimize(query, mockAnalysis);
      
      expect(result).toBeDefined();
      expect(result.techniques).toBeInstanceOf(Array);
    });
  });
});