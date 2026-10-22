/* Motion preference: Prompt Library animates by default, even when the device asks for reduced motion
   (Android "Remove animations", battery saver, Windows "Show animations" off). Loaded before every other script.
   localStorage plMotion = 'system' follows the device instead. Shared word for word with the desktop app. */
(function () {
  let pref = 'on';
  try { pref = localStorage.getItem('plMotion') || 'on'; } catch (e) {}
  window.PL_MOTION_PREF = {
    get: () => pref,
    set(v) { try { localStorage.setItem('plMotion', v); } catch (e) {} location.reload(); }
  };
  if (pref !== 'on' || !window.matchMedia) return;
  // Scripts ask matchMedia whether to skip motion: always answer no
  const real = window.matchMedia.bind(window), REDUCE = /prefers-reduced-motion\s*:\s*reduce/i;
  window.matchMedia = q => REDUCE.test(String(q)) ? real('not all') : real(q);
  // Stylesheets switch motion off inside @media (prefers-reduced-motion: reduce): drop those blocks
  function clean(sheet) {
    let rules;
    try { rules = sheet.cssRules; } catch (e) { return; }
    for (let i = rules.length - 1; i >= 0; i--) {
      const r = rules[i];
      if (r.media && REDUCE.test(r.conditionText || r.media.mediaText || '')) { try { sheet.deleteRule(i); } catch (e) {} }
    }
  }
  const cleanAll = () => { for (const s of document.styleSheets) clean(s); };
  cleanAll();
  document.addEventListener('DOMContentLoaded', cleanAll);
  window.addEventListener('load', cleanAll);
  new MutationObserver(list => list.forEach(m => m.addedNodes.forEach(n => {
    if (n.tagName === 'STYLE' && n.sheet) clean(n.sheet);
    else if (n.tagName === 'LINK') n.addEventListener('load', () => n.sheet && clean(n.sheet));
  }))).observe(document.documentElement, { childList: true, subtree: true });
})();
