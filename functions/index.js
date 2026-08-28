/**
 * ============================================================================
 * CYBER SHIELD - CLOUD FUNCTIONS BACKEND
 * ============================================================================
 * 
 * Why this exists:
 * 1. Hides threat detection heuristics and scoring algorithms server-side so
 *    scammers cannot view page source to craft evasion techniques.
 * 2. Provides Admin SDK access to write verified reports to the 'reports'
 *    Firestore collection while blocking direct client browser writes.
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// Pre-defined plain-language explanations dictionary for server responses
const SERVER_REASONS = {
  reason_http_insecure: [
    "This website does not have a secure lock (HTTPS), meaning anything you type can be seen by others.",
    "This link does not use a secure lock. Please tell your family member not to enter passwords here.",
    "This link is not securely encrypted. Warn group members not to type personal details."
  ],
  reason_ip_address: [
    "This link uses random numbers instead of a real company website address.",
    "This link uses numbers instead of a real company name. Real banks never do this.",
    "This points to a raw numeric computer address, which is typical of fake websites."
  ],
  reason_at_trick: [
    "This link uses a hidden '@' trick to secretly send you to a different webpage.",
    "This is a deceptive link designed to fool people into visiting a fake website.",
    "This link uses address masking to trick users into loading an unintended website."
  ],
  reason_risky_tld: [
    "This website uses an unusual ending (%TLD%) commonly used for cheap throwaway scam sites.",
    "The website address ends in an unusual ending (%TLD%). Real organizations use known addresses like .com, .org, or .in.",
    "The domain extension (%TLD%) is frequently associated with mass spam campaigns."
  ],
  reason_brand_bait: [
    "The address contains words like '%KEYWORD%' trying to imitate an official bank or service.",
    "This address tries to look like a real bank or service by putting '%KEYWORD%' in the link. Real companies have their own official website.",
    "Impersonation keyword '%KEYWORD%' detected in web address."
  ],
  reason_hyphens_subdomains: [
    "The link has an unusually long, scrambled name with many dashes to look confusing.",
    "The website address is suspiciously long and messy. Real banks keep their addresses short and official.",
    "The link contains excessive hyphenation designed to mimic legitimate domain names."
  ],
  reason_shortener: [
    "This is a shortened link (%HOST%) that hides where it actually goes.",
    "This short link hides the real website. Scammers often use this so you cannot see the real link.",
    "Shortened link detected. Advise users to verify the real destination first."
  ],
  reason_danger_file: [
    "This link asks to download an app file (.%EXT%), which could be dangerous malware.",
    "This link tries to download a program to the phone (.%EXT%). Please do NOT let family members install it.",
    "Direct executable/app download detected (.%EXT%). High risk of device infection."
  ],
  reason_urgency: [
    "This message is trying to rush and panic you with emergency threats (%WORDS%).",
    "The message uses scary words (%WORDS%) to make you panic. Scammers do this so you act without thinking.",
    "High urgency and fear tactics detected (%WORDS%) to force hasty decisions."
  ],
  reason_otp_pin: [
    "This message asks for secret credentials like OTP, PIN, or passwords.",
    "It asks for OTP or secret numbers. Remind your family that real banks NEVER ask for OTPs or PINs.",
    "Credential harvesting alert: Requests secret OTP, password, or PIN."
  ],
  reason_lottery_bait: [
    "This promises free lottery money, prizes, or unrealistically easy cash (%WORDS%).",
    "It promises free money or prizes (%WORDS%). Remind your loved ones that nobody gives free money on WhatsApp or SMS.",
    "Unrealistic prize or financial bait detected (%WORDS%)."
  ],
  reason_gov_impersonation: [
    "It claims to be from electricity boards, police, tax, or KYC departments threatening sudden disconnection or arrest.",
    "It threatens that electricity or SIM card will be cut off or KYC is expired. Scammers use this threat constantly.",
    "Authority and utility impersonation threat detected."
  ],
  reason_upi_scam: [
    "This QR code or link is asking to SEND money using UPI. Remember: You NEVER need to enter a UPI PIN to receive cashback or money!",
    "Warning! This QR code is trying to deduct money from the bank account. You only enter UPI PIN to PAY, never to receive money.",
    "UPI payment request detected disguised as reward or cashback."
  ],
  reason_phone_link_combo: [
    "It gives an unknown phone number and asks you to call or click immediately.",
    "It asks you to call an unknown number right away. Tell your family to only use official helpline numbers.",
    "Combined suspicious link with request to call unknown number."
  ],
  reason_generic_greeting: [
    "It uses a generic greeting ('Dear Customer') without your real name.",
    "It does not address you by name, only 'Dear Customer', which is typical of bulk scam messages.",
    "Impersonal greeting typical of automated phishing broadcasts."
  ],
  reason_courier_trap: [
    "It claims a parcel or package cannot be delivered and asks you to update your address or pay a small fee.",
    "Fake parcel delivery message. Tell your family not to pay any small delivery fees for parcels they didn't order.",
    "Courier/parcel delivery phishing hook detected."
  ],
  reason_looks_clean: [
    "No common scam words, suspicious links, or pressure tactics were found.",
    "Everything looks normal and clean. No scary threats or fake link tricks were detected.",
    "No phishing indicators, malicious patterns, or suspicious triggers found."
  ]
};

/**
 * URL Threat Analysis Engine
 */
function analyzeURL(urlString) {
  const reasons = [];
  let score = 0;
  let cleanUrl = String(urlString || "").trim();

  if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = "http://" + cleanUrl;
  }

  let parsed;
  try {
    parsed = new URL(cleanUrl);
  } catch (e) {
    parsed = {
      protocol: cleanUrl.startsWith("https") ? "https:" : "http:",
      hostname: cleanUrl.replace(/https?:\/\//i, "").split("/")[0],
      pathname: "/" + (cleanUrl.replace(/https?:\/\//i, "").split("/")[1] || ""),
    };
  }

  const hostname = (parsed.hostname || "").toLowerCase();
  const fullUrl = cleanUrl.toLowerCase();

  // 1. Missing HTTPS
  if (parsed.protocol === "http:") {
    score += 1;
    reasons.push({ key: "reason_http_insecure", params: {} });
  }

  // 2. Direct IP Address Hostname
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipPattern.test(hostname)) {
    score += 4;
    reasons.push({ key: "reason_ip_address", params: {} });
  }

  // 3. '@' Symbol URL Trick
  if (urlString.includes("@")) {
    score += 4;
    reasons.push({ key: "reason_at_trick", params: {} });
  }

  // 4. Risky / Throwaway TLDs
  const riskyTlds = [".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".work", ".click", ".buzz", ".loan", ".fit", ".live", ".rest", ".surf", ".icu", ".monster"];
  const matchedTld = riskyTlds.find((tld) => hostname.endsWith(tld));
  if (matchedTld) {
    score += 2;
    reasons.push({ key: "reason_risky_tld", params: { TLD: matchedTld } });
  }

  // 5. Brand Bait keywords in Subdomain or Path
  const brandKeywords = [
    "sbi", "hdfc", "icici", "axis", "paytm", "phonepe", "gpay", "bank", "login", "verify",
    "secure", "kyc", "pan", "aadhar", "reward", "lottery", "refund", "update-card", "billing",
    "netflix-account", "amazon-security", "electricity", "customs"
  ];
  const legitimateDomains = ["sbi.co.in", "hdfcbank.com", "icicibank.com", "axisbank.com", "paytm.com", "phonepe.com", "google.com", "amazon.com", "wikipedia.org", "gov.in"];
  const isLegit = legitimateDomains.some((ld) => hostname === ld || hostname.endsWith("." + ld));

  if (!isLegit) {
    const matchedKeyword = brandKeywords.find((kw) => fullUrl.includes(kw));
    if (matchedKeyword) {
      score += 3;
      reasons.push({ key: "reason_brand_bait", params: { KEYWORD: matchedKeyword } });
    }
  }

  // 6. Excessive Hyphens or Suspicious Subdomains
  const hyphenCount = (hostname.match(/-/g) || []).length;
  const dotCount = (hostname.match(/\./g) || []).length;
  if (hyphenCount >= 2 || dotCount >= 4) {
    score += 2;
    reasons.push({ key: "reason_hyphens_subdomains", params: {} });
  }

  // 7. URL Shorteners
  const shorteners = ["bit.ly", "tinyurl.com", "is.gd", "t.co", "cutt.ly", "rb.gy", "goo.gl", "ow.ly"];
  const matchedShortener = shorteners.find((sh) => hostname.includes(sh));
  if (matchedShortener) {
    score += 1.5;
    reasons.push({ key: "reason_shortener", params: { HOST: matchedShortener } });
  }

  // 8. Dangerous File Extensions (.apk, .exe, etc.)
  const dangerousExts = ["apk", "exe", "scr", "bat", "vbs", "cmd", "dmg"];
  const matchedExt = dangerousExts.find((ext) => (parsed.pathname || "").toLowerCase().endsWith("." + ext));
  if (matchedExt) {
    score += 4;
    reasons.push({ key: "reason_danger_file", params: { EXT: matchedExt } });
  }

  let verdict = "safe";
  if (score >= 3) verdict = "danger";
  else if (score >= 1) verdict = "caution";

  if (reasons.length === 0) {
    reasons.push({ key: "reason_looks_clean", params: {} });
  }

  return { verdict, reasons: reasons.slice(0, 3), score, snippet: urlString };
}

/**
 * Text / SMS / WhatsApp Message Threat Analysis Engine
 */
function analyzeText(text) {
  const reasons = [];
  let score = 0;
  const lower = String(text || "").toLowerCase();

  // 1. Urgency / Threat Words
  const urgencyPatterns = [
    { pattern: /urgent|immediately|within 24 hours|account blocked|suspended today|last warning|power disconnect|cut tonight|electricity disconnected/i, words: "urgent / blocked in 24 hours" },
    { pattern: /तुरंत|24 घंटे|खाता ब्लॉक|बिजली कट|आखिरी चेतावनी/i, words: "तुरंत / 24 घंटे में ब्लॉक" },
    { pattern: /వెంటనే|24 గంటల్లో|ఖాతా నిలిపివేత|కరెంట్ కట్/i, words: "వెంటనే / నిలిపివేత" },
  ];
  for (const u of urgencyPatterns) {
    if (u.pattern.test(lower)) {
      score += 3;
      reasons.push({ key: "reason_urgency", params: { WORDS: u.words } });
      break;
    }
  }

  // 2. Secret Credential Requests (OTP, PIN, CVV, Password)
  const credentialPattern = /otp|one time password|pin|cvv|netbanking password|atm pin|secret code|ओटीपी|पिन|పాస్‌వర్డ్|ఓటీపీ/i;
  if (credentialPattern.test(lower)) {
    score += 4;
    reasons.push({ key: "reason_otp_pin", params: {} });
  }

  // 3. Prize / Lottery / Easy Money / Cashback
  const lotteryPatterns = [
    { pattern: /congratulations|you won|lottery|cashback ₹|claim reward|part-time job|earn ₹|daily income|free recharge|kbc/i, words: "You won / Daily Income / Free reward" },
    { pattern: /बधाई|लॉटरी|इनाम|फ्री रिचार्ज|घर बैठे पैसे/i, words: "लॉटरी / फ्री पैसे" },
    { pattern: /అభినందనలు|లాటరీ|బహుమతి|ఉచిత రీఛార్జ్/i, words: "లాటరీ / బహుమతి" },
  ];
  for (const l of lotteryPatterns) {
    if (l.pattern.test(lower)) {
      score += 3;
      reasons.push({ key: "reason_lottery_bait", params: { WORDS: l.words } });
      break;
    }
  }

  // 4. Utility / Authority / KYC threat
  const govPattern = /electricity office|power will be disconnected|kyc expired|pan unlinked|court notice|police cyber|customs duty|बिजली कार्यालय|केवाईसी समाप्त|విద్యుత్ శాఖ/i;
  if (govPattern.test(lower)) {
    score += 3;
    reasons.push({ key: "reason_gov_impersonation", params: {} });
  }

  // 5. Courier / Delivery Scam
  const courierPattern = /parcel|courier|delivery address|failed to deliver|package on hold|डाकघर|पार्सल|కొరియర్|పార్సల్/i;
  if (courierPattern.test(lower)) {
    score += 2;
    reasons.push({ key: "reason_courier_trap", params: {} });
  }

  // 6. Generic Impersonal Greeting
  const genericGreeting = /^dear (customer|user|client|consumer|valued)|प्रिय ग्राहक|డియర్ కస్టమర్/i;
  if (genericGreeting.test(lower.trim())) {
    score += 1;
    reasons.push({ key: "reason_generic_greeting", params: {} });
  }

  // 7. Combined Link & Phone Number in same message
  const hasUrl = /https?:\/\/|www\.|\.xyz|\.top|\.com|\.link|\.me/i.test(lower);
  const hasPhone = /(\+?\d{1,3}[- ]?)?\b\d{10}\b/.test(lower);
  if (hasUrl && hasPhone) {
    score += 2;
    reasons.push({ key: "reason_phone_link_combo", params: {} });
  }

  // Embedded URL check
  const urlMatch = text.match(/https?:\/\/[^\s]+|www\.[^\s]+/i);
  if (urlMatch) {
    const urlAnalysis = analyzeURL(urlMatch[0]);
    if (urlAnalysis.verdict === "danger") score += 3;
    urlAnalysis.reasons.forEach((r) => {
      if (!reasons.some((existing) => existing.key === r.key)) {
        reasons.push(r);
      }
    });
  }

  let verdict = "safe";
  if (score >= 3) verdict = "danger";
  else if (score >= 1) verdict = "caution";

  if (reasons.length === 0) {
    reasons.push({ key: "reason_looks_clean", params: {} });
  }

  return {
    verdict,
    reasons: reasons.slice(0, 3),
    score,
    snippet: text.slice(0, 60) + (text.length > 60 ? "..." : "")
  };
}

/**
 * QR Code Payload Analysis Engine
 */
function analyzeQR(qrString) {
  const lower = String(qrString || "").toLowerCase();

  // UPI Payment QR Traps
  if (lower.startsWith("upi://pay")) {
    return {
      verdict: "danger",
      score: 5,
      reasons: [
        { key: "reason_upi_scam", params: {} },
        { key: "reason_otp_pin", params: {} },
      ],
      snippet: "UPI Payment QR: " + qrString.slice(0, 45) + "..."
    };
  }

  // URL QR
  if (lower.startsWith("http://") || lower.startsWith("https://") || lower.startsWith("www.")) {
    return analyzeURL(qrString);
  }

  // Text QR
  return analyzeText(qrString);
}

/**
 * ============================================================================
 * 1. CALLABLE CLOUD FUNCTION: analyzeContent
 * ============================================================================
 * Takes { type, content, lang, persona } and returns server-evaluated verdict.
 */
exports.analyzeContent = functions.https.onCall(async (data, context) => {
  const { type, content } = data || {};

  if (!content || typeof content !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "Content must be a non-empty string.");
  }

  let result;
  if (type === "link") {
    result = analyzeURL(content);
  } else if (type === "msg") {
    result = analyzeText(content);
  } else if (type === "qr") {
    result = analyzeQR(content);
  } else {
    // Default detection
    result = content.includes("http") ? analyzeURL(content) : analyzeText(content);
  }

  return {
    success: true,
    verdict: result.verdict,
    reasons: result.reasons,
    score: result.score,
    snippet: result.snippet,
    analyzedAt: new Date().toISOString()
  };
});

/**
 * ============================================================================
 * 2. CALLABLE CLOUD FUNCTION: submitReport
 * ============================================================================
 * Takes { text, verdict, language } and securely creates or increments a
 * report document in the 'reports/{reportId}' collection via Admin SDK.
 */
exports.submitReport = functions.https.onCall(async (data, context) => {
  // Requires user to be authenticated (anonymous or permanent)
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated to report scams.");
  }

  const { text, verdict } = data || {};
  if (!text || typeof text !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "Report text is required.");
  }

  // Hash or sanitize snippet to prevent duplicate docs for same scam message
  const reportDocId = Buffer.from(text.slice(0, 100)).toString("base64").replace(/[\/+=]/g, "_").slice(0, 40);
  const reportRef = db.collection("reports").doc(reportDocId);

  const doc = await reportRef.get();
  if (doc.exists) {
    // Increment confirm counter
    await reportRef.update({
      confirmCount: admin.firestore.FieldValue.increment(1),
      lastReportedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } else {
    // Create new report entry
    await reportRef.set({
      text: text.slice(0, 500), // snippet string
      verdict: verdict || "danger", // verdict string
      createdAt: admin.firestore.FieldValue.serverTimestamp(), // timestamp
      confirmCount: 1, // number starts at 1
      reportedBy: context.auth.uid // uid of reporting user
    });
  }

  return {
    success: true,
    reportId: reportDocId,
    message: "Scam report recorded successfully."
  };
});
