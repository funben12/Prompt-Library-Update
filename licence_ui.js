// ============================================================
//  LICENCE KEY UI HANDLERS
//  Add to static/app.js (in the BOOTSTRAP section)
// ============================================================

async function initLicenceUI() {
  const activateBtn = $('licenceActivateBtn');
  const keyInput = $('licenceKeyInput');
  const statusDiv = $('licenceActivateStatus');

  if (!activateBtn) return; // Not in DOM yet

  // Load current licence status on startup
  await checkLicenceStatus();

  // Activate button
  activateBtn.addEventListener('click', async () => {
    const key = keyInput.value.trim();
    if (!key) {
      statusDiv.textContent = '⚠ Enter a licence key';
      statusDiv.style.color = 'var(--ink-3)';
      return;
    }

    activateBtn.disabled = true;
    statusDiv.textContent = 'Validating…';
    statusDiv.style.color = 'var(--ink-3)';

    try {
      const res = await fetch('/api/licence/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      });

      const data = await res.json();

      if (data.valid) {
        statusDiv.textContent = '✓ ' + data.message;
        statusDiv.style.color = 'var(--success-color, #4caf50)';
        state.isPremium = true;
        keyInput.disabled = true;
        activateBtn.disabled = true;
        activateBtn.textContent = '✓ Activated';

        // Update status display
        await checkLicenceStatus();

        // Refresh feature visibility
        updatePremiumFeatures();

        // Show success toast
        showToast('Pro features unlocked!', 'success');
      } else {
        statusDiv.textContent = '✗ ' + data.message;
        statusDiv.style.color = 'var(--error-color, #f44336)';
        activateBtn.disabled = false;
      }
    } catch (err) {
      statusDiv.textContent = '✗ Error: ' + err.message;
      statusDiv.style.color = 'var(--error-color, #f44336)';
      activateBtn.disabled = false;
    }
  });

  // Allow Enter key to activate
  keyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') activateBtn.click();
  });
}

async function checkLicenceStatus() {
  try {
    const res = await fetch('/api/licence/status');
    const data = await res.json();

    const statusDiv = $('licenceStatus');
    const statusText = $('licenceStatusText');
    const activateBtn = $('licenceActivateBtn');
    const keyInput = $('licenceKeyInput');

    if (data.licensed) {
      state.isPremium = true;
      statusDiv.style.borderLeftColor = 'var(--success-color, #4caf50)';
      statusText.textContent = `✓ Licensed as of ${new Date(data.activated).toLocaleDateString()}`;
      statusText.style.color = 'var(--success-color, #4caf50)';

      keyInput.value = data.key;
      keyInput.disabled = true;
      activateBtn.disabled = true;
      activateBtn.textContent = '✓ Activated';

      updatePremiumFeatures();
    } else {
      state.isPremium = false;
      statusDiv.style.borderLeftColor = 'var(--ink-3)';
      statusText.textContent = 'Not licensed — enter your key to unlock Pro features';
      statusText.style.color = 'var(--ink-3)';

      keyInput.disabled = false;
      activateBtn.disabled = false;
      activateBtn.textContent = 'Activate Licence';
    }
  } catch (err) {
    console.warn('Could not check licence status:', err);
  }
}

function updatePremiumFeatures() {
  // Show/hide premium elements based on state.isPremium
  const premiumEls = $$('[data-premium="true"]');
  const freeLimitEls = $$('[data-free-limit]');

  premiumEls.forEach(el => {
    el.style.display = state.isPremium ? 'block' : 'none';
  });

  freeLimitEls.forEach(el => {
    if (!state.isPremium) {
      el.style.opacity = '0.5';
      el.style.pointerEvents = 'none';
    } else {
      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
    }
  });
}
