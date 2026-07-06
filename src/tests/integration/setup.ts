import { TestContainers } from './test-containers.js';
import { db } from '../../db/index.js';
import { IntegrationPipelineExecutor } from './setup-executor.js';

export class IntegrationTestContext {
  public containers!: TestContainers;
  public db!: any;
  public redis!: any;
  public executor!: IntegrationPipelineExecutor;

  static async create(): Promise<IntegrationTestContext> {
    const ctx = new IntegrationTestContext();
    ctx.containers = new TestContainers();
    
    await ctx.containers.startPostgres();
    await ctx.containers.startRedis();
    
    ctx.db = db;
    
    // In-memory mock redis for reliable testing
    const redisState = new Map<string, any>();
    ctx.redis = {
      getCircuitBreakerState: async (serviceName: string) => {
        return redisState.get(`circuit:${serviceName}`) || { state: 'CLOSED', failureCount: 0 };
      },
      setCircuitBreakerState: async (serviceName: string, state: any) => {
        redisState.set(`circuit:${serviceName}`, state);
      }
    };
    
    ctx.executor = new IntegrationPipelineExecutor(ctx.db, ctx.redis);
    
    return ctx;
  }

  async cleanup(): Promise<void> {
    await this.containers.stop();
  }
}
