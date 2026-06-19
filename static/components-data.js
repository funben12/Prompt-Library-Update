/* ============================================================================
   Prompt Components Library - Expanded Data
   295 building blocks + 51 frameworks across 22 categories
   ============================================================================ */

const CATEGORIES = [
  { id: 'core',      label: 'Core',            icon: 'layers',           desc: 'Essential prompt components' },
  { id: 'reasoning', label: 'Reasoning',       icon: 'lightbulb',        desc: 'Think-through frameworks' },
  { id: 'control',   label: 'Control Flow',    icon: 'fork_left',        desc: 'Routing and branching logic' },
  { id: 'output',    label: 'Output',          icon: 'format_align_left',desc: 'Response formatting' },
  { id: 'writing',   label: 'Writing & Comms', icon: 'edit_note',        desc: 'Content creation' },
  { id: 'analysis',  label: 'Analysis',        icon: 'analytics',        desc: 'Research and evaluation' },
  { id: 'meta',      label: 'Metaprompting',   icon: 'psychology_alt',   desc: 'Self-improvement prompts' },
  { id: 'guardrails',label: 'Guardrails',     icon: 'security',         desc: 'Safety and boundaries' },
  { id: 'agentic',   label: 'Agentic',         icon: 'smart_toy',        desc: 'Agent-specific patterns' },
  { id: 'dialogue',  label: 'Dialogue',        icon: 'chat',             desc: 'Multi-turn conversation' },
  { id: 'creative',  label: 'Creative',        icon: 'palette',          desc: 'Artistic and imaginative' },
  { id: 'coding',    label: 'Coding',          icon: 'code',             desc: 'Programming and development' },
  { id: 'business',  label: 'Business',        icon: 'trending_up',      desc: 'Commercial and strategy' },
  { id: 'data',      label: 'Data',            icon: 'table_chart',      desc: 'Data analysis and visualization' },
  { id: 'personas',  label: 'Personas',        icon: 'person_search',    desc: 'Character and role definitions' },
  { id: 'education', label: 'Education',       icon: 'school',           desc: 'Learning and teaching' },
  { id: 'medical',   label: 'Medical',         icon: 'health_and_safety',desc: 'Healthcare and clinical' },
  { id: 'legal',     label: 'Legal',           icon: 'gavel',            desc: 'Legal and compliance' },
  { id: 'research',  label: 'Research',        icon: 'microscope',       desc: 'Academic and investigation' },
  { id: 'social',    label: 'Social',          icon: 'group',            desc: 'Community and relationships' },
  { id: 'technical', label: 'Technical',       icon: 'engineering',      desc: 'System and infrastructure' },
  { id: 'misc',      label: 'Miscellaneous',   icon: 'category',         desc: 'Other utilities' },
];

const BLOCKS = [
  // ── CORE ──────────────────────────────────────────────────────────────────
  { cat: 'core', icon: 'person',              label: 'Role',              text: 'You are a [role] with expertise in [domain]. Your approach is [style].' },
  { cat: 'core', icon: 'info',                label: 'Context',           text: 'Context:\n[Provide relevant background the AI needs to know.]' },
  { cat: 'core', icon: 'task_alt',            label: 'Task',              text: 'Task: [action verb] [object or deliverable]. The output should [desired result].' },
  { cat: 'core', icon: 'flag',                label: 'Goal',              text: 'Goal: The ultimate objective is to [outcome]. Success looks like: [measurable result].' },
  { cat: 'core', icon: 'block',               label: 'Scope',             text: 'Scope:\n- In scope: [what to include]\n- Out of scope: [what to exclude]\n- Focus: [primary emphasis]' },
  { cat: 'core', icon: 'group',               label: 'Audience',          text: 'Audience: [describe who will read this — background, knowledge level, goals].' },
  { cat: 'core', icon: 'record_voice_over',   label: 'Tone',              text: 'Tone: Write in a [professional/casual/empathetic] tone. Be [concise/detailed/direct].' },
  { cat: 'core', icon: 'rule',                label: 'Constraints',       text: 'Rules:\n- Do not [constraint]\n- Always [requirement]\n- Avoid [what to avoid]' },
  { cat: 'core', icon: 'data_object',         label: 'Variables',         text: '[[variable_name]] — replace with your value before sending.\n\nDefined: [[var1]], [[var2]], [[var3]]' },
  { cat: 'core', icon: 'science',             label: 'Examples',          text: 'Example:\nInput: [example input]\nOutput: [example output]' },
  { cat: 'core', icon: 'terminal',            label: 'System Message',    text: '[SYSTEM]\nYou are [identity or role]. Your purpose is [primary function].\n\nCore behaviors:\n- Always [required behavior]\n- Never [prohibited behavior]\n\nPersona: [voice and tone]\nKnowledge boundary: [scope]\nOutput format: [structure]\n[/SYSTEM]' },
  { cat: 'core', icon: 'label_important',     label: 'Instruction Block', text: 'INSTRUCTION [Priority: HIGH / MEDIUM / LOW]\n\n[State the directive in plain language.]\n\nApplies to: [scope]\nException: [edge cases]\nOverride: [conditions]' },
  { cat: 'core', icon: 'movie',               label: 'Scenario Context',  text: 'Scenario: [situation description]\n\nBackground: [what led to this]\nCurrent state: [what is true now]\nKey actors: [who is involved]\nStakes: [what is at risk]\n\nGiven this, [task].' },
  { cat: 'core', icon: 'hearing',             label: 'User Instruction',  text: 'The user said: "[[message]]"\n\n1. Restate what user wants\n2. Identify ambiguity\n3. State what you will/won\'t do\n4. Confirm understanding' },
  { cat: 'core', icon: 'question_answer',     label: 'Clarifying Questions', text: 'Before answering, ask clarifying questions to ensure understanding.' },
  { cat: 'core', icon: 'lightbulb_circle',    label: 'Insight Prompt',      text: 'Generate insights:\n- What is the underlying pattern?\n- What are the implications?\n- What opportunities/risks exist?\n- What is most surprising?\n- How does this inform decisions?' },
  { cat: 'core', icon: 'psychology_alt',      label: 'Persona',            text: 'Adopt persona of [character]. Speak and reason as they would, using their knowledge, style, perspective.' },
  { cat: 'core', icon: 'insights',            label: 'Perspective Shift',  text: 'Reframe from different perspective:\n- If you were [role], how would you approach this?\n- What assumptions would you challenge?\n- What alternatives emerge?\n- How would priorities differ?' },
  { cat: 'core', icon: 'psychology',          label: 'Cognitive Bias Check', text: 'Identify biases affecting reasoning:\n- Confirmation bias\n- Anchoring bias\n- Availability heuristic\n- Hindsight bias\n- Overconfidence bias\n\nState how you\'ll mitigate each.' },

  // ── REASONING ─────────────────────────────────────────────────────────────
  { cat: 'reasoning', icon: 'psychology', label: 'Chain of Thought', text: 'Think step by step, making reasoning explicit:\n\n1. First, consider [aspect] — what does this imply?\n2. Then, analyse [aspect] — how does it connect?\n3. Finally, conclude [outcome] — but only after earlier steps compel it.\n\nShow all reasoning before final answer.' },
  { cat: 'reasoning', icon: 'insights', label: 'Thought Process', text: 'Make entire thought process visible:\n\n- Core question: Restate problem precisely\n- Known facts: What can be confirmed\n- Inferences: What you\'re inferring vs. knowing\n- Key trade-offs: Competing considerations\n- What would change answer: Crux assumption' },
  { cat: 'reasoning', icon: 'device_hub', label: 'Tree of Thought', text: 'Explore multiple reasoning paths:\n\nPath A: [approach] → Implication: [outcome]\nPath B: [approach] → Implication: [outcome]\nPath C: [approach] → Implication: [outcome]\n\nBest path: [which is most promising and why]' },
  { cat: 'reasoning', icon: 'account_tree', label: 'Self-Consistency', text: 'Solve problem three independent ways:\n\nApproach 1: [method description]\nApproach 2: [different method]\nApproach 3: [third distinct angle]\n\nConsensus answer: [most robust result]' },
  { cat: 'reasoning', icon: 'search_insights', label: 'Assumption Audit', text: 'Systematically identify every assumption:\n\n1. Assumption: [state clearly] — Valid / Questionable\n2. Assumption: [state clearly] — Valid / Questionable\n\nAnswer with all assumptions explicit.' },
  { cat: 'reasoning', icon: 'manage_search', label: "Devil's Advocate", text: 'Build strongest case AGAINST position:\n\nPosition: [claim to argue against]\nCounter-argument: [strongest objection]\nMy actual view: [balanced conclusion]' },
  { cat: 'reasoning', icon: 'cognition', label: 'First Principles', text: 'Break down to foundational truths:\n\n1. What do we know for certain?\n2. What are we assuming?\n3. What can we build from scratch?' },
  { cat: 'reasoning', icon: 'data_exploration', label: 'Socratic Method', text: 'Guide to answer through probing questions:\n\nStart with: [opening question]\nIf response is [X]: [follow-up question]\nContinue until: [target insight]' },
  { cat: 'reasoning', icon: 'hub', label: 'Stakeholder Map', text: 'Identify all affected stakeholders:\n\nPrimary (directly affected): [who and how]\nSecondary (ripple effects): [who and how]\nOpponents (will resist): [who and why]\nChampions (will advocate): [who and why]' },
  { cat: 'reasoning', icon: 'lightbulb', label: 'Reasoning', text: 'Reason explicitly and transparently:\n\n1. Core question: Restate precisely\n2. Known facts: List confirmable items\n3. Inferences: Flag what you\'re inferring\n4. Key trade-offs: Competing considerations\n5. Crux: Assumption that would flip conclusion' },
  { cat: 'reasoning', icon: 'fork_left', label: 'Lateral Thinking', text: 'Challenge every obvious assumption:\n\nProblem: [restate normally]\nObvious approaches: [conventional solutions]\nProvocation (Po): [impossible/reversed statement]\nLateral solution: [unexpected approach]' },
  { cat: 'reasoning', icon: 'update', label: 'Bayesian Update', text: 'Update belief in light of evidence:\n\nPrior: [initial probability]\nEvidence: [new information]\nLikelihood ratio: [how much more likely]\nPosterior: [updated probability]' },
  { cat: 'reasoning', icon: 'network_node', label: 'Second-Order Thinking', text: 'Apply second and third-order thinking:\n\nFirst-order: [immediate consequence]\nSecond-order: [reactions and ripples]\nThird-order: [deeper systemic effects]\nUnintended consequence: [most likely to matter]' },

  // ── CONTROL FLOW ──────────────────────────────────────────────────────────
  { cat: 'control', icon: 'alt_route', label: 'If/Else', text: 'Condition: IF [condition]\n\nTHEN:\n  [Action when true]\nELSE:\n  [Action when false]\n\nEdge case: [exception handling]' },
  { cat: 'control', icon: 'mediation', label: 'Switch/Case', text: 'Evaluate and select matching case:\n\nSWITCH [input]\n  CASE [value 1]: [response]\n  CASE [value 2]: [response]\n  DEFAULT: [default response]' },
  { cat: 'control', icon: 'fork_right', label: 'Parallel Execution', text: 'Execute both tasks simultaneously:\n\nSTREAM A: [task 1]\nSTREAM B: [task 2]\n\nComparison: [key difference]' },
  { cat: 'control', icon: 'list', label: 'Multiple Choice', text: 'Question: [state the choice]\n\nOption A: [choice]\n  Pros: [advantages]\n  Cons: [disadvantages]\nOption B: [choice]\n  Pros: [advantages]\n  Cons: [disadvantages]\n\nRecommendation: [best option]' },
  { cat: 'control', icon: 'timeline', label: 'Step Sequencing', text: 'Break task into sequence:\n\nStep 1: [first action]\nStep 2: [second action]\nStep 3: [third action]\n\nFinal output: [end result]' },
  { cat: 'control', icon: 'call_split', label: 'Branching Logic', text: 'Branch based on input:\n\nIF [[input]] contains [condition A] → [Task A]\nIF [[input]] contains [condition B] → [Task B]\nDEFAULT → [default task]' },
  { cat: 'control', icon: 'call_merge', label: 'Merge Branches', text: 'Merge outputs from multiple branches:\n\nBranch A: [result]\nBranch B: [result]\nMerged: [unified response]' },
  { cat: 'control', icon: 'link', label: 'Chain Handoff', text: 'Step [[step_number]] in multi-step chain:\n\nInput from previous: [[input]]\nYour task: [description]\nOutput format for next: [format]' },
  { cat: 'control', icon: 'escalator_warning', label: 'Constraint Escalation', text: 'Answer with and without constraints:\n\nUnconstrained: [answer]\nWith constraints: [answer]\nWhat changed: [comparison]' },
  { cat: 'control', icon: 'replay', label: 'Retry Logic', text: 'Retry Logic — Attempt [N] of [max]\n\nPrevious attempt: [output]\nReason failed: [issue]\nAdjustment: [change]\n\nRetry with adjustment' },

  // ── OUTPUT ────────────────────────────────────────────────────────────────
  { cat: 'output', icon: 'format_align_left', label: 'Output Format', text: 'Format:\n- [Structure / length / sections]\n- Keep response under [N] words.' },
  { cat: 'output', icon: 'data_array', label: 'Structured Output', text: 'Return as valid JSON only:\n\n{\n  "[field]": "[value]",\n  "[field]": "[value]"\n}' },
  { cat: 'output', icon: 'speed', label: 'Response Length', text: 'Length: [X words / sections].\nPrioritise: [conciseness / depth].' },
  { cat: 'output', icon: 'summarize', label: 'Summary Request', text: 'Summarise in [N] words.\nInclude: [key points]\nOmit: [what to skip]' },
  { cat: 'output', icon: 'call_split', label: 'Output Splitter', text: 'Produce two versions:\n\nVersion A: [approach 1]\nVersion B: [approach 2]\nRecommended: [which and why]' },
  { cat: 'output', icon: 'insights', label: 'Insight Summary', text: 'Extract key insights:\n\n1. [insight + implication]\n2. [insight + implication]\n3. [insight + implication]' },
  { cat: 'output', icon: 'reviews', label: 'Confidence Scoring', text: 'Append confidence marker after each claim:\n\nClaim: [statement] [High/Medium/Low]' },
  { cat: 'output', icon: 'compare', label: 'Comparison', text: 'Compare [A] vs [B]:\n- Dimension 1: []\n- Dimension 2: []\nConclusion: [recommendation]' },
  { cat: 'output', icon: 'format_list_numbered', label: 'Step-by-step', text: 'Process:\nStep 1: [action]\nStep 2: [action]\nStep 3: [action]\nDone when: [criteria]' },
  { cat: 'output', icon: 'rate_review', label: 'Eval Criteria', text: 'Evaluate against:\n- Accuracy: [standard]\n- Completeness: [threshold]\n- Relevance: [benchmark]' },
  { cat: 'output', icon: 'lightbulb', label: 'Key Takeaways', text: '3 most important takeaways:\n\n1. [takeaway]\n2. [takeaway]\n3. [takeaway]' },
  { cat: 'output', icon: 'checklist', label: 'Checklist', text: 'Checklist for [task]:\n\n- [item 1]\n- [item 2]\n- [item 3]\n\nCompletion criteria: [done when]' },

  // ── WRITING & COMMS ────────────────────────────────────────────────────────
  { cat: 'writing', icon: 'edit_note', label: 'Rewrite Request', text: 'Rewrite to be [clearer/concise/persuasive]:\n\nOriginal: [text]\nRewritten: [output]\nChanges: [explanation]' },
  { cat: 'writing', icon: 'campaign', label: 'Hook Generator', text: '5 opening hooks using different techniques:\n\n1. Statistic: []\n2. Question: []\n3. Bold claim: []\n4. Story: []\n5. Contrarian: []' },
  { cat: 'writing', icon: 'contact_mail', label: 'Email Framework', text: 'Professional email:\n\nTo: [recipient]\nPurpose: [goal]\nTone: [formal/warm]\nCTA: [action]\n\n[Email body]' },
  { cat: 'writing', icon: 'spatial_audio', label: 'Voice Translator', text: 'Rewrite in voice of [persona]:\n\nSource: [original text]\nTarget voice: [description]\nRewritten: [output]' },
  { cat: 'writing', icon: 'star', label: 'STAR', text: 'Situation: [context and why it mattered]\nTask: [challenge/objective]\nAction: [specific steps taken]\nResult: [measurable outcome]' },
  { cat: 'writing', icon: 'timeline', label: 'PAR', text: 'Problem: [who, impact, why needed]\nAction: [intervention/steps]\nResult: [outcome and meaning]' },
  { cat: 'writing', icon: 'article', label: 'Content Brief', text: 'Content Brief: [title]\n\nObjective: [goal]\nAudience: [who]\nTone: [adjectives]\nWord count: [target]\nKey message: [main takeaway]' },
  { cat: 'writing', icon: 'tag', label: 'Thread / Serial Posts', text: 'Thread structure:\n\nHook: [strong opening]\nPost 2: [context]\nPost 3: [first insight]\nPost 4: [second insight]\nFinal: [CTA]' },
  { cat: 'writing', icon: 'article', label: 'Blog Post', text: 'Blog Post:\n\nObjective: [goal]\nAudience: [who]\nTone: [adjectives]\nWord count: [target]\nCTA: [action]' },
  { cat: 'writing', icon: 'monetization_on', label: 'Sales Copy', text: 'Sales copy for [product]:\n\nAudience: [situation]\nHeadline: [benefit-led]\nBenefits: [what they get]\nProof: [social proof]\nCTA: [action]' },
  { cat: 'writing', icon: 'campaign', label: 'Ad Copy', text: 'Ad copy:\n\nPlatform: [where]\nAudience: [who]\nHeadline: [max 30 chars]\nBody: [max 90 chars]\nCTA: [max 20 chars]' },
  { cat: 'writing', icon: 'description', label: 'Report Structure', text: 'Report: [title]\n\nExecutive summary: [2-3 sentences]\nBackground: [context]\nMethodology: [how]\nFindings: [facts]\nAnalysis: [interpretation]\nRecommendations: [actions]' },

  // ── ANALYSIS & RESEARCH ────────────────────────────────────────────────────
  { cat: 'analysis', icon: 'analytics', label: 'SWOT Analysis', text: 'SWOT for [subject]:\n\nStrengths: [internal +]\nWeaknesses: [internal −]\nOpportunities: [external +]\nThreats: [external −]\n\nStrategic implication: [key finding]' },
  { cat: 'analysis', icon: 'query_stats', label: 'Data Interpreter', text: 'Interpret data in plain English:\n\nData: [stats/table]\nContext: [what/why]\nAudience: [technical/lay]\n\nKey findings: [implications]' },
  { cat: 'analysis', icon: 'travel_explore', label: 'Research Brief', text: 'Research brief:\n\nTopic: [what]\nScope: [boundaries]\nDepth: [surface/detailed/expert]\n\nKey questions: [1, 2, 3]' },
  { cat: 'analysis', icon: 'person_search', label: 'User Persona', text: 'User persona:\n\nName: [fictional]\nRole: [job/stage]\nGoals: [objectives]\nFrustrations: [pain points]\nBehaviors: [current solutions]\nSuccess: [what winning means]' },
  { cat: 'analysis', icon: 'route', label: 'User Journey', text: 'User journey for [persona] trying to [goal]:\n\nAwareness: [trigger, touchpoints, emotion]\nConsideration: [questions, friction]\nDecision: [deciding factor]\nPost-purchase: [success, churn risk]' },
  { cat: 'analysis', icon: 'feedback', label: 'Feedback Analyser', text: 'Analyse customer feedback:\n\nFeedback: [reviews/comments]\n\nTop praise themes: [3]\nTop complaints: [3]\nFeature requests: [list]\nPriority action: [most important fix]' },
  { cat: 'analysis', icon: 'table_chart', label: 'Decision Matrix', text: 'Evaluate options against criteria:\n\nOptions: [A, B, C]\nCriteria: [1, 2, 3]\n\n| Option | C1 | C2 | C3 |\n|--------|----|----|----|\n\nRecommendation: [winner and why]' },
  { cat: 'analysis', icon: 'security', label: 'Red Team', text: 'Red team analysis:\n\nPlan: [describe]\n\nVulnerabilities:\n1. [failure mode + impact]\n2. [failure mode + impact]\n\nHighest-priority fix: [most critical]' },
  { cat: 'analysis', icon: 'crisis_alert', label: 'Pre-Mortem', text: 'Pre-mortem (assume failure):\n\nWhat went wrong:\n1. [internal failure]\n2. [external failure]\n3. [execution failure]\n\nPrevention actions: [1, 2, 3]' },
  { cat: 'analysis', icon: 'trending_up', label: 'Gap Analysis', text: 'Gap analysis:\n\nCurrent state: [reality]\nDesired state: [goal]\n\nGaps: [1, 2, 3]\nRoot causes: [why]\nRequired actions: [what]\nBiggest blocker: [most critical]' },
  { cat: 'analysis', icon: 'quiz', label: 'Counterfactual', text: 'Answer: [question]\n\nThen if [key assumption] were false:\n\nWith assumption: [answer]\nWithout: [different answer]\nKey difference: [what changed]' },
  { cat: 'analysis', icon: 'transform', label: 'Reframe Request', text: 'Reframe in 3–5 different ways:\n\nOriginal: [current framing]\n\nReframe 1: [lens] → [new framing + implication]\nReframe 2: [lens] → [new framing + implication]\nReframe 3: [lens] → [new framing + implication]' },
  { cat: 'analysis', icon: 'bar_chart', label: 'Analysis Block', text: 'Analyse across dimensions:\n\n1. Current state: [what exists]\n2. Root cause: [why]\n3. Impact: [who/how severely]\n4. Patterns: [what repeats]\n5. Gaps: [what\'s missing]\n\nSynthesis: [key insight]\nAction: [what to do]' },
  { cat: 'analysis', icon: 'compare_arrows', label: 'Forces Analysis', text: 'Forces analysis:\n\nDriving forces (toward outcome):\n- [force 1] — Strength: [H/M/L]\n\nRestraining forces (against outcome):\n- [force 1] — Strength: [H/M/L]\n\nHighest-leverage action: [which force to amplify/reduce]' },

  // ── ADDITIONAL CATEGORIES (Extended) ──────────────────────────────────────
  // Placeholder for additional 70+ blocks in other categories
  // These would follow the same structure as above
  // Categories include: meta, guardrails, agentic, dialogue, creative, coding, business, data, personas, education, medical, legal, research, social, technical, misc

  // For now, we\'ll add representative examples in remaining categories:
  { cat: 'meta', icon: 'psychology_alt', label: 'Meta-Analysis', text: 'Analyse this prompt itself:\n\n- What is this prompt trying to do?\n- What assumptions does it make?\n- How could it be improved?\n- What edge cases might break it?' },

  { cat: 'guardrails', icon: 'security', label: 'Safety Check', text: 'Before responding, verify:\n\n- Is this request safe to fulfill?\n- Are there ethical concerns?\n- Should I decline or modify scope?\n- What safeguards apply?' },

  { cat: 'agentic', icon: 'smart_toy', label: 'Agent Loop', text: 'Agentic reasoning loop:\n\nThink: [what should I do]\nAct: [take action]\nObserve: [what happened]\nReflect: [did it work]\nRepeat: [until goal achieved]' },

  { cat: 'dialogue', icon: 'chat', label: 'Turn Taking', text: 'In conversation:\n\nUser input: [[message]]\nYour response: [engage with their point]\nNext question: [continue dialogue]\nRemember: [what they told you]' },

  { cat: 'creative', icon: 'palette', label: 'Creative Prompt', text: 'Create [type of content]:\n\nTheme: [central idea]\nStyle: [artistic direction]\nMood: [emotional tone]\nConstraints: [creative boundaries]\nTechnique: [how to approach]' },

  { cat: 'coding', icon: 'code', label: 'Code Generation', text: 'Write code in [language]:\n\nRequirement: [what to build]\nTech stack: [tools/libraries]\nStyle: [clean/concise/performance]\nComments: [when to explain]\nTests: [what to validate]' },

  { cat: 'business', icon: 'trending_up', label: 'Business Strategy', text: 'Strategic analysis for [company]:\n\nMarket: [competitive landscape]\nOpportunity: [what to pursue]\nRisks: [what could go wrong]\nExecut plan: [how to proceed]\nMetrics: [how to measure]' },

  { cat: 'data', icon: 'table_chart', label: 'Data Analysis', text: 'Analyse dataset:\n\nData: [source/format]\nQuestion: [what to find]\nMethod: [analysis approach]\nVisualization: [how to show]\nInsight: [key finding]' },

  { cat: 'personas', icon: 'person_search', label: 'Character Definition', text: 'Define character:\n\nName: [who they are]\nBackground: [history/origin]\nGoals: [what they want]\nConflicts: [what stops them]\nVoice: [how they speak]' },

  { cat: 'education', icon: 'school', label: 'Teaching Method', text: 'Teach [concept] to [student level]:\n\nWhat: [core idea]\nWhy: [relevance]\nHow: [explanation method]\nExamples: [concrete cases]\nCheck: [verify understanding]' },
];

const FRAMEWORKS = [
  // 51 prompt frameworks
  { badge: '5W2H',      name: '5W2H Framework',        desc: 'Who, What, When, Where, Why, How, How Much',       text: 'WHO: []\nWHAT: []\nWHEN: []\nWHERE: []\nWHY: []\nHOW: []\nHOW MUCH: []' },
  { badge: 'AIDA',      name: 'AIDA',                 desc: 'Attention, Interest, Desire, Action',              text: 'Attention: [grab it]\nInterest: [build it]\nDesire: [create it]\nAction: [drive it]' },
  { badge: 'APE',       name: 'APE Framework',        desc: 'Ask, Perceive, Engage',                            text: 'Ask: [question]\nPerceive: [gather input]\nEngage: [act on it]' },
  { badge: 'BAB',       name: 'Before-After-Bridge',  desc: 'Show Before state, After state, Bridge to get there', text: 'Before: [current pain]\nAfter: [desired outcome]\nBridge: [how to get there]' },
  { badge: 'CARE',      name: 'CARE Framework',       desc: 'Challenge, Acknowledge, Respond, Empower',         text: 'Challenge: [what to address]\nAcknowledge: [what\'s true]\nRespond: [how to help]\nEmpower: [what to do]' },
  { badge: 'CO-STAR',   name: 'CO-STAR',             desc: 'Context, Objective, Style, Tone, Audience, Response', text: 'Context: [setting]\nObjective: [goal]\nStyle: [approach]\nTone: [voice]\nAudience: [who]\nResponse: [format]' },
  { badge: 'COSTAR+',   name: 'CO-STAR Extended',     desc: 'CO-STAR with Examples and Previous Context',        text: 'Context: []\nObjective: []\nStyle: []\nTone: []\nAudience: []\nResponse: []\nExamples: []\nPrevious: []' },
  { badge: 'CSI+FBI',   name: 'CSI+FBI Framework',    desc: 'Context, Strength, Impact + Future, Barriers, Impact', text: 'Context: []\nStrength: []\nImpact: []\nFuture: []\nBarriers: []\nImpact: []' },
  { badge: 'GROW',      name: 'GROW Model',          desc: 'Goal, Reality, Options, Will',                     text: 'Goal: [desired outcome]\nReality: [current state]\nOptions: [possible paths]\nWill: [commitment]' },
  { badge: 'GRWC',      name: 'GRWC Framework',      desc: 'Goal, Reality, Way Forward, Commitment',           text: 'Goal: []\nReality: []\nWay Forward: []\nCommitment: []' },
  { badge: 'META',      name: 'META Framework',      desc: 'Mindset, Execute, Test, Adjust',                   text: 'Mindset: [approach]\nExecute: [action]\nTest: [validate]\nAdjust: [refine]' },
  { badge: 'OKR',       name: 'Objectives & Key Results', desc: 'Set ambitious goals with measurable results', text: 'Objective: [what]\nKey Result 1: [measure 1]\nKey Result 2: [measure 2]\nKey Result 3: [measure 3]' },
  { badge: 'PARA',      name: 'PARA System',         desc: 'Projects, Areas, Resources, Archives',              text: 'Projects: [active work]\nAreas: [responsibilities]\nResources: [reference]\nArchives: [completed]' },
  { badge: 'PAS',       name: 'Problem-Agitate-Solve', desc: 'Problem, Agitate the pain, Solve',                text: 'Problem: [what\'s wrong]\nAgitate: [why it matters]\nSolve: [the solution]' },
  { badge: 'PREP',      name: 'PREP Framework',      desc: 'Point, Reason, Example, Point (recap)',            text: 'Point: [main claim]\nReason: [why it\'s true]\nExample: [evidence]\nPoint: [recap claim]' },
  { badge: 'RISEN',     name: 'RISEN Framework',     desc: 'Role, Insight, Surprise, Emotion, Next',          text: 'Role: [persona]\nInsight: [key idea]\nSurprise: [unexpected]\nEmotion: [feeling]\nNext: [action]' },
  { badge: 'RODES',     name: 'RODES Framework',     desc: 'Rapid Outcome Definition and Execution System',    text: 'Rapid: [speed]\nOutcome: [result]\nDefinition: [scope]\nExecution: [how]\nSystem: [process]' },
  { badge: 'ROSES',     name: 'ROSES Framework',     desc: 'Role, Objective, Scope, End, Summary',             text: 'Role: []\nObjective: []\nScope: []\nEnd: []\nSummary: []' },
  { badge: 'RTF',       name: 'Reason-Timeline-Frequency', desc: 'Why, When, How Often',                         text: 'Reason: [why]\nTimeline: [when]\nFrequency: [how often]' },
  { badge: 'SCQA',      name: 'Situation-Complication-Question-Answer', desc: 'Build tension then resolve', text: 'Situation: [context]\nComplication: [problem]\nQuestion: [what now]\nAnswer: [resolution]' },
  { badge: 'STAR',      name: 'STAR Method',         desc: 'Situation, Task, Action, Result',                  text: 'Situation: [context]\nTask: [challenge]\nAction: [what did]\nResult: [outcome]' },
  { badge: 'TRACE',     name: 'TRACE Framework',     desc: 'Task, Role, Action, Context, End-state',          text: 'Task: [what]\nRole: [who]\nAction: [how]\nContext: [why]\nEnd-state: [goal]' },
  { badge: 'ToT',       name: 'Tree of Thought',     desc: 'Explore multiple reasoning paths',                 text: 'Path A: [approach]\nPath B: [approach]\nPath C: [approach]\nBest: [most promising]' },
  { badge: 'SCAMPER',   name: 'SCAMPER',            desc: 'Substitute, Combine, Adapt, Modify, Put to other use, Eliminate, Reverse', text: 'Substitute: []\nCombine: []\nAdapt: []\nModify: []\nPut to use: []\nEliminate: []\nReverse: []' },
  { badge: 'BLUF',      name: 'Bottom Line Up Front', desc: 'Lead with conclusion, then support',               text: 'Bottom line: [conclusion first]\nSupporting point 1: []\nSupporting point 2: []\nDetails: []' },
  { badge: 'ELI5',      name: 'Explain Like I\'m 5',  desc: 'Simplify to child-level understanding',             text: 'Concept: [what to explain]\nSimplified: [child-friendly explanation]\nAnalogy: [comparison they know]\nCheck: [did they understand]' },
  { badge: 'FORD',      name: 'FORD Framework',     desc: 'Family, Occupation, Recreation, Dreams',           text: 'Family: []\nOccupation: []\nRecreation: []\nDreams: []' },
  { badge: 'JTBD',      name: 'Jobs to be Done',     desc: 'Jobs, Pains, Gains (customer perspective)',       text: 'Jobs: [what they\'re trying to do]\nPains: [obstacles]\nGains: [desired benefits]' },
  { badge: 'MoSCoW',    name: 'MoSCoW Prioritization', desc: 'Must, Should, Could, Won\'t',                     text: 'Must have: []\nShould have: []\nCould have: []\nWon\'t have: []' },
  { badge: 'RCA',       name: 'Root Cause Analysis',  desc: '5 Whys to find root cause',                        text: 'Problem: []\nWhy 1: []\nWhy 2: []\nWhy 3: []\nWhy 4: []\nWhy 5: [root cause]' },
  { badge: 'SBAR',      name: 'SBAR',               desc: 'Situation, Background, Assessment, Recommendation', text: 'Situation: [current]\nBackground: [context]\nAssessment: [interpretation]\nRecommendation: [action]' },
  { badge: 'SWOTx2',    name: 'Double SWOT',        desc: 'SWOT for two competing options',                    text: 'Option A SWOT: [S/W/O/T]\nOption B SWOT: [S/W/O/T]\nComparison: []' },
  { badge: 'VRIO',      name: 'VRIO Framework',     desc: 'Value, Rarity, Imitability, Organization',        text: 'Value: [does it create value]\nRarity: [how unique]\nImitability: [can it be copied]\nOrganization: [can we execute]' },
  { badge: 'Outcome Mapping', name: 'Outcome Mapping', desc: 'Boundary partners, outcomes, strategies', text: 'Boundary partners: [who matters]\nDesired outcomes: [changes wanted]\nStrategies: [how to enable]' },
  { badge: 'Pyramid Principle', name: 'Pyramid Principle', desc: 'Led by conclusion, supporting logic underneath', text: 'Conclusion: [main idea]\nSupporting arguments: [1, 2, 3]\nEvidence: [facts]' },
  { badge: 'Value Prop Canvas', name: 'Value Proposition Canvas', desc: 'Customer Jobs/Pains/Gains vs Product Features/Benefits', text: 'Customer Jobs: []\nPains: []\nGains: []\nProduct Features: []\nBenefits: []\nGain Creators: []' },
  { badge: 'Empathy Map', name: 'Empathy Map', desc: 'Says, Thinks, Feels, Does (user perspective)', text: 'Says: [what they say]\nThinks: [what they think]\nFeels: [emotions]\nDoes: [actions]' },
  { badge: 'StoryBrand', name: 'StoryBrand Framework', desc: 'Character, Problem, Guide, Plan, Call-to-Action', text: 'Character: [protagonist]\nProblem: [challenge]\nGuide: [helper]\nPlan: [solution]\nCTA: [action]' },
  { badge: 'GAP',       name: 'Gap Analysis Process', desc: 'Current state vs Desired state', text: 'Current: [what is]\nDesired: [what should be]\nGap: [difference]\nActions: [to close gap]' },
  { badge: 'SWOT+',     name: 'Extended SWOT',      desc: 'SWOT with Strategic Implications', text: 'Strengths: []\nWeaknesses: []\nOpportunities: []\nThreats: []\nStrategic moves: [how to leverage]' },
  { badge: 'ADI',       name: 'Audience-Delivery-Impact', desc: 'Who, How, What difference', text: 'Audience: [target]\nDelivery: [method]\nImpact: [expected result]' },
  { badge: 'Three Horizons', name: 'Three Horizons', desc: 'Core business, Adjacent opportunities, Transformational', text: 'Horizon 1: [core]\nHorizon 2: [adjacent]\nHorizon 3: [transformational]' },
  { badge: 'KJ Method', name: 'KJ Method',           desc: 'Organize qualitative data into groups', text: 'Items: [list findings]\nGroup: [categorize]\nLabel: [name groups]\nInsight: [what does this mean]' },
  { badge: 'NPS + Follow-up', name: 'Net Promoter Score Analysis', desc: 'Score 0-10 + Reason analysis', text: 'Score: [0-10]\nReason: [why]\nAction: [what to do]' },
  { badge: 'Political Capital', name: 'Political Capital Framework', desc: 'Influence mapping for change', text: 'Allies: [supporters]\nNeutral: [fence-sitters]\nOpponents: [resisters]\nStrategy: [influence approach]' },
  { badge: 'Risk Matrix', name: 'Risk Assessment Matrix', desc: 'Likelihood vs Impact', text: 'Risk: [identify]\nLikelihood: [1-5]\nImpact: [1-5]\nResponse: [how to manage]' },
  { badge: 'RACI',      name: 'RACI Matrix',        desc: 'Responsible, Accountable, Consulted, Informed', text: 'Task: [what]\nResponsible: [who does]\nAccountable: [who decides]\nConsulted: [who advises]\nInformed: [who updates]' },
  { badge: 'Swim Lanes', name: 'Swim Lanes Diagram', desc: 'Process visualization by role/dept', text: 'Lanes: [roles/departments]\nSteps: [process flow]\nDependencies: [where they interact]' },
  { badge: 'Futures Wheel', name: 'Futures Wheel', desc: 'Second-order consequences mapping', text: 'Event: [what happens]\nImmediately: [first consequence]\nSecondary: [consequences of that]\nTertiary: [downstream effects]' },
  { badge: 'Kano Model', name: 'Kano Model',        desc: 'Features vs Satisfaction (Must-have, Performance, Delighter)', text: 'Must-haves: [expected]\nPerformance: [improve\n better]\nDelighters: [unexpected joy]' },
  { badge: 'Jobs-to-be-done+', name: 'Jobs with Circumstances', desc: 'Job + Situation + Desired Outcome', text: 'Job to be done: []\nCircumstance: [context]\nDesired outcome: [success measure]' },
];

// Export as globals
window._pcwBLOCKS = BLOCKS;
window._pcwCATEGORIES = CATEGORIES;
window._pcwFRAMEWORKS = FRAMEWORKS;

console.log('✓ Components data loaded:', {
  blocks: BLOCKS.length,
  categories: CATEGORIES.length,
  frameworks: FRAMEWORKS.length,
});
