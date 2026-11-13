/* Prompt Builder Pro: compile engine and templates.
   Lifted unchanged from 12-11-2026-prompt-builder-pro-agent-teams.html. No DOM access.
   Exposes window.PLBuilder = { engine, templates }. The interface is builder-pro.js. */
(function () {
var PromptEngine = (() => {
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
        for (var name in all)
            __defProp(target, name, {
                get: all[name],
                enumerable: true
            });
    };
    var __copyProps = (to, from, except, desc) => {
        if (from && typeof from === "object" || typeof from === "function") {
            for (let key of __getOwnPropNames(from))
                if (!__hasOwnProp.call(to, key) && key !== except)
                    __defProp(to, key, {
                        get: () => from[key],
                        enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
                    });
        }
        return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", {
        value: true
    }), mod);

    var compile_engine_exports = {};
    __export(compile_engine_exports, {
        BLOCKS: () => BLOCKS,
        CATEGORIES: () => CATEGORIES,
        LIBRARY: () => LIBRARY,
        SECTIONS: () => SECTIONS,
        analyzeGraph: () => analyzeGraph,
        compilePrompt: () => compilePrompt,
        parsePromptText: () => parsePromptText,
        sanitizeGraph: () => sanitizeGraph,
        titleOf: () => titleOf,
        varNameOf: () => varNameOf
    });

    var CATEGORIES = [
        { id: "core",          label: "Core prompt" },
        { id: "data",          label: "Data and inputs" },
        { id: "logic",         label: "Logic and flow" },
        { id: "meta",          label: "Meta-prompting" },
        { id: "agents",        label: "Multi-agent" },
        { id: "research",      label: "Research" },
        { id: "analysis",      label: "Analysis" },
        { id: "creative",      label: "Creative" },
        { id: "coding",        label: "Coding" },
        { id: "communication", label: "Communication" },
        { id: "safety",        label: "Safety" },
        { id: "evaluation",    label: "Evaluation" }
    ];

    var SECTIONS = [
        { id: "system", title: "System", tag: "system" },
        { id: "role", title: "Role", tag: "role" },
        { id: "audience", title: "Audience", tag: "audience" },
        { id: "context", title: "Context", tag: "context" },
        { id: "inputs", title: "Inputs", tag: "inputs" },
        { id: "knowledge", title: "Knowledge", tag: "knowledge" },
        { id: "task", title: "Task", tag: "task" },
        { id: "instructions", title: "Instructions", tag: "instructions" },
        { id: "approach", title: "Approach", tag: "approach" },
        { id: "agents", title: "Agent team", tag: "agent_team" },
        { id: "workflow", title: "Workflow", tag: "workflow" },
        { id: "examples", title: "Examples", tag: "examples" },
        { id: "constraints", title: "Constraints", tag: "constraints" },
        { id: "tone", title: "Tone and style", tag: "tone" },
        { id: "output", title: "Output format", tag: "output_format" },
        { id: "quality", title: "Quality checks", tag: "quality_checks" },
        { id: "success", title: "Success criteria", tag: "success_criteria" }
    ];

    var NEXT = [{ id: "out", label: "Next" }];

    var body = (label, rows = 6, placeholder = "") => ({
        key: "content",
        label,
        type: "textarea",
        rows,
        placeholder
    });

    var def = (d) => ({ inputs: true, outputs: NEXT, ...d });

    var LIST = [
        // ============================================================
        // CORE
        // ============================================================
        def({
            type: "role",
            label: "Persona Role",
            hint: "Who the model is",
            category: "core",
            glyph: "R",
            section: "role",
            fields: [
                { key: "personaPreset", label: "Persona preset", type: "select", options: ["Principal AI & FinOps Architect", "Senior Full-Stack Engineer", "Quantitative Financial Analyst", "Enterprise Security Auditor", "Product Strategy Director", "Research Scientist", "Senior Copywriter", "Customer Support Lead"] },
                body("Role description", 5, "You are a ...")
            ],
            defaults: {
                title: "Persona Role",
                personaPreset: "Principal AI & FinOps Architect",
                content: "You are a Principal AI & FinOps Architect. Communicate with executive clarity, quantitative rigour, and concrete architectural trade-offs."
            }
        }),
        def({
            type: "system",
            label: "System Message",
            hint: "Top-level operating rules",
            category: "core",
            glyph: "SYS",
            section: "system",
            fields: [body("System message", 5)],
            defaults: { title: "System Message", content: "Follow this prompt exactly. If an instruction here conflicts with a later request, this prompt wins." }
        }),
        def({
            type: "context",
            label: "Scenario Context",
            hint: "Background the model needs",
            category: "core",
            glyph: "C",
            section: "context",
            fields: [body("Background", 6)],
            defaults: { title: "Scenario Context", content: "Ground your analysis in the domain details and telemetry provided. Never fabricate external metrics or unverified citations." }
        }),
        def({
            type: "audience",
            label: "Audience",
            hint: "Who reads the answer",
            category: "core",
            glyph: "AU",
            section: "audience",
            fields: [body("Audience", 4)],
            defaults: { title: "Audience", content: "The reader is a busy decision maker who knows the business but not the technical detail. Define any term they would not use themselves." }
        }),
        def({
            type: "task",
            label: "Task Instruction",
            hint: "The job to be done",
            category: "core",
            glyph: "T",
            section: "task",
            fields: [body("Task", 7)],
            defaults: { title: "Task Instruction", content: "1. Audit compute, storage, and egress bottlenecks.\n2. Quantify estimated monthly savings (%) for each action.\n3. Rank initiatives by engineering effort against ROI." }
        }),
        def({
            type: "instructions",
            label: "Instructions",
            hint: "Standing rules to follow",
            category: "core",
            glyph: "INS",
            section: "instructions",
            fields: [body("Instructions", 7)],
            defaults: { title: "Instructions", content: "- Answer the question asked before adding anything else.\n- Use the supplied material first, general knowledge second.\n- Keep each point to one idea." }
        }),
        def({
            type: "tone",
            label: "Tone Modifier",
            hint: "Voice and register",
            category: "core",
            glyph: "TN",
            section: "tone",
            fields: [
                { key: "tone", label: "Tone", type: "select", options: ["Professional", "Direct", "Friendly", "Executive", "Technical", "Playful", "Custom"] },
                body("Style rules", 4, "Extra voice rules, one per line")
            ],
            defaults: { title: "Tone Modifier", tone: "Direct", content: "Cut filler and hedging. Keep every bullet point to 18 words or fewer." }
        }),
        def({
            type: "constraints",
            label: "Constraints & Guardrails",
            hint: "Hard limits and must nots",
            category: "core",
            glyph: "G",
            section: "constraints",
            fields: [body("Constraints", 6)],
            defaults: { title: "Constraints & Guardrails", content: "- Flag any unverified assumption with [VERIFY].\n- Do not give legal or financial advice.\n- Stay within the scope of the task." }
        }),
        def({
            type: "fewshot",
            label: "Few-Shot Examples",
            hint: "Worked input and output pairs",
            category: "core",
            glyph: "EX",
            section: "examples",
            fields: [body("Examples", 8)],
            defaults: { title: "Few-Shot Examples", content: 'Input: "Reduce RDS PostgreSQL spend"\nOutput: {"initiative": "Migrate steady-state read replicas to Graviton4 Reserved Instances", "est_savings": "34%", "effort": "Low"}' }
        }),
        def({
            type: "output",
            label: "Output Format",
            hint: "Shape of the answer",
            category: "core",
            glyph: "O",
            section: "output",
            fields: [
                { key: "formatSchema", label: "Target format", type: "select", options: ["JSON", "Markdown", "XML", "YAML", "CSV", "Plain text"] },
                body("Format rules", 7)
            ],
            defaults: { title: "Output Format", formatSchema: "JSON", content: 'Return strictly valid JSON matching:\n{\n  "executive_summary": "string",\n  "optimisations": [{"title": "string", "savings_pct": "string", "effort": "Low|Med|High"}],\n  "confidence_score": 0.95\n}' }
        }),
        def({
            type: "success",
            label: "Success Criteria",
            hint: "What a good answer achieves",
            category: "core",
            glyph: "SC",
            section: "success",
            fields: [body("Criteria", 5)],
            defaults: { title: "Success Criteria", content: "- Every recommendation carries a number.\n- A reader can act on the answer without a follow-up question." }
        }),

        // ---------- NEW CORE ----------
        def({ type: "objective", label: "Primary Objective", hint: "The single outcome that matters most", category: "core", glyph: "OBJ", section: "task", fields: [body("Primary objective", 4, "The one thing this prompt must achieve")], defaults: { title: "Primary Objective", content: "The single most important outcome of this task is to deliver a decision-ready recommendation, not an exploration. Optimise every choice against that outcome." } }),
        def({ type: "deliverable", label: "Deliverable", hint: "The concrete artefact produced", category: "core", glyph: "DEL", section: "output", fields: [body("Deliverable spec", 4)], defaults: { title: "Deliverable", content: "Produce one self-contained artefact. State its file type, target length, and required sections explicitly. Do not pad the deliverable with restated instructions." } }),
        def({ type: "scope", label: "Scope Boundary", hint: "What is in and out of scope", category: "core", glyph: "SCP", section: "constraints", fields: [body("Scope", 5)], defaults: { title: "Scope Boundary", content: "In scope:\n- Current-quarter AWS spend for the payments platform.\n\nOut of scope:\n- Multi-cloud comparisons.\n- Vendor contract renegotiation." } }),
        def({ type: "stakeholders", label: "Stakeholder Map", hint: "Who cares and what they need", category: "core", glyph: "STK", section: "audience", fields: [body("Stakeholders", 5)], defaults: { title: "Stakeholder Map", content: "- CFO: needs the headline savings figure and payback period in one sentence.\n- VP Engineering: needs effort estimates and sequencing.\n- Security: needs confirmation that no compliance posture changes." } }),
        def({ type: "definition_of_done", label: "Definition of Done", hint: "The acceptance test for the answer", category: "core", glyph: "DoD", section: "success", fields: [body("Definition of done", 5)], defaults: { title: "Definition of Done", content: "The answer is done when a reviewer can confirm: (1) every claim is sourced or marked [VERIFY], (2) every recommendation has an owner and an effort estimate, and (3) the executive summary fits on one screen." } }),
        def({ type: "priority", label: "Priority & Urgency", hint: "How important this is and why", category: "core", glyph: "PRI", section: "constraints", fields: [{ key: "priorityLevel", label: "Priority", type: "select", options: ["Critical", "High", "Medium", "Low", "Informational"] }, body("Rationale", 4)], defaults: { title: "Priority & Urgency", priorityLevel: "High", content: "Treat this as high priority because the outcome feeds next quarter's budget cycle. Do not trade correctness for speed." } }),
        def({ type: "style_guide", label: "Style Guide", hint: "Consistent stylistic rules", category: "core", glyph: "STY", section: "tone", fields: [body("Style rules", 5)], defaults: { title: "Style Guide", content: "- Use sentence case for headings.\n- Prefer active voice.\n- No exclamation marks.\n- Spell out acronyms on first use.\n- Use numerals for all numbers above nine." } }),
        def({ type: "glossary", label: "Glossary", hint: "Terms the answer must use consistently", category: "core", glyph: "GLO", section: "context", fields: [body("Terms and definitions", 6)], defaults: { title: "Glossary", content: "- RI: Reserved Instance, a 1- or 3-year commitment with a discounted rate.\n- Egress: data transferred out of the cloud provider's network.\n- Steady-state: workload volume that varies less than 5% week over week." } }),

        // ============================================================
        // DATA
        // ============================================================
        def({
            type: "variable",
            label: "Input Variable",
            hint: "Run-time value, used as {{name}}",
            category: "data",
            glyph: "{ }",
            section: "inputs",
            inputs: false,
            outputs: [{ id: "out", label: "Feeds" }],
            fields: [
                { key: "varName", label: "Variable name", type: "text", mono: true, placeholder: "user_query" },
                { key: "content", label: "What it holds", type: "text", placeholder: "The user's request" },
                { key: "defaultValue", label: "Sample value", type: "textarea", rows: 3 }
            ],
            defaults: { title: "Input Variable", varName: "user_query", content: "The user's request", defaultValue: "Evaluate our AWS infrastructure spend and identify 3 high-ROI cost optimisations." }
        }),

        // NEW: User Input block (category: data)
        def({
            type: "user_input",
            label: "User Input",
            hint: "Information the user must supply",
            category: "data",
            glyph: "UI",
            section: "inputs",
            inputs: false,
            outputs: [{ id: "out", label: "To agent" }],
            fields: [
                { key: "inputName", label: "Input name", type: "text", mono: true, placeholder: "user_request" },
                { key: "prompt", label: "Ask the user", type: "text", placeholder: "What do you need help with?" },
                body("What to do with the input", 3),
                { key: "defaultValue", label: "Sample value", type: "textarea", rows: 3 }
            ],
            defaults: {
                title: "User Input",
                inputName: "user_request",
                prompt: "What do you need help with?",
                content: "Pass this value directly to the connected agent as its primary task.",
                defaultValue: "Draft a launch plan for our new API tier."
            }
        }),

        def({
            type: "rag_source",
            label: "Knowledge Source",
            hint: "Reference documents or data",
            category: "data",
            glyph: "KB",
            section: "knowledge",
            outputs: [{ id: "out", label: "Grounds" }],
            fields: [
                { key: "varName", label: "Variable name", type: "text", mono: true, placeholder: "retrieved_docs" },
                body("How to use the material", 4),
                { key: "defaultValue", label: "Sample value", type: "textarea", rows: 3 }
            ],
            defaults: { title: "Knowledge Source", varName: "retrieved_docs", content: "Treat the supplied documents as the only source of truth and cite each one inline as [Doc-ID].", defaultValue: "[Doc-104: Q3 FinOps Audit Report], [Doc-209: Kubernetes Node Right-Sizing Policy]" }
        }),
        def({ type: "user_profile", label: "User Profile", hint: "Who the user is and what they know", category: "data", glyph: "UP", section: "inputs", outputs: [{ id: "out", label: "Personalises" }], fields: [{ key: "userName", label: "Name or handle", type: "text", placeholder: "Alex" }, { key: "role", label: "Role", type: "text", placeholder: "VP Engineering" }, { key: "expertise", label: "Expertise level", type: "select", options: ["Novice", "Intermediate", "Expert", "Domain specialist"] }, body("What matters to them", 4)], defaults: { title: "User Profile", userName: "Alex", role: "VP Engineering", expertise: "Expert", content: "Alex cares about speed of delivery and engineering morale. Assume deep technical fluency; skip foundational explanations and lead with trade-offs." } }),
        def({ type: "project_info", label: "Project Brief", hint: "The project this answer feeds into", category: "data", glyph: "PRJ", section: "context", outputs: [{ id: "out", label: "Contextualises" }], fields: [{ key: "projectName", label: "Project name", type: "text", placeholder: "Q4 Cost Reduction Programme" }, body("Project background", 5)], defaults: { title: "Project Brief", projectName: "Q4 Cost Reduction Programme", content: "The programme targets a 20% reduction in cloud spend without service degradation. Workstreams span compute, storage, networking, and licensing. Current phase is ideation-to-shortlist." } }),
        def({ type: "structured_dataset", label: "Structured Dataset", hint: "Tabular data the model should read", category: "data", glyph: "TBL", section: "knowledge", outputs: [{ id: "out", label: "Feeds" }], fields: [{ key: "format", label: "Format", type: "select", options: ["CSV", "TSV", "JSON", "Markdown table", "YAML"] }, body("Dataset", 8), { key: "schemaNote", label: "Column notes", type: "textarea", rows: 3 }], defaults: { title: "Structured Dataset", format: "CSV", content: "service,region,monthly_cost_usd,change_pct\norders-api,us-east-1,48210,+12\npayments-api,us-east-1,91040,+4\nsearch,eu-west-1,32870,-8", schemaNote: "monthly_cost_usd is billed cost; change_pct is month-over-month." } }),
        def({ type: "metadata", label: "Document Metadata", hint: "Provenance and freshness of sources", category: "data", glyph: "META", section: "knowledge", outputs: [{ id: "out", label: "Qualifies" }], fields: [{ key: "source", label: "Source", type: "text" }, { key: "date", label: "Date / version", type: "text", placeholder: "2025-03-14" }, { key: "authority", label: "Authority", type: "select", options: ["Primary", "Secondary", "Tertiary", "User-supplied", "Unknown"] }, body("Caveats", 4)], defaults: { title: "Document Metadata", source: "Internal FinOps dashboard", date: "2025-03-14", authority: "Primary", content: "Figures reflect billing data through end of February. Treat as authoritative for cost, but do not extrapolate seasonality from a single quarter." } }),
        def({ type: "assumptions", label: "Assumptions Register", hint: "What we are taking as true", category: "data", glyph: "ASM", section: "inputs", outputs: [{ id: "out", label: "Constrains" }], fields: [body("Assumptions", 6)], defaults: { title: "Assumptions Register", content: "- Traffic grows less than 15% next quarter.\n- No new compliance regimes take effect this year.\n- The engineering team retains current headcount.\nFlag any assumption you rely on with [ASSUMPTION]." } }),
        def({ type: "unknowns", label: "Open Questions", hint: "What we do not yet know", category: "data", glyph: "UNK", section: "inputs", outputs: [{ id: "out", label: "Flags" }], fields: [body("Open questions", 6)], defaults: { title: "Open Questions", content: "- Exact reserved-instance coverage target.\n- Whether egress optimisation is politically viable given the CDN contract.\n- Tolerance for a 2-week migration freeze." } }),
        def({ type: "requirements", label: "Requirements Spec", hint: "Functional and non-functional requirements", category: "data", glyph: "REQ", section: "inputs", outputs: [{ id: "out", label: "Governs" }], fields: [body("Requirements", 7)], defaults: { title: "Requirements Spec", content: "Functional:\n- The answer must name at least three concrete initiatives.\n\nNon-functional:\n- Response under 600 words.\n- No vendor lock-in recommendations.\n- All cost figures in USD." } }),
        def({ type: "dependencies", label: "Dependencies Map", hint: "What this work relies on", category: "data", glyph: "DEP", section: "inputs", outputs: [{ id: "out", label: "Sequences" }], fields: [body("Dependencies", 6)], defaults: { title: "Dependencies Map", content: "- Requires sign-off from Security before any networking change.\n- Depends on the cost-allocation tagging project landing first.\n- Blocked by the current hiring freeze for SRE headcount." } }),
        def({ type: "input_parameters", label: "Input Parameters", hint: "Configurable knobs supplied at run time", category: "data", glyph: "PAR", section: "inputs", inputs: false, outputs: [{ id: "out", label: "Feeds" }], fields: [{ key: "paramName", label: "Parameter", type: "text", mono: true, placeholder: "audience_level" }, { key: "paramType", label: "Type", type: "select", options: ["string", "number", "boolean", "enum", "array"] }, { key: "paramValues", label: "Allowed values / range", type: "text", placeholder: "executive | manager | engineer" }, body("Description", 3)], defaults: { title: "Input Parameters", paramName: "audience_level", paramType: "enum", paramValues: "executive | manager | engineer", content: "Controls explanation depth. Executive: one screen. Manager: one page. Engineer: full detail with trade-offs." } }),
        def({ type: "data_schema", label: "Data Schema", hint: "The shape and meaning of the data", category: "data", glyph: "SCH", section: "knowledge", outputs: [{ id: "out", label: "Validates" }], fields: [{ key: "schemaName", label: "Schema name", type: "text", placeholder: "cost_event" }, body("Schema definition", 7)], defaults: { title: "Data Schema", schemaName: "cost_event", content: "{\n  \"service\": \"string (required)\",\n  \"region\": \"string (required)\",\n  \"monthly_cost_usd\": \"number, 2dp\",\n  \"change_pct\": \"number, signed\",\n  \"tags\": \"object<string,string>\"\n}" } }),

        // ============================================================
        // LOGIC
        // ============================================================
        def({ type: "ifelse", label: "If / Else Branch", hint: "Two outcomes from one check", category: "logic", glyph: "IF", section: "workflow", outputs: [{ id: "true", label: "True" }, { id: "false", label: "False" }], fields: [{ key: "condition", label: "Condition, in plain language", type: "text", placeholder: "the draft cites a source for every claim" }, body("What to check first", 3)], defaults: { title: "If / Else Branch", condition: "every recommendation includes quantified savings", content: "Check the draft before you answer." } }),
        def({ type: "switch", label: "Switch / Router", hint: "Route by case", category: "logic", glyph: "SW", section: "workflow", outputs: [{ id: "caseA", label: "Case A" }, { id: "caseB", label: "Case B" }, { id: "default", label: "Default" }], fields: [{ key: "condition", label: "Route by", type: "text", placeholder: "the intent of the request" }, { key: "caseALabel", label: "Case A", type: "text" }, { key: "caseBLabel", label: "Case B", type: "text" }, body("Routing guidance", 3)], defaults: { title: "Switch / Router", condition: "the intent of the request", caseALabel: "Technical issue", caseBLabel: "Billing or account", content: "" } }),
        def({ type: "loop", label: "Refinement Loop", hint: "Repeat until good enough", category: "logic", glyph: "LP", section: "workflow", outputs: [{ id: "out", label: "Loop body" }], fields: [{ key: "exitCondition", label: "Stop when", type: "text", placeholder: "no logical flaws remain" }, { key: "maxIterations", label: "Max passes", type: "number", min: 1, max: 10 }, body("What each pass does", 4)], defaults: { title: "Refinement Loop", exitCondition: "no logical flaws remain", maxIterations: 3, content: "Critique the current draft for logical gaps, security edge cases, and clarity, then rewrite it." } }),
        def({ type: "parallel", label: "Parallel Split", hint: "Independent tracks", category: "logic", glyph: "PA", section: "workflow", outputs: [{ id: "branch1", label: "Track A" }, { id: "branch2", label: "Track B" }], fields: [body("Lead-in", 3)], defaults: { title: "Parallel Split", content: "Work through these tracks independently before combining them." } }),
        def({ type: "merge", label: "Merge Outputs", hint: "Combine tracks into one", category: "logic", glyph: "MG", section: "workflow", outputs: [{ id: "out", label: "Merged" }], fields: [body("How to combine", 4)], defaults: { title: "Merge Outputs", content: "Reconcile the findings from every track, resolve any conflicts, and produce one unified answer." } }),
        def({ type: "retry", label: "Retry Handler", hint: "Retry a step on failure", category: "logic", glyph: "RTY", section: "workflow", outputs: [{ id: "out", label: "Next attempt" }], fields: [{ key: "condition", label: "Retry when", type: "text", placeholder: "validation fails" }, { key: "maxAttempts", label: "Max attempts", type: "number", min: 1, max: 10 }, body("What changes each retry", 4)], defaults: { title: "Retry Handler", condition: "the JSON does not parse or fails schema validation", maxAttempts: 3, content: "On each retry, inspect the parse error, narrow the output template, and re-emit. Do not silently drop fields that failed validation." } }),
        def({ type: "fallback", label: "Fallback Path", hint: "Safe default when the main path fails", category: "logic", glyph: "FBK", section: "workflow", outputs: [{ id: "out", label: "Fallback" }], fields: [body("Fallback behaviour", 4)], defaults: { title: "Fallback Path", content: "If the required input is missing or ambiguous, do not guess. Return a short note describing exactly what is missing and the smallest question that would unblock you." } }),
        def({ type: "priority_router", label: "Priority Router", hint: "Route by urgency tier", category: "logic", glyph: "PRI", section: "workflow", outputs: [{ id: "critical", label: "Critical" }, { id: "normal", label: "Normal" }, { id: "low", label: "Low" }], fields: [{ key: "condition", label: "Route by", type: "text", placeholder: "request severity" }, body("Tier definitions", 5)], defaults: { title: "Priority Router", condition: "request severity", content: "Critical: security incident, outage, or data loss. Normal: feature work or optimisation. Low: questions, documentation, or exploration." } }),
        def({ type: "gate", label: "Checkpoint Gate", hint: "A must-pass check before proceeding", category: "logic", glyph: "GT", section: "workflow", outputs: [{ id: "pass", label: "Pass" }, { id: "fail", label: "Fail" }], fields: [{ key: "condition", label: "Pass criteria", type: "text", placeholder: "all required fields are populated" }, body("What to do on fail", 4)], defaults: { title: "Checkpoint Gate", condition: "every section in the output template contains substantive content", content: "If the gate fails, stop and report the specific gap rather than shipping a partial answer." } }),
        def({ type: "pipeline", label: "Sequential Pipeline", hint: "Ordered stages, one after another", category: "logic", glyph: "PIP", section: "workflow", outputs: [{ id: "out", label: "Final stage" }], fields: [body("Stages, one per line", 6)], defaults: { title: "Sequential Pipeline", content: "Stage 1: Extract the numeric claims.\nStage 2: Validate each against the source.\nStage 3: Summarise validated claims.\nStage 4: Flag anything unverified with [VERIFY]." } }),

        // ============================================================
        // META
        // ============================================================
        def({ type: "meta_clarify", label: "Clarifying Questions", hint: "Ask before answering", category: "meta", glyph: "Q", section: "approach", fields: [{ key: "maxQuestions", label: "Max questions", type: "number", min: 1, max: 10 }, body("Rule", 4)], defaults: { title: "Clarifying Questions", maxQuestions: 3, content: "Before you begin, check that you have everything you need. If anything essential is missing or ambiguous, ask your questions first and wait for the answers." } }),
        def({ type: "meta_reasoning", label: "Reasoning Protocol", hint: "Think step by step", category: "meta", glyph: "CoT", section: "approach", fields: [{ key: "visibility", label: "Reasoning is", type: "select", options: ["Kept private", "Shown before the answer"] }, body("Protocol", 5)], defaults: { title: "Reasoning Protocol", visibility: "Kept private", content: "Work through the problem step by step before answering: restate the goal, list what you know, name what is uncertain, then reason to a conclusion." } }),
        def({ type: "meta_optimizer", label: "Prompt Optimiser", hint: "Sharpen the request first", category: "meta", glyph: "OPT", section: "approach", fields: [body("Rule", 5)], defaults: { title: "Prompt Optimiser", content: "Before responding, rewrite the request as a sharper brief: state the goal, the audience, the constraints, and the definition of done. Work from that brief, and show it only if asked." } }),
        def({ type: "meta_generator", label: "Prompt Generator", hint: "Output is a prompt for another model", category: "meta", glyph: "GEN", section: "output", fields: [{ key: "targetModel", label: "Target model (optional)", type: "text", placeholder: "Claude, GPT, Gemini" }, body("Rule", 5)], defaults: { title: "Prompt Generator", targetModel: "", content: "Your output is a prompt for another AI model, not the final answer. Write it in the second person, give it a role, a task, constraints, and an output format, and return it in a single code block." } }),
        def({ type: "meta_selfcheck", label: "Self-Critique Pass", hint: "Review before delivering", category: "meta", glyph: "SCP", section: "quality", fields: [body("Rule", 5)], defaults: { title: "Self-Critique Pass", content: "Before you finish, review your draft against this prompt. Look for errors, unsupported claims, missed requirements, and unclear wording, then fix them. Deliver only the corrected version." } }),
        def({ type: "meta_rubric", label: "Quality Rubric", hint: "Score, then revise", category: "meta", glyph: "RUB", section: "quality", fields: [{ key: "threshold", label: "Pass mark", type: "text", placeholder: "8 out of 10" }, body("Criteria, one per line", 5)], defaults: { title: "Quality Rubric", threshold: "8 out of 10", content: "- Accuracy: every claim is supported.\n- Completeness: every part of the task is covered.\n- Clarity: a first-time reader follows it in one pass." } }),
        def({ type: "meta_uncertainty", label: "Uncertainty Handling", hint: "No guessing, no invented facts", category: "meta", glyph: "UN", section: "quality", fields: [body("Rule", 4)], defaults: { title: "Uncertainty Handling", content: "If you are unsure or lack the information to answer, say so plainly. Never invent facts, figures, or sources. Mark every assumption with [ASSUMPTION]." } }),
        def({ type: "role_stack", label: "Role Stack", hint: "Layer multiple roles cleanly", category: "meta", glyph: "RST", section: "role", fields: [body("Roles, in priority order", 5)], defaults: { title: "Role Stack", content: "Primary role: Principal FinOps Architect.\nSecondary role: Data Analyst.\nAdjunct lens: Security reviewer, only to flag risk.\nWhen the roles conflict, the primary role wins." } }),
        def({ type: "behavior_rules", label: "Behavioural Rules", hint: "Recurring do's and don'ts", category: "meta", glyph: "BHVR", section: "approach", fields: [body("Rules", 6)], defaults: { title: "Behavioural Rules", content: "- Lead with the answer, then justify.\n- Ask at most one clarifying question when blocked.\n- Never expose chain-of-thought; show only conclusions.\n- When the user is wrong, say so once and move on." } }),
        def({ type: "decision_framework", label: "Decision Framework", hint: "How to choose between options", category: "meta", glyph: "DEC", section: "approach", fields: [body("Decision criteria", 6)], defaults: { title: "Decision Framework", content: "Score each option on four axes: impact (1-5), effort (1-5), reversibility (1-5), and risk (1-5). Rank by impact ÷ (effort × risk), break ties by reversibility." } }),
        def({ type: "reasoning_framework", label: "Reasoning Framework", hint: "Structured thinking pattern", category: "meta", glyph: "RF", section: "approach", fields: [{ key: "framework", label: "Framework", type: "select", options: ["First principles", "MECE decomposition", "Inversion", "Second-order thinking", "Pre-mortem", "Bayesian updating", "Custom"] }, body("How to apply it", 5)], defaults: { title: "Reasoning Framework", framework: "First principles", content: "Break the problem into irreducible facts, then rebuild the solution from those facts. Do not reason by analogy unless the analogy is explicit and checked." } }),
        def({ type: "instruction_hierarchy", label: "Instruction Hierarchy", hint: "Explicit ordering of instruction priority", category: "meta", glyph: "HIER", section: "approach", fields: [body("Priority order", 6)], defaults: { title: "Instruction Hierarchy", content: "Priority 1: safety and ethics rules.\nPriority 2: system message.\nPriority 3: task instruction.\nPriority 4: tone and style.\nIf two instructions conflict, the higher priority wins and the lower one is dropped without comment." } }),
        def({ type: "qa_checklist", label: "QA Checklist", hint: "Pre-delivery verification list", category: "meta", glyph: "QA", section: "quality", fields: [body("Checklist", 6)], defaults: { title: "QA Checklist", content: "- [ ] The answer directly addresses the user's question.\n- [ ] Every numeric claim is sourced or flagged.\n- [ ] No leftover placeholders or TODOs.\n- [ ] Length is within target.\n- [ ] Tone matches the brief." } }),
        def({ type: "output_controller", label: "Output Controller", hint: "Gate and shape the final output", category: "meta", glyph: "OUT", section: "output", fields: [body("Controls", 5)], defaults: { title: "Output Controller", content: "Before delivering, confirm the output is one artefact in the requested format, contains no commentary about the prompt itself, and fits within the stated length. If any condition fails, fix it silently." } }),
        def({ type: "self_evaluator", label: "Self-Evaluator", hint: "Score your own answer before shipping", category: "meta", glyph: "SEV", section: "quality", fields: [{ key: "threshold", label: "Pass mark", type: "text", placeholder: "7 / 10" }, body("Scoring dimensions", 5)], defaults: { title: "Self-Evaluator", threshold: "7 / 10", content: "Score yourself 1-10 on: factual accuracy, task coverage, structural clarity, and adherence to constraints. If any score is below 7, revise the answer before delivering." } }),
        def({ type: "adaptability", label: "Adaptability Rules", hint: "Adjust to the user as you go", category: "meta", glyph: "ADP", section: "approach", fields: [body("Adaptation rules", 5)], defaults: { title: "Adaptability Rules", content: "Match the user's technical depth. If they use precise terminology, mirror it; if they use everyday language, translate jargon. Never explain a term the user has already used correctly." } }),

        // ============================================================
        // MULTI-AGENT
        // Every agent block carries `about` (what it is for) and `use` (what you can do with it).
        // Both show in the inspector and the guide, never in the compiled prompt.
        // ============================================================
        def({
            type: "multi_agent", kind: "coordinator", label: "Multi-Agent Conductor", hint: "Optional. Briefs four agents you add", category: "agents", glyph: "MAG", section: "agents",
            about: "Optional. A Conductor hands out the work, it does not do it. The Planner, Researcher, Writer and Critic are separate blocks: add them and wire one to each Conductor output.",
            use: ["Start a full team from one task without wiring the task into every agent by hand.", "Set team-wide rules in one place, such as who hands to whom and how many revision rounds are allowed.", "Feed a Critic's feedback back in to restart the team on a second pass."],
            inputs: [{ id: "task", label: "Task in" }, { id: "context", label: "Context in" }, { id: "config", label: "Agent config" }, { id: "feedback", label: "Feedback in" }],
            outputs: [{ id: "planner", label: "Planner" }, { id: "researcher", label: "Researcher" }, { id: "writer", label: "Writer" }, { id: "critic", label: "Critic" }],
            fields: [body("Coordination rules", 7)],
            defaults: { title: "Multi-Agent Conductor", content: "Brief each agent with the task and only the background it needs. The Planner goes first, the Researcher and Writer work from the plan, and the Critic reviews last. No agent does another agent's job." }
        }),
        def({
            type: "agent_lead", kind: "coordinator", label: "Team Lead", hint: "Optional. Splits a job across agents you add", category: "agents", glyph: "LEAD", section: "agents",
            about: "Optional. A Team Lead hands out up to three assignments, it does not do them. Add an agent block for each assignment and wire it to that output.",
            use: ["Run two or three specialists side by side on different parts of one job.", "Build a hierarchy: wire an assignment into another Team Lead to create a sub-team.", "Wire the workers' results into Reports in so the lead signs off the combined work."],
            inputs: [{ id: "task", label: "Task in" }, { id: "context", label: "Context in" }, { id: "reports", label: "Reports in" }],
            outputs: [{ id: "worker_a", label: "Assignment A" }, { id: "worker_b", label: "Assignment B" }, { id: "worker_c", label: "Assignment C" }, { id: "summary", label: "Sign-off" }],
            fields: [body("How to split and manage the work", 6)],
            defaults: { title: "Team Lead", content: "Split the job into assignments that do not overlap. Give each worker one assignment, the outcome expected, and a word limit. When the reports come back, check each one against its assignment before signing off." }
        }),
        def({
            type: "agent_router", kind: "coordinator", label: "Agent Router", hint: "Optional. Picks one agent you add", category: "agents", glyph: "RT", section: "agents",
            about: "Optional. A Router picks exactly one agent for each request, where a Conductor briefs all of them. The agents are separate blocks: add them and wire one to each output.",
            use: ["Handle mixed requests with one prompt: questions go to the Researcher, drafting goes to the Writer.", "Keep cheap requests cheap by skipping agents that are not needed.", "Catch anything unclear on the Fallback port and ask a question."],
            inputs: [{ id: "request", label: "Request in" }, { id: "context", label: "Context in" }, { id: "capabilities", label: "Capabilities" }],
            outputs: [{ id: "to_planner", label: "Planner" }, { id: "to_researcher", label: "Researcher" }, { id: "to_writer", label: "Writer" }, { id: "to_critic", label: "Critic" }, { id: "fallback", label: "Fallback" }],
            fields: [body("Routing rules", 6)],
            defaults: { title: "Agent Router", content: "Choose one agent by the intent of the request. Multi-step work goes to the Planner, evidence gathering to the Researcher, drafting to the Writer, and review to the Critic. If no agent fits, use the fallback and ask one clarifying question." }
        }),
        def({
            type: "agent_planner", kind: "worker", label: "Planner Agent", hint: "Turn the task into ordered steps", category: "agents", glyph: "PLN", section: "agents",
            about: "Thinks before anyone writes. It breaks the task into steps and names the unknowns and risks.",
            use: ["Wire Plan into a Writer so the draft follows a structure.", "Wire Priorities into a Researcher's Questions so research answers what the plan needs.", "Wire Plan into a Critic's Planning context so the review checks the draft against the plan."],
            inputs: [{ id: "task", label: "Task in" }, { id: "context", label: "Context in" }, { id: "constraints", label: "Constraints" }],
            outputs: [{ id: "plan", label: "Plan" }, { id: "outline", label: "Outline" }, { id: "priorities", label: "Priorities" }],
            fields: [body("Planning rules", 5)],
            defaults: { title: "Planner Agent", content: "Decompose the task into an ordered list of steps, each with an explicit input and output. Surface unknowns as questions rather than assuming. List the top three risks with a leading indicator for each." }
        }),
        def({
            type: "agent_researcher", kind: "worker", label: "Researcher Agent", hint: "Gather and cite evidence", category: "agents", glyph: "RSC", section: "agents",
            about: "Finds the facts. It answers questions from the sources it is given and lists what it could not find.",
            use: ["Wire a Knowledge Source into Context in to ground the whole team in your documents.", "Wire Findings into a Writer's Context in so every claim has evidence behind it.", "Wire Sources into a Fact-Checker or Critic so they can verify citations."],
            inputs: [{ id: "task", label: "Research task" }, { id: "context", label: "Context in" }, { id: "questions", label: "Questions" }],
            outputs: [{ id: "findings", label: "Findings" }, { id: "sources", label: "Sources" }, { id: "evidence", label: "Evidence" }],
            fields: [body("Research rules", 5)],
            defaults: { title: "Researcher Agent", content: "Work only from the sources provided. For every factual claim, record the source ID inline as [Doc-ID]. If a question cannot be answered from the sources, list it under Gaps rather than guessing." }
        }),
        def({
            type: "agent_analyst", kind: "worker", label: "Analyst Agent", hint: "Turn data into findings", category: "agents", glyph: "ANL", section: "agents",
            about: "Works with numbers and tables. It reads data, runs the comparison asked for, and reports what the figures show and how sure it is.",
            use: ["Wire a Structured Dataset into Data in to get findings a Writer can quote.", "Pair it with a Researcher: one covers documents, the other covers numbers.", "Wire Caveats into a Critic so weak evidence is challenged."],
            inputs: [{ id: "data", label: "Data in" }, { id: "question", label: "Question" }, { id: "context", label: "Context in" }],
            outputs: [{ id: "analysis", label: "Analysis" }, { id: "insights", label: "Key findings" }, { id: "caveats", label: "Caveats" }],
            fields: [body("Analysis rules", 5)],
            defaults: { title: "Analyst Agent", content: "Answer the question from the data alone. Show the figure behind every finding, state the comparison you made, and give each finding a confidence level of high, medium or low. List anything the data cannot answer." }
        }),
        def({
            type: "agent_specialist", kind: "worker", label: "Specialist Agent", hint: "A custom expert you define", category: "agents", glyph: "SPC", section: "agents",
            about: "A blank agent you shape yourself. Give it a specialism and it becomes the legal reviewer, pricing strategist, UX expert or whatever the team is missing.",
            use: ["Add a role the built-in agents do not cover.", "Drop in several with different specialisms under a Team Lead for a panel of experts.", "Wire Feedback in to let a Critic send its work back for another pass."],
            inputs: [{ id: "task", label: "Task in" }, { id: "context", label: "Context in" }, { id: "feedback", label: "Feedback" }],
            outputs: [{ id: "result", label: "Result" }, { id: "notes", label: "Notes" }],
            fields: [{ key: "specialty", label: "Specialism", type: "text", placeholder: "Pricing strategist" }, body("Working rules", 5)],
            defaults: { title: "Specialist Agent", specialty: "Pricing strategist", content: "Stay inside your specialism. Give a clear recommendation with the reasoning behind it, and name anything that needs another expert's view." }
        }),
        def({
            type: "agent_writer", kind: "worker", label: "Writer Agent", hint: "Draft and revise the answer", category: "agents", glyph: "WRT", section: "agents",
            about: "Produces the deliverable. It writes the first draft, then revises when feedback arrives.",
            use: ["Wire a Planner's Plan and a Researcher's Findings in for a structured, sourced draft.", "Wire Draft into a Critic, then the Critic's Feedback into Feedback to create a revision loop.", "Take Revised draft as the final output once the loop is closed."],
            inputs: [{ id: "task", label: "Task in" }, { id: "plan", label: "Plan in" }, { id: "context", label: "Context in" }, { id: "notes", label: "Notes in" }, { id: "feedback", label: "Feedback" }],
            outputs: [{ id: "draft", label: "Draft" }, { id: "revised_draft", label: "Revised draft" }, { id: "notes", label: "Notes" }],
            fields: [body("Writing rules", 5)],
            defaults: { title: "Writer Agent", content: "Lead with the answer and follow the plan. On the first round, write the draft. When feedback arrives, resolve every issue raised and produce a revised draft, noting anything you chose not to change and why." }
        }),
        def({
            type: "agent_editor", kind: "worker", label: "Editor Agent", hint: "Polish without changing the meaning", category: "agents", glyph: "EDT", section: "agents",
            about: "The last pair of eyes on wording. It tightens and corrects a finished draft, and leaves the substance alone.",
            use: ["Place it after the Critic loop so polish happens once, on the final draft.", "Wire a Style Guide block into Style in to enforce house rules.", "Use the Change log output when a human needs to see what was edited."],
            inputs: [{ id: "draft", label: "Draft in" }, { id: "style", label: "Style in" }, { id: "feedback", label: "Feedback" }],
            outputs: [{ id: "edited", label: "Edited draft" }, { id: "changes", label: "Change log" }],
            fields: [body("Editing rules", 5)],
            defaults: { title: "Editor Agent", content: "Cut repetition, fix grammar and tighten every sentence. Do not add claims, remove facts or change the argument. Record each edit that alters wording by more than a few words." }
        }),
        def({
            type: "agent_critic", kind: "reviewer", label: "Critic Agent", hint: "Review the draft and return feedback", category: "agents", glyph: "CRT", section: "agents",
            about: "The quality gate. It judges a draft against the task and your criteria, then says exactly what to fix.",
            use: ["Wire Feedback into a Writer's Feedback input to create a revision loop.", "Wire a Quality Rubric or Success Criteria block into Criteria in to control what it checks.", "Wire Critique into the output when you want the verdict delivered with the answer."],
            inputs: [{ id: "draft", label: "Draft in" }, { id: "task", label: "Task in" }, { id: "criteria", label: "Criteria in" }, { id: "context", label: "Planning context" }],
            outputs: [{ id: "critique", label: "Critique" }, { id: "feedback", label: "Feedback" }, { id: "recommendations", label: "Recommendations" }],
            fields: [body("Review rules", 5)],
            defaults: { title: "Critic Agent", content: "Judge the draft against the task and the criteria. Pass it only if every criterion is met. List issues by severity (blocker, major, minor) and give one concrete rewrite hint for each blocker." }
        }),
        def({
            type: "agent_fact_checker", kind: "reviewer", label: "Fact-Checker Agent", hint: "Verify every claim against sources", category: "agents", glyph: "FCK", section: "agents",
            about: "Checks truth, where the Critic checks quality. It tests each claim in a draft against the sources and flags anything unsupported.",
            use: ["Wire a Researcher's Sources into Sources in so claims are checked against what was actually found.", "Place it before the Editor so nothing unverified gets polished.", "Wire Flagged claims into a Writer's Feedback input to force corrections."],
            inputs: [{ id: "draft", label: "Draft in" }, { id: "sources", label: "Sources in" }],
            outputs: [{ id: "verified", label: "Verified draft" }, { id: "flags", label: "Flagged claims" }],
            fields: [body("Checking rules", 5)],
            defaults: { title: "Fact-Checker Agent", content: "Check every number, name, date and quotation against the sources. Mark each claim as supported, unsupported or contradicted. Never fix a claim by guessing: flag it and say what evidence is missing." }
        }),
        def({
            type: "agent_advocate", kind: "reviewer", label: "Devil's Advocate", hint: "Argue the strongest case against", category: "agents", glyph: "DVL", section: "agents",
            about: "Deliberate opposition. It attacks a proposal as hard as it honestly can, so weak points surface before a real audience finds them.",
            use: ["Pair it with a Specialist arguing in favour, then let a Judge decide.", "Wire Objections into a Writer's Feedback input to harden a draft.", "Stress-test a plan before anyone spends time building it."],
            inputs: [{ id: "proposal", label: "Proposal in" }, { id: "context", label: "Context in" }],
            outputs: [{ id: "objections", label: "Objections" }, { id: "risks", label: "Risks" }],
            fields: [body("Rules of opposition", 5)],
            defaults: { title: "Devil's Advocate", content: "Argue against the proposal as its strongest honest critic. Give your three best objections in order of seriousness, each with the evidence or scenario that makes it real. Do not offer solutions." }
        }),
        def({
            type: "agent_judge", kind: "reviewer", label: "Judge Agent", hint: "Weigh two positions and decide", category: "agents", glyph: "JDG", section: "agents",
            about: "Ends a debate. It weighs two competing answers against your criteria and gives one verdict with reasons.",
            use: ["Close a debate between an advocate and a Devil's Advocate.", "Pick the better of two drafts written by different agents.", "Wire a Decision Framework block into Criteria in to control how it scores."],
            inputs: [{ id: "option_a", label: "Position A" }, { id: "option_b", label: "Position B" }, { id: "criteria", label: "Criteria in" }],
            outputs: [{ id: "verdict", label: "Verdict" }, { id: "rationale", label: "Reasoning" }],
            fields: [body("Judging rules", 5)],
            defaults: { title: "Judge Agent", content: "Weigh both positions on their merits, not on how confidently they are written. State the verdict in one sentence, then the two reasons that decided it and the strongest point on the losing side." }
        }),
        def({
            type: "agent_vote", kind: "reviewer", label: "Consensus Vote", hint: "Pick the best of up to three answers", category: "agents", glyph: "VOTE", section: "agents",
            about: "A panel decision. It compares up to three candidate answers and selects one, recording any disagreement.",
            use: ["Have three Specialists answer the same question, then keep the best answer.", "Reduce the chance of one agent's mistake reaching the output.", "Use Dissent to show the user where the experts disagreed."],
            inputs: [{ id: "candidate_a", label: "Candidate A" }, { id: "candidate_b", label: "Candidate B" }, { id: "candidate_c", label: "Candidate C" }],
            outputs: [{ id: "winner", label: "Winner" }, { id: "dissent", label: "Dissent" }],
            fields: [body("Voting rules", 5)],
            defaults: { title: "Consensus Vote", content: "Compare the candidates point by point. Choose the one that best answers the task. If two candidates agree and one differs, treat the difference as a warning sign and check it before deciding. Record what the losing candidates got right." }
        }),
        def({
            type: "agent_aggregator", kind: "plumbing", label: "Agent Aggregator", hint: "Combine several outputs into one", category: "agents", glyph: "AGG", section: "agents",
            about: "The merge point. It takes what several agents produced and builds one answer, calling out where they conflict.",
            use: ["Join parallel workers back into a single deliverable.", "Wire Conflicts into a Critic or Judge so disagreements get resolved, not hidden.", "Use Confidence to tell the reader how far to trust the result."],
            inputs: [{ id: "planner_out", label: "Input A" }, { id: "researcher_out", label: "Input B" }, { id: "writer_out", label: "Input C" }, { id: "critic_out", label: "Input D" }],
            outputs: [{ id: "merged", label: "Merged" }, { id: "conflicts", label: "Conflicts" }, { id: "confidence", label: "Confidence" }],
            fields: [body("How to combine", 5)],
            defaults: { title: "Agent Aggregator", content: "Merge the inputs into one answer with no repetition. Where two inputs disagree, say so and keep the better supported position. Report overall confidence as the lowest confidence among the inputs." }
        }),
        def({
            type: "agent_handoff", kind: "plumbing", label: "Agent Handoff", hint: "Pass work on with a briefing note", category: "agents", glyph: "HND", section: "agents",
            about: "A briefing note between two agents. It packages what the next agent needs to know, so nothing is lost in the pass.",
            use: ["Place it between two agents when the second needs a summary, not the whole history.", "Use Escalate for work no agent in the team can do.", "Use Log to keep a record of who did what."],
            inputs: [{ id: "from", label: "From agent" }, { id: "context", label: "Context in" }, { id: "feedback", label: "Feedback" }],
            outputs: [{ id: "to_next", label: "Next agent" }, { id: "escalate", label: "Escalate" }, { id: "log", label: "Log" }],
            fields: [body("Handoff rules", 5)],
            defaults: { title: "Agent Handoff", content: "Pass on the minimum the next agent needs: the goal, what has been done, what failed, and what is still open. Escalate if the work needs a capability no agent in the team has." }
        }),
        def({
            type: "agent_memory", kind: "plumbing", label: "Shared Notes", hint: "A scratchpad every agent can read", category: "agents", glyph: "MEM", section: "agents",
            about: "A shared notebook for the team. Any agent can write to it and any agent can read it, which keeps decisions consistent.",
            use: ["Wire a Planner into it, then wire it into every worker so all of them see the same decisions.", "Hold facts that must not change between agents, such as names, figures and terms.", "Give a long workflow a memory without wiring every agent to every other agent."],
            inputs: [{ id: "write", label: "Notes in" }],
            outputs: [{ id: "read", label: "Shared notes" }],
            fields: [body("What to record", 5)],
            defaults: { title: "Shared Notes", content: "Keep a running record of decisions made, facts established and questions still open. Every agent reads these notes before starting and must not contradict them. Add to the notes, never rewrite them." }
        }),
        def({
            type: "agent_human", kind: "plumbing", label: "Human Approval", hint: "Pause for a person to approve", category: "agents", glyph: "HUM", section: "agents",
            about: "A stop sign. The team pauses here, shows its work to the user, and continues only on a yes.",
            use: ["Put it after the Planner so the user approves the plan before anyone writes.", "Wire Changes requested into a Writer's Feedback input so the user's edits start a revision.", "Guard any step that is expensive or hard to undo."],
            inputs: [{ id: "proposal", label: "For approval" }],
            outputs: [{ id: "approved", label: "Approved" }, { id: "changes", label: "Changes requested" }],
            fields: [{ key: "question", label: "Ask the user", type: "text", placeholder: "Does this plan look right?" }, body("Approval rules", 4)],
            defaults: { title: "Human Approval", question: "Does this look right, or what should change?", content: "Stop and show the work to the user. Do not continue until they reply. Treat anything other than a clear yes as a request for changes." }
        }),
        def({
            type: "feedback", kind: "plumbing", label: "Feedback", hint: "Set the rules of a revision loop", category: "agents", glyph: "FB", section: "agents",
            about: "The rulebook for a revision loop. It sits on the wire that carries feedback back to an agent and sets how many rounds are allowed.",
            use: ["Place it between a Critic's Feedback and a Writer's Feedback input to cap the number of rounds.", "Inject your own feedback: wire a User Input into it.", "Change the purpose from Revision to Final polish for a lighter last pass."],
            inputs: [{ id: "in", label: "Feedback in" }],
            outputs: [{ id: "to_writer", label: "To writer" }, { id: "to_any", label: "To any agent" }],
            fields: [
                { key: "feedbackSource", label: "Feedback origin", type: "select", options: ["User feedback", "Critic feedback", "Self-critique", "Mixed"] },
                { key: "purpose", label: "Intended purpose", type: "select", options: ["Revision", "Refinement", "Final polish", "Rejection"] },
                { key: "maxRounds", label: "Max rounds", type: "number", min: 1, max: 5 },
                body("Feedback rules", 5)
            ],
            defaults: { title: "Feedback", feedbackSource: "Critic feedback", purpose: "Revision", maxRounds: 2, content: "Treat every issue as something to act on. Resolve it in the next round or state why it is out of scope. Never raise the same issue twice." }
        }),

        // ============================================================
        // RESEARCH
        // ============================================================
        def({ type: "research_plan", label: "Research Plan", hint: "How the model should investigate", category: "research", glyph: "RP", section: "approach", fields: [body("Plan", 6)], defaults: { title: "Research Plan", content: "1. Restate the question as a falsifiable hypothesis.\n2. List the three strongest sources that would confirm or refute it.\n3. Gather evidence from each.\n4. State the conclusion with confidence." } }),
        def({ type: "source_evaluation", label: "Source Evaluation", hint: "Judge source quality before using it", category: "research", glyph: "SE", section: "quality", fields: [body("Evaluation criteria", 5)], defaults: { title: "Source Evaluation", content: "For each source, note its authority (primary vs secondary), recency, and potential conflict of interest. Prefer primary, recent, low-conflict sources. Flag any source older than 18 months as [STALE]." } }),
        def({ type: "citation_style", label: "Citation Style", hint: "How sources should be cited", category: "research", glyph: "CIT", section: "output", fields: [{ key: "style", label: "Citation format", type: "select", options: ["Inline [n]", "Author-year", "Footnote", "BibTeX", "Custom"] }, body("Rules", 4)], defaults: { title: "Citation Style", style: "Inline [n]", content: "Cite every factual claim with an inline numeric reference [n] that maps to a numbered source list at the end. Do not cite anything you have not actually used." } }),
        def({ type: "fact_check", label: "Fact Check Protocol", hint: "Verify each claim before delivering", category: "research", glyph: "FC", section: "quality", fields: [body("Protocol", 5)], defaults: { title: "Fact Check Protocol", content: "For every numeric or factual claim, mark it as [VERIFIED], [UNVERIFIED], or [DISPUTED]. Never deliver a claim marked [UNVERIFIED] without flagging it in the final answer." } }),
        def({ type: "synthesis", label: "Synthesis Protocol", hint: "Combine multiple sources into one view", category: "research", glyph: "SYN", section: "approach", fields: [body("Synthesis rules", 5)], defaults: { title: "Synthesis Protocol", content: "When sources disagree, state the disagreement explicitly, identify the likely cause (data vintage, methodology, or scope), and adopt the most defensible position with a confidence level." } }),

        // ============================================================
        // CREATIVE
        // ============================================================
        def({ type: "creative_brief", label: "Creative Brief", hint: "Direction for creative output", category: "creative", glyph: "CB", section: "tone", fields: [{ key: "medium", label: "Medium", type: "select", options: ["Long-form article", "Email", "Social post", "Landing page", "Script", "Ad copy", "Custom"] }, body("Creative direction", 6)], defaults: { title: "Creative Brief", medium: "Landing page", content: "Tone: confident, understated.\nAudience: technical buyers.\nOne idea per section.\nNo metaphors that require a cultural reference.\nAvoid 'revolutionary', 'seamless', 'game-changing'." } }),
        def({ type: "narrative_structure", label: "Narrative Structure", hint: "Shape of the story", category: "creative", glyph: "NS", section: "tone", fields: [{ key: "structure", label: "Structure", type: "select", options: ["Hero's journey", "Problem-agitate-solve", "Three-act", "Inverted pyramid", "Listicle", "Custom"] }, body("Beats", 5)], defaults: { title: "Narrative Structure", structure: "Problem-agitate-solve", content: "Beat 1: name the cost problem in one line.\nBeat 2: quantify the cost of inaction.\nBeat 3: introduce the solution as a sequence of steps.\nBeat 4: prove it with one concrete number." } }),
        def({ type: "voice_style", label: "Voice & Style", hint: "The writing voice to adopt", category: "creative", glyph: "VS", section: "tone", fields: [body("Voice rules", 5)], defaults: { title: "Voice & Style", content: "Write like a senior engineer explaining something to a smart peer: concrete, unadorned, and confident. Use short sentences. Avoid adverbs where a stronger verb exists." } }),
        def({ type: "imagery", label: "Imagery Guidance", hint: "Visual language and metaphors", category: "creative", glyph: "IMG", section: "tone", fields: [body("Imagery rules", 4)], defaults: { title: "Imagery Guidance", content: "Use at most one metaphor per section. Prefer physical, mechanical, or architectural imagery over organic or natural imagery. Avoid mixing metaphor families." } }),
        def({ type: "tone_shift", label: "Tone Shift", hint: "Change tone at a specific point", category: "creative", glyph: "TS", section: "tone", fields: [{ key: "trigger", label: "Shift when", type: "text", placeholder: "the topic turns to risk" }, body("Target tone", 4)], defaults: { title: "Tone Shift", trigger: "the topic turns to risk or compliance", content: "Switch from confident and forward-leaning to precise and conservative. Use plain declarative sentences. No idiom, no marketing language." } }),

        // ============================================================
        // CODING
        // ============================================================
        def({ type: "coding_standards", label: "Coding Standards", hint: "Language and style conventions", category: "coding", glyph: "CS", section: "instructions", fields: [{ key: "language", label: "Language / stack", type: "text", placeholder: "TypeScript, Node 20" }, body("Standards", 6)], defaults: { title: "Coding Standards", language: "TypeScript, Node 20", content: "- Strict mode on.\n- No `any` without an inline justification comment.\n- Prefer named exports over default exports.\n- Errors are typed and handled explicitly; no silent catch." } }),
        def({ type: "architecture_guidance", label: "Architecture Guidance", hint: "Design constraints and patterns", category: "coding", glyph: "ARCH", section: "instructions", fields: [body("Architecture rules", 6)], defaults: { title: "Architecture Guidance", content: "Prefer stateless services. Isolate side effects behind a single interface. Do not introduce a new dependency unless the standard library cannot do the job in under 30 lines." } }),
        def({ type: "testing_strategy", label: "Testing Strategy", hint: "What to test and how", category: "coding", glyph: "TST", section: "quality", fields: [body("Testing plan", 6)], defaults: { title: "Testing Strategy", content: "Every new behaviour gets one unit test and one integration test. Prioritise edge cases over happy paths. No test may depend on wall-clock time or external network calls." } }),
        def({ type: "debugging_protocol", label: "Debugging Protocol", hint: "How to diagnose a failure", category: "coding", glyph: "DBG", section: "instructions", fields: [body("Debug procedure", 6)], defaults: { title: "Debugging Protocol", content: "1. Reproduce the failure reliably.\n2. Reduce to the smallest failing input.\n3. Form one hypothesis at a time; test it.\n4. Fix the cause, not the symptom.\n5. Add a regression test that fails before the fix." } }),
        def({ type: "code_review", label: "Code Review", hint: "Criteria for reviewing a change", category: "coding", glyph: "CR", section: "quality", fields: [body("Review criteria", 6)], defaults: { title: "Code Review", content: "Review for correctness, readability, and test coverage. Comment on substance, not style. Block only on correctness, security, or data-loss risk. Everything else is a suggestion." } }),
        def({ type: "security_review", label: "Security Review", hint: "Security checks before shipping", category: "coding", glyph: "SEC", section: "quality", fields: [body("Security checklist", 6)], defaults: { title: "Security Review", content: "Check for: input validation on every boundary, authentication on every endpoint, authorisation on every resource, no secrets in code or logs, and no PII in error messages." } }),

        // ============================================================
        // ANALYSIS
        // ============================================================
        def({ type: "analysis_framework", label: "Analysis Framework", hint: "The analytical lens to apply", category: "analysis", glyph: "AF", section: "approach", fields: [{ key: "framework", label: "Framework", type: "select", options: ["SWOT", "Porter's five forces", "Root-cause (5 whys)", "Cost-benefit", "Sensitivity", "Cohort", "Custom"] }, body("How to apply it", 5)], defaults: { title: "Analysis Framework", framework: "Cost-benefit", content: "Quantify one-time cost and ongoing cost separately. Express benefit as a range, not a point estimate. State the payback period in months and the discount rate assumed." } }),
        def({ type: "data_interpretation", label: "Data Interpretation", hint: "How to read the supplied data", category: "analysis", glyph: "DI", section: "approach", fields: [body("Interpretation rules", 5)], defaults: { title: "Data Interpretation", content: "Before drawing conclusions, check for missing data, seasonality, and composition effects. Distinguish correlation from causation. Report the direction, magnitude, and uncertainty of each effect." } }),
        def({ type: "statistical_rigor", label: "Statistical Rigor", hint: "Standards for quantitative claims", category: "analysis", glyph: "SR", section: "quality", fields: [body("Standards", 5)], defaults: { title: "Statistical Rigor", content: "Report sample sizes alongside estimates. Use confidence intervals, not just point estimates. Never claim significance without stating the test and the alpha. Flag small samples with [SMALL-N]." } }),
        def({ type: "scenario_analysis", label: "Scenario Analysis", hint: "Compare plausible futures", category: "analysis", glyph: "SCN", section: "approach", fields: [{ key: "scenarioCount", label: "Number of scenarios", type: "number", min: 2, max: 6 }, body("Scenario definitions", 6)], defaults: { title: "Scenario Analysis", scenarioCount: 3, content: "Base case: current trajectory continues.\nUpside: traffic grows 25% but unit costs fall 10%.\nDownside: traffic flat but a major vendor raises prices 15%.\nFor each scenario, state the impact on the target metric." } }),
        def({ type: "risk_assessment", label: "Risk Assessment", hint: "Identify and rank risks", category: "analysis", glyph: "RSK", section: "approach", fields: [body("Risk framework", 6)], defaults: { title: "Risk Assessment", content: "For each identified risk, record likelihood (1-5), impact (1-5), and a leading indicator that would warn you early. Rank by likelihood × impact. Propose one mitigation per high-ranked risk." } }),

        // ============================================================
        // COMMUNICATION
        // ============================================================
        def({ type: "formatting_rules", label: "Formatting Rules", hint: "Exact layout and typography", category: "communication", glyph: "FMT", section: "output", fields: [body("Formatting rules", 5)], defaults: { title: "Formatting Rules", content: "Use H2 for top-level sections and H3 for sub-sections. Bullets for lists; numbered lists only for sequences. Bold the first three words of every bullet. No nested bullets beyond two levels." } }),
        def({ type: "explanation_level", label: "Explanation Level", hint: "How deep to explain", category: "communication", glyph: "EXL", section: "tone", fields: [{ key: "level", label: "Level", type: "select", options: ["ELI5", "Informed generalist", "Practitioner", "Domain expert", "Mixed"] }, body("Rules", 4)], defaults: { title: "Explanation Level", level: "Practitioner", content: "Assume familiarity with the domain. Define only terms that are specific to this organisation. Skip foundational context; spend the words on trade-offs instead." } }),
        def({ type: "audience_adaptation", label: "Audience Adaptation", hint: "Tailor the same answer to a reader", category: "communication", glyph: "ADA", section: "audience", fields: [{ key: "readerRole", label: "Reader role", type: "text", placeholder: "CFO" }, body("Adaptation rules", 5)], defaults: { title: "Audience Adaptation", readerRole: "CFO", content: "Lead with the financial headline. Translate every technical term into its cost implication. Avoid implementation detail unless it changes the number. Keep the whole answer to one screen." } }),
        def({ type: "summarization", label: "Summarization", hint: "How to condense content", category: "communication", glyph: "SUM", section: "output", fields: [{ key: "maxLength", label: "Max length", type: "text", placeholder: "5 sentences" }, body("Summarization rules", 4)], defaults: { title: "Summarization", maxLength: "5 sentences", content: "Preserve every number and every named entity. Drop examples before dropping conclusions. Never introduce information that is not in the source." } }),
        def({ type: "translation", label: "Translation & Locale", hint: "Localise without losing meaning", category: "communication", glyph: "TRN", section: "output", fields: [{ key: "targetLocale", label: "Target locale", type: "text", placeholder: "de-DE" }, { key: "register", label: "Register", type: "select", options: ["Formal", "Neutral", "Informal"] }, body("Localization rules", 4)], defaults: { title: "Translation & Locale", targetLocale: "de-DE", register: "Formal", content: "Translate meaning, not words. Keep numbers, code, and product names verbatim. Use metric units. Prefer native idioms over calques; when no idiom exists, write plainly." } }),

        // ============================================================
        // SAFETY
        // ============================================================
        def({ type: "ethical_rails", label: "Ethical Rails", hint: "Ethical boundaries the answer must respect", category: "safety", glyph: "ETH", section: "constraints", fields: [body("Ethical rules", 5)], defaults: { title: "Ethical Rails", content: "Do not produce content that deceives, manipulates, or unfairly disadvantages a group. Refuse requests that would require deceiving a third party, and offer a transparent alternative instead." } }),
        def({ type: "pii_protection", label: "PII Protection", hint: "Keep personal data out of the output", category: "safety", glyph: "PII", section: "constraints", fields: [body("PII rules", 4)], defaults: { title: "PII Protection", content: "Never echo personal data (names, emails, phone numbers, addresses, account IDs) back in the output. Replace any such value with [REDACTED] before responding." } }),
        def({ type: "refusal_policy", label: "Refusal Policy", hint: "When and how to decline", category: "safety", glyph: "REF", section: "constraints", fields: [body("Refusal rules", 5)], defaults: { title: "Refusal Policy", content: "If the request falls outside the permitted scope, decline in one sentence, state the specific reason, and offer one adjacent thing you can do. Do not lecture or over-explain the refusal." } }),
        def({ type: "bias_check", label: "Bias Check", hint: "Check for hidden bias", category: "safety", glyph: "BIAS", section: "quality", fields: [body("Bias checks", 5)], defaults: { title: "Bias Check", content: "Before delivering, check for: loaded framing, asymmetric examples, default assumptions about the reader, and claims that generalise from a single case. Rewrite any sentence that would read differently if the subject changed." } }),
        def({ type: "compliance", label: "Compliance Rules", hint: "Regulatory or policy constraints", category: "safety", glyph: "CMP", section: "constraints", fields: [{ key: "regime", label: "Regime / policy", type: "text", placeholder: "GDPR, SOC 2" }, body("Rules", 5)], defaults: { title: "Compliance Rules", regime: "GDPR, SOC 2", content: "Do not recommend processing personal data outside the EEA. Do not suggest storing credentials in plaintext. Any recommendation touching audit logs must preserve immutability." } }),

        // ============================================================
        // EVALUATION
        // ============================================================
        def({ type: "rubric_scoring", label: "Rubric Scoring", hint: "Score output against explicit criteria", category: "evaluation", glyph: "RS", section: "quality", fields: [{ key: "scale", label: "Scale", type: "select", options: ["1-5", "1-10", "0-100", "Pass / Fail"] }, body("Dimensions", 6)], defaults: { title: "Rubric Scoring", scale: "1-5", content: "Score each output 1-5 on: relevance, factual accuracy, structural clarity, and constraint adherence. Any dimension below 3 triggers a rewrite of that section only." } }),
        def({ type: "feedback_format", label: "Feedback Format", hint: "Structure of the feedback returned", category: "evaluation", glyph: "FBF", section: "output", fields: [body("Feedback structure", 5)], defaults: { title: "Feedback Format", content: "For each issue, state: what is wrong, why it matters, and the smallest fix. Group issues by severity (blocker, major, minor). End with one sentence on what is working well." } }),
        def({ type: "quality_metrics", label: "Quality Metrics", hint: "Measurable indicators of quality", category: "evaluation", glyph: "QM", section: "quality", fields: [body("Metrics", 5)], defaults: { title: "Quality Metrics", content: "Track: unsupported claim rate (target 0), first-pass acceptance rate (target >80%), average response length vs target (target ±10%), and refusal rate on out-of-scope requests." } }),
        def({ type: "ab_testing", label: "A/B Testing", hint: "Compare two variants rigorously", category: "evaluation", glyph: "AB", section: "approach", fields: [{ key: "metric", label: "Primary metric", type: "text", placeholder: "conversion rate" }, body("Test design", 5)], defaults: { title: "A/B Testing", metric: "conversion rate", content: "Define the primary metric before running the test. Hold all variables fixed except the one being tested. State the minimum detectable effect and the required sample size up front. Do not peek at results early." } })
    ];

    var BLOCKS = Object.fromEntries(LIST.map((b) => [b.type, b]));
    var LIBRARY = LIST.filter((b) => !b.legacy);
    var LOGIC = new Set(["ifelse", "switch", "loop", "parallel", "merge"]);
    var BRANCHING = new Set(["ifelse", "switch", "parallel"]);
    var PORT_RANK = {
        out: 0,
        true: 1, false: 2,
        caseA: 1, caseB: 2, default: 3,
        branch1: 1, branch2: 2,
        planner: 1, researcher: 2, writer: 3, critic: 4,
        worker_a: 1, worker_b: 2, worker_c: 3, summary: 4,
        result: 1, edited: 1, changes: 2, verified: 1, flags: 2, analysis: 1, insights: 2, caveats: 3,
        objections: 1, risks: 2, verdict: 1, rationale: 2, winner: 1, dissent: 2, approved: 1, read: 1,
        plan: 1, outline: 2, priorities: 3,
        questions: 2, risks: 3,
        findings: 1, sources: 2, evidence: 3,
        citations: 2, gaps: 3,
        draft: 1, revised_draft: 2, notes: 3,
        critique: 1, feedback: 2, recommendations: 3,
        verdict: 1, issues: 2, rewrite_hint: 3,
        to_next: 1, escalate: 2, log: 3,
        to_planner: 1, to_researcher: 2, to_writer: 3, to_critic: 4, fallback: 5,
        merged: 1, conflicts: 2, confidence: 3,
        to_any: 2
    };
    var VAR_RE = /\{\{\s*([\w.-]+)\s*\}\}/g;
    var str = (v) => (v === null || v === void 0 ? "" : String(v)).trim();
    var stripEnd = (s) => s.replace(/[\s.:;,]+$/, "");
    var sentence = (s) => s && !/[.!?:)\]`"']$/.test(s) ? s + "." : s;
    var article = (s) => /^[aeiou]/i.test(s) ? "an" : "a";
    var lowerFirst = (s) => /^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s;
    var two = (a, b, sep = " ") => [a, b].filter(Boolean).join(sep);
    var indent = (s, n) => s.split("\n").map((l, i) => i === 0 || !l ? l : " ".repeat(n) + l).join("\n");
    var varNameOf = (n) => { var _a; return str((_a = n.config) == null ? void 0 : _a.varName).replace(/[{}\s]/g, "") || "input"; };
    var titleOf = (n) => { var _a, _b; return str((_a = n.config) == null ? void 0 : _a.title) || ((_b = BLOCKS[n.type]) == null ? void 0 : _b.label) || "Block"; };

    function sanitizeGraph(nodes, edges) {
        const okNodes = nodes.filter((n) => n && n.id && BLOCKS[n.type]);
        const ids = new Map(okNodes.map((n) => [n.id, n]));
        const seen = new Set();
        const okEdges = edges.filter((e) => {
            const a = ids.get(e == null ? void 0 : e.from);
            const b = ids.get(e == null ? void 0 : e.to);
            if (!a || !b || a === b || !BLOCKS[b.type].inputs) return false;
            if (!BLOCKS[a.type].outputs.some((p) => p.id === e.fromPort)) return false;
            const raw = BLOCKS[b.type].inputs;
            const bIn = raw === true ? [{ id: "in" }] : Array.isArray(raw) ? raw : [];
            if (!bIn.some((p) => p.id === (e.toPort || "in"))) return false;
            const key = `${e.from}:${e.fromPort}>${e.to}:${e.toPort || "in"}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        return {
            nodes: okNodes,
            edges: okEdges,
            dropped: nodes.length - okNodes.length + edges.length - okEdges.length
        };
    }

    // A wire into one of these inputs is a deliberate return path (feedback or a report), not an accident.
    var BACK_PORTS = new Set(["feedback", "reports"]);

    // Strongly connected components. Returns a Map of node id to component number, for components of 2 or more nodes.
    function findCycles(ids, targetsOf) {
        const index = {}, low = {}, onStack = new Set(), stack = [], found = new Map();
        let counter = 0, comp = 0;
        for (const root of ids) {
            if (index[root] !== void 0) continue;
            const work = [[root, 0]];
            while (work.length) {
                const frame = work[work.length - 1];
                const v = frame[0], i = frame[1];
                if (i === 0) { index[v] = low[v] = counter++; stack.push(v); onStack.add(v); }
                const outs = targetsOf(v);
                if (i < outs.length) {
                    frame[1]++;
                    const w = outs[i];
                    if (index[w] === void 0) work.push([w, 0]);
                    else if (onStack.has(w)) low[v] = Math.min(low[v], index[w]);
                } else {
                    if (low[v] === index[v]) {
                        const members = [];
                        let w;
                        do { w = stack.pop(); onStack.delete(w); members.push(w); } while (w !== v);
                        if (members.length > 1) { members.forEach((m) => found.set(m, comp)); comp++; }
                    }
                    work.pop();
                    if (work.length) { const p = work[work.length - 1][0]; low[p] = Math.min(low[p], low[v]); }
                }
            }
        }
        return found;
    }

    function analyzeGraph(nodesIn, edgesIn) {
        const { nodes, edges } = sanitizeGraph(nodesIn, edgesIn);
        const nodeMap = new Map(nodes.map((n) => [n.id, n]));
        const inEdges = {}, outEdges = {};
        nodes.forEach((n) => { inEdges[n.id] = []; outEdges[n.id] = []; });
        edges.forEach((e) => { outEdges[e.from].push(e); inEdges[e.to].push(e); });
        Object.values(outEdges).forEach((l) => l.sort((a, b) => {
            var _a, _b;
            return ((_a = PORT_RANK[a.fromPort]) != null ? _a : 9) - ((_b = PORT_RANK[b.fromPort]) != null ? _b : 9);
        }));
        const connected = new Set();
        if (nodes.length === 1 && edges.length === 0) connected.add(nodes[0].id);
        edges.forEach((e) => { connected.add(e.from); connected.add(e.to); });
        const byPos = (a, b) => a.x - b.x || a.y - b.y;
        const active = nodes.filter((n) => connected.has(n.id));
        const unwired = nodes.filter((n) => !connected.has(n.id));
        const ids = active.map((n) => n.id);
        const isBack = (e) => BACK_PORTS.has(e.toPort || "in");

        // Every cycle, then only the cycles that survive once return wires are set aside. The survivors are mistakes.
        const any = findCycles(ids, (v) => outEdges[v].map((e) => e.to));
        const hard = findCycles(ids, (v) => outEdges[v].filter((e) => !isBack(e)).map((e) => e.to));
        const cycleNodes = new Set(hard.keys());
        const cycleEdgeIds = new Set(edges.filter((e) => !isBack(e) && hard.has(e.from) && hard.get(e.from) === hard.get(e.to)).map((e) => e.id));
        const loopEdges = edges.filter((e) => isBack(e) && any.has(e.from) && any.get(e.from) === any.get(e.to));
        const loopEdgeIds = new Set(loopEdges.map((e) => e.id));
        const loopMap = new Map();
        loopEdges.forEach((e) => {
            const k = any.get(e.from);
            if (!loopMap.has(k)) loopMap.set(k, { nodeIds: ids.filter((id) => any.get(id) === k), edges: [] });
            loopMap.get(k).edges.push(e);
        });
        const loops = [...loopMap.values()];
        const deadEdgeIds = new Set([...cycleEdgeIds, ...loopEdgeIds]);

        const deg = {};
        active.forEach((n) => { deg[n.id] = inEdges[n.id].filter((e) => !deadEdgeIds.has(e.id)).length; });
        const queue = active.filter((n) => deg[n.id] === 0).sort(byPos).map((n) => n.id);
        const ordered = [];
        const seen = new Set();
        while (queue.length) {
            const id = queue.shift();
            if (seen.has(id)) continue;
            seen.add(id);
            ordered.push(nodeMap.get(id));
            outEdges[id].forEach((e) => {
                if (deadEdgeIds.has(e.id)) return;
                if (--deg[e.to] <= 0 && !seen.has(e.to)) queue.push(e.to);
            });
        }
        active.filter((n) => !seen.has(n.id)).sort(byPos).forEach((n) => ordered.push(n));
        return { nodes, edges, nodeMap, inEdges, outEdges, connected, active, unwired, ordered, cycleNodes, cycleEdgeIds, loopEdgeIds, loops, deadEdgeIds };
    }

    function branchOwnership(g) {
        const owned = new Map();
        const live = (e) => !g.deadEdgeIds.has(e.id);
        const reach = (starts) => {
            const out = new Set();
            const todo = [...starts];
            while (todo.length) {
                const id = todo.pop();
                if (out.has(id)) continue;
                out.add(id);
                g.outEdges[id].filter(live).forEach((e) => todo.push(e.to));
            }
            return out;
        };
        for (const b of g.ordered) {
            if (g.cycleNodes.has(b.id)) continue;
            const outs = g.outEdges[b.id].filter(live);
            if (b.type === "loop") {
                outs.forEach((e) => {
                    if (g.inEdges[e.to].every((i) => i.from === b.id)) owned.set(e.to, { owner: b.id, port: "out" });
                });
                continue;
            }
            if (!BRANCHING.has(b.type)) continue;
            const ports = [...new Set(outs.map((e) => e.fromPort))];
            const sets = new Map(ports.map((p) => [p, reach(outs.filter((e) => e.fromPort === p).map((e) => e.to))]));
            for (const p of ports) {
                const mine = new Set([...sets.get(p)].filter((id) => id !== b.id && ports.every((q) => q === p || !sets.get(q).has(id))));
                let changed = true;
                while (changed) {
                    changed = false;
                    for (const id of [...mine]) {
                        if (!g.inEdges[id].filter(live).every((e) => e.from === b.id || mine.has(e.from))) {
                            mine.delete(id);
                            changed = true;
                        }
                    }
                }
                mine.forEach((id) => owned.set(id, { owner: b.id, port: p }));
            }
        }
        return owned;
    }

    function compilePrompt(nodesIn, edgesIn, opts) {
        const g = analyzeGraph(nodesIn, edgesIn);
        const diagnostics = [];
        const add = (level, code, message, nodeId, edgeId) => diagnostics.push({ level, code, message, nodeId, edgeId });
        const defined = new Map();
        g.active.filter((n) => n.type === "variable" || n.type === "rag_source" || n.type === "user_input").forEach((n) => {
            const v = n.type === "user_input" ? str(n.config.inputName).replace(/[{}\s]/g, "") || "input" : varNameOf(n);
            if (defined.has(v)) add("warning", "duplicate_var", `Two blocks define {{${v}}}. Rename one of them.`, n.id);
            else defined.set(v, n);
        });
        const sub = (s) => opts.sample ? s.replace(VAR_RE, (m, v) => defined.has(v) && str(defined.get(v).config.defaultValue) || m) : s;
        const used = new Set();
        g.active.forEach((n) => {
            const own = n.type === "variable" || n.type === "rag_source" ? varNameOf(n) : n.type === "user_input" ? str(n.config.inputName).replace(/[{}\s]/g, "") : "";
            Object.entries(n.config || {}).forEach(([k, val]) => {
                if (k === "title" || typeof val !== "string") return;
                for (const m of val.matchAll(VAR_RE)) {
                    if (m[1] === own) continue;
                    used.add(m[1]);
                    if (!defined.has(m[1])) add("warning", "undefined_var", `"${titleOf(n)}" uses {{${m[1]}}}, but no Input Variable defines it.`, n.id);
                }
            });
        });
        const agentType = (n) => BLOCKS[n.type].category === "agents";
        const touchesTeam = (n) => !agentType(n) && (g.outEdges[n.id].some((e) => agentType(g.nodeMap.get(e.to))) || g.inEdges[n.id].some((e) => agentType(g.nodeMap.get(e.from))));
        const blockText = (n) => {
            const raw = rawText(n);
            if (!raw || !touchesTeam(n) || n.type === "variable" || n.type === "user_input") return raw;
            return `${titleOf(n)}:\n${raw}`;
        };
        const rawText = (n) => {
            const c = n.config || {};
            const text2 = sub(str(c.content));
            switch (n.type) {
                case "role":
                    return text2 || (str(c.personaPreset) ? `You are ${article(str(c.personaPreset))} ${str(c.personaPreset)}.` : "");
                case "tone": {
                    const t = str(c.tone);
                    return two(t && t !== "Custom" ? `Write in ${article(t)} ${t.toLowerCase()} tone.` : "", text2);
                }
                case "output":
                    return text2 || (str(c.formatSchema) ? `Respond in ${str(c.formatSchema)}.` : "");
                case "variable": {
                    const v = varNameOf(n);
                    const name = touchesTeam(n) ? `${titleOf(n)} ` : "";
                    if (opts.sample && str(c.defaultValue)) return `- ${name || v + " "}`.trimEnd() + `: ${str(c.defaultValue)}`;
                    return `- ${name ? `${name}({{${v}}})` : `{{${v}}}`}: ${lowerFirst(stripEnd(text2)) || "provided at run time"}`;
                }
                case "user_input": {
                    const v = str(c.inputName).replace(/[{}\s]/g, "") || "input";
                    const ask = str(c.prompt) ? `the user's answer to "${str(c.prompt)}"` : "supplied by the user";
                    if (opts.sample && str(c.defaultValue)) return `- ${titleOf(n)}: ${str(c.defaultValue)}`;
                    return two(`- ${titleOf(n)} ({{${v}}}): ${ask}.`, text2);
                }
                case "rag_source": {
                    const v = varNameOf(n);
                    const tail = opts.sample && str(c.defaultValue) ? `Source material:\n${str(c.defaultValue)}` : `The source material is provided as {{${v}}}.`;
                    return two(text2, tail, "\n\n");
                }
                case "meta_clarify":
                    return two(sentence(text2), Number(c.maxQuestions) > 0 ? `Ask no more than ${Number(c.maxQuestions)} question${Number(c.maxQuestions) === 1 ? "" : "s"}.` : "");
                case "meta_reasoning":
                    return two(sentence(text2), text2 ? str(c.visibility).startsWith("Shown") ? "Show this reasoning before your final answer." : "Keep this reasoning private and share only the final answer." : "");
                case "meta_rubric":
                    return text2 ? `Score your draft against each criterion below. If any criterion scores under ${str(c.threshold) || "8 out of 10"}, revise and score again. Do not show the scores.\n${text2}` : "";
                case "meta_generator":
                    return two(sentence(text2), text2 && str(c.targetModel) ? `Write it for ${str(c.targetModel)}.` : "");
                case "feedback":
                    return two(sentence(text2), str(c.purpose) ? `Purpose: ${lowerFirst(stripEnd(str(c.purpose)))}.` : "");
                case "agent_specialist":
                    return two(str(c.specialty) ? `Specialism: ${stripEnd(sub(str(c.specialty)))}.` : "", text2);
                case "agent_human":
                    return two(text2, str(c.question) ? `Ask the user: "${sub(str(c.question))}"` : "");
                default:
                    return text2;
            }
        };
        const owned = branchOwnership(g);
        const rendered = new Set();
        const portLabel = (n, port) => {
            const c = n.config || {};
            if (n.type === "ifelse") return port === "true" ? `If ${stripEnd(sub(str(c.condition))) || "the check passes"}` : "Otherwise";
            if (n.type === "switch") return port === "caseA" ? stripEnd(str(c.caseALabel)) || "Case A" : port === "caseB" ? stripEnd(str(c.caseBLabel)) || "Case B" : "Anything else";
            if (n.type === "parallel") return port === "branch1" ? "Track A" : "Track B";
            return "Each pass";
        };
        const logicText = (n, ids, guard) => {
            ids.push(n.id);
            rendered.add(n.id);
            if (guard.has(n.id)) return "";
            guard.add(n.id);
            const c = n.config || {};
            const text2 = sub(str(c.content));
            let head = text2;
            if (n.type === "switch") head = two(str(c.condition) ? `Route by ${stripEnd(sub(str(c.condition)))}.` : "", text2);
            if (n.type === "loop") head = two(`Repeat up to ${Number(c.maxIterations) || 3} times, stopping early once ${stripEnd(sub(str(c.exitCondition))) || "the result is good enough"}.`, text2);
            if (n.type === "parallel" && !head) head = "Work through these tracks independently.";
            if (n.type === "merge") return head;
            const lines = [];
            for (const port of BLOCKS[n.type].outputs) {
                const kids = g.ordered.filter((k) => {
                    const o = owned.get(k.id);
                    return o && o.owner === n.id && o.port === port.id;
                });
                const wired = g.outEdges[n.id].some((e) => e.fromPort === port.id);
                if (!wired && n.type !== "loop") {
                    if (!(n.type === "switch" && port.id === "default"))
                        add("info", "open_port", `"${titleOf(n)}": the ${port.label} port is not connected, so that branch is left out.`, n.id);
                    continue;
                }
                const texts = kids.map((k) => LOGIC.has(k.type) ? logicText(k, ids, guard) : (ids.push(k.id), rendered.add(k.id), blockText(k))).filter(Boolean);
                if (!texts.length) {
                    if (n.type !== "loop") lines.push(`- ${portLabel(n, port.id)}: continue to the next step.`);
                    continue;
                }
                const joined = texts.join("\n");
                lines.push(joined.includes("\n") ? `- ${portLabel(n, port.id)}:\n${joined.split("\n").map((l) => l ? "  " + l : l).join("\n")}` : `- ${portLabel(n, port.id)}: ${joined}`);
            }
            return two(head, lines.join("\n"), "\n");
        };
        const bucket = new Map();
        const firstSeen = [];
        const push = (id, part) => {
            if (!bucket.has(id)) {
                bucket.set(id, []);
                firstSeen.push(id);
            }
            bucket.get(id).push(part);
        };
        const team = [];
        const isAgent = (n) => BLOCKS[n.type].category === "agents";
        const joinTeam = (n) => {
            rendered.add(n.id);
            team.push(n);
            if (!bucket.has("agents")) { bucket.set("agents", []); firstSeen.push("agents"); }
        };
        for (const n of g.ordered) {
            if (rendered.has(n.id) || owned.has(n.id)) continue;
            const d = BLOCKS[n.type];
            if (isAgent(n)) { joinTeam(n); continue; }
            if (LOGIC.has(n.type)) {
                const ids = [];
                const text3 = logicText(n, ids, new Set());
                if (text3) push("workflow", { nodeId: n.id, nodeIds: ids, text: text3 });
                else add("warning", "empty", `"${titleOf(n)}" has nothing to say yet, so it is left out.`, n.id);
                continue;
            }
            rendered.add(n.id);
            const text2 = blockText(n);
            if (text2) push(d.section, { nodeId: n.id, nodeIds: [n.id], text: text2 });
            else add("warning", "empty", `"${titleOf(n)}" is empty, so it is left out.`, n.id);
        }
        for (const n of g.ordered) {
            if (rendered.has(n.id)) continue;
            if (isAgent(n)) { joinTeam(n); continue; }
            rendered.add(n.id);
            const text2 = LOGIC.has(n.type) ? logicText(n, [], new Set()) : blockText(n);
            if (text2) push(BLOCKS[n.type].section, { nodeId: n.id, nodeIds: [n.id], text: text2 });
        }

        // ---- Agent team: one entry per agent, with who it receives from and who it hands to, read off the wires.
        let teamSize = 0, teamLead = "";
        if (team.length) {
            const xmlOut = opts.format === "xml";
            const attr = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "'");
            const inList = (d) => d.inputs === true ? [{ id: "in", label: "Input" }] : Array.isArray(d.inputs) ? d.inputs : [];
            const tidy = (l) => String(l || "").replace(/\s+in$/i, "").trim();
            const uniq = (a) => [...new Set(a)];
            const list = (a) => a.length > 1 ? a.slice(0, -1).join(", ") + " and " + a[a.length - 1] : a[0] || "";
            const loopOf = new Map();
            g.loops.forEach((lp, i) => lp.nodeIds.forEach((id) => loopOf.set(id, i)));
            // A Feedback block inside a loop is that loop's rulebook, so wires are read straight through it.
            const mediators = new Set(team.filter((n) => n.type === "feedback" && loopOf.has(n.id)).map((n) => n.id));
            const sourcesOf = (e) => mediators.has(e.from) ? g.inEdges[e.from].map((x) => g.nodeMap.get(x.from)) : [g.nodeMap.get(e.from)];
            const targetsOf = (e) => mediators.has(e.to) ? g.outEdges[e.to].map((x) => g.nodeMap.get(x.to)) : [g.nodeMap.get(e.to)];
            const members = team.filter((n) => !mediators.has(n.id));
            teamSize = members.length;
            const parts = members.map((n, i) => {
                const d = BLOCKS[n.type];
                const recv = [], send = [];
                g.inEdges[n.id].forEach((e) => {
                    const tp = inList(d).find((p) => p.id === (e.toPort || "in"));
                    const what = tp ? tidy(tp.label) : "Input";
                    const back = g.loopEdgeIds.has(e.id) ? (e.toPort === "reports" ? ", when the work comes back" : ", on revision rounds") : "";
                    sourcesOf(e).forEach((src) => {
                        const sd = BLOCKS[src.type];
                        const fp = sd.outputs.find((p) => p.id === e.fromPort);
                        const via = !mediators.has(e.from) && sd.outputs.length > 1 && fp && tidy(fp.label).toLowerCase() !== what.toLowerCase() ? ` (${tidy(fp.label)})` : "";
                        recv.push(`- ${what}, from ${titleOf(src)}${via}${back}`);
                    });
                });
                g.outEdges[n.id].forEach((e) => {
                    const fp = d.outputs.find((p) => p.id === e.fromPort);
                    targetsOf(e).forEach((tgt) => {
                        const what = fp ? tidy(fp.label) : "Output";
                        send.push(what.toLowerCase() === titleOf(tgt).toLowerCase() ? `- To ${titleOf(tgt)}` : `- ${what}, to ${titleOf(tgt)}`);
                    });
                });
                if (!g.inEdges[n.id].length) add("warning", "agent_no_input", `"${titleOf(n)}" receives nothing, so it has no brief. Wire a task or another agent's output into it.`, n.id);
                if (d.kind === "coordinator") {
                    const open = d.outputs.filter((p) => !/summary|fallback/.test(p.id) && !g.outEdges[n.id].some((e) => e.fromPort === p.id));
                    const wired = d.outputs.length - open.length;
                    if (open.length && !g.outEdges[n.id].length) add("warning", "coordinator_empty", `"${titleOf(n)}" has no agents to brief. It only hands out work: add agent blocks and wire one to each of its outputs, or select it and use "Add its agents".`, n.id);
                    else if (open.length) add("info", "coordinator_open", `"${titleOf(n)}": nothing is wired to ${list(open.map((p) => p.label))}, so ${open.length === 1 ? "that brief is" : "those briefs are"} left out.`, n.id);
                } else if (!g.outEdges[n.id].length) add("info", "agent_no_output", `"${titleOf(n)}" hands its work to nothing. Wire one of its outputs onward, or into an Output Format block.`, n.id);
                const handLabel = n.type === "agent_router" ? "Hands off (choose exactly one):" : n.type === "agent_human" ? "Hands off (depending on the user's reply):" : "Hands off:";
                const body2 = [blockText(n), recv.length ? "Receives:\n" + uniq(recv).join("\n") : "", send.length ? handLabel + "\n" + uniq(send).join("\n") : ""].filter(Boolean).join("\n");
                const text2 = xmlOut ? `<agent name="${attr(titleOf(n))}">\n${body2}\n</agent>` : `### ${i + 1}. ${titleOf(n)}\n${body2}`;
                return { nodeId: n.id, nodeIds: [n.id], text: text2 };
            });
            g.loops.forEach((lp) => {
                const fb = team.find((n) => mediators.has(n.id) && lp.nodeIds.includes(n.id));
                const reportsOnly = lp.edges.every((e) => e.toPort === "reports");
                const lines = uniq(lp.edges.map((e) => {
                    const from = uniq(sourcesOf(e).map(titleOf));
                    const plural = from.length > 1;
                    return e.toPort === "reports"
                        ? `${list(from)} ${plural ? "report" : "reports"} back to ${titleOf(g.nodeMap.get(e.to))}`
                        : `${list(from)} ${plural ? "send" : "sends"} feedback to ${titleOf(g.nodeMap.get(e.to))}`;
                }));
                const rounds = Math.max(1, Number(fb && fb.config.maxRounds) || 2);
                const rule = reportsOnly
                    ? "Each report is checked once against its assignment before sign-off."
                    : `Run at most ${rounds} round${rounds === 1 ? "" : "s"}, and stop as soon as no issues remain.`;
                const body2 = two(`${lines.join(". ")}. ${rule}`, fb ? blockText(fb) : "", "\n");
                const name = reportsOnly ? "Reporting line" : "Revision loop";
                parts.push({
                    nodeId: fb ? fb.id : lp.edges[0].to,
                    nodeIds: fb ? [fb.id] : uniq(lp.edges.map((e) => e.to)),
                    text: xmlOut ? `<loop name="${name}">\n${body2}\n</loop>` : `### ${name}\n${body2}`
                });
                if (!fb && !reportsOnly) add("info", "loop_default", `The revision loop into "${titleOf(g.nodeMap.get(lp.edges[0].to))}" runs for 2 rounds by default. Put a Feedback block on the return wire to change that.`, lp.edges[0].to, lp.edges[0].id);
            });
            // The model has no orchestrator behind it, so the prompt has to say how the team runs.
            const finals = uniq(members.flatMap((n) => g.outEdges[n.id].flatMap(targetsOf)).filter((t) => !isAgent(t)).map(titleOf));
            teamLead = teamSize > 1 ? [
                `This prompt describes a team of ${teamSize} agents. No software runs them: you play every agent yourself, in one continuous piece of work.`,
                `Run order: ${members.map(titleOf).join(" > ")}.`,
                "For each agent in turn: adopt its rules, use only what it receives, and write its output under a heading with the agent's name. Then pass that output to the agents listed under its hand-offs. An agent that is handed nothing in this run is skipped.",
                finals.length ? `The finished deliverable is whatever reaches ${list(finals)}.` : ""
            ].filter(Boolean).join("\n") : "";
            bucket.set("agents", parts);
        }
        const sectionIds = opts.order === "wire" ? firstSeen : SECTIONS.map((s) => s.id).filter((id) => bucket.has(id));
        const xml = opts.format === "xml";
        const sections = sectionIds.map((id) => {
            const meta = SECTIONS.find((s) => s.id === id);
            let parts = bucket.get(id);
            let lead = "";
            if (id === "inputs") lead = opts.sample ? "Inputs for this run:" : "You will be given the following inputs:";
            if (id === "agents") lead = teamLead;
            if (id === "workflow" && parts.length > 1) parts = parts.map((p, i) => ({ ...p, text: `${i + 1}. ${indent(p.text, 3)}` }));
            const joiner = id === "inputs" || id === "workflow" && parts.length > 1 ? "\n" : "\n\n";
            const text2 = two(lead, parts.map((p) => p.text).join(joiner), id === "agents" ? "\n\n" : "\n");
            return {
                id, title: meta.title, tag: meta.tag, lead, parts, text: text2,
                open: xml ? `<${meta.tag}>` : `## ${meta.title}`,
                close: xml ? `</${meta.tag}>` : ""
            };
        });
        const doc = (list) => list.map((s) => s.close ? `${s.open}\n${s.text}\n${s.close}` : `${s.open}\n${s.text}`).join("\n\n");
        let text = doc(sections);
        if (opts.format === "json" && sections.length) {
            const md = sections.map((s) => ({ ...s, open: `## ${s.title}`, close: "" }));
            const vars = [...defined.entries()].filter(([, n]) => n.type === "variable" || n.type === "user_input");
            const user = vars.map(([v, n]) => opts.sample && str(n.config.defaultValue) || `{{${v}}}`).join("\n\n");
            const messages = [{ role: "system", content: doc(md.filter((s) => s.id !== "inputs" || !user)) }];
            if (user) messages.push({ role: "user", content: user });
            text = JSON.stringify({ name: opts.title || "Untitled prompt", messages }, null, 2);
        }
        g.unwired.forEach((n) => add("warning", "unwired", `"${titleOf(n)}" is not wired in, so it is left out of the prompt.`, n.id));
        if (g.cycleNodes.size) {
            const names = g.ordered.filter((n) => g.cycleNodes.has(n.id)).map((n) => `"${titleOf(n)}"`).join(", ");
            add("error", "cycle", `Circular link between ${names}. Remove one of the red wires. A loop is only allowed when the return wire goes into a Feedback or Reports input.`, [...g.cycleNodes][0], [...g.cycleEdgeIds][0]);
        }
        g.active.filter((n) => n.type === "merge" && g.inEdges[n.id].length < 2).forEach((n) => add("info", "merge_single", `"${titleOf(n)}" has one incoming wire. A merge normally combines two or more.`, n.id));
        defined.forEach((n, v) => {
            if (n.type === "variable" && !used.has(v) && !touchesTeam(n)) add("info", "unused_var", `{{${v}}} is listed under Inputs but no block refers to it yet.`, n.id);
        });
        const has = (...types) => g.active.some((n) => types.includes(n.type));
        const missing = [];
        if (g.active.length) {
            if (!has("role", "persona_governor", "system")) missing.push("role");
            if (!has("task", "instructions", "objective", "agent_writer", "multi_agent", "agent_lead", "agent_router", "agent_planner", "agent_specialist")) missing.push("task");
            if (!has("output", "meta_generator", "deliverable", "agent_critic", "agent_editor", "agent_judge", "agent_vote")) missing.push("output");
        }
        const rank = { error: 0, warning: 1, info: 2 };
        diagnostics.sort((a, b) => rank[a.level] - rank[b.level]);
        const chars = text.length;
        return {
            sections, text, diagnostics, missing,
            order: g.ordered.map((n) => n.id),
            activeIds: g.active.map((n) => n.id),
            unwiredIds: g.unwired.map((n) => n.id),
            cycleNodeIds: [...g.cycleNodes],
            cycleEdgeIds: [...g.cycleEdgeIds],
            loopEdgeIds: [...g.loopEdgeIds],
            loopCount: g.loops.length,
            chars,
            tokens: chars ? Math.max(1, Math.ceil(chars / 4)) : 0,
            ready: sections.length > 0 && !missing.includes("task") && !diagnostics.some((d) => d.level === "error")
        };
    }

    var HEADING_MAP = [
        [/success|criteria|good looks like|definition of done|acceptance/, "success"],
        [/output|format|response|deliverable/, "output"],
        [/quality|check|verif|review|validat/, "meta_selfcheck"],
        [/tone|style|voice/, "tone"],
        [/example|few.?shot|sample|demonstration/, "fewshot"],
        [/constraint|guard|limit|avoid|never|must not|boundar|rule|restriction/, "constraints"],
        [/approach|method|reasoning|thinking/, "meta_optimizer"],
        [/instruction|step|guideline|process|workflow|procedure|how to/, "instructions"],
        [/task|objective|goal|job|mission|assignment|request/, "task"],
        [/knowledge|source|reference|document|data/, "knowledge"],
        [/input|variable|parameter|placeholder/, "inputs"],
        [/audience|reader|user profile|who it'?s for/, "audience"],
        [/context|background|scenario|situation|why|purpose|overview|about/, "context"],
        [/role|persona|identity|who you are|character/, "role"],
        [/system/, "system"]
    ];

    function parsePromptText(raw) {
        var _a;
        const text = String(raw || "").replace(/\r\n?/g, "\n").trim();
        const notes = [];
        let title = "";
        let chunks = [];
        const xml = [...text.matchAll(/^<([a-zA-Z][\w-]*)>\s*\n?([\s\S]*?)\n?<\/\1>\s*$/gm)];
        const lines = text.split("\n");
        const heads = lines.map((l, i) => ({ i, m: /^(#{1,6})\s+(.+?)\s*#*$/.exec(l) })).filter((h) => h.m);
        let inFence = false;
        const fenced = new Set();
        lines.forEach((l, i) => {
            if (/^\s*```/.test(l)) inFence = !inFence;
            else if (inFence) fenced.add(i);
        });
        const real = heads.filter((h) => !fenced.has(h.i));
        if (real.length) {
            let list = real;
            if (list.length > 1 && list[0].m[1].length === 1 && list.slice(1).every((h) => h.m[1].length > 1)) {
                title = list[0].m[2];
                list = list.slice(1);
                const pre = lines.slice(real[0].i + 1, list[0].i).join("\n").trim();
                if (pre) chunks.push({ heading: "System", body: pre });
            } else {
                const pre = lines.slice(0, list[0].i).join("\n").trim();
                if (pre) chunks.push({ heading: "System", body: pre });
            }
            const level = Math.min(...list.map((h) => h.m[1].length));
            const tops = list.filter((h) => h.m[1].length === level);
            tops.forEach((h, k) => {
                const end = k + 1 < tops.length ? tops[k + 1].i : lines.length;
                chunks.push({ heading: h.m[2], body: lines.slice(h.i + 1, end).join("\n").trim() });
            });
        } else if (xml.length) {
            chunks = xml.map((m) => ({ heading: m[1].replace(/[_-]+/g, " "), body: m[2].trim() }));
        } else if (text) {
            const paras = text.split(/\n{2,}/);
            if (/^you are\b/i.test(paras[0]) && paras.length > 1) chunks = [{ heading: "Role", body: paras[0] }, { heading: "Task", body: paras.slice(1).join("\n\n") }];
            else chunks = [{ heading: "Task", body: text }];
            notes.push("No headings were found, so the text was split into the fewest blocks that made sense.");
        }
        const nodes = [];
        const vars = [];
        let n = 0;
        const pretty = (h) => h.replace(/^\s*(\d+|[A-Za-z])[.)]\s+/, "").replace(/[*_`:]+/g, "").trim();
        const titleCase = (h) => h === h.toUpperCase() || h === h.toLowerCase() ? h.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()) : h;
        const make = (type, config) => ({
            id: `imp_${++n}`,
            type,
            x: 0, y: 0,
            config: { ...JSON.parse(JSON.stringify(BLOCKS[type].defaults)), ...config }
        });
        for (const c of chunks) {
            const name = titleCase(pretty(c.heading)) || "Section";
            if (!c.body) { notes.push(`"${name}" had no text under it and was skipped.`); continue; }
            const key = name.toLowerCase();
            let kind = (_a = HEADING_MAP.find(([re]) => re.test(key))) == null ? void 0 : _a[1];
            if (!kind) { kind = "instructions"; notes.push(`"${name}" is not a standard section, so it came in as an Instructions block.`); }
            if (kind === "inputs") {
                const rows = [...c.body.matchAll(/^\s*[-*]\s*\{\{\s*([\w.-]+)\s*\}\}\s*:?\s*(.*)$/gm)];
                if (rows.length) {
                    rows.forEach((r) => vars.push(make("variable", { title: titleCase(r[1].replace(/[_.-]+/g, " ")), varName: r[1], content: r[2] ? r[2][0].toUpperCase() + r[2].slice(1) : "", defaultValue: "" })));
                    continue;
                }
                kind = "context";
            }
            if (kind === "knowledge") {
                const v = /\{\{\s*([\w.-]+)\s*\}\}/.exec(c.body);
                if (v) {
                    nodes.push(make("rag_source", { title: name, varName: v[1], defaultValue: "", content: c.body.replace(/\n*The source material is provided as \{\{[^}]+\}\}\.?\s*$/, "").trim() }));
                    continue;
                }
                kind = "context";
            }
            if (/workflow/.test(key)) notes.push(`"${name}" came in as written text. Rebuild it with logic blocks if you want real branches on the canvas.`);
            const extra = kind === "tone" ? { tone: "Custom" } : kind === "role" ? { personaPreset: "" } : kind === "output" ? { formatSchema: "" } : {};
            nodes.push(make(kind, { title: name, content: c.body, ...extra }));
        }
        const have = new Set(vars.map(varNameOf));
        nodes.filter((x) => x.type === "rag_source").forEach((x) => have.add(varNameOf(x)));
        nodes.forEach((x) => {
            for (const m of String(x.config.content).matchAll(VAR_RE))
                if (!have.has(m[1])) {
                    have.add(m[1]);
                    vars.push(make("variable", { title: titleCase(m[1].replace(/[_.-]+/g, " ")), varName: m[1], content: "", defaultValue: "" }));
                }
        });
        const edges = [];
        let e = 0;
        nodes.forEach((x, i) => {
            x.x = 344 + i * 304;
            x.y = 80;
            if (i) edges.push({ id: `imp_e${++e}`, from: nodes[i - 1].id, fromPort: BLOCKS[nodes[i - 1].type].outputs[0].id, to: x.id, toPort: "in" });
        });
        const first = nodes.find((x) => BLOCKS[x.type].inputs);
        vars.forEach((v, i) => {
            v.x = 40;
            v.y = 80 + i * 168;
            if (first) edges.push({ id: `imp_e${++e}`, from: v.id, fromPort: "out", to: first.id, toPort: "in" });
        });
        return { title, nodes: [...vars, ...nodes], edges, notes };
    }
    return __toCommonJS(compile_engine_exports);
})();

// Preset workflows
const TEMPLATES = {
    default: {
        title: 'Quality-Checked Analyst',
        nodes: [
            { id: 'n1', type: 'variable', x: 40, y: 80, config: { title: 'User Query', varName: 'user_query', content: "The user's request", defaultValue: 'Evaluate our AWS infrastructure spend and identify 3 high-ROI cost optimisations.' } },
            { id: 'n2', type: 'role', x: 344, y: 80, config: { title: 'Persona Role', personaPreset: 'Principal AI & FinOps Architect', content: 'You are a Principal AI & FinOps Architect. Communicate with executive clarity, quantitative rigour, and concrete architectural trade-offs.' } },
            { id: 'n3', type: 'task', x: 648, y: 80, config: { title: 'Task Instruction', content: 'Answer {{user_query}} in three steps:\n1. Audit compute, storage, and egress bottlenecks.\n2. Quantify estimated monthly savings (%) for each action.\n3. Rank initiatives by engineering effort against ROI.' } },
            { id: 'n4', type: 'ifelse', x: 952, y: 80, config: { title: 'Quality Gate', condition: 'every recommendation has a quantified saving and you are at least 85% confident', content: 'Check the draft before you answer.' } },
            { id: 'n5', type: 'output', x: 1256, y: 16, config: { title: 'Verified JSON Output', formatSchema: 'JSON', content: 'Return strictly valid JSON with the keys "executive_summary", "optimisations" (an array of title, savings_pct, effort), and "confidence_score".' } },
            { id: 'n6', type: 'constraints', x: 1256, y: 232, config: { title: 'Telemetry Fallback', content: 'List the exact billing metrics you need from the user before estimating any savings.' } },
            { id: 'n7', type: 'tone', x: 952, y: 336, config: { title: 'Tone Modifier', tone: 'Executive', content: 'Cut filler and hedging. Keep every bullet point to 18 words or fewer.' } }
        ],
        edges: [
            { id: 'e1', from: 'n1', fromPort: 'out', to: 'n2', toPort: 'in' },
            { id: 'e2', from: 'n2', fromPort: 'out', to: 'n3', toPort: 'in' },
            { id: 'e3', from: 'n3', fromPort: 'out', to: 'n4', toPort: 'in' },
            { id: 'e4', from: 'n4', fromPort: 'true', to: 'n5', toPort: 'in' },
            { id: 'e5', from: 'n4', fromPort: 'false', to: 'n6', toPort: 'in' },
            { id: 'e6', from: 'n3', fromPort: 'out', to: 'n7', toPort: 'in' }
        ]
    },
    cot: {
        title: 'Chain-of-Thought Reasoning',
        nodes: [
            { id: 'c1', type: 'variable', x: 40, y: 120, config: { title: 'Problem Statement', varName: 'problem_statement', content: 'The problem to solve', defaultValue: 'A cluster handles 1,200 req/s at 80% CPU. Traffic doubles during peak.' } },
            { id: 'c2', type: 'role', x: 344, y: 120, config: { title: 'First-Principles Reasoner', personaPreset: 'Research Scientist', content: 'You are a research scientist who breaks complex systems down from first principles before reaching a conclusion.' } },
            { id: 'c3', type: 'task', x: 648, y: 120, config: { title: 'Solve the Problem', content: 'Solve {{problem_statement}} and state the final answer with its units.' } },
            { id: 'c4', type: 'meta_reasoning', x: 952, y: 120, config: { title: 'Reasoning Protocol', visibility: 'Shown before the answer', content: 'Work through the problem step by step before answering: restate the goal, list what you know, name what is uncertain, then reason to a conclusion.' } },
            { id: 'c5', type: 'fewshot', x: 1256, y: 120, config: { title: 'Worked Example', content: 'Reasoning:\n1. Current load: 1,200 req/s at 80% CPU, so full capacity is 1,500 req/s.\n2. Peak load: 2,400 req/s needs 2,400 / 1,500 = 1.6 nodes at minimum.\n3. Add 30% headroom, so 3 nodes are required.\nFinal answer: 3 nodes.' } }
        ],
        edges: [
            { id: 'ce1', from: 'c1', fromPort: 'out', to: 'c2', toPort: 'in' },
            { id: 'ce2', from: 'c2', fromPort: 'out', to: 'c3', toPort: 'in' },
            { id: 'ce3', from: 'c3', fromPort: 'out', to: 'c4', toPort: 'in' },
            { id: 'ce4', from: 'c4', fromPort: 'out', to: 'c5', toPort: 'in' }
        ]
    },
    critique: {
        title: 'Self-Critique Loop',
        nodes: [
            { id: 'm1', type: 'role', x: 40, y: 128, config: { title: 'Lead Systems Architect', personaPreset: 'Principal AI & FinOps Architect', content: 'You are a lead systems architect who drafts thorough, deeply technical architecture proposals.' } },
            { id: 'm2', type: 'task', x: 344, y: 128, config: { title: 'Draft the Spec', content: 'Write a production architecture specification that removes every single point of failure.' } },
            { id: 'm3', type: 'loop', x: 648, y: 120, config: { title: 'Adversarial Critique Loop', exitCondition: 'no security or latency flaws remain', maxIterations: 3, content: 'Review the draft as a staff security and reliability reviewer.' } },
            { id: 'm4', type: 'instructions', x: 952, y: 40, config: { title: 'Harden the Draft', content: 'List each flaw you found, then rewrite the affected section to remove it.' } },
            { id: 'm5', type: 'output', x: 952, y: 264, config: { title: 'Hardened Deliverable', formatSchema: 'Markdown', content: 'Deliver the final architecture document in Markdown, ending with a threat mitigation table.' } }
        ],
        edges: [
            { id: 'me1', from: 'm1', fromPort: 'out', to: 'm2', toPort: 'in' },
            { id: 'me2', from: 'm2', fromPort: 'out', to: 'm3', toPort: 'in' },
            { id: 'me3', from: 'm3', fromPort: 'out', to: 'm4', toPort: 'in' },
            { id: 'me4', from: 'm2', fromPort: 'out', to: 'm5', toPort: 'in' }
        ]
    },
    router: {
        title: 'Conditional Content Router',
        nodes: [
            { id: 'r1', type: 'variable', x: 40, y: 152, config: { title: 'Customer Message', varName: 'customer_message', content: 'The incoming support message', defaultValue: 'Our webhook endpoint is returning 502 Bad Gateway errors since the v2 deploy.' } },
            { id: 'r0', type: 'role', x: 344, y: 152, config: { title: 'Support Triage Lead', personaPreset: 'Customer Support Lead', content: 'You are a support triage lead who gets each customer to the right resolution on the first reply.' } },
            { id: 'r2', type: 'switch', x: 648, y: 136, config: { title: 'Intent Triage Router', condition: 'the intent of {{customer_message}}', caseALabel: 'Engineering or bug report', caseBLabel: 'Billing or account', content: '' } },
            { id: 'r3', type: 'task', x: 952, y: 16, config: { title: 'Engineering Runbook', content: 'Extract the HTTP status codes and deployment version, then write a structured P1 or P2 triage report.' } },
            { id: 'r4', type: 'task', x: 952, y: 176, config: { title: 'Billing Resolution', content: 'Check the invoice cycle and proration rules, then draft an empathetic billing reply.' } },
            { id: 'r5', type: 'constraints', x: 952, y: 336, config: { title: 'General Clarification', content: 'Ask two targeted questions so the request can be routed accurately.' } }
        ],
        edges: [
            { id: 're0', from: 'r1', fromPort: 'out', to: 'r0', toPort: 'in' },
            { id: 're1', from: 'r0', fromPort: 'out', to: 'r2', toPort: 'in' },
            { id: 're2', from: 'r2', fromPort: 'caseA', to: 'r3', toPort: 'in' },
            { id: 're3', from: 'r2', fromPort: 'caseB', to: 'r4', toPort: 'in' },
            { id: 're4', from: 'r2', fromPort: 'default', to: 'r5', toPort: 'in' }
        ]
    },
    rag: {
        title: 'RAG Synthesis Pipeline',
        nodes: [
            { id: 'g1', type: 'rag_source', x: 40, y: 128, config: { title: 'Retrieved Documents', varName: 'retrieved_docs', content: 'Treat the supplied documents as the only source of truth and cite each one inline as [Doc-ID].', defaultValue: '[Doc-104: Q3 FinOps Audit], [Doc-209: K8s Right-Sizing]' } },
            { id: 'g2', type: 'parallel', x: 344, y: 120, config: { title: 'Dual Verification Split', content: 'Run fact extraction and the grounding audit independently.' } },
            { id: 'g3', type: 'task', x: 648, y: 40, config: { title: 'Factual Extraction', content: 'Extract the exact figures, dates, and architectural claims that a citation supports.' } },
            { id: 'g4', type: 'constraints', x: 648, y: 216, config: { title: 'Grounding Audit', content: 'Reject any statement the documents do not explicitly support.' } },
            { id: 'g5', type: 'merge', x: 952, y: 128, config: { title: 'Cited Synthesis', content: 'Merge the verified facts into one concise answer with inline citations.' } },
            { id: 'g6', type: 'meta_uncertainty', x: 1256, y: 128, config: { title: 'Uncertainty Handling', content: 'If the documents do not answer the question, say so plainly. Never invent facts, figures, or sources.' } }
        ],
        edges: [
            { id: 'ge1', from: 'g1', fromPort: 'out', to: 'g2', toPort: 'in' },
            { id: 'ge2', from: 'g2', fromPort: 'branch1', to: 'g3', toPort: 'in' },
            { id: 'ge3', from: 'g2', fromPort: 'branch2', to: 'g4', toPort: 'in' },
            { id: 'ge4', from: 'g3', fromPort: 'out', to: 'g5', toPort: 'in' },
            { id: 'ge5', from: 'g4', fromPort: 'out', to: 'g5', toPort: 'in' },
            { id: 'ge6', from: 'g5', fromPort: 'out', to: 'g6', toPort: 'in' }
        ]
    },
    meta: {
        title: 'Meta-Prompt Generator',
        nodes: [
            { id: 'p1', type: 'variable', x: 40, y: 128, config: { title: 'Goal', varName: 'goal', content: 'What the finished prompt must achieve', defaultValue: 'A prompt that turns meeting transcripts into action lists.' } },
            { id: 'p2', type: 'role', x: 344, y: 128, config: { title: 'Prompt Engineer', personaPreset: 'Senior Copywriter', content: 'You are a senior prompt engineer who writes reusable, reliable system prompts.' } },
            { id: 'p3', type: 'meta_clarify', x: 648, y: 128, config: { title: 'Clarifying Questions', maxQuestions: 3, content: 'Before you begin, check that you have everything you need. If anything essential is missing or ambiguous, ask your questions first and wait for the answers.' } },
            { id: 'p4', type: 'task', x: 952, y: 128, config: { title: 'Write the Prompt', content: 'Write a system prompt that achieves {{goal}}.' } },
            { id: 'p5', type: 'meta_generator', x: 1256, y: 40, config: { title: 'Prompt Generator', targetModel: '', content: 'Your output is a prompt for another AI model, not the final answer. Write it in the second person, give it a role, a task, constraints, and an output format, and return it in a single code block.' } },
            { id: 'p6', type: 'meta_rubric', x: 1256, y: 264, config: { title: 'Quality Rubric', threshold: '8 out of 10', content: '- Clarity: a model could follow it without guessing.\n- Reuse: it works for inputs beyond the example.\n- Reliability: it says what to do when information is missing.' } }
        ],
        edges: [
            { id: 'pe1', from: 'p1', fromPort: 'out', to: 'p2', toPort: 'in' },
            { id: 'pe2', from: 'p2', fromPort: 'out', to: 'p3', toPort: 'in' },
            { id: 'pe3', from: 'p3', fromPort: 'out', to: 'p4', toPort: 'in' },
            { id: 'pe4', from: 'p4', fromPort: 'out', to: 'p5', toPort: 'in' },
            { id: 'pe5', from: 'p4', fromPort: 'out', to: 'p6', toPort: 'in' }
        ]
    },
    multiAgent: {
        title: 'Team: Conductor and four agents', group: 'agents',
        about: 'One task goes in. The Conductor briefs four agents, and the Critic sends the draft back for one revision.',
        shape: 'Task > Conductor > Planner, Researcher, Writer, Critic\nWriter <> Critic (loop) > Output',
        nodes: [
            { id: 'a1', type: 'variable', config: { title: 'Task', varName: 'task', content: 'The job the team must complete', defaultValue: 'Write a launch plan for a new API tier, with pricing, rollout, and risk.' } },
            { id: 'a2', type: 'multi_agent', config: { title: 'Team Coordinator', content: 'Brief each agent with {{task}} and only the background it needs. The Planner goes first, the Researcher and Writer work from the plan, and the Critic reviews last. No agent does another agent\'s job.' } },
            { id: 'a3', type: 'agent_planner', config: { title: 'Planner', content: 'Decompose the task into an ordered list of steps, each with an explicit input and output. Surface unknowns as questions rather than assuming. List the top three risks with a leading indicator for each.' } },
            { id: 'a4', type: 'agent_researcher', config: { title: 'Researcher', content: 'Work only from the sources provided. For every factual claim, record the source ID inline as [Doc-ID]. If a question cannot be answered from the sources, list it under Gaps rather than guessing.' } },
            { id: 'a5', type: 'agent_writer', config: { title: 'Writer', content: 'Lead with the answer and follow the plan. On the first round, write the draft. When feedback arrives, resolve every issue raised and produce a revised draft.' } },
            { id: 'a6', type: 'agent_critic', config: { title: 'Critic', content: 'Judge the draft against the task and the plan. Pass it only if every step of the plan is covered. List issues by severity (blocker, major, minor) and give one concrete rewrite hint for each blocker.' } },
            { id: 'a7', type: 'output', config: { title: 'Deliver the Plan', formatSchema: 'Markdown', content: 'Deliver the final launch plan in Markdown, followed by the Critic\'s verdict as a short quality note.' } }
        ],
        edges: [
            ['a1', 'out', 'a2', 'task'], ['a2', 'planner', 'a3', 'task'], ['a2', 'researcher', 'a4', 'task'], ['a2', 'writer', 'a5', 'task'], ['a2', 'critic', 'a6', 'task'],
            ['a3', 'plan', 'a5', 'plan'], ['a3', 'priorities', 'a4', 'questions'], ['a4', 'findings', 'a5', 'context'], ['a3', 'plan', 'a6', 'context'],
            ['a5', 'draft', 'a6', 'draft'], ['a6', 'feedback', 'a5', 'feedback'], ['a5', 'revised_draft', 'a7', 'in'], ['a6', 'critique', 'a7', 'in']
        ]
    },
    assemblyLine: {
        title: 'Team: Assembly line', group: 'agents',
        about: 'The simplest tree. Each agent does one job and passes it on: plan, research, write, fact-check, edit.',
        shape: 'Planner > Researcher > Writer > Fact-Checker > Editor > Output',
        nodes: [
            { id: 's1', type: 'user_input', config: { title: 'User Task', inputName: 'user_request', prompt: 'What should the team write?', content: 'Use this as the task for every agent.', defaultValue: 'A one-page briefing on whether we should move our payments service to a second cloud region.' } },
            { id: 's0', type: 'rag_source', config: { title: 'Source Documents', varName: 'source_docs', content: 'Treat the supplied documents as the only source of truth and cite each one inline as [Doc-ID].', defaultValue: '[Doc-11: Region outage report], [Doc-12: Cloud pricing sheet]' } },
            { id: 's2', type: 'agent_planner', config: { title: 'Planner', content: 'Decompose the task into ordered steps. Surface unknowns as questions. List the top three risks.' } },
            { id: 's3', type: 'agent_researcher', config: { title: 'Researcher', content: 'Answer the plan\'s open questions from the sources. Cite every claim as [Doc-ID]. List anything you could not find under Gaps.' } },
            { id: 's4', type: 'agent_writer', config: { title: 'Writer', content: 'Lead with the recommendation and follow the plan. Use only the Researcher\'s findings as evidence.' } },
            { id: 's5', type: 'agent_fact_checker', config: { title: 'Fact-Checker', content: 'Check every number, name and date against the sources. Mark each claim as supported, unsupported or contradicted. Never fix a claim by guessing.' } },
            { id: 's6', type: 'agent_editor', config: { title: 'Editor', content: 'Cut repetition and tighten every sentence. Do not add claims, remove facts or change the argument.' } },
            { id: 's7', type: 'output', config: { title: 'Final Briefing', formatSchema: 'Markdown', content: 'Deliver the edited briefing in Markdown, no longer than one page, with a numbered source list at the end.' } }
        ],
        edges: [
            ['s1', 'out', 's2', 'task'], ['s1', 'out', 's4', 'task'], ['s0', 'out', 's3', 'context'], ['s2', 'priorities', 's3', 'questions'], ['s2', 'plan', 's4', 'plan'],
            ['s3', 'findings', 's4', 'context'], ['s4', 'draft', 's5', 'draft'], ['s3', 'sources', 's5', 'sources'], ['s5', 'verified', 's6', 'draft'], ['s6', 'edited', 's7', 'in']
        ]
    },
    plannerWriterCritic: {
        title: 'Team: Writer and Critic loop', group: 'agents',
        about: 'A revision loop with a round limit. The Feedback block on the return wire sets the rules.',
        shape: 'Planner > Writer > Critic\nCritic > Feedback > Writer (2 rounds) > Output',
        nodes: [
            { id: 't1', type: 'user_input', config: { title: 'User Task', inputName: 'user_request', prompt: 'What do you need the team to do?', content: 'Use this as the task for the Planner and the Writer.', defaultValue: 'Write a two-page launch plan for our new API tier, covering pricing, rollout, and risk.' } },
            { id: 't2', type: 'agent_planner', config: { title: 'Planner', content: 'Decompose the task into ordered steps. Surface unknowns as questions. List the top three risks with a leading indicator.' } },
            { id: 't3', type: 'agent_writer', config: { title: 'Writer', content: 'Lead with the answer and follow the plan. On the first round, write the draft. When feedback arrives, resolve every issue raised and produce a revised draft.' } },
            { id: 't4', type: 'agent_critic', config: { title: 'Critic', content: 'Judge the draft against the task and the plan. List issues by severity and give one concrete rewrite hint for each blocker.' } },
            { id: 't5', type: 'feedback', config: { title: 'Revision Rules', feedbackSource: 'Critic feedback', purpose: 'Revision', maxRounds: 2, content: 'Treat every issue as something to act on. Resolve it in the next round or state why it is out of scope. Never raise the same issue twice.' } },
            { id: 't6', type: 'output', config: { title: 'Final Deliverable', formatSchema: 'Markdown', content: 'Return the revised draft as the final answer, plus a short summary of what changed between the first draft and the last.' } }
        ],
        edges: [
            ['t1', 'out', 't2', 'task'], ['t1', 'out', 't3', 'task'], ['t2', 'plan', 't3', 'plan'], ['t2', 'plan', 't4', 'context'], ['t3', 'draft', 't4', 'draft'],
            ['t4', 'feedback', 't5', 'in'], ['t5', 'to_writer', 't3', 'feedback'], ['t3', 'revised_draft', 't6', 'in']
        ]
    },
    leadSpecialists: {
        title: 'Team: Lead with parallel specialists', group: 'agents',
        about: 'A manager splits one job three ways. The specialists work side by side, an Aggregator merges them, and the lead signs off.',
        shape: 'Team Lead > Specialist, Specialist, Analyst\n> Aggregator > reports back to Lead > Output',
        nodes: [
            { id: 'l1', type: 'user_input', config: { title: 'Business Question', inputName: 'question', prompt: 'What decision do you need help with?', content: 'Use this as the job for the Team Lead.', defaultValue: 'Should we launch a usage-based pricing tier next quarter?' } },
            { id: 'l0', type: 'structured_dataset', config: { title: 'Usage Data', format: 'CSV', content: 'plan,customers,avg_monthly_calls,churn_pct\nstarter,1840,12000,6.1\ngrowth,620,410000,2.4\nscale,74,9800000,0.9', schemaNote: 'One row per current plan.' } },
            { id: 'l2', type: 'agent_lead', config: { title: 'Team Lead', content: 'Split the question into three assignments that do not overlap: pricing, security and usage data. Give each worker the outcome expected and a 150-word limit. Check each report against its assignment before signing off.' } },
            { id: 'l3', type: 'agent_specialist', config: { title: 'Pricing Strategist', specialty: 'SaaS pricing strategy', content: 'Recommend a price structure and say what it does to revenue from each existing plan.' } },
            { id: 'l4', type: 'agent_specialist', config: { title: 'Security Reviewer', specialty: 'API security and abuse prevention', content: 'Name the abuse and billing-fraud risks a usage-based tier creates, and the control that answers each one.' } },
            { id: 'l5', type: 'agent_analyst', config: { title: 'Usage Analyst', content: 'Answer from the data alone. Show the figure behind every finding and give each one a confidence level of high, medium or low.' } },
            { id: 'l6', type: 'agent_aggregator', config: { title: 'Combine Reports', content: 'Merge the three reports into one answer with no repetition. Where two reports disagree, say so and keep the better supported position.' } },
            { id: 'l7', type: 'output', config: { title: 'Decision Memo', formatSchema: 'Markdown', content: 'Deliver a decision memo: the recommendation in one sentence, three supporting points, the main risk, and the next step.' } }
        ],
        edges: [
            ['l1', 'out', 'l2', 'task'], ['l2', 'worker_a', 'l3', 'task'], ['l2', 'worker_b', 'l4', 'task'], ['l2', 'worker_c', 'l5', 'question'], ['l0', 'out', 'l5', 'data'],
            ['l3', 'result', 'l6', 'planner_out'], ['l4', 'result', 'l6', 'researcher_out'], ['l5', 'insights', 'l6', 'writer_out'], ['l6', 'merged', 'l2', 'reports'], ['l2', 'summary', 'l7', 'in']
        ]
    },
    debateJudge: {
        title: 'Team: Debate, judge and human approval', group: 'agents',
        about: 'Two agents argue opposite sides. A Judge decides, then a person approves or sends it back.',
        shape: 'Advocate + Devil\'s Advocate > Judge > Human Approval\nChanges requested > back to Advocate',
        nodes: [
            { id: 'd1', type: 'variable', config: { title: 'Proposal', varName: 'proposal', content: 'The idea to be tested', defaultValue: 'Replace our weekly status meeting with a written update.' } },
            { id: 'd2', type: 'agent_specialist', config: { title: 'Advocate', specialty: 'Making the strongest honest case in favour', content: 'Argue for {{proposal}}. Give your three best reasons, each with the evidence or scenario that makes it real.' } },
            { id: 'd3', type: 'agent_advocate', config: { title: 'Devil\'s Advocate', content: 'Argue against {{proposal}} as its strongest honest critic. Give your three best objections in order of seriousness. Do not offer solutions.' } },
            { id: 'd0', type: 'decision_framework', config: { title: 'Judging Criteria', content: 'Score each side on impact, cost, reversibility and risk. A reversible change needs less evidence than a permanent one.' } },
            { id: 'd4', type: 'agent_judge', config: { title: 'Judge', content: 'Weigh both positions on their merits, not on how confidently they are written. State the verdict in one sentence, then the two reasons that decided it and the strongest point on the losing side.' } },
            { id: 'd5', type: 'agent_human', config: { title: 'Owner Approval', question: 'Do you accept this verdict, or what should be reconsidered?', content: 'Stop and show the verdict to the user. Do not continue until they reply. Treat anything other than a clear yes as a request for changes.' } },
            { id: 'd6', type: 'output', config: { title: 'Decision Record', formatSchema: 'Markdown', content: 'Deliver a decision record: the proposal, the verdict, the deciding reasons, and the objection that still stands.' } }
        ],
        edges: [
            ['d1', 'out', 'd2', 'task'], ['d1', 'out', 'd3', 'proposal'], ['d2', 'result', 'd4', 'option_a'], ['d3', 'objections', 'd4', 'option_b'], ['d0', 'out', 'd4', 'criteria'],
            ['d4', 'verdict', 'd5', 'proposal'], ['d5', 'approved', 'd6', 'in'], ['d5', 'changes', 'd2', 'feedback']
        ]
    },
    routerTriage: {
        title: 'Team: Router triage', group: 'agents',
        about: 'One request, one agent. The Router picks who handles it, and Shared Notes keep the team consistent.',
        shape: 'Router > Planner | Researcher | Writer | Fallback\nPlanner > Shared Notes > Writer > Output',
        nodes: [
            { id: 'q1', type: 'user_input', config: { title: 'Incoming Request', inputName: 'request', prompt: 'What do you need?', content: 'Use this as the request to route.', defaultValue: 'Can you find out what our refund policy says about annual plans?' } },
            { id: 'q2', type: 'agent_router', config: { title: 'Request Router', content: 'Choose one agent by the intent of {{request}}. Multi-step work goes to the Planner, questions of fact go to the Researcher, and drafting goes to the Writer. If no agent fits, use the fallback.' } },
            { id: 'q3', type: 'agent_planner', config: { title: 'Planner', content: 'Decompose the request into ordered steps and name what is still unknown.' } },
            { id: 'q4', type: 'agent_researcher', config: { title: 'Researcher', content: 'Answer the question from the sources provided and cite each claim as [Doc-ID]. List anything you could not find under Gaps.' } },
            { id: 'q7', type: 'agent_memory', config: { title: 'Shared Notes', content: 'Keep a running record of decisions made, facts established and questions still open. Every agent reads these notes before starting and must not contradict them.' } },
            { id: 'q5', type: 'agent_writer', config: { title: 'Writer', content: 'Write the reply the user asked for. Use the plan and the findings when they exist, and never contradict the shared notes.' } },
            { id: 'q6', type: 'meta_clarify', config: { title: 'Fallback Question', maxQuestions: 1, content: 'If the request does not fit any agent, do not guess what was meant. Ask the user what outcome they want.' } },
            { id: 'q8', type: 'output', config: { title: 'Reply', formatSchema: 'Plain text', content: 'Reply in plain text, in under 150 words, and say which agent handled the request.' } }
        ],
        edges: [
            ['q1', 'out', 'q2', 'request'], ['q2', 'to_planner', 'q3', 'task'], ['q2', 'to_researcher', 'q4', 'task'], ['q2', 'to_writer', 'q5', 'task'], ['q2', 'fallback', 'q6', 'in'],
            ['q3', 'plan', 'q5', 'plan'], ['q4', 'findings', 'q5', 'context'], ['q3', 'outline', 'q7', 'write'], ['q4', 'evidence', 'q7', 'write'], ['q7', 'read', 'q5', 'notes'], ['q5', 'draft', 'q8', 'in']
        ]
    },
    panelVote: {
        title: 'Team: Expert panel vote', group: 'agents',
        about: 'Three specialists answer the same question separately. A vote keeps the best answer and records the disagreement.',
        shape: 'Question > Specialist A, B, C > Consensus Vote > Editor > Output',
        nodes: [
            { id: 'v1', type: 'variable', config: { title: 'Question', varName: 'question', content: 'The question the panel must answer', defaultValue: 'What is the single biggest risk in launching our mobile app in Germany?' } },
            { id: 'v2', type: 'agent_specialist', config: { title: 'Legal Expert', specialty: 'EU data protection and consumer law', content: 'Answer {{question}} from your specialism alone, in under 120 words. Do not hedge: name one risk and defend it.' } },
            { id: 'v3', type: 'agent_specialist', config: { title: 'Market Expert', specialty: 'European consumer app markets', content: 'Answer {{question}} from your specialism alone, in under 120 words. Do not hedge: name one risk and defend it.' } },
            { id: 'v4', type: 'agent_specialist', config: { title: 'Engineering Expert', specialty: 'Mobile infrastructure and localisation', content: 'Answer {{question}} from your specialism alone, in under 120 words. Do not hedge: name one risk and defend it.' } },
            { id: 'v5', type: 'agent_vote', config: { title: 'Panel Vote', content: 'Compare the three answers point by point and choose the one that best answers the question. Record what the other two got right.' } },
            { id: 'v6', type: 'agent_editor', config: { title: 'Editor', content: 'Tighten the winning answer. Do not add claims, remove facts or change the argument.' } },
            { id: 'v7', type: 'output', config: { title: 'Panel Answer', formatSchema: 'Markdown', content: 'Deliver the winning answer, then a section headed "Where the panel disagreed" with one line for each dissenting expert.' } }
        ],
        edges: [
            ['v1', 'out', 'v2', 'task'], ['v1', 'out', 'v3', 'task'], ['v1', 'out', 'v4', 'task'], ['v2', 'result', 'v5', 'candidate_a'], ['v3', 'result', 'v5', 'candidate_b'], ['v4', 'result', 'v5', 'candidate_c'],
            ['v5', 'winner', 'v6', 'draft'], ['v6', 'edited', 'v7', 'in'], ['v5', 'dissent', 'v7', 'in']
        ]
    }
};
// Team templates list wires as [from, fromPort, to, toPort]; expand them to the standard edge shape.
Object.entries(TEMPLATES).forEach(([key, t]) => {
    t.nodes.forEach(n => { n.x = n.x || 0; n.y = n.y || 0; });
    t.edges = t.edges.map((e, i) => Array.isArray(e) ? { id: `${key}_e${i + 1}`, from: e[0], fromPort: e[1], to: e[2], toPort: e[3] } : e);
});

window.PLBuilder = { engine: PromptEngine, templates: TEMPLATES };
})();
