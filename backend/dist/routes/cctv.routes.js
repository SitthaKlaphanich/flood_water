"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const url_1 = require("url");
const AggregatorService_1 = require("../services/AggregatorService");
const router = (0, express_1.Router)();
// Allowed hosts for secure proxying
const ALLOWED_HOSTS = [
    'bmatraffic.com',
    'www.bmatraffic.com',
    'cpudapp.bangkok.go.th',
    'floodbangkok.bangkok.go.th',
    'weather.bangkok.go.th',
    'bmasedgis.bangkok.go.th'
];
const cameraCache = new Map();
const CACHE_TTL_MS = 10000; // 10 seconds per camera
// Clean up expired cache every 60 seconds
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cameraCache.entries()) {
        if (now - entry.fetchedAt > CACHE_TTL_MS * 2) {
            cameraCache.delete(key);
        }
    }
}, 60000);
router.get('/cctv', (_req, res) => {
    const state = AggregatorService_1.aggregator.getState();
    res.json({
        status: state.status,
        count: state.cctv.length,
        data: state.cctv
    });
});
/**
 * Standard fetch without custom/spoofed headers.
 * Respects public accessibility and follows safe HTTP redirects.
 */
function fetchPublicImage(targetUrl, maxRedirects = 3) {
    return new Promise((resolve, reject) => {
        const parsed = new url_1.URL(targetUrl);
        const client = parsed.protocol === 'https:' ? https_1.default : http_1.default;
        // Standard client without forged Referer or special headers
        const req = client.get(targetUrl, {
            timeout: 10000,
            headers: {
                'Accept': 'image/*,*/*;q=0.8'
            }
        }, (remoteRes) => {
            if (remoteRes.statusCode &&
                remoteRes.statusCode >= 300 &&
                remoteRes.statusCode < 400 &&
                remoteRes.headers.location &&
                maxRedirects > 0) {
                const nextUrl = new url_1.URL(remoteRes.headers.location, targetUrl).toString();
                remoteRes.resume();
                return resolve(fetchPublicImage(nextUrl, maxRedirects - 1));
            }
            if (remoteRes.statusCode && remoteRes.statusCode >= 400) {
                remoteRes.resume();
                return reject(new Error(`Remote server HTTP ${remoteRes.statusCode}`));
            }
            const chunks = [];
            remoteRes.on('data', chunk => chunks.push(chunk));
            remoteRes.on('end', () => {
                const buffer = Buffer.concat(chunks);
                const contentType = remoteRes.headers['content-type'] || 'image/jpeg';
                resolve({ buffer, contentType });
            });
        });
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Image fetch timeout (10s)'));
        });
    });
}
/**
 * Image proxy endpoint:
 * - Strictly rate-limited to <= 1 fetch per 10s per camera
 * - Transparent headers
 * - Inspects byte length to flag blank placeholder images
 */
router.get('/cctv/proxy-image', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        res.status(400).json({ error: 'Missing url parameter' });
        return;
    }
    try {
        const parsed = new url_1.URL(targetUrl);
        const isAllowed = ALLOWED_HOSTS.some(h => parsed.hostname === h || parsed.hostname.endsWith('.' + h));
        if (!isAllowed) {
            res.status(403).json({ error: 'Host not permitted in allowed domain list' });
            return;
        }
        const now = Date.now();
        const cached = cameraCache.get(targetUrl);
        if (cached && (now - cached.fetchedAt) < CACHE_TTL_MS) {
            // Serve cached image (within 10s window)
            res.setHeader('Content-Type', cached.contentType);
            res.setHeader('Cache-Control', 'public, max-age=10');
            res.setHeader('X-Cache-Status', 'HIT');
            res.setHeader('X-Fetched-At', new Date(cached.fetchedAt).toISOString());
            res.setHeader('X-Image-Bytes', cached.buffer.length.toString());
            if (cached.buffer.length <= 1600) {
                res.setHeader('X-Image-Blank', 'true');
            }
            res.send(cached.buffer);
            return;
        }
        // Fetch fresh image from origin
        const { buffer, contentType } = await fetchPublicImage(targetUrl);
        // Save to rate limit cache
        cameraCache.set(targetUrl, {
            buffer,
            contentType,
            fetchedAt: now
        });
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=10');
        res.setHeader('X-Cache-Status', 'MISS');
        res.setHeader('X-Fetched-At', new Date(now).toISOString());
        res.setHeader('X-Image-Bytes', buffer.length.toString());
        // If BMA server returned their known ~1.4KB blank placeholder, send header flag
        if (buffer.length <= 1600) {
            res.setHeader('X-Image-Blank', 'true');
        }
        res.send(buffer);
    }
    catch (err) {
        if (!res.headersSent) {
            res.status(502).json({
                error: 'Failed to fetch camera snapshot from source',
                details: err.message
            });
        }
    }
});
exports.default = router;
