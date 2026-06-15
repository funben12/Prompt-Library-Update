#!/usr/bin/env python3
"""Add 10 more frameworks to FORGE_FRAMEWORKS and the HTML select."""

# ── app.js patch ────────────────────────────────────────────────────────────
JS_OLD = """    ]
  }

};

/* Template presets"""

JS_NEW = """    ]
  },

  spin: {
    label: 'SPIN',
    description: 'Situation · Problem · Implication · Need-payoff',
    fields: [
      { id: 'forgeSituation',   label: 'Situation',    icon: 'landscape',            hint: 'Current context or background',        rows: 3, weight: 1.5, placeholder: 'e.g. Our sales team is struggling to qualify enterprise leads during initial discovery calls.' },
      { id: 'forgeProblem',     label: 'Problem',      icon: 'report_problem',       hint: 'The specific pain point or challenge',  rows: 3, weight: 3, required: true, placeholder: 'e.g. Reps ask surface-level questions and miss the real blockers buyers face.' },
      { id: 'forgeImplication', label: 'Implication',  icon: 'trending_down',        hint: 'Consequences if the problem goes unsolved', rows: 3, weight: 2, placeholder: 'e.g. Deals stall at proposal stage because budget and urgency were never surfaced early.' },
      { id: 'forgeNeedPayoff',  label: 'Need / Payoff', icon: 'emoji_events',         hint: 'What solving this looks like; the value of the solution', rows: 3, weight: 2, placeholder: 'e.g. A structured discovery script that surfaces implicit needs and builds urgency naturally.' }
    ]
  },

  soar: {
    label: 'SOAR',
    description: 'Situation · Obstacle · Action · Result',
    fields: [
      { id: 'forgeSituation', label: 'Situation',  icon: 'landscape',        hint: 'Starting context or background',              rows: 3, weight: 1.5, placeholder: 'e.g. We were launching a new product into a market dominated by two incumbents.' },
      { id: 'forgeObstacle',  label: 'Obstacle',   icon: 'block',            hint: 'The challenge or barrier faced',              rows: 3, weight: 2, placeholder: 'e.g. Our brand was unknown and we had a fraction of the incumbents\' marketing budget.' },
      { id: 'forgeAction',    label: 'Action',     icon: 'bolt',             hint: 'What you did to overcome the obstacle',       rows: 3, weight: 3, required: true, placeholder: 'e.g. We focused on one niche segment, ran micro-influencer campaigns, and built in public.' },
      { id: 'forgeResult',    label: 'Result',     icon: 'trending_up',      hint: 'The measurable outcome or achievement',       rows: 3, weight: 2, placeholder: 'e.g. Reached 10k users in 90 days and secured a featured placement in two industry newsletters.' }
    ]
  },

  fivew2h: {
    label: '5W2H',
    description: 'Who · What · When · Where · Why · How · How Much',
    fields: [
      { id: 'forgeWho',      label: 'Who',       icon: 'group',            hint: 'Who is involved or responsible?',             rows: 2, weight: 1.5, placeholder: 'e.g. The content marketing team and external freelancers.' },
      { id: 'forgeWhat',     label: 'What',      icon: 'help_outline',     hint: 'What needs to be done?',                      rows: 3, weight: 3, required: true, placeholder: 'e.g. Produce 8 long-form SEO articles per month targeting mid-funnel keywords.' },
      { id: 'forgeWhen',     label: 'When',      icon: 'schedule',         hint: 'By when, or what timeframe?',                 rows: 2, weight: 1.5, placeholder: 'e.g. First batch due end of Q3; ongoing monthly thereafter.' },
      { id: 'forgeWhere',    label: 'Where',     icon: 'place',            hint: 'Where does this happen or apply?',            rows: 2, weight: 1, placeholder: 'e.g. Published on the company blog and syndicated to Medium.' },
      { id: 'forgeWhy',      label: 'Why',       icon: 'lightbulb',        hint: 'The reason or goal behind this',              rows: 2, weight: 2, placeholder: 'e.g. Grow organic traffic by 40% and reduce CAC from paid channels.' },
      { id: 'forgeHow',      label: 'How',       icon: 'settings',         hint: 'The method or approach',                      rows: 3, weight: 2, placeholder: 'e.g. Brief writers with keyword clusters, review drafts, publish with internal links to product pages.' },
      { id: 'forgeHowMuch',  label: 'How Much',  icon: 'attach_money',     hint: 'Budget, effort, or scale involved',           rows: 2, weight: 1, placeholder: 'e.g. $3,000/month for freelancers; 10 hours of in-house review time.' }
    ]
  },

  okr: {
    label: 'OKR',
    description: 'Objective · Key Results',
    fields: [
      { id: 'forgeObjective',   label: 'Objective',    icon: 'flag',             hint: 'The inspiring qualitative goal',              rows: 3, weight: 3, required: true, placeholder: 'e.g. Become the go-to tool for solo founders building their first SaaS.' },
      { id: 'forgeKR1',         label: 'Key Result 1', icon: 'looks_one',        hint: 'First measurable outcome indicating success',  rows: 2, weight: 2, placeholder: 'e.g. Reach 500 paying customers by end of Q4.' },
      { id: 'forgeKR2',         label: 'Key Result 2', icon: 'looks_two',        hint: 'Second measurable outcome',                    rows: 2, weight: 1.5, placeholder: 'e.g. Achieve NPS ≥ 50 across the active user base.' },
      { id: 'forgeKR3',         label: 'Key Result 3', icon: 'looks_3',          hint: 'Third measurable outcome (optional)',           rows: 2, weight: 1, placeholder: 'e.g. Reduce monthly churn to below 3%.' },
      { id: 'forgeConstraints', label: 'Constraints',  icon: 'fence',            hint: 'Resources, limits, or guardrails',              rows: 2, weight: 1, placeholder: 'e.g. Team of 2; no paid ads; existing free tier stays free.' }
    ]
  },

  smart: {
    label: 'SMART',
    description: 'Specific · Measurable · Achievable · Relevant · Time-bound',
    fields: [
      { id: 'forgeSpecific',    label: 'Specific',     icon: 'adjust',           hint: 'Exactly what needs to be achieved',            rows: 3, weight: 3, required: true, placeholder: 'e.g. Increase the email open rate for our weekly newsletter.' },
      { id: 'forgeMeasurable',  label: 'Measurable',   icon: 'bar_chart',        hint: 'How success will be measured',                 rows: 2, weight: 2, placeholder: 'e.g. From 22% to 35% open rate, tracked in Mailchimp.' },
      { id: 'forgeAchievable',  label: 'Achievable',   icon: 'check_circle',     hint: 'Why this is realistic given current capacity',  rows: 2, weight: 1.5, placeholder: 'e.g. Competitors average 32%; industry benchmarks show 35% is achievable with better subject lines.' },
      { id: 'forgeRelevant',    label: 'Relevant',     icon: 'link',             hint: 'Why this matters to broader goals',            rows: 2, weight: 1.5, placeholder: 'e.g. Higher open rates drive more product page visits and free trial sign-ups.' },
      { id: 'forgeTimeBound',   label: 'Time-bound',   icon: 'event',            hint: 'The deadline or timeframe',                    rows: 2, weight: 2, placeholder: 'e.g. Achieved by the end of Q2 (June 30).' }
    ]
  },

  ooda: {
    label: 'OODA',
    description: 'Observe · Orient · Decide · Act',
    fields: [
      { id: 'forgeObserve',  label: 'Observe',  icon: 'visibility',        hint: 'Raw data, signals, or inputs you are seeing',  rows: 3, weight: 2, placeholder: 'e.g. Churn jumped 18% this month; support tickets mention slow load times and missing export feature.' },
      { id: 'forgeOrient',   label: 'Orient',   icon: 'explore',           hint: 'How you interpret and frame the situation',    rows: 3, weight: 2, placeholder: 'e.g. Performance issues are likely causing abandonment; the export request is a latent need we have ignored.' },
      { id: 'forgeDecide',   label: 'Decide',   icon: 'fork_right',        hint: 'The hypothesis or decision you are committing to', rows: 3, weight: 3, required: true, placeholder: 'e.g. Prioritise a performance sprint this cycle; add CSV export to the roadmap for next sprint.' },
      { id: 'forgeAct',      label: 'Act',      icon: 'rocket_launch',     hint: 'Specific actions and who does what',           rows: 3, weight: 2, placeholder: 'e.g. Eng profiles and fixes top 3 bottlenecks; PM writes export spec; CS sends proactive update to affected users.' }
    ]
  },

  decide: {
    label: 'DECIDE',
    description: 'Define · Establish · Consider · Identify · Develop · Evaluate',
    fields: [
      { id: 'forgeDefine',    label: 'Define',    icon: 'question_mark',    hint: 'The decision that needs to be made',           rows: 3, weight: 3, required: true, placeholder: 'e.g. Should we build our own analytics dashboard or integrate a third-party tool?' },
      { id: 'forgeEstablish', label: 'Establish', icon: 'checklist',        hint: 'Criteria that matter most for this decision',  rows: 3, weight: 2, placeholder: 'e.g. Cost under $500/mo, ships in 6 weeks, no new vendor risk, integrates with our current data warehouse.' },
      { id: 'forgeConsider',  label: 'Consider',  icon: 'compare_arrows',   hint: 'Available options or alternatives',            rows: 3, weight: 2, placeholder: 'e.g. (A) Build in-house with Recharts; (B) Integrate Metabase; (C) Use existing Notion dashboards.' },
      { id: 'forgeIdentify',  label: 'Identify',  icon: 'warning_amber',    hint: 'Risks or downsides of each option',           rows: 3, weight: 1.5, placeholder: 'e.g. (A) Eng time cost; (B) Vendor lock-in; (C) Limited visualisation capability.' },
      { id: 'forgeDevelop',   label: 'Develop',   icon: 'task_alt',         hint: 'Recommended course of action and rationale',   rows: 3, weight: 2, placeholder: 'e.g. Go with Metabase — meets all criteria, 2-week setup, existing OSS community support.' },
      { id: 'forgeEvaluate',  label: 'Evaluate',  icon: 'analytics',        hint: 'How you will measure if the decision was right', rows: 2, weight: 1, placeholder: 'e.g. Review adoption rate and ticket reduction in 60 days; revisit if usage is below 50%.' }
    ]
  },

  mece: {
    label: 'MECE',
    description: 'Mutually Exclusive · Collectively Exhaustive',
    fields: [
      { id: 'forgeProblemSpace', label: 'Problem Space',  icon: 'category',         hint: 'The topic or question to structure',          rows: 3, weight: 3, required: true, placeholder: 'e.g. Why did our Q3 revenue miss target by 15%?' },
      { id: 'forgeSegments',    label: 'Segments',        icon: 'account_tree',     hint: 'Mutually exclusive categories that cover all possibilities', rows: 4, weight: 2, placeholder: 'e.g. 1. Fewer new customers  2. Higher churn  3. Lower average deal size  4. Longer sales cycles' },
      { id: 'forgeAnalysis',    label: 'Analysis',        icon: 'search_insights',  hint: 'What the data shows for each segment',        rows: 4, weight: 2, placeholder: 'e.g. New customers -8% (market headwinds), churn flat, ACV down 22% (discounting), sales cycle +3 weeks.' },
      { id: 'forgeSynthesis',   label: 'Synthesis',       icon: 'merge_type',       hint: 'The overall insight or recommendation',       rows: 3, weight: 2, placeholder: 'e.g. Root cause is ACV compression from aggressive discounting. Halt discounts; reinforce value messaging.' }
    ]
  },

  fourps: {
    label: '4Ps',
    description: 'Product · Price · Place · Promotion',
    fields: [
      { id: 'forgeProduct',    label: 'Product',    icon: 'inventory_2',      hint: 'What you are offering; features and benefits',  rows: 3, weight: 3, required: true, placeholder: 'e.g. A local-first prompt library desktop app — offline, private, no subscription.' },
      { id: 'forgePrice',      label: 'Price',      icon: 'attach_money',     hint: 'Pricing strategy and rationale',               rows: 2, weight: 2, placeholder: 'e.g. One-time $49 licence fee; no recurring costs; lifetime updates for v1.' },
      { id: 'forgePlace',      label: 'Place',      icon: 'storefront',       hint: 'Where and how customers access it',            rows: 2, weight: 1.5, placeholder: 'e.g. Direct download from landing page; Gumroad fallback; no app stores (Windows-only).' },
      { id: 'forgePromotion',  label: 'Promotion',  icon: 'campaign',         hint: 'How it will be marketed and communicated',     rows: 3, weight: 2, placeholder: 'e.g. Twitter/X build-in-public thread; ProductHunt launch; affiliate programme at 30% commission.' }
    ]
  },

  succes: {
    label: 'SUCCES',
    description: 'Simple · Unexpected · Concrete · Credible · Emotional · Story',
    fields: [
      { id: 'forgeSimple',      label: 'Simple',      icon: 'compress',         hint: 'The core idea in one clear sentence',          rows: 2, weight: 3, required: true, placeholder: 'e.g. Prompt Library Pro lets you store, search, and reuse your best AI prompts — offline, forever.' },
      { id: 'forgeUnexpected',  label: 'Unexpected',  icon: 'bolt',             hint: 'The surprising or counterintuitive angle',     rows: 2, weight: 2, placeholder: 'e.g. Most people lose their best prompts in chat history. We give them a home that isn\'t the cloud.' },
      { id: 'forgeConcrete',    label: 'Concrete',    icon: 'view_in_ar',       hint: 'Specific, sensory details that make it real',  rows: 3, weight: 2, placeholder: 'e.g. Double-click a prompt, paste into ChatGPT in 3 seconds. No browser, no login, no loading spinner.' },
      { id: 'forgeCredible',    label: 'Credible',    icon: 'verified',         hint: 'What makes this believable (stats, proof, authority)', rows: 2, weight: 1.5, placeholder: 'e.g. 200+ beta users, 4.8-star average rating, featured in 3 AI newsletters.' },
      { id: 'forgeEmotional',   label: 'Emotional',   icon: 'favorite',         hint: 'The feeling or empathy this should evoke',     rows: 2, weight: 1.5, placeholder: 'e.g. Relief — your best thinking, finally safe and searchable, not buried in 47 open tabs.' },
      { id: 'forgeStory',       label: 'Story',       icon: 'auto_stories',     hint: 'The narrative arc that ties it together',      rows: 3, weight: 2, placeholder: 'e.g. Before: hours wasted rewriting the same prompts. After: one click, perfect prompt, great output.' }
    ]
  }

};

/* Template presets"""

content = open('static/app.js', 'r', encoding='utf-8').read()
assert JS_OLD in content, "JS anchor not found!"
new_content = content.replace(JS_OLD, JS_NEW, 1)
assert new_content != content, "No replacement made!"
open('static/app.js', 'w', encoding='utf-8').write(new_content)
print("app.js patched OK")

# Count frameworks now
import re
idx = new_content.find('const FORGE_FRAMEWORKS')
end_idx = new_content.find('const FORGE_TEMPLATES')
keys = re.findall(r'^  (\w+): \{$', new_content[idx:end_idx], re.MULTILINE)
print(f"Frameworks now: {len(keys)} — {keys}")
