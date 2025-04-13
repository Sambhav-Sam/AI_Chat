import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import redisCache from './services/redisCache.js';
import browserManager from './automation/browserManager.js';
import pagePool from './automation/pagePool.js';
import { cleanupBrowserResources } from './automation/automateWebsites.js';
import cacheMetrics from './services/cacheMetrics.js';

// Load environment variables
dotenv.config();

// Import API routes - moved after dotenv.config()
let apiRoutes;
try {
    // Load using dynamic import for better error visibility
    const apiRoutesModule = await import('./api/routes.js');
    apiRoutes = apiRoutesModule.default;
    console.log('API routes loaded successfully');
} catch (error) {
    console.error('Error importing API routes:', error);
    console.warn('Starting server with limited functionality');
    console.log('Stack trace:', error.stack);

    // Create minimal router as fallback
    const router = express.Router();
    router.get('/status', (req, res) => res.json({
        status: 'API limited - route loading error',
        error: error.message,
        errorType: error.name
    }));
    apiRoutes = router;
}

const app = express();
const PORT = process.env.PORT || 5000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Middleware
app.use(cors());
app.use(express.json());

// Ensure the screenshots directory exists
const screenshotsDir = path.join(__dirname, 'automation/screenshots');
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Initialize Redis Cache
const ENABLE_REDIS = process.env.ENABLE_REDIS !== 'false'; // Enable by default
if (ENABLE_REDIS) {
    redisCache.initialize()
        .then((success) => {
            if (success) {
                console.log('Redis cache initialized successfully');
                // Initialize cache metrics
                cacheMetrics.initialize()
                    .then(() => console.log('Cache metrics initialized'))
                    .catch(err => console.error('Error initializing cache metrics:', err));
            } else {
                console.warn('Redis cache initialization failed, continuing without caching');
            }
        })
        .catch(err => {
            console.error('Error initializing Redis cache:', err);
            console.warn('Continuing without Redis cache');
        });
}

// Pre-initialize Browser Manager and Page Pool for faster first request
const BROWSER_PRELOAD = process.env.BROWSER_PRELOAD === 'true';
const PAGE_PRELOAD = process.env.PAGE_PRELOAD === 'true';
const USE_HEADLESS = process.env.USE_HEADLESS === 'true'; // Default to visible browser

console.log(`Browser mode: ${USE_HEADLESS ? 'Headless' : 'Visible'}`);

if (BROWSER_PRELOAD) {
    // Initialize browser manager
    browserManager.initialize({ headless: USE_HEADLESS })
        .then(() => {
            console.log(`Browser manager pre-initialized in ${USE_HEADLESS ? 'headless' : 'visible'} mode`);

            // Then initialize page pool if enabled
            if (PAGE_PRELOAD) {
                // Configure page pool with domains from environment or defaults
                const preloadDomains = process.env.PRELOAD_DOMAINS
                    ? process.env.PRELOAD_DOMAINS.split(',')
                    : ['example.com', 'google.com', 'github.com'];

                pagePool.preloadDomains = preloadDomains;
                pagePool.initialize()
                    .then(() => console.log('Page pool initialized with domains:', preloadDomains))
                    .catch(err => console.error('Error initializing page pool:', err));
            }
        })
        .catch(err => console.error('Error pre-initializing browser manager:', err));
}

// API routes
app.use('/api', apiRoutes);

// Serve screenshots statically
app.use('/screenshots', express.static(screenshotsDir));

// MongoDB connection - only if enabled and URI is provided
const MONGO_URI = process.env.MONGO_URI;
const ENABLE_MONGODB = process.env.ENABLE_MONGODB === 'true';

if (ENABLE_MONGODB && MONGO_URI) {
    import('mongoose').then((mongoose) => {
        mongoose.default.connect(MONGO_URI)
            .then(() => console.log('MongoDB connected'))
            .catch(err => console.error('MongoDB connection error:', err, 'Continuing without MongoDB'));
    }).catch(err => {
        console.error('Error importing mongoose:', err, 'Continuing without MongoDB');
    });
} else {
    console.log('MongoDB connection skipped. Running without database.');
}

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
    const clientBuildPath = path.join(__dirname, '../client/dist');
    app.use(express.static(clientBuildPath));

    app.get('*', (req, res) => {
        res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
}

// Basic route for testing
app.get('/', (req, res) => {
    res.json({
        message: 'API is running',
        status: 'OK',
        version: '1.0.0',
        cacheEnabled: ENABLE_REDIS,
        cacheFallbackActive: redisCache.useInMemory,
        cacheConnected: redisCache.connected,
        browserReady: browserManager.isInitialized,
        pagePoolReady: pagePool.initialized
    });
});

// Status endpoint for monitoring
app.get('/api/status', (req, res) => {
    res.json({
        status: 'OK',
        uptime: process.uptime(),
        timestamp: Date.now(),
        cacheStatus: {
            enabled: ENABLE_REDIS,
            connected: redisCache.connected,
            fallbackActive: redisCache.useInMemory
        }
    });
});

// Handle graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown() {
    console.log('Received shutdown signal. Closing connections...');

    // Close Redis connection
    if (redisCache.connected) {
        await redisCache.close();
    }

    // Clean up browser resources
    await cleanupBrowserResources();

    console.log('All connections closed. Exiting...');

    // Don't exit immediately in development mode to allow for debugging
    // and to prevent unintentional server shutdown
    if (process.env.NODE_ENV === 'production') {
        process.exit(0);
    } else {
        console.log('Server shutdown complete. Process will remain alive for debugging.');
        console.log('Press Ctrl+C again to force exit.');
    }
}

// Start server
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access the API at http://localhost:${PORT}`);
    console.log(`Access the status endpoint at http://localhost:${PORT}/api/status`);
    console.log(`Access the screenshots at http://localhost:${PORT}/screenshots`);
}); 