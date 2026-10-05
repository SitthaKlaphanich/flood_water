"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAdapter = void 0;
class BaseAdapter {
    health = {
        name: '',
        key: '',
        status: 'offline',
        lastSuccessfulFetch: null,
        responseTimeMs: 0,
        recordCount: 0,
        url: ''
    };
    getHealth() {
        return {
            ...this.health,
            name: this.name,
            key: this.key,
            url: this.url
        };
    }
    updateHealthSuccess(count, durationMs) {
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
    updateHealthFailure(errorMsg, durationMs) {
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
exports.BaseAdapter = BaseAdapter;
