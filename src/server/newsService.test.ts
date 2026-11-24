import test from 'node:test';
import assert from 'node:assert/strict';
import {
  categorizeNewsHeadline,
  cleanCompanyQueryName,
  parseGoogleNewsRss,
} from './newsService.ts';

test('categorizeNewsHeadline classifies agreements, projects/orders, earnings, and market updates', () => {
  assert.equal(
    categorizeNewsHeadline('Cochin Shipyard and Damen sign agreement on low-emission vessels'),
    'Agreement & Deal',
  );
  assert.equal(
    categorizeNewsHeadline('HAL bags Rs 2,400 crore defence order and new project expansion'),
    'Project & Order',
  );
  assert.equal(
    categorizeNewsHeadline('Reliance Industries Q2 FY27 profit rises 12% YoY'),
    'Earnings & Results',
  );
  assert.equal(
    categorizeNewsHeadline('Nifty IT stocks trade mixed ahead of RBI policy'),
    'Market Update',
  );
});

test('cleanCompanyQueryName strips corporate suffixes cleanly', () => {
  assert.equal(cleanCompanyQueryName('Cochin Shipyard Ltd.', 'COCHINSHIP'), 'Cochin Shipyard');
  assert.equal(cleanCompanyQueryName('Tata Consultancy Services Ltd.', 'TCS'), 'Tata Consultancy Services');
  assert.equal(cleanCompanyQueryName('Reliance Industries Ltd.', 'RELIANCE'), 'Reliance Industries');
  assert.equal(cleanCompanyQueryName('State Bank of India', 'SBIN'), 'State Bank of India');
  assert.equal(cleanCompanyQueryName('GAIL (India) Ltd.', 'GAIL'), 'GAIL');
});

test('parseGoogleNewsRss extracts clean headlines, categories, safe URLs, unique IDs, and strips duplicate publisher', () => {
  const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0"><channel>
    <item>
      <title>Cochin Shipyard and Damen sign agreement on low-emission vessels - Business Standard</title>
      <link>https://news.google.com/rss/articles/CBMipAFBVV95cUxN_article_one_123456</link>
      <pubDate>Thu, 19 Nov 2026 06:34:18 GMT</pubDate>
      <source url="https://business-standard.com">Business Standard</source>
    </item>
    <item>
      <title>Cochin Shipyard bags new project order - Mint</title>
      <link>https://news.google.com/rss/articles/CBMipAFBVV95cUxN_article_two_789012</link>
      <pubDate>Thu, 19 Nov 2026 07:34:18 GMT</pubDate>
      <source url="https://livemint.com">Mint</source>
    </item>
    <item>
      <title>Unsafe link should be ignored - Spam</title>
      <link>javascript:alert(1)</link>
      <pubDate>Thu, 19 Nov 2026 06:34:18 GMT</pubDate>
      <source>Spam</source>
    </item>
  </channel></rss>`;

  const parsed = parseGoogleNewsRss(sampleXml, {
    symbol: 'COCHINSHIP',
    exchange: 'NSE',
    companyName: 'Cochin Shipyard Ltd.',
  });

  assert.equal(parsed.length, 2);
  assert.notEqual(parsed[0].id, parsed[1].id);
  assert.equal(parsed[0].symbol, 'COCHINSHIP');
  assert.equal(parsed[0].title, 'Cochin Shipyard and Damen sign agreement on low-emission vessels');
  assert.equal(parsed[0].source, 'Business Standard');
  assert.equal(parsed[0].category, 'Agreement & Deal');
  assert.equal(parsed[1].category, 'Project & Order');
});
