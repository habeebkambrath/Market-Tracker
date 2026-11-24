import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import type { Exchange } from './src/types/market.ts';
import { marketDataProvider } from './src/server/marketService.ts';
import { fetchWatchlistStockNews } from './src/server/newsService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '1mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', market: 'NSE/BSE' });
  });

  // Live-style NIFTY 50 & BANK NIFTY market indicators
  app.get('/api/market/indices', async (req, res) => {
    try {
      const liveJitter = req.query.live === '1';
      const indices = await marketDataProvider.getIndices(liveJitter);
      res.json({ indices });
    } catch (error) {
      console.error('Failed to fetch market indices:', error);
      res.status(500).json({ error: 'Unable to fetch market indices' });
    }
  });

  // Search Indian stocks across NSE & BSE
  app.get('/api/stocks/search', async (req, res) => {
    try {
      const query = typeof req.query.q === 'string' ? req.query.q.slice(0, 40) : '';
      const rawExchange = typeof req.query.exchange === 'string' ? req.query.exchange.toUpperCase() : 'ALL';
      const exchangeFilter: Exchange | 'ALL' =
        rawExchange === 'NSE' || rawExchange === 'BSE' ? rawExchange : 'ALL';

      const results = await marketDataProvider.searchStocks(query, exchangeFilter);
      res.json({ results });
    } catch (error) {
      console.error('Failed to search stocks:', error);
      res.status(500).json({ error: 'Unable to search stocks' });
    }
  });

  // Batch fetch quotes and technical indicators for watchlist items
  app.get('/api/stocks/quotes', async (req, res) => {
    try {
      const rawSymbols = typeof req.query.symbols === 'string' ? req.query.symbols : '';
      const liveJitter = req.query.live === '1';

      const parsedKeys: { symbol: string; exchange: Exchange }[] = rawSymbols
        .split(',')
        .map((token) => token.trim())
        .filter(Boolean)
        .slice(0, 50)
        .map((token) => {
          const [exPart, symPart] = token.includes(':')
            ? token.split(':', 2)
            : ['NSE', token];
          const exchange: Exchange = exPart.toUpperCase() === 'BSE' ? 'BSE' : 'NSE';
          const symbol = symPart.toUpperCase().replace(/[^A-Z0-9.\-&]/g, '');
          return { symbol, exchange };
        })
        .filter((k) => k.symbol.length > 0);

      const quotes = await marketDataProvider.getQuotes(parsedKeys, liveJitter);
      res.json({ quotes });
    } catch (error) {
      console.error('Failed to fetch stock quotes:', error);
      res.status(500).json({ error: 'Unable to fetch stock quotes' });
    }
  });

  // Fetch latest corporate & market news for watchlist stocks
  app.get('/api/stocks/news', async (req, res) => {
    try {
      const rawSymbols = typeof req.query.symbols === 'string' ? req.query.symbols : '';
      const liveRefresh = req.query.live === '1';

      const parsedKeys: { symbol: string; exchange: Exchange }[] = rawSymbols
        .split(',')
        .map((token) => token.trim())
        .filter(Boolean)
        .slice(0, 20)
        .map((token) => {
          const [exPart, symPart] = token.includes(':')
            ? token.split(':', 2)
            : ['NSE', token];
          const exchange: Exchange = exPart.toUpperCase() === 'BSE' ? 'BSE' : 'NSE';
          const symbol = symPart.toUpperCase().replace(/[^A-Z0-9.\-&]/g, '');
          return { symbol, exchange };
        })
        .filter((k) => k.symbol.length > 0 && /^[A-Z0-9.\-&]+$/.test(k.symbol));

      const news = await fetchWatchlistStockNews(parsedKeys, liveRefresh);
      res.json({ news });
    } catch (error) {
      console.error('Failed to fetch watchlist stock news:', error);
      res.status(500).json({ error: 'Unable to fetch watchlist stock news' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Market Tracker server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
