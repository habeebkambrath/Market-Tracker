import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import type {
  AlertCondition,
  Exchange,
  PerformanceLogEntry,
  PriceAlert,
  StockQuote,
  StockSearchResult,
  WatchlistItem,
} from '../types/market.ts';
import type { ImportedPerformanceRow } from '../utils/excel.ts';
import {
  makePerformanceLogDocId,
  makePriceAlertDocId,
  makeWatchlistDocId,
} from '../utils/formatters.ts';

// Constants synchronized with firebase-blueprint.json
const SYMBOL_REGEX = /^[A-Z0-9.\-&]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function clampString(val: string, maxLen: number): string {
  return val.trim().slice(0, maxLen);
}

export async function ensureUserProfile(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userRef);
    const displayName = clampString(user.displayName || user.email || 'Market Tracker User', 120);
    const email = clampString(user.email || 'user@example.com', 200);
    const photoURL = clampString(user.photoURL || '', 500);

    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        displayName,
        email,
        photoURL,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, {
        displayName,
        email,
        photoURL,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeWatchlist(
  userId: string,
  onData: (items: WatchlistItem[]) => void,
  onError: (err: Error) => void,
): () => void {
  const path = `users/${userId}/watchlist`;
  const q = query(
    collection(db, 'users', userId, 'watchlist'),
    where('userId', '==', userId),
    orderBy('addedAt', 'desc'),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: WatchlistItem[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: String(data.userId),
          symbol: String(data.symbol),
          name: String(data.name),
          exchange: (data.exchange === 'BSE' ? 'BSE' : 'NSE') as Exchange,
          sector: String(data.sector || 'Equity'),
          addedAt: data.addedAt,
        };
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    },
  );
}

export async function addStockToWatchlist(
  userId: string,
  stock: Pick<StockSearchResult, 'symbol' | 'name' | 'exchange' | 'sector'>,
): Promise<void> {
  const symbol = clampString(stock.symbol.toUpperCase(), 24);
  if (!SYMBOL_REGEX.test(symbol)) {
    throw new Error(`Invalid stock symbol format: ${symbol}`);
  }
  const exchange: Exchange = stock.exchange === 'BSE' ? 'BSE' : 'NSE';
  const docId = makeWatchlistDocId(exchange, symbol);
  const path = `users/${userId}/watchlist/${docId}`;

  try {
    const ref = doc(db, 'users', userId, 'watchlist', docId);
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      return;
    }

    await setDoc(ref, {
      userId,
      symbol,
      name: clampString(stock.name, 120),
      exchange,
      sector: clampString(stock.sector || 'Equity', 60),
      addedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function removeStockFromWatchlist(userId: string, itemId: string): Promise<void> {
  const path = `users/${userId}/watchlist/${itemId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'watchlist', itemId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribePerformanceLogs(
  userId: string,
  onData: (logs: PerformanceLogEntry[]) => void,
  onError: (err: Error) => void,
): () => void {
  const path = `users/${userId}/performanceLogs`;
  const q = query(
    collection(db, 'users', userId, 'performanceLogs'),
    where('userId', '==', userId),
    orderBy('date', 'desc'),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const logs: PerformanceLogEntry[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: String(data.userId),
          date: String(data.date),
          symbol: String(data.symbol),
          exchange: (data.exchange === 'BSE' ? 'BSE' : 'NSE') as Exchange,
          closingPrice: Number(data.closingPrice),
          dailyChangePct: Number(data.dailyChangePct),
          signal:
            data.signal === 'Buy' || data.signal === 'Sell' ? data.signal : 'Hold',
          reason: String(data.reason || ''),
          source: data.source === 'import' ? 'import' : 'auto',
        };
      });
      onData(logs);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    },
  );
}

export async function syncDailyClosingLogs(
  userId: string,
  quotes: StockQuote[],
  existingLogs: PerformanceLogEntry[],
): Promise<number> {
  if (quotes.length === 0) return 0;

  const existingIds = new Set(existingLogs.map((l) => l.id));
  const batch = writeBatch(db);
  let writeCount = 0;

  for (const quote of quotes) {
    // Log trailing 5 trading days for each watchlist stock so day-by-day history builds cleanly
    const recentDays = quote.historicalCloses.slice(-5);
    for (const dayPoint of recentDays) {
      if (!DATE_REGEX.test(dayPoint.date) || !SYMBOL_REGEX.test(quote.symbol)) continue;
      const docId = makePerformanceLogDocId(dayPoint.date, quote.exchange, quote.symbol);
      const isToday = dayPoint.date === recentDays[recentDays.length - 1]?.date;

      // Avoid redundant writes for immutable past days already logged; update today's entry if price changed
      const existing = existingLogs.find((l) => l.id === docId);
      if (existing && (!isToday || Math.abs(existing.closingPrice - dayPoint.close) < 0.01)) {
        continue;
      }

      const ref = doc(db, 'users', userId, 'performanceLogs', docId);
      const safePrice = Math.min(Math.max(Number(dayPoint.close.toFixed(2)), 0.01), 10000000);
      const safeChange = Math.min(Math.max(Number(dayPoint.changePct.toFixed(2)), -100), 1000);
      const safeReason = clampString(quote.reason || 'Daily market close snapshot', 200);

      if (existingIds.has(docId)) {
        batch.update(ref, {
          closingPrice: safePrice,
          dailyChangePct: safeChange,
          signal: quote.signal,
          reason: safeReason,
          source: 'auto',
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.set(ref, {
          userId,
          date: dayPoint.date,
          symbol: clampString(quote.symbol.toUpperCase(), 24),
          exchange: quote.exchange,
          closingPrice: safePrice,
          dailyChangePct: safeChange,
          signal: quote.signal,
          reason: safeReason,
          source: 'auto',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      writeCount++;
    }
  }

  if (writeCount === 0) return 0;

  const path = `users/${userId}/performanceLogs`;
  try {
    await batch.commit();
    return writeCount;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function importPerformanceRowsToFirestore(
  userId: string,
  rows: ImportedPerformanceRow[],
  existingLogs: PerformanceLogEntry[],
): Promise<number> {
  if (rows.length === 0) return 0;

  const existingIds = new Set(existingLogs.map((l) => l.id));
  const path = `users/${userId}/performanceLogs`;

  // Process in chunks of 400 to stay safely below Firestore's 500-op batch limit
  const chunkSize = 400;
  let totalImported = 0;

  try {
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const batch = writeBatch(db);

      for (const row of chunk) {
        if (!DATE_REGEX.test(row.date) || !SYMBOL_REGEX.test(row.symbol)) continue;
        const docId = makePerformanceLogDocId(row.date, row.exchange, row.symbol);
        const ref = doc(db, 'users', userId, 'performanceLogs', docId);
        const safePrice = Math.min(Math.max(Number(row.closingPrice.toFixed(2)), 0.01), 10000000);
        const safeChange = Math.min(Math.max(Number(row.dailyChangePct.toFixed(2)), -100), 1000);
        const safeReason = clampString(row.reason || 'Imported from Excel ledger', 200);

        if (existingIds.has(docId)) {
          batch.update(ref, {
            closingPrice: safePrice,
            dailyChangePct: safeChange,
            signal: row.signal,
            reason: safeReason,
            source: 'import',
            updatedAt: serverTimestamp(),
          });
        } else {
          batch.set(ref, {
            userId,
            date: row.date,
            symbol: clampString(row.symbol.toUpperCase(), 24),
            exchange: row.exchange,
            closingPrice: safePrice,
            dailyChangePct: safeChange,
            signal: row.signal,
            reason: safeReason,
            source: 'import',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          existingIds.add(docId);
        }
        totalImported++;
      }

      await batch.commit();
    }

    return totalImported;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribePriceAlerts(
  userId: string,
  onData: (alerts: PriceAlert[]) => void,
  onError: (err: Error) => void,
): () => void {
  const path = `users/${userId}/priceAlerts`;
  const q = query(
    collection(db, 'users', userId, 'priceAlerts'),
    where('userId', '==', userId),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const alerts: PriceAlert[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: String(data.userId),
          symbol: String(data.symbol),
          exchange: (data.exchange === 'BSE' ? 'BSE' : 'NSE') as Exchange,
          condition: (data.condition === 'below' ? 'below' : 'above') as AlertCondition,
          targetPrice: Number(data.targetPrice),
          status: data.status === 'triggered' ? 'triggered' : 'active',
          triggeredPrice: Number(data.triggeredPrice || 0),
        };
      });
      onData(alerts);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    },
  );
}

export async function upsertPriceAlert(
  userId: string,
  symbol: string,
  exchange: Exchange,
  condition: AlertCondition,
  targetPrice: number,
): Promise<void> {
  const cleanSymbol = clampString(symbol.toUpperCase(), 24);
  if (!SYMBOL_REGEX.test(cleanSymbol)) {
    throw new Error(`Invalid stock symbol format: ${cleanSymbol}`);
  }
  const docId = makePriceAlertDocId(exchange, cleanSymbol, condition);
  const path = `users/${userId}/priceAlerts/${docId}`;
  const safeTarget = Math.min(Math.max(Number(targetPrice.toFixed(2)), 0.01), 10000000);

  try {
    const ref = doc(db, 'users', userId, 'priceAlerts', docId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, {
        condition,
        targetPrice: safeTarget,
        status: 'active',
        triggeredPrice: 0,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        userId,
        symbol: cleanSymbol,
        exchange,
        condition,
        targetPrice: safeTarget,
        status: 'active',
        triggeredPrice: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function markPriceAlertsTriggered(
  userId: string,
  hits: { alertId: string; currentPrice: number }[],
): Promise<void> {
  if (hits.length === 0) return;
  const path = `users/${userId}/priceAlerts`;
  const batch = writeBatch(db);

  for (const hit of hits) {
    const ref = doc(db, 'users', userId, 'priceAlerts', hit.alertId);
    const safePrice = Math.min(Math.max(Number(hit.currentPrice.toFixed(2)), 0.01), 10000000);
    batch.update(ref, {
      status: 'triggered',
      triggeredPrice: safePrice,
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deletePriceAlert(userId: string, alertId: string): Promise<void> {
  const path = `users/${userId}/priceAlerts/${alertId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'priceAlerts', alertId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
