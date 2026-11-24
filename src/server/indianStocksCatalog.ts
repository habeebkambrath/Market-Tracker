export interface CatalogStockEntry {
  symbol: string;
  name: string;
  sector: string;
  basePrice: number;
  dailyReturnsPct?: number[];
  volumeBase?: number;
}

const CURATED_OVERRIDES: Record<string, { dailyReturnsPct: number[]; volumeBase: number }> = {
  RELIANCE: {
    dailyReturnsPct: [
      -0.6, -0.8, -0.5, -0.7, -0.4, -0.5, 0.4, -0.2, 0.5, -0.3,
      0.6, -0.2, 0.7, -0.1, 0.8, -0.2, 0.6, 0.5, -0.3, 1.35,
    ],
    volumeBase: 8420500,
  },
  TCS: {
    dailyReturnsPct: [
      0.4, -0.5, 0.2, -0.3, 0.6, -0.4, 0.1, -0.2, 0.3, -0.1,
      -0.3, 0.4, -0.2, 0.2, -0.1, 0.3, -0.4, 0.2, -0.1, -0.28,
    ],
    volumeBase: 2145300,
  },
  HDFCBANK: {
    dailyReturnsPct: [
      0.3, -0.6, -0.5, 0.4, -0.9, -0.6, 0.3, -0.8, -0.7, 0.4,
      -0.9, -0.5, 0.2, -0.7, -0.6, 0.3, -0.8, -0.6, 0.2, -1.12,
    ],
    volumeBase: 14280400,
  },
  INFY: {
    dailyReturnsPct: [
      0.5, 0.8, -0.3, 0.9, 0.4, 1.1, -0.2, 0.8, 0.6, -0.4,
      0.9, 0.7, -0.2, 0.8, 0.9, -0.3, 0.7, 0.8, -0.2, 1.64,
    ],
    volumeBase: 6912000,
  },
  SBIN: {
    dailyReturnsPct: [
      -0.4, -0.5, -0.3, -0.6, 0.3, -0.2, 0.5, -0.3, 0.4, -0.2,
      0.6, -0.3, 0.5, -0.1, 0.6, -0.2, 0.7, -0.2, 0.5, 1.18,
    ],
    volumeBase: 16450100,
  },
};

export const INDIAN_STOCKS_CATALOG: CatalogStockEntry[] = [
  // Energy, Oil & Gas, Power
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', sector: 'Energy & Retail', basePrice: 1265.0 },
  { symbol: 'GAIL', name: 'GAIL (India) Ltd.', sector: 'Oil & Gas', basePrice: 196.4 },
  { symbol: 'ONGC', name: 'Oil & Natural Gas Corporation Ltd.', sector: 'Oil & Gas', basePrice: 254.8 },
  { symbol: 'IOC', name: 'Indian Oil Corporation Ltd.', sector: 'Oil & Gas', basePrice: 138.6 },
  { symbol: 'BPCL', name: 'Bharat Petroleum Corporation Ltd.', sector: 'Oil & Gas', basePrice: 294.2 },
  { symbol: 'HPCL', name: 'Hindustan Petroleum Corporation Ltd.', sector: 'Oil & Gas', basePrice: 378.5 },
  { symbol: 'OIL', name: 'Oil India Ltd.', sector: 'Oil & Gas', basePrice: 468.0 },
  { symbol: 'PETRONET', name: 'Petronet LNG Ltd.', sector: 'Oil & Gas', basePrice: 326.4 },
  { symbol: 'IGL', name: 'Indraprastha Gas Ltd.', sector: 'Oil & Gas', basePrice: 392.0 },
  { symbol: 'MGL', name: 'Mahanagar Gas Ltd.', sector: 'Oil & Gas', basePrice: 1285.0 },
  { symbol: 'GUJGASLTD', name: 'Gujarat Gas Ltd.', sector: 'Oil & Gas', basePrice: 498.5 },
  { symbol: 'ATGL', name: 'Adani Total Gas Ltd.', sector: 'Oil & Gas', basePrice: 695.0 },
  { symbol: 'COALINDIA', name: 'Coal India Ltd.', sector: 'Mining & Energy', basePrice: 418.2 },
  { symbol: 'NTPC', name: 'NTPC Ltd.', sector: 'Power', basePrice: 374.0 },
  { symbol: 'POWERGRID', name: 'Power Grid Corporation of India Ltd.', sector: 'Power', basePrice: 316.8 },
  { symbol: 'TATAPOWER', name: 'Tata Power Company Ltd.', sector: 'Power', basePrice: 412.5 },
  { symbol: 'ADANIPOWER', name: 'Adani Power Ltd.', sector: 'Power', basePrice: 548.0 },
  { symbol: 'ADANIGREEN', name: 'Adani Green Energy Ltd.', sector: 'Renewables', basePrice: 1184.0 },
  { symbol: 'JSWENERGY', name: 'JSW Energy Ltd.', sector: 'Power', basePrice: 642.0 },
  { symbol: 'NHPC', name: 'NHPC Ltd.', sector: 'Power', basePrice: 82.4 },
  { symbol: 'SJVN', name: 'SJVN Ltd.', sector: 'Power', basePrice: 108.6 },
  { symbol: 'SUZLON', name: 'Suzlon Energy Ltd.', sector: 'Renewables', basePrice: 64.2 },

  // IT & Tech
  { symbol: 'TCS', name: 'Tata Consultancy Services Ltd.', sector: 'IT Services', basePrice: 4110.0 },
  { symbol: 'INFY', name: 'Infosys Ltd.', sector: 'IT Services', basePrice: 1735.0 },
  { symbol: 'HCLTECH', name: 'HCL Technologies Ltd.', sector: 'IT Services', basePrice: 1842.0 },
  { symbol: 'WIPRO', name: 'Wipro Ltd.', sector: 'IT Services', basePrice: 545.0 },
  { symbol: 'TECHM', name: 'Tech Mahindra Ltd.', sector: 'IT Services', basePrice: 1684.0 },
  { symbol: 'LTIM', name: 'LTIMindtree Ltd.', sector: 'IT Services', basePrice: 5980.0 },
  { symbol: 'PERSISTENT', name: 'Persistent Systems Ltd.', sector: 'IT Services', basePrice: 5640.0 },
  { symbol: 'COFORGE', name: 'Coforge Ltd.', sector: 'IT Services', basePrice: 8120.0 },
  { symbol: 'KPITTECH', name: 'KPIT Technologies Ltd.', sector: 'IT Services', basePrice: 1412.0 },
  { symbol: 'TATAELXSI', name: 'Tata Elxsi Ltd.', sector: 'IT Services', basePrice: 6780.0 },
  { symbol: 'MPHASIS', name: 'Mphasis Ltd.', sector: 'IT Services', basePrice: 2890.0 },
  { symbol: 'LTTS', name: 'L&T Technology Services Ltd.', sector: 'IT Services', basePrice: 5210.0 },

  // Banking & Financial Services
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', sector: 'Banking', basePrice: 1715.0 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd.', sector: 'Banking', basePrice: 1284.0 },
  { symbol: 'SBIN', name: 'State Bank of India', sector: 'Banking', basePrice: 818.0 },
  { symbol: 'AXISBANK', name: 'Axis Bank Ltd.', sector: 'Banking', basePrice: 1165.0 },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd.', sector: 'Banking', basePrice: 1765.0 },
  { symbol: 'INDUSINDBK', name: 'IndusInd Bank Ltd.', sector: 'Banking', basePrice: 1024.0 },
  { symbol: 'PNB', name: 'Punjab National Bank', sector: 'Banking', basePrice: 104.5 },
  { symbol: 'BANKBARODA', name: 'Bank of Baroda', sector: 'Banking', basePrice: 244.8 },
  { symbol: 'CANBK', name: 'Canara Bank', sector: 'Banking', basePrice: 102.3 },
  { symbol: 'UNIONBANK', name: 'Union Bank of India', sector: 'Banking', basePrice: 118.4 },
  { symbol: 'IDFCFIRSTB', name: 'IDFC First Bank Ltd.', sector: 'Banking', basePrice: 65.8 },
  { symbol: 'FEDERALBNK', name: 'Federal Bank Ltd.', sector: 'Banking', basePrice: 204.6 },
  { symbol: 'YESBANK', name: 'Yes Bank Ltd.', sector: 'Banking', basePrice: 19.8 },
  { symbol: 'BANDHANBNK', name: 'Bandhan Bank Ltd.', sector: 'Banking', basePrice: 168.5 },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd.', sector: 'Financial Services', basePrice: 6820.0 },
  { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv Ltd.', sector: 'Financial Services', basePrice: 1642.0 },
  { symbol: 'JIOFIN', name: 'Jio Financial Services Ltd.', sector: 'Financial Services', basePrice: 324.0 },
  { symbol: 'LICI', name: 'Life Insurance Corporation of India', sector: 'Insurance', basePrice: 928.0 },
  { symbol: 'SBILIFE', name: 'SBI Life Insurance Company Ltd.', sector: 'Insurance', basePrice: 1485.0 },
  { symbol: 'HDFCLIFE', name: 'HDFC Life Insurance Company Ltd.', sector: 'Insurance', basePrice: 648.0 },
  { symbol: 'ICICIPRULI', name: 'ICICI Prudential Life Insurance', sector: 'Insurance', basePrice: 682.0 },
  { symbol: 'CHOLAFIN', name: 'Cholamandalam Investment & Finance', sector: 'Financial Services', basePrice: 1295.0 },
  { symbol: 'SHRIRAMFIN', name: 'Shriram Finance Ltd.', sector: 'Financial Services', basePrice: 2980.0 },
  { symbol: 'PFC', name: 'Power Finance Corporation Ltd.', sector: 'Financial Services', basePrice: 468.0 },
  { symbol: 'RECLTD', name: 'REC Ltd.', sector: 'Financial Services', basePrice: 524.0 },
  { symbol: 'IRFC', name: 'Indian Railway Finance Corporation Ltd.', sector: 'Financial Services', basePrice: 152.4 },
  { symbol: 'MUTHOOTFIN', name: 'Muthoot Finance Ltd.', sector: 'Financial Services', basePrice: 1945.0 },
  { symbol: 'CDSL', name: 'Central Depository Services (India) Ltd.', sector: 'Capital Markets', basePrice: 1680.0 },
  { symbol: 'BSE', name: 'BSE Ltd.', sector: 'Capital Markets', basePrice: 4620.0 },
  { symbol: 'MCX', name: 'Multi Commodity Exchange of India Ltd.', sector: 'Capital Markets', basePrice: 6180.0 },
  { symbol: 'ANGELONE', name: 'Angel One Ltd.', sector: 'Capital Markets', basePrice: 2890.0 },

  // Telecom & Digital
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd.', sector: 'Telecom', basePrice: 1475.0 },
  { symbol: 'IDEA', name: 'Vodafone Idea Ltd.', sector: 'Telecom', basePrice: 8.2 },
  { symbol: 'INDUSTOWER', name: 'Indus Towers Ltd.', sector: 'Telecom', basePrice: 342.0 },
  { symbol: 'TATACOMM', name: 'Tata Communications Ltd.', sector: 'Telecom', basePrice: 1795.0 },
  { symbol: 'ETERNAL', name: 'Eternal Ltd. (formerly Zomato)', sector: 'Consumer Tech', basePrice: 362.1 },
  { symbol: 'PAYTM', name: 'One 97 Communications Ltd. (Paytm)', sector: 'Fintech', basePrice: 892.0 },
  { symbol: 'NYKAA', name: 'FSN E-Commerce Ventures Ltd. (Nykaa)', sector: 'Consumer Tech', basePrice: 168.4 },
  { symbol: 'POLICYBZR', name: 'PB Fintech Ltd. (Policybazaar)', sector: 'Fintech', basePrice: 1890.0 },
  { symbol: 'NAUKRI', name: 'Info Edge (India) Ltd.', sector: 'Consumer Tech', basePrice: 7940.0 },
  { symbol: 'IRCTC', name: 'Indian Railway Catering & Tourism Corp.', sector: 'Travel & Tech', basePrice: 814.0 },
  { symbol: 'INDIGO', name: 'InterGlobe Aviation Ltd. (IndiGo)', sector: 'Aviation', basePrice: 4280.0 },

  // Automobile & EV
  { symbol: 'TMCV', name: 'Tata Motors Ltd. (Commercial Vehicles)', sector: 'Automobile', basePrice: 430.0 },
  { symbol: 'TMPV', name: 'Tata Motors Passenger Vehicles Ltd.', sector: 'Automobile', basePrice: 430.0 },
  { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd.', sector: 'Automobile', basePrice: 11240.0 },
  { symbol: 'M&M', name: 'Mahindra & Mahindra Ltd.', sector: 'Automobile', basePrice: 2910.0 },
  { symbol: 'BAJAJ-AUTO', name: 'Bajaj Auto Ltd.', sector: 'Automobile', basePrice: 9420.0 },
  { symbol: 'EICHERMOT', name: 'Eicher Motors Ltd.', sector: 'Automobile', basePrice: 4890.0 },
  { symbol: 'HEROMOTOCO', name: 'Hero MotoCorp Ltd.', sector: 'Automobile', basePrice: 4720.0 },
  { symbol: 'TVSMOTOR', name: 'TVS Motor Company Ltd.', sector: 'Automobile', basePrice: 2485.0 },
  { symbol: 'ASHOKLEY', name: 'Ashok Leyland Ltd.', sector: 'Automobile', basePrice: 226.4 },
  { symbol: 'MOTHERSON', name: 'Samvardhana Motherson International', sector: 'Auto Components', basePrice: 164.2 },
  { symbol: 'BOSCHLTD', name: 'Bosch Ltd.', sector: 'Auto Components', basePrice: 34800.0 },

  // FMCG, Retail & Consumer
  { symbol: 'ITC', name: 'ITC Ltd.', sector: 'FMCG', basePrice: 482.0 },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd.', sector: 'FMCG', basePrice: 2490.0 },
  { symbol: 'NESTLEIND', name: 'Nestle India Ltd.', sector: 'FMCG', basePrice: 2265.0 },
  { symbol: 'BRITANNIA', name: 'Britannia Industries Ltd.', sector: 'FMCG', basePrice: 4920.0 },
  { symbol: 'TATACONSUM', name: 'Tata Consumer Products Ltd.', sector: 'FMCG', basePrice: 964.0 },
  { symbol: 'DABUR', name: 'Dabur India Ltd.', sector: 'FMCG', basePrice: 528.0 },
  { symbol: 'GODREJCP', name: 'Godrej Consumer Products Ltd.', sector: 'FMCG', basePrice: 1210.0 },
  { symbol: 'MARICO', name: 'Marico Ltd.', sector: 'FMCG', basePrice: 618.0 },
  { symbol: 'VBL', name: 'Varun Beverages Ltd.', sector: 'Beverages', basePrice: 612.0 },
  { symbol: 'DMART', name: 'Avenue Supermarts Ltd. (DMart)', sector: 'Retail', basePrice: 3840.0 },
  { symbol: 'TRENT', name: 'Trent Ltd.', sector: 'Retail', basePrice: 6720.0 },
  { symbol: 'TITAN', name: 'Titan Company Ltd.', sector: 'Consumer Goods', basePrice: 3290.0 },
  { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd.', sector: 'Consumer Goods', basePrice: 2560.0 },
  { symbol: 'PIDILITIND', name: 'Pidilite Industries Ltd.', sector: 'Chemicals', basePrice: 3040.0 },
  { symbol: 'HAVELLS', name: 'Havells India Ltd.', sector: 'Consumer Durables', basePrice: 1685.0 },
  { symbol: 'VOLTAS', name: 'Voltas Ltd.', sector: 'Consumer Durables', basePrice: 1712.0 },
  { symbol: 'DIXON', name: 'Dixon Technologies (India) Ltd.', sector: 'Electronics', basePrice: 15840.0 },
  { symbol: 'KALYANKJIL', name: 'Kalyan Jewellers India Ltd.', sector: 'Retail', basePrice: 698.0 },

  // Infrastructure, Defence, Metals & Capital Goods
  { symbol: 'LT', name: 'Larsen & Toubro Ltd.', sector: 'Infrastructure', basePrice: 3610.0 },
  { symbol: 'ADANIENT', name: 'Adani Enterprises Ltd.', sector: 'Conglomerate', basePrice: 2480.0 },
  { symbol: 'ADANIPORTS', name: 'Adani Ports & Special Economic Zone', sector: 'Infrastructure', basePrice: 1245.0 },
  { symbol: 'HAL', name: 'Hindustan Aeronautics Ltd.', sector: 'Aerospace & Defence', basePrice: 4320.0 },
  { symbol: 'BEL', name: 'Bharat Electronics Ltd.', sector: 'Aerospace & Defence', basePrice: 298.4 },
  { symbol: 'BHEL', name: 'Bharat Heavy Electricals Ltd.', sector: 'Capital Goods', basePrice: 242.6 },
  { symbol: 'MAZDOCK', name: 'Mazagon Dock Shipbuilders Ltd.', sector: 'Defence', basePrice: 4480.0 },
  { symbol: 'COCHINSHIP', name: 'Cochin Shipyard Ltd.', sector: 'Defence', basePrice: 1540.0 },
  { symbol: 'RVNL', name: 'Rail Vikas Nigam Ltd.', sector: 'Infrastructure', basePrice: 438.0 },
  { symbol: 'NBCC', name: 'NBCC (India) Ltd.', sector: 'Infrastructure', basePrice: 94.5 },
  { symbol: 'HUDCO', name: 'Housing & Urban Development Corp.', sector: 'Infrastructure', basePrice: 228.0 },
  { symbol: 'SIEMENS', name: 'Siemens Ltd.', sector: 'Capital Goods', basePrice: 7180.0 },
  { symbol: 'ABB', name: 'ABB India Ltd.', sector: 'Capital Goods', basePrice: 7420.0 },
  { symbol: 'CGPOWER', name: 'CG Power & Industrial Solutions Ltd.', sector: 'Capital Goods', basePrice: 734.0 },
  { symbol: 'POLYCAB', name: 'Polycab India Ltd.', sector: 'Cables & Electricals', basePrice: 6940.0 },
  { symbol: 'TATASTEEL', name: 'Tata Steel Ltd.', sector: 'Metals', basePrice: 146.8 },
  { symbol: 'JSWSTEEL', name: 'JSW Steel Ltd.', sector: 'Metals', basePrice: 962.0 },
  { symbol: 'HINDALCO', name: 'Hindalco Industries Ltd.', sector: 'Metals', basePrice: 658.0 },
  { symbol: 'VEDL', name: 'Vedanta Ltd.', sector: 'Metals & Mining', basePrice: 454.0 },
  { symbol: 'SAIL', name: 'Steel Authority of India Ltd.', sector: 'Metals', basePrice: 118.4 },
  { symbol: 'NMDC', name: 'NMDC Ltd.', sector: 'Mining', basePrice: 232.0 },
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement Ltd.', sector: 'Cement', basePrice: 11280.0 },
  { symbol: 'AMBUJACEM', name: 'Ambuja Cements Ltd.', sector: 'Cement', basePrice: 546.0 },
  { symbol: 'GRASIM', name: 'Grasim Industries Ltd.', sector: 'Cement & Materials', basePrice: 2610.0 },
  { symbol: 'DLF', name: 'DLF Ltd.', sector: 'Real Estate', basePrice: 814.0 },

  // Pharma & Healthcare
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Industries', sector: 'Pharma', basePrice: 1710.0 },
  { symbol: 'CIPLA', name: 'Cipla Ltd.', sector: 'Pharma', basePrice: 1512.0 },
  { symbol: 'DRREDDY', name: "Dr. Reddy's Laboratories Ltd.", sector: 'Pharma', basePrice: 1228.0 },
  { symbol: 'DIVISLAB', name: "Divi's Laboratories Ltd.", sector: 'Pharma', basePrice: 5890.0 },
  { symbol: 'LUPIN', name: 'Lupin Ltd.', sector: 'Pharma', basePrice: 2045.0 },
  { symbol: 'AUROPHARMA', name: 'Aurobindo Pharma Ltd.', sector: 'Pharma', basePrice: 1284.0 },
  { symbol: 'BIOCON', name: 'Biocon Ltd.', sector: 'Pharma', basePrice: 342.0 },
  { symbol: 'APOLLOHOSP', name: 'Apollo Hospitals Enterprise Ltd.', sector: 'Healthcare', basePrice: 6940.0 },
  { symbol: 'MAXHEALTH', name: 'Max Healthcare Institute Ltd.', sector: 'Healthcare', basePrice: 1024.0 },
];

export function generateDeterministicReturns(symbol: string): number[] {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = (hash * 31 + symbol.charCodeAt(i)) >>> 0;
  }

  // Distribute across 3 realistic market regimes (bullish, oversold/dip, neutral)
  const regime = hash % 3;
  const returns: number[] = [];
  for (let day = 0; day < 20; day++) {
    const wave = Math.sin((hash + day * 17) * 0.7) * 0.85;
    const bias = regime === 0 ? 0.22 : regime === 1 ? -0.18 : 0.02;
    const pct = Number((bias + wave).toFixed(2));
    returns.push(pct);
  }
  return returns;
}

export function resolveCatalogEntry(symbol: string): CatalogStockEntry {
  const upper = symbol.trim().toUpperCase();
  const found = INDIAN_STOCKS_CATALOG.find((s) => s.symbol === upper);
  if (found) {
    const override = CURATED_OVERRIDES[found.symbol];
    return {
      ...found,
      dailyReturnsPct: override?.dailyReturnsPct ?? generateDeterministicReturns(found.symbol),
      volumeBase: override?.volumeBase ?? 3200000 + ((upper.charCodeAt(0) * 97123) % 9000000),
    };
  }

  // Custom NSE/BSE ticker fallback so ANY valid symbol works seamlessly
  let hash = 0;
  for (let i = 0; i < upper.length; i++) {
    hash = (hash * 37 + upper.charCodeAt(i)) >>> 0;
  }
  const basePrice = Number((120 + (hash % 3400) + ((hash % 95) / 100)).toFixed(2));
  return {
    symbol: upper,
    name: `${upper} India Ltd.`,
    sector: 'Listed Equity',
    basePrice,
    dailyReturnsPct: generateDeterministicReturns(upper),
    volumeBase: 1200000 + (hash % 5000000),
  };
}
