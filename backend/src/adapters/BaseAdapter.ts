import { SourceHealth } from '../types/models';

export abstract class BaseAdapter<T> {
  abstract readonly name: string;
  abstract readonly key: string;
  abstract readonly url: string;

  protected health: SourceHealth = {
    name: '',
    key: '',
    status: 'offline',
    lastSuccessfulFetch: null,
    responseTimeMs: 0,
    recordCount: 0,
    url: ''
  };

  abstract fetch(): Promise<T>;

  getHealth(): SourceHealth {
    return {
      ...this.health,
      name: this.name,
      key: this.key,
      url: this.url
    };
  }

  protected updateHealthSuccess(count: number, durationMs: number): void {
    this.health = {
      name: this.name,
      key: this.key,
      status: 'online',
      lastSuccessfulFetch: new Date().toISOString(),
      responseTimeMs: Math.round(durationMs),
      recordCount: count,
      error: undefined,
      url: this.url
    };
  }

  protected updateHealthFailure(errorMsg: string, durationMs: number): void {
    this.health = {
      ...this.health,
      name: this.name,
      key: this.key,
      status: this.health.lastSuccessfulFetch ? 'degraded' : 'offline',
      responseTimeMs: Math.round(durationMs),
      error: errorMsg,
      url: this.url
    };
  }
}
