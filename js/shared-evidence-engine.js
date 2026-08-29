/* Shared evidence → verification → score → confidence layer.
   It makes only local observations unless a server-side integration attaches
   a confirmed finding. Missing data is recorded as unavailable, never risky. */
(function () {
  const LOCAL_WEIGHTS = {
    reason_otp_pin: 20, reason_upi_scam: 20, reason_urgency: 10,
    reason_lottery_bait: 10, reason_gov_impersonation: 10,
    reason_courier_trap: 8, reason_phone_link_combo: 5,
    reason_generic_greeting: 2, reason_brand_bait: 10,
    social_opening: 10, sender_reports: 15, brand_impersonation: 25
  };
  const LOCAL_TEXT = {
    reason_otp_pin: 'The content asks for an OTP, PIN, password, or payment detail.',
    reason_upi_scam: 'A UPI payment destination was detected.',
    reason_urgency: 'The message uses urgency or threat wording.',
    reason_lottery_bait: 'The message includes a prize, job, or unrealistic-money claim.',
    reason_gov_impersonation: 'The message uses government or utility impersonation wording.',
    reason_courier_trap: 'The message uses a delivery or parcel problem claim.',
    reason_phone_link_combo: 'A phone number and link appear together.',
    reason_generic_greeting: 'A generic greeting was detected. This alone is not proof of a scam.',
    reason_brand_bait: 'Brand or verification wording was detected. This alone is not proof of impersonation.',
    social_opening: 'The social message uses a common account-verification or giveaway opener.',
    sender_reports: 'This sender has community reports. Reports are not independently verified.',
    brand_impersonation: 'The page content mentions a brand while the domain does not match its configured official domain.'
  };
  const extractUrls = text => String(text || '').match(/https?:\/\/[^\s<>"']+|www\.[^\s<>"']+/gi) || [];
  const extractPhones = text => String(text || '').match(/(?:\+?\d{1,3}[-.\s]?)?\b\d{10}\b/g) || [];
  const unique = list => [...new Set(list.filter(Boolean))];
  const textFor = reason => reason && (reason.text || LOCAL_TEXT[reason.key] || null);

  function emailEvidence(raw) {
    const local = [], unknown = [];
    let points = 0;
    const from = (raw.match(/^from\s*:\s*(.+)$/im) || [])[1];
    const reply = (raw.match(/^reply-to\s*:\s*(.+)$/im) || [])[1];
    const domainOf = value => (String(value || '').match(/[\w.+-]+@([\w.-]+)/) || [])[1]?.toLowerCase();
    const fromDomain = domainOf(from), replyDomain = domainOf(reply);
    if (from) local.push(`Sender supplied as ${from.trim()}.`);
    else unknown.push('Sender address was not supplied.');
    if (reply) local.push(`Reply-To supplied as ${reply.trim()}.`);
    if (fromDomain && replyDomain && fromDomain !== replyDomain) {
      points += 15;
      local.push('Sender and Reply-To domains do not match.');
    }
    ['spf', 'dkim', 'dmarc'].forEach(key => {
      const hit = raw.match(new RegExp(`${key}\\s*[:=]\\s*(pass|fail|softfail|neutral)`, 'i'));
      if (hit) local.push(`Provided email header: ${key.toUpperCase()} reports ${hit[1].toLowerCase()}.`);
      else unknown.push(`${key.toUpperCase()} result unavailable because no header was supplied.`);
    });
    return { points, local, unknown };
  }

  function classify({ score, strongCount, signalCount, confirmedExternal, localEvidence, trusted, invalid }) {
    if (invalid) return { verdict: 'unable', label: 'UNABLE TO VERIFY', confidence: 15, verification: 'Invalid URL — unable to verify from available sources.' };
    if (!localEvidence && !confirmedExternal && !trusted) return { verdict: 'unable', label: 'UNABLE TO VERIFY', confidence: 15, verification: 'Insufficient evidence for a reliable classification.' };
    let verdict;
    // A configured confirmed-malicious match is strong evidence on its own;
    // all other high-risk verdicts still need a 60+ score and two strong signals.
    if (confirmedExternal) verdict = 'danger';
    else if (score >= 60 && strongCount >= 2) verdict = 'danger';
    // A single low-weight clue (for example HTTP or one urgent word) stays
    // low risk. A strong clue or several independent clues need verification.
    else if (score >= 30 || strongCount >= 1 || (signalCount >= 2 && score >= 15)) verdict = 'caution';
    else verdict = 'safe';
    const confidence = Math.min(85, confirmedExternal ? 85 : strongCount >= 2 ? 70 : localEvidence ? 45 : 30);
    return {
      verdict,
      label: verdict === 'danger' ? 'HIGH RISK' : verdict === 'caution' ? 'SUSPICIOUS' : 'SAFE',
      confidence,
      verification: confirmedExternal ? 'Confirmed by a configured external source.' : 'External threat-intelligence verification unavailable. Local evidence only.'
    };
  }

  window.SharedEvidenceEngine = {
    finalize(base, inputType, raw) {
      const reasons = (base.reasons || []).map(item => {
        const reason = typeof item === 'object' ? { ...item } : { key: item };
        reason.text = textFor(reason);
        reason.source = reason.source || 'local';
        reason.points = Number.isFinite(reason.points) ? reason.points : (LOCAL_WEIGHTS[reason.key] || 0);
        return reason;
      });
      const invalid = Boolean(base.features?.invalid_url) || reasons.some(r => r.key === 'url_invalid');
      const baseUsesScore = ['link', 'web', 'qr'].includes(inputType) && Number.isFinite(base.score);
      let score = baseUsesScore ? base.score : reasons.reduce((total, r) => total + r.points, 0);

      const categories = { local: [], external: [], user: [], unknown: [] };
      // A zero-point note (for example, a trusted-domain match or a supplied
      // sender field) is context, not evidence that can decide the verdict.
      reasons.forEach(r => { if (r.text && r.points > 0) categories[r.source].push(r.text); });
      if (!['link', 'web', 'qr'].includes(inputType)) {
        extractUrls(raw).forEach(link => {
          if (!window.URLRiskEngine) return;
          const result = window.URLRiskEngine.analyze(link);
          score += Math.min(25, result.score || 0);
          result.reasons.filter(r => r.points > 0).forEach(r => {
            categories.local.push(`Link found in the content: ${r.text || r.key}`);
            reasons.push({ ...r, source: 'local' });
          });
        });
      }
      if (extractPhones(raw).length) categories.unknown.push('Phone number detected — verification unavailable from available sources.');
      if (inputType === 'email') {
        const email = emailEvidence(raw);
        score += email.points;
        categories.local.push(...email.local);
        categories.unknown.push(...email.unknown);
        if (email.points) reasons.push({ key: 'reply_to_mismatch', text: 'Sender and Reply-To domains do not match.', points: email.points, source: 'local' });
      }
      if (inputType === 'social') categories.unknown.push('Social-account authenticity cannot be verified from pasted message text alone.');
      if (inputType === 'qr') categories.unknown.push('QR result is based only on decoded content; no payment was initiated.');

      const known = base.features?.known_malicious === true;
      const trusted = base.features?.trusted_domain === true;
      if (known) categories.external.push('Configured verified malicious-domain list matched this exact domain.');
      else categories.unknown.push('External threat-intelligence verification unavailable.');
      categories.unknown.push('Machine-learning verification is unavailable.');

      score = Math.min(100, Math.max(0, Math.round(score)));
      const strongCount = reasons.filter(r => r.points >= 15).length;
      const localEvidence = categories.local.length > 0;
      const status = classify({ score, strongCount, signalCount: reasons.filter(r => r.points > 0).length, confirmedExternal: known, localEvidence, trusted, invalid });
      const sources = [
        'Detected locally: rule-based analysis',
        known ? 'Confirmed externally: configured verified malicious-domain list' : 'External source: unavailable',
        categories.user.length ? 'User reports: available' : 'User reports: unavailable',
        'Unknown/unverified: domain age, reputation, and ML are unavailable'
      ];
      return {
        ...base, reasons, score, riskScore: score, scoreAvailable: true,
        verdict: status.verdict, riskLabel: status.label, confidence: status.confidence,
        verificationStatus: status.verification, sources,
        evidenceCategories: Object.fromEntries(Object.entries(categories).map(([key, values]) => [key, unique(values)])),
        evidence: unique([...categories.local, ...categories.external, ...categories.user, ...categories.unknown]),
        detectedIndicators: unique(reasons.filter(r => r.text && r.points > 0).map(r => r.text)),
        scoreBreakdown: reasons.filter(r => r.points > 0).map(r => ({ label: r.text || r.key, points: r.points, source: r.source }))
      };
    }
  };
})();
