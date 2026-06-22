import { Server } from 'http';
import { logger } from '../utils/logger.js';

export interface Shutdownable {
  name: string;
  close(): Promise<void>;
}

export class GracefulShutdown {
  private services: Shutdownable[] = [];
  private isShuttingDown = false;
  private shutdownTimeout = 30000; // 30 seconds

  constructor(
    private server: Server,
    private io?: any,
    private dbAdapter?: any,
    private redis?: any
  ) {
    this.registerDefaultServices();
    this.setupSignalHandlers();
  }

  private registerDefaultServices(): void {
    if (this.dbAdapter) {
      this.services.push({
        name: 'Database',
        close: async () => {
          try {
            logger.info('Closing database pool/instance connection...');
            if (typeof this.dbAdapter.close === 'function') {
              await this.dbAdapter.close();
            } else if (typeof this.dbAdapter.end === 'function') {
              await this.dbAdapter.end();
            }
          } catch (err: any) {
            logger.error('Error closing database in graceful shutdown:', { error: err.message || err });
          }
        }
      });
    }

    if (this.redis) {
      this.services.push({
        name: 'Redis',
        close: async () => {
          try {
            logger.info('Closing Redis connection...');
            await this.redis.quit();
          } catch (err: any) {
            logger.error('Error closing Redis in graceful shutdown:', { error: err.message || err });
          }
        }
      });
    }

    if (this.io) {
      this.services.push({
        name: 'WebSocket',
        close: async () => {
          try {
            logger.info('Closing WebSocket connections...');
            if (this.io.disconnectSockets) {
              this.io.disconnectSockets(true);
            }
            if (this.io.close) {
              this.io.close();
            }
          } catch (err: any) {
            logger.error('Error closing Socket.io in graceful shutdown:', { error: err.message || err });
          }
        }
      });
    }

    this.services.push({
      name: 'HTTP Server',
      close: async () => {
        logger.info('Closing HTTP server...');
        await new Promise<void>((resolve, reject) => {
          this.server.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
    });
  }

  registerService(service: Shutdownable): void {
    this.services.push(service);
  }

  private setupSignalHandlers(): void {
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
    
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', { error: error.message || error, stack: error.stack });
      this.shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, _promise) => {
      logger.error('Unhandled Rejection at promise:', { reason: String(reason) });
      this.shutdown('unhandledRejection');
    });
  }

  private async shutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      logger.info('Shutdown already in progress...');
      return;
    }

    this.isShuttingDown = true;
    logger.warn(`\nReceived ${signal}, starting graceful shutdown...`);

    const shutdownTimer = setTimeout(() => {
      logger.error('Shutdown timeout exceeded, forcing exit...');
      process.exit(1);
    }, this.shutdownTimeout);

    try {
      // Close services in reverse order
      for (const service of [...this.services].reverse()) {
        try {
          logger.info(`Shutting down ${service.name}...`);
          await service.close();
          logger.info(`${service.name} shut down successfully`);
        } catch (error: any) {
          logger.error(`Error shutting down ${service.name}:`, { error: error.message || error });
        }
      }

      clearTimeout(shutdownTimer);
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error: any) {
      logger.error('Error during shutdown:', { error: error.message || error });
      clearTimeout(shutdownTimer);
      process.exit(1);
    }
  }
}
