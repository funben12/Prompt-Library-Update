/* Settings / config panel — functions extracted from static/app.js
   These run inside the app.js IIFE and rely on shared helpers
   ($, $$, state, api, toast, escapeHtml) in ../_shared/shared.js */

    function loadConfigSettings() {
        const provider = localStorage.getItem('pl_ai_provider') || 'openai';
        $$('.config-provider-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.provider === provider);
        });
        const key = localStorage.getItem(`pl_api_key_${provider}`) || '';
        const input = $('#configApiKeyInput');
        if (input) input.value = key;
        const needsEndpoint = !['openai','anthropic','gemini','openrouter','mistral','groq','deepseek','xai','cohere','perplexity'].includes(provider);
        const modelRow = $('#configModelRow');
        const modelInput = $('#configModelInput');
        modelRow && (modelRow.style.display = (provider === 'openrouter' || needsEndpoint) ? '' : 'none');
        if (modelInput) {
            if (provider === 'openrouter') modelInput.value = localStorage.getItem('pl_openrouter_model') || '';
            else if (needsEndpoint) modelInput.value = localStorage.getItem(`pl_model_${provider}`) || '';
        }
        const baseUrlRow = $('#configBaseUrlRow');
        const baseUrlInput = $('#configBaseUrlInput');
        baseUrlRow && (baseUrlRow.style.display = needsEndpoint ? '' : 'none');
        if (baseUrlInput && needsEndpoint) baseUrlInput.value = localStorage.getItem(`pl_base_url_${provider}`) || '';
    }

    
