/* Feature-based URL analyzer. It makes no network claims: age/malicious data stay unknown until a verified backend provides them. */
(function () {
  const cfg = window.URL_RISK_CONFIG;
  const belongsTo = (host, domains) => domains.some(d => host === d || host.endsWith(`.${d}`));
  const isIp = host => /^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host.includes(':');
  function editDistance(a, b) { const row=Array.from({length:b.length+1},(_,i)=>i); for(let i=1;i<=a.length;i++){let prev=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old;}} return row[b.length]; }
  function isTypo(host) { const base=host.split('.')[0]; return cfg.trustedDomains.some(domain => { const brand=domain.split('.')[0]; return base!==brand && base.length>3 && (editDistance(base,brand)<=1 || new RegExp(`(^|[-_])${brand}($|[-_])`).test(base)); }); }
  window.URLRiskEngine = {
    analyze(input) {
      const raw=String(input||'').trim(); const normalized=/^https?:\/\//i.test(raw)?raw:`https://${raw}`;
      let url; try { url=new URL(normalized); } catch { return { verdict:'unable', score:0, reasons:[{key:'url_invalid',text:'This does not look like a valid web address.',points:0}], features:{invalid_url:true}, snippet:raw, scoreAvailable:true }; }
      const host=url.hostname.toLowerCase(); const path=`${url.pathname}${url.search}`.toLowerCase(); const trusted=belongsTo(host,cfg.trustedDomains);
      const features={ url_length:raw.length, domain_length:host.length, num_dots:(host.match(/\./g)||[]).length, num_hyphens:(host.match(/-/g)||[]).length, num_digits:(raw.match(/\d/g)||[]).length, num_special_chars:(raw.match(/[^a-z0-9]/gi)||[]).length, num_subdomains:Math.max(0,host.split('.').length-2), has_https:url.protocol==='https:', has_ip:isIp(host), has_at_symbol:raw.includes('@'), has_url_encoding:/%[0-9a-f]{2}/i.test(raw), has_punycode:host.includes('xn--'), suspicious_keyword_count:0, shortened_url:belongsTo(host,cfg.shorteners), typosquatting:false, domain_age_days:null, known_malicious:false, trusted_domain:trusted };
      const reasons=[]; let score=0; const add=(points,key,text)=>{score+=points;reasons.push({key,text,points});};
      const keywords=cfg.suspiciousKeywords.filter(word=>path.includes(word)); features.suspicious_keyword_count=keywords.length;
      features.known_malicious=belongsTo(host,cfg.knownMaliciousDomains); features.typosquatting=!trusted&&isTypo(host);
      if(features.known_malicious)add(cfg.weights.knownMalicious,'known_malicious','This domain is present in the configured verified malicious-domain list.');
      if(features.typosquatting)add(cfg.weights.typosquatting,'typosquatting','The domain name looks very similar to a trusted brand name.');
      if(features.has_ip)add(cfg.weights.ipAddress,'ip_address','The link uses an IP address instead of a normal website name.');
      if(features.has_at_symbol)add(cfg.weights.atSymbol,'at_symbol','The link contains @, which can hide the real destination.');
      if(features.has_punycode)add(cfg.weights.punycode,'punycode','The domain uses internationalized (punycode) characters, so verify the exact spelling carefully.');
      if(features.has_url_encoding)add(cfg.weights.urlEncoding,'url_encoding','The link contains encoded characters that make the destination harder to read.');
      if(features.shortened_url)add(cfg.weights.shortener,'shortener','This is a shortened link, so the final destination is hidden.');
      if(!features.has_https)add(cfg.weights.http,'http','This link does not use HTTPS encryption.');
      if(features.url_length>120)add(cfg.weights.veryLongUrl,'long_url','The link is unusually long.');
      if(features.num_subdomains>=3)add(cfg.weights.excessiveSubdomains,'subdomains','The link has many subdomains.');
      if(features.num_hyphens>=3)add(cfg.weights.manyHyphens,'hyphens','The domain contains many hyphens.');
      if(features.num_digits>=8)add(cfg.weights.manyDigits,'digits','The link contains many digits.');
      if(keywords.length)add(Math.min(cfg.weights.suspiciousKeyword*keywords.length,20),'keywords',`Risk-related words found in the URL path: ${keywords.join(', ')}.`);
      score=Math.min(100,score); const verdict=score<=cfg.thresholds.safe?'safe':score<=cfg.thresholds.suspicious?'caution':'danger';
      if(trusted) reasons.push({key:'trusted_domain',text:'This host matches a configured trusted-domain entry. This is helpful context, not proof that every page is safe.',points:0});
      if(!reasons.length) reasons.push({key:'no_signals',text:'No configured URL warning signs were found. This is not a guarantee that the site is safe.',points:0});
      return { verdict, score, riskScore:score, scoreAvailable:true, reasons, features, snippet:raw, normalizedUrl:url.href };
    }
  };
})();
