/* Cyber Shield URL risk settings. Change values here without editing the UI. */
window.URL_RISK_CONFIG = {
  thresholds: { safe: 29, suspicious: 59 },
  weights: {
    knownMalicious: 50, typosquatting: 25, ipAddress: 20, atSymbol: 15,
    suspiciousKeyword: 10, excessiveSubdomains: 10, shortener: 10,
    veryLongUrl: 10, http: 5, veryNewDomain: 10, manyHyphens: 6, manyDigits: 5,
    urlEncoding: 10, punycode: 15
  },
  suspiciousKeywords: ['login', 'verify', 'account', 'password', 'security', 'update', 'reward', 'prize', 'urgent', 'bank', 'payment'],
  shorteners: ['bit.ly', 'tinyurl.com', 't.co', 'is.gd', 'cutt.ly', 'rb.gy', 'shorturl.at'],
  trustedDomains: [
    'google.com','github.com','gitlab.com','stackoverflow.com','developer.mozilla.org','npmjs.com','pypi.org','openai.com','supabase.com','microsoft.com','wikipedia.org',
    'sbi.co.in','onlinesbi.sbi','hdfcbank.com','icicibank.com','axisbank.com','kotak.bank.in','amazon.in','amazon.com','flipkart.com','paytm.com','phonepe.com','gov.in'
  ],
  knownMaliciousDomains: [] // Keep empty unless supplied by a verified threat-intelligence source.
};
