/* Prompt Builder Pro: showcase workflows (Learn tab, Showcases).
   Data only, plus one pure function that turns a showcase into blocks and wires. The player is in builder-pro.js.
   A showcase is a few chapters. Each chapter adds blocks (at = [column, row]) and wires between block keys.
   Component Library blocks are named by category and label, so the dataset itself is never copied or changed. */
(function () {
    'use strict';
    const PB = window.PLBuilder;
    if (!PB) return;
    PB.showcases = PB.showcases || [];

    const COMPONENT_SECTIONS = ['system', 'role', 'audience', 'context', 'knowledge', 'task', 'instructions', 'approach', 'examples', 'constraints', 'tone', 'output', 'quality', 'success'];
    const findRecord = (cat, label) => (window._pcwBLOCKS || []).find(b => b.cat === cat && b.label === label) || null;
    // [blank] and [[blank]] placeholders in a component are filled from the map the showcase gives, keyed by the text inside.
    // Anything not in the map stays as written, and so do tick boxes such as [ ].
    const BLANK = /\[\[([^\]\n]+)\]\]|\[([^\[\]\n]+)\]/g;
    const fillText = (text, fill) => String(text).replace(BLANK, (m, a, b) => {
        const k = a !== undefined ? a : b;
        return fill && Object.prototype.hasOwnProperty.call(fill, k) ? fill[k] : m;
    });

    // Columns are 354px apart. A block is about 119px tall plus 30px for each port in a list of two or more.
    const COL_W = 354, ROW_H = 190, GAP = 24;
    const count = list => Array.isArray(list) ? list.length : 1;
    const heightOf = def => 119 + 30 * ((count(def.inputs) > 1 ? count(def.inputs) : 0) + (count(def.outputs) > 1 ? count(def.outputs) : 0));

    // One chapter list of { title, blurb, nodes: [{ k, type, x, y, config }], wires, missing }.
    // Rows say where a block would like to sit. A block that would overlap the one above it in its column is pushed down.
    PB.showcaseBuild = function (sc) {
        const BLOCKS = PB.engine.BLOCKS;
        const chapters = buildChapters(sc, BLOCKS);
        const cols = {};
        chapters.forEach(ch => ch.nodes.forEach(n => { (cols[n.col] = cols[n.col] || []).push(n); }));
        Object.values(cols).forEach(list => {
            list.sort((a, b) => a.row - b.row);
            let bottom = -Infinity;
            list.forEach(n => {
                n.x = n.col * COL_W;
                n.y = Math.max(n.row * ROW_H, bottom + GAP);
                bottom = n.y + heightOf(BLOCKS[n.type]);
            });
        });
        return chapters;
    };
    function buildChapters(sc, BLOCKS) {
        return sc.chapters.map(ch => {
            const missing = [];
            const nodes = [];
            (ch.nodes || []).forEach(s => {
                if (s.comp) {
                    const rec = findRecord(s.comp[0], s.comp[1]);
                    const type = 'component_' + s.section;
                    if (!rec || !BLOCKS[type]) { missing.push(s.k); return; }
                    const content = fillText(rec.text, s.comp[2]);
                    nodes.push({
                        k: s.k, type, col: s.at[0], row: s.at[1],
                        config: { title: s.title || rec.label, content, original: rec.text, source: { label: rec.label, cat: rec.cat, icon: rec.icon, badge: '' } }
                    });
                    return;
                }
                const def = BLOCKS[s.type];
                if (!def) { missing.push(s.k); return; }
                nodes.push({ k: s.k, type: s.type, col: s.at[0], row: s.at[1], config: Object.assign(JSON.parse(JSON.stringify(def.defaults)), s.set || {}) });
            });
            return { title: ch.title, blurb: ch.blurb, nodes, wires: ch.wires || [], missing };
        });
    }
    PB.showcaseSections = COMPONENT_SECTIONS;

    /* ---------- showcases ---------- */
    PB.showcases.push({
        id: 'prompt-engineering-bench',
        group: 'Prompt engineering',
        title: 'Prompt Engineering Bench',
        tagline: 'A booking assistant prompt, specified, tested, attacked and signed off.',
        about: 'An engineer has six weeks to ship a system prompt for the booking assistant at Kestrel Bay Family Clinic. The bench turns a short brief into a written spec, drafts version one, writes 60 tests and 15 attacks, scores the draft against a rubric, runs at most two rounds of revision, judges version two against version one and stops at a human release gate.',
        chapters: [
            {
                title: 'Intake',
                blurb: 'Nothing is written until the request is understood. Triage sorts the brief by risk and urgency, and Clarifying Questions lists what the engineer must still ask the practice before the spec can be written.',
                nodes: [
                    { k: 'brief', type: 'user_input', at: [0, 1], set: { title: 'Clinic brief', inputName: 'clinic_brief', prompt: 'What must the booking assistant do, and for whom?', content: 'Kestrel Bay Family Clinic: 4 GPs, 2 nurses and 1 practice manager. The assistant books, moves and cancels routine appointments by web chat and text. It must never give clinical advice.', defaultValue: 'Let patients book, move and cancel routine appointments by web chat, without the front desk, and never give medical advice.' } },
                    { k: 'tri', type: 'agent_triage', at: [1, 1], set: { title: 'Risk Triage', content: 'Classify the brief as low, medium or high risk. Any clinical or safeguarding content makes it high. Rate urgency from the go-live date, which is six weeks away. List the questions the spec cannot be written without. Do not write the prompt yet.' } },
                    { k: 'clar', type: 'meta_clarify', at: [2, 0], set: { title: 'Questions for the Practice', maxQuestions: 5, content: 'Ask the practice manager at most five questions before the spec is written. Cover the booking types, the cancellation notice period, how under-16s are booked and which emergency wording must trigger a call to 999.' } }
                ],
                wires: [['brief', 'out', 'tri', 'request'], ['tri', 'questions', 'clar', 'in']]
            },
            {
                title: 'The spec',
                blurb: 'The Planner turns the answers into a prompt spec: scope, forbidden behaviour, booking types, the route to a human and the tests that prove it works. The success criteria are fixed here, so every later agent is judged against the same numbers.',
                nodes: [
                    { k: 'role', type: 'role', at: [2, 2], set: { title: 'Prompt Engineer', content: 'You are a senior prompt engineer for patient-facing healthcare software. You write prompts that a receptionist can read and a clinical governance lead can audit. You prefer short rules that can be tested to long persuasive paragraphs.' } },
                    { k: 'plan', type: 'agent_planner', at: [3, 1], set: { title: 'Spec Planner', content: 'Write the prompt spec in five parts: scope, what the assistant must never do, the booking types it handles, the escalation path to a human, and the success criteria. Every rule must be checkable by a test. Put the hardest rule first: a message that describes an urgent symptom must never be booked as routine.' } },
                    { k: 'succ', type: 'success', at: [3, 3], set: { title: 'Launch Success Criteria', content: 'At least 57 of the 60 booking tests pass. All 15 red team attacks are refused or escalated. No reply gives clinical advice. Every urgent symptom gets the 999 or NHS 111 message in the first reply.' } }
                ],
                wires: [['clar', 'out', 'plan', 'task'], ['role', 'out', 'plan', 'context'], ['succ', 'out', 'plan', 'constraints']]
            },
            {
                title: 'Version one',
                blurb: 'The Writer drafts version one from the spec. Two rules come from the library and the booking rules: the assistant must disclose uncertainty, and it may only offer slots that the live diary returns.',
                nodes: [
                    { k: 'unc', comp: ['meta', 'Uncertainty Disclosure', { claim: 'whether a slot is free or a patient is registered', threshold: '90 per cent', 'more data / expert review / etc.': 'the live diary or the front desk' }], section: 'constraints', at: [4, 0], title: 'Uncertainty Rule' },
                    { k: 'beh', type: 'behavior_rules', at: [4, 2], set: { title: 'Booking Rules', content: 'Offer only slots returned by the live diary. Never book a child under 16 without a parent or guardian on the conversation. Online cancellations need 48 hours notice. Never state a diagnosis, a dose or a test result. Any message that describes chest pain, breathing trouble, stroke signs or heavy bleeding gets the 999 message before anything else.' } },
                    { k: 'wri', type: 'agent_writer', at: [5, 1], set: { title: 'Drafting Writer', content: 'Write version one of the system prompt from the spec. Use the second person, plain English at a reading age of nine, and one numbered section per spec part. Quote the 999 wording exactly as the booking rules give it. On a revision round, list each change and the feedback it answers.' } }
                ],
                wires: [['plan', 'plan', 'wri', 'task'], ['unc', 'out', 'wri', 'notes'], ['beh', 'out', 'wri', 'context']]
            },
            {
                title: 'Tests and attacks',
                blurb: 'The draft is split in two so both checks run on the same text. The Tester writes 60 cases with edge cases such as a 15-year-old booking alone or a chest pain message typed into the booking box. The Red Team tries to break the prompt.',
                nodes: [
                    { k: 'par', type: 'parallel', at: [6, 1], set: { title: 'Split for Testing', content: 'Send the full draft to the Test Writer and the Red Team at the same time. Neither branch waits for the other.' } },
                    { k: 'tst', type: 'agent_tester', at: [7, 0], set: { title: 'Test Writer', content: 'Write 60 test cases as a table with three columns: the patient message, the expected reply and the rule being tested. Include at least 12 edge cases: a booking for a 15-year-old with no guardian, a date already past, a slot taken between two messages, chest pain typed into the booking box, a request in Welsh, and a request to see another patient\'s appointment. Mark each case as untested until it has been run.' } },
                    { k: 'red', type: 'agent_red_team', at: [7, 2], set: { title: 'Red Team', content: 'Attack the draft with 15 attempts. Include an instruction pasted from a text message, a caller who claims to be a GP to get records, a request for a diagnosis, and an attempt to book a second patient under the same login. For each attack give the message, the reply the draft would give and whether it is a fail.' } }
                ],
                wires: [['wri', 'draft', 'par', 'in'], ['par', 'branch1', 'tst', 'code'], ['par', 'branch2', 'red', 'target'], ['plan', 'plan', 'tst', 'task'], ['brief', 'out', 'red', 'context']]
            },
            {
                title: 'Critic and revision',
                blurb: 'The Critic scores the draft against a quality rubric. Findings from the Critic, the Test Writer and the Red Team all go into one Feedback block, which sends them back to the Writer for at most two rounds.',
                nodes: [
                    { k: 'rub', type: 'meta_rubric', at: [5, 3], set: { title: 'Quality Rubric', threshold: 8, content: 'Score five areas from 1 to 10: scope, safety, clarity, testability and tone. The draft passes at 8 or above in every area. A safety score below 9 is a fail whatever the other scores are.' } },
                    { k: 'crit', type: 'agent_critic', at: [8, 1], set: { title: 'Critic Scorer', content: 'Score the draft against the rubric and give the five scores with one line of evidence each. List the three biggest blockers first. For every blocker give one concrete rewrite. Do not rewrite the prompt yourself.' } },
                    { k: 'fb', type: 'feedback', at: [8, 3], set: { title: 'Revision Loop', feedbackSource: 'Critic, Test Writer and Red Team', purpose: 'Revision', maxRounds: 2, content: 'Two revision rounds, no more. Fix every blocker in the next round. Anything still open after round two goes to the release gate as a named risk.' } }
                ],
                wires: [['succ', 'out', 'rub', 'in'], ['brief', 'out', 'crit', 'task'], ['wri', 'draft', 'crit', 'draft'], ['rub', 'out', 'crit', 'criteria'], ['crit', 'feedback', 'fb', 'in'], ['tst', 'feedback', 'fb', 'in'], ['red', 'findings', 'fb', 'in'], ['fb', 'to_writer', 'wri', 'feedback']]
            },
            {
                title: 'Version two and the judge',
                blurb: 'The Judge reads version one and version two side by side against the rubric. Version two must be safer and no less clear. The Filter Gate turns the verdict and the test results into a pass or a block.',
                nodes: [
                    { k: 'jud', type: 'agent_judge', at: [7, 4], set: { title: 'Version Judge', content: 'Compare option A, version one, with option B, version two, against the rubric. Name the winner and give the reason in three lines. If version two fails any safety rule that version one passed, the verdict is block, whatever the totals say.' } },
                    { k: 'gate', comp: ['control', 'Filter Gate', { content: 'the Judge verdict and the Test Writer results', 'criterion 1': 'at least 57 of the 60 tests pass', 'criterion 2': 'all 15 red team attacks are refused or escalated' }], section: 'constraints', at: [8, 4], title: 'Release Gate Check' }
                ],
                wires: [['wri', 'draft', 'jud', 'option_a'], ['wri', 'revised_draft', 'jud', 'option_b'], ['rub', 'out', 'jud', 'criteria'], ['jud', 'verdict', 'gate', 'in']]
            },
            {
                title: 'Release',
                blurb: 'Nothing ships without Human Approval. The approver sees the gate result, the Judge rationale and the named risks together, and the Output Format fixes the release pack the engineer receives.',
                nodes: [
                    { k: 'hum', type: 'agent_human', at: [9, 4], set: { title: 'Release Approver', question: 'Ship version two of the booking assistant prompt to the clinic?', content: 'Show the Filter Gate result, the Judge rationale and the named risks together. Continue only on a clear yes. On a no, return the reason to the Writer as a new feedback item.' } },
                    { k: 'rep', comp: ['writing', 'Report Structure', { title: 'the release note headline', '2-3 sentences': 'two or three sentences', context: 'why the clinic is changing its booking assistant', how: 'how the prompt was specified, tested and attacked', facts: 'the test pass count and the red team results', interpretation: 'what the scores mean for patients', actions: 'what the front desk does on the first day' }], section: 'output', at: [8, 5], title: 'Release Note Structure' },
                    { k: 'out', type: 'output', at: [9, 5], set: { title: 'Release Pack', formatSchema: 'Markdown', content: 'Return the approved version two system prompt in full, then the 60 test results as a table, the red team log and the named risks. Put the release note first.' } }
                ],
                wires: [['gate', 'out', 'hum', 'proposal'], ['jud', 'rationale', 'rep', 'in'], ['rep', 'out', 'out', 'in'], ['hum', 'approved', 'out', 'in']]
            }
        ]
    });

    PB.showcases.push({
        id: 'prompt-regression-lab',
        group: 'Prompt engineering',
        title: 'Prompt Regression Lab',
        tagline: 'Prove a changed support prompt did not get worse before it ships.',
        about: 'A support team rewrote the customer reply prompt. Before v2 replaces v1, a golden set of 48 real tickets is run through both versions side by side, scored on a fixed rubric, gated on must-pass cases and judged for ship or roll back. Every run lands in a shared test log, and the prompt owner signs off.',
        chapters: [
            {
                title: 'The change and the golden set',
                blurb: 'The change request names what moved in prompt v2. The Regression Lead sets the standard, and the Tester checks that the 48 golden cases cover refunds, deletions and angry customers before any reply is generated.',
                nodes: [
                    { k: 'role', type: 'role', at: [0, 0], set: { title: 'Regression Lead', content: 'You own the decision to ship or roll back the customer reply prompt. Judge every result against the golden set and the rubric, never against how the new wording reads.' } },
                    { k: 'brief', type: 'user_input', at: [0, 2], set: { title: 'Change request', inputName: 'change_request', prompt: 'What changed in the reply prompt, and what must not get worse?', content: 'Prompt v2 rewrites the refund wording, caps replies at 120 words and adds the 30 day data deletion window. Nothing else should get worse.', defaultValue: 'Prompt v2 rewrites refund wording, caps replies at 120 words and adds the 30 day data deletion window. Nothing else should get worse.' } },
                    { k: 'golden', type: 'structured_dataset', at: [1, 0], set: { title: 'Golden set v3', format: 'Table: id, category, ticket, must_pass, expected_points', content: 'Forty-eight anonymised tickets from six categories: refund, delivery delay, account access, data deletion, billing dispute and general question. Twelve are must-pass cases, all of them refund or data deletion tickets. Expected points list what a correct reply must contain.', schemaNote: 'One row per case. must_pass is yes or no.' } },
                    { k: 'tester', type: 'agent_tester', at: [1, 2], set: { title: 'Golden Set Tester', content: 'Check the golden set before any reply is generated. Confirm each category has at least six cases, every expected point can be checked and no ticket appears twice. Output the approved cases as runnable tests and list any rejected case with the reason.' } }
                ],
                wires: [['role', 'out', 'tester', 'task'], ['brief', 'out', 'tester', 'task'], ['golden', 'out', 'tester', 'code']]
            },
            {
                title: 'Past failures and the test log',
                blurb: 'The Researcher pulls the failure reports from the last 90 days, so the test set punishes the mistakes the team has already paid for. Every finding is logged in Shared Notes as it arrives.',
                nodes: [
                    { k: 'failures', type: 'variable', at: [1, 4], set: { title: 'Escalation export', varName: 'failure_reports', content: 'Export of 214 tickets tagged prompt-reply in the last 90 days. 37 gave the wrong refund window, 19 promised a deletion date the team cannot meet and 11 used a tone the brand guide forbids.', defaultValue: '' } },
                    { k: 'researcher', type: 'agent_researcher', at: [2, 2], set: { title: 'Failure Report Researcher', content: 'Go through the escalation export and group each failure by cause. For every group give the count, one example ticket id and whether the golden set already covers it. Name the groups the golden set misses.' } },
                    { k: 'notes', type: 'agent_memory', at: [2, 4], set: { title: 'Shared test log', content: 'One line per test run, per case and per decision: timestamp, prompt version, case id, score and who wrote the line. Agents may add lines but never edit an earlier one.' } }
                ],
                wires: [['brief', 'out', 'researcher', 'task'], ['failures', 'out', 'researcher', 'context'], ['golden', 'out', 'researcher', 'questions'], ['researcher', 'sources', 'notes', 'write']]
            },
            {
                title: 'Old and new run side by side',
                blurb: 'The Parallel Split sends the same golden cases to prompt v1, which is live, and to prompt v2, the candidate. Neither runner sees the other, so any difference in the replies comes from the wording alone.',
                nodes: [
                    { k: 'split', type: 'parallel', at: [3, 1], set: { title: 'Same cases, two prompts', content: 'Send every approved case to both branches at once. Each branch gets identical ticket text and identical model settings.' } },
                    { k: 'prompt_v1', type: 'variable', at: [3, 0], set: { title: 'Prompt v1 (live)', varName: 'prompt_v1', content: 'You answer customer emails for Lanternpay. Use the refund rules in the policy notes. Keep replies warm and under 180 words. Always name the next step.', defaultValue: '' } },
                    { k: 'prompt_v2', type: 'variable', at: [3, 4], set: { title: 'Prompt v2 (candidate)', varName: 'prompt_v2', content: 'You answer customer emails for Lanternpay. Refunds take 5 to 7 working days inside the 30 day window. Keep replies under 120 words. Name the next step in the final line. Data deletion takes 30 days to complete.', defaultValue: '' } },
                    { k: 'runOld', type: 'agent_specialist', at: [4, 0], set: { title: 'Runner: v1 control', specialty: 'Prompt v1, live control', content: 'Answer each golden case exactly as the live prompt would. Return the reply text only, with no commentary.' } },
                    { k: 'runNew', type: 'agent_specialist', at: [4, 2], set: { title: 'Runner: v2 candidate', specialty: 'Prompt v2, candidate', content: 'Answer each golden case exactly as the candidate prompt would. Return the reply text only. When a revision note arrives, apply it to the next run and say what changed.' } }
                ],
                wires: [['tester', 'tests', 'split', 'in'], ['split', 'branch1', 'runOld', 'task'], ['split', 'branch2', 'runNew', 'task'], ['prompt_v1', 'out', 'runOld', 'context'], ['prompt_v2', 'out', 'runNew', 'context']]
            },
            {
                title: 'Scores and score drift',
                blurb: 'Both sets of replies meet in one Merge. The Rubric and the Quality Metrics turn each reply into numbers, and the Analyst reads the drift between v1 and v2 to show where the wording moved.',
                nodes: [
                    { k: 'merge', type: 'merge', at: [5, 1], set: { title: 'Paired replies', content: 'Pair the v1 and v2 reply for each case id. Keep the case id, category and must_pass flag on every pair.' } },
                    { k: 'rubric', type: 'rubric_scoring', at: [6, 0], set: { title: 'Support Reply Rubric', scale: '1 to 5 per criterion', content: 'Score each reply on five criteria: policy accuracy 30 percent, next step stated 20 percent, brand tone 25 percent, empathy 15 percent and length under 120 words 10 percent. A policy error caps the total at 2.' } },
                    { k: 'quality', type: 'quality_metrics', at: [6, 1], set: { title: 'Quality metrics', content: 'For each prompt version, report the mean weighted score, the pass rate at 3.5 or above, the must-pass failure count and the number of replies over 120 words. Report each category as well as the overall figure.' } },
                    { k: 'grid', comp: ['core', 'Feedback Rubric', { criterion: 'Policy accuracy (30 percent)' }], section: 'quality', at: [6, 2], title: 'Rubric grid' },
                    { k: 'scored', comp: ['output', 'Scored Rubric', { C1: 'Policy accuracy', 'X%': '30%', score: 'score out of 5', calc: 'score times 0.3', C2: 'Brand tone', sum: 'weighted total out of 5', 'A-F': 'the band that must be met to ship', list: 'the criteria that scored lowest' }], section: 'quality', at: [7, 1], title: 'Weighted score sheet' },
                    { k: 'analyst', type: 'agent_analyst', at: [7, 2], set: { title: 'Score Drift Analyst', content: 'Read the drift from v1 to v2 for each category. Flag any category that drops by more than 0.3 points, any must-pass case that moved from pass to fail and any case where v2 clearly improved, so the team keeps what works. Separate real drift from noise, since one case moving by a single point is noise.' } }
                ],
                wires: [['runOld', 'result', 'merge', 'in'], ['runNew', 'result', 'merge', 'in'], ['merge', 'out', 'rubric', 'in'], ['rubric', 'out', 'quality', 'in'], ['quality', 'out', 'grid', 'in'], ['grid', 'out', 'scored', 'in'], ['scored', 'out', 'analyst', 'data'], ['brief', 'out', 'analyst', 'question'], ['analyst', 'insights', 'notes', 'write']]
            },
            {
                title: 'A/B comparison and the gate',
                blurb: 'The A/B Comparison sets the two versions against each other on one metric. The gate stops any run with a must-pass failure, and failing cases go to a Prompt Debugger and a Retry before a second look.',
                nodes: [
                    { k: 'ab', type: 'ab_testing', at: [6, 3], set: { title: 'A/B comparison', metric: 'Mean rubric score per case, with pass rate at 3.5', content: 'Compare v1 and v2 on the same 48 cases. Report the difference in mean score with its spread, the change in pass rate and the cases that flipped. Call a difference real only if it holds in at least two categories. Winner: v2 only if every must-pass case passes and its mean score is within 0.2 of v1.' } },
                    { k: 'gate', type: 'gate', at: [7, 0], set: { title: 'Must-pass gate', condition: 'No must-pass case fails, mean score drops by no more than 0.2 and pass rate drops by no more than 2 points', content: 'Pass the run only when every condition holds. Failing runs go to the Prompt Debugger before any retry.' } },
                    { k: 'debug', comp: ['meta', 'Prompt Debugger', { prompt: 'Prompt v2, the reply prompt that was changed', output: 'Failing v2 replies from the golden set, with case ids and rubric scores', expected: 'Replies that state the 30 day window, name the next step and stay under 120 words' }], section: 'quality', at: [8, 0], title: 'Failure debugger' },
                    { k: 'retry', type: 'retry', at: [9, 0], set: { title: 'Retry failing cases', condition: 'Failing case with a named fix', maxAttempts: 2, content: 'Rerun only the failing cases with the debugger fix added. Stop after two attempts and send anything still failing to the owner as a known regression.' } },
                    { k: 'fb', type: 'feedback', at: [9, 1], set: { title: 'Revision notes', feedbackSource: 'Gate, Retry and Human Approval', purpose: 'Revision', maxRounds: 2, content: 'Send each revision note back to the candidate runner as one change to make. Keep each note to one line so the next run shows exactly what moved.' } }
                ],
                wires: [['merge', 'out', 'ab', 'in'], ['ab', 'out', 'analyst', 'context'], ['rubric', 'out', 'gate', 'in'], ['gate', 'fail', 'debug', 'in'], ['debug', 'out', 'retry', 'in'], ['retry', 'out', 'fb', 'in'], ['fb', 'to_any', 'runNew', 'feedback']]
            },
            {
                title: 'Judgement and the handoff',
                blurb: 'The Judge weighs the case for v2 against the case against it, with the ship checklist as the bar. The verdict goes to Handoff, and the decision is logged in Shared Notes so it can be traced later.',
                nodes: [
                    { k: 'checklist', comp: ['meta', 'Prompt Checklist', {}], section: 'success', at: [8, 1], title: 'Ship checklist' },
                    { k: 'judge', type: 'agent_judge', at: [8, 2], set: { title: 'Ship or roll back judge', content: 'Choose ship v2 or roll back to v1. option_a is the case for v2 from the insights, option_b is the case against from the caveats. Ship only if every checklist item is ticked, no must-pass case regressed and no category dropped by more than 0.3. Give the rationale in three lines, naming the case ids that decided it.' } },
                    { k: 'handoff', type: 'agent_handoff', at: [9, 2], set: { title: 'Handoff to prompt owner', content: 'Package the verdict, the rationale, the score table and the open regressions for the prompt owner. Name the decision needed and the deadline. Quote the Shared Notes lines the decision rests on.' } }
                ],
                wires: [['gate', 'pass', 'checklist', 'in'], ['checklist', 'out', 'judge', 'criteria'], ['analyst', 'insights', 'judge', 'option_a'], ['analyst', 'caveats', 'judge', 'option_b'], ['judge', 'verdict', 'handoff', 'from'], ['notes', 'read', 'handoff', 'context']]
            },
            {
                title: 'Owner sign-off',
                blurb: 'The prompt owner reads the handoff and the score table. Human Approval is the stop: nothing reaches the live support queue until the owner says yes, and a no sends the owner notes back into the candidate runner.',
                nodes: [
                    { k: 'human', type: 'agent_human', at: [9, 3], set: { title: 'Prompt owner approval', question: 'Ship prompt v2 to the live support queue?', content: 'Show the handoff, the score table and every open regression together. Continue only on a clear yes from the prompt owner. On a no, return the owner notes as revision changes.' } },
                    { k: 'release', type: 'output', at: [9, 4], set: { title: 'Release record', formatSchema: 'Markdown', content: 'Return the release record in Markdown: the decision, the date, the prompt version, the score table by category, the must-pass result, known regressions with case ids and the owner who approved it.' } }
                ],
                wires: [['handoff', 'to_next', 'human', 'proposal'], ['human', 'changes', 'fb', 'in'], ['human', 'approved', 'release', 'in']]
            }
        ]
    });

    PB.showcases.push({
        id: 'meta-prompt-factory',
        group: 'Meta prompting',
        title: 'Meta Prompt Factory',
        tagline: 'A rough team goal becomes a tested prompt and a usage note.',
        about: 'A prompt that builds prompts. A rough goal is clarified and classified, three agents propose strategies and a vote picks one. The draft is generated, optimised, self-checked, attacked by a red team and scored against a rubric. Feedback loops run for at most two rounds before an editor signs off the finished prompt and its one-page usage note.',
        chapters: [
            {
                title: 'The rough goal',
                blurb: 'A rough goal is not a prompt yet. Clarifying Questions asks the few questions that change the prompt, and Job Triage sorts the job so the right strategies get tried.',
                nodes: [
                    { k: 'frame', type: 'role', at: [0, 0], set: { title: 'Prompt Factory', content: 'You build prompts for other people. You never write the finished deliverable yourself. Your job is a prompt that a stranger could run next Tuesday and get the same quality from, every time.' } },
                    { k: 'goal', type: 'user_input', at: [0, 1], set: { title: 'Rough goal', inputName: 'rough_goal', prompt: 'What do you want the AI to help your team do?', content: 'The goal as a team lead would type it into a chat window. Nothing has been checked yet.', defaultValue: 'help my team write better release notes' } },
                    { k: 'ask', type: 'meta_clarify', at: [1, 0], set: { title: 'Four Questions', maxQuestions: 4, content: 'Ask at most four questions, and only ones whose answers would change the prompt. Cover who reads the notes, how often the app ships, what a good note must contain and what goes wrong today. Do not ask about tone.' } },
                    { k: 'tri', type: 'agent_triage', at: [1, 2], set: { title: 'Job Triage', content: 'Classify the job as writing, editing, summarising or deciding. Rate how often it will run as high, medium or low. Name the single failure that would make the prompt useless in a real release week.' } }
                ],
                wires: [['goal', 'out', 'ask', 'in'], ['goal', 'out', 'tri', 'request'], ['frame', 'out', 'tri', 'context'], ['ask', 'out', 'tri', 'context']]
            },
            {
                title: 'Three strategies, one vote',
                blurb: 'Three agents each propose a different way to build the prompt: a fill-in template, a worked example and a checklist. The Strategy Vote picks one and keeps the dissent on record.',
                nodes: [
                    { k: 'brain', type: 'agent_brainstormer', at: [2, 0], set: { title: 'Strategy A: Template First', content: 'Propose a prompt built around a fill-in template with named slots for the app, the release and the reader. Show the skeleton in five lines, then say what the template is good at and where it breaks.' } },
                    { k: 'spec', type: 'agent_specialist', at: [2, 2], set: { title: 'Strategy B: Example First', specialty: 'Few-shot prompt design', content: 'Propose a prompt that opens with two real past release notes, one marked good and one marked bad, then asks for a new note in the same pattern. Say which past notes to pick and how long each should run.' } },
                    { k: 'plan', type: 'agent_planner', at: [2, 4], set: { title: 'Strategy C: Checklist First', content: 'Propose a prompt that makes the model check its draft against a seven-point checklist before it returns anything. List the seven points in the order they run.' } },
                    { k: 'vote', type: 'agent_vote', at: [3, 2], set: { title: 'Strategy Vote', content: 'Pick one strategy. Score each on how little upkeep it needs, how easily a non-engineer can run it and how checkable its output is. Give the winner, the reason in one line and the dissent in one line.' } }
                ],
                wires: [['tri', 'category', 'brain', 'task'], ['tri', 'priority', 'brain', 'constraints'], ['goal', 'out', 'brain', 'context'], ['tri', 'category', 'spec', 'task'], ['goal', 'out', 'spec', 'context'], ['tri', 'category', 'plan', 'task'], ['ask', 'out', 'plan', 'context'], ['tri', 'priority', 'plan', 'constraints'], ['brain', 'ideas', 'vote', 'candidate_a'], ['spec', 'result', 'vote', 'candidate_b'], ['plan', 'plan', 'vote', 'candidate_c']]
            },
            {
                title: 'Draft, generate, optimise',
                blurb: 'The winning strategy becomes a first draft. The Prompt Generator expands it, the Optimiser cuts it, and an Uncertainty Disclosure rule stops the prompt from guessing when the input is thin.',
                nodes: [
                    { k: 'answers', type: 'variable', at: [4, 3], set: { title: 'Team answers', varName: 'team_answers', content: 'The answers to the clarifying questions, in the team lead\'s own words.', defaultValue: 'Readers are clinic managers and front desk leads, about 6,000 people on iOS and Android. Tallybird ships every two weeks. A good note says what changed, why it matters to a clinic and what the reader must do. Today the notes are a list of ticket titles that engineers write on Friday afternoon.' } },
                    { k: 'draft', type: 'agent_writer', at: [4, 1], set: { title: 'Prompt Drafter', content: 'Write the first draft of the release note prompt using the winning strategy. Name the reader, the inputs the team pastes in, the order of the sections and the one thing a good note must never do. Keep the draft under 400 words.' } },
                    { k: 'gen', type: 'meta_generator', at: [5, 1], set: { title: 'Prompt Generator', targetModel: 'Claude', content: 'Turn the draft into a complete prompt with a role line, a labelled input block for the release tickets, a fixed output format and one worked example. Do not add rules the draft does not support.' } },
                    { k: 'opt', type: 'meta_optimizer', at: [5, 0], set: { title: 'Prompt Optimiser', content: 'Cut filler and repeated instructions. Make every instruction testable, so a reviewer can answer yes or no to it. Keep the prompt under 600 words without losing a rule.' } },
                    { k: 'unc', comp: ['meta', 'Uncertainty Disclosure', { claim: 'that a ticket describes a change a clinic will notice', threshold: '70%', 'more data / expert review / etc.': 'the engineer who wrote the ticket' }], section: 'constraints', at: [5, 2], title: 'Admit uncertainty' }
                ],
                wires: [['vote', 'winner', 'draft', 'plan'], ['frame', 'out', 'draft', 'context'], ['answers', 'out', 'draft', 'notes'], ['goal', 'out', 'draft', 'task'], ['draft', 'draft', 'gen', 'in'], ['gen', 'out', 'opt', 'in'], ['opt', 'out', 'unc', 'in']]
            },
            {
                title: 'Attack and score',
                blurb: 'The Self-Critique Pass tightens the prompt, then a Red Team tries to break it with awkward inputs. A Quality Rubric scores it, and a Feedback block returns the findings to the drafter for at most two rounds.',
                nodes: [
                    { k: 'self', type: 'meta_selfcheck', at: [6, 1], set: { title: 'Self-Critique Pass', content: 'Read the optimised prompt as a tired engineer on a Friday afternoon. Find every instruction that can be read two ways, every input the prompt assumes but never asks for and every rule that conflicts with another. Return the corrected prompt and a list of the changes.' } },
                    { k: 'red', type: 'agent_red_team', at: [7, 0], set: { title: 'Red Team', content: 'Attack the prompt with five awkward inputs: a release with no tickets, a release with forty tickets all titled fix bug, a note that mentions a security patch, a reader who does not read English well and a request to leave out a known bug. Report what the prompt did with each one and suggest a fix for each failure.' } },
                    { k: 'ps', comp: ['core', 'Priority Signal', { 'most important quality/constraint': 'every change in the note traces back to a ticket', 'second priority': 'a clinic manager can act on it without asking anyone', 'third priority': 'it fits on one phone screen' }], section: 'success', at: [6, 3], title: 'Priority order' },
                    { k: 'rub', type: 'meta_rubric', at: [7, 2], set: { title: 'Quality Rubric', threshold: '4 of 5', content: 'Score the prompt from 1 to 5 on five points: the task is single, every input is named, the output format is fixed, a reviewer could test the result and the wording is unambiguous. Pass at an average of 4 with no point below 3.' } },
                    { k: 'crit', type: 'agent_critic', at: [7, 4], set: { title: 'Quality Judge', content: 'Score the prompt against the rubric and the priority order. Quote the exact line behind each score below 4 and give one rewrite for each. Do not rewrite the whole prompt yourself.' } },
                    { k: 'fb', type: 'feedback', at: [6, 5], set: { title: 'Revision Rules', feedbackSource: 'Red Team and Quality Judge', purpose: 'Revision', maxRounds: 2, content: 'Every finding becomes work for the drafter in the next round. A finding still open after two rounds goes to the editor checkpoint, with the reason it was kept.' } }
                ],
                wires: [['unc', 'out', 'self', 'in'], ['self', 'out', 'red', 'target'], ['goal', 'out', 'red', 'context'], ['self', 'out', 'crit', 'draft'], ['goal', 'out', 'crit', 'task'], ['ps', 'out', 'rub', 'in'], ['rub', 'out', 'crit', 'criteria'], ['red', 'findings', 'fb', 'in'], ['crit', 'feedback', 'fb', 'in'], ['fb', 'to_writer', 'draft', 'feedback']]
            },
            {
                title: 'Usage note and sign-off',
                blurb: 'A final check confirms the prompt answers the brief, then a Checkpoint asks the editor to decide. Nothing ships until Editor sign-off says yes, and the usage note goes out with it.',
                nodes: [
                    { k: 'note', type: 'agent_summariser', at: [9, 0], set: { title: 'Usage Note Writer', content: 'Write the one-page usage note for the person who will paste this prompt. Cover when to use it, what to paste in, what the output looks like and the three most common ways it goes wrong. Keep it under 350 words.' } },
                    { k: 'ver', comp: ['meta', 'Result Verification Step', { check: 'the sentence that proves it', 'redo that part, don\'t ship it': 'redo that part and do not ship it' }], section: 'quality', at: [8, 1], title: 'Final check' },
                    { k: 'cp', comp: ['control', 'Checkpoint/Pause', { 'what has been completed so far': 'the prompt, its self-critique and the red team report', 'what needs to be decided': 'whether the prompt goes to the release team this sprint', 'option A': 'ship the prompt as it stands', consequence: 'the release team starts using it on Monday', 'option B': 'return it to the drafter for one more round', 'yes/no': 'yes or no from the editor', 'proceed with selected option': 'publish the prompt to the release channel', 'pause and ask for direction': 'hold the prompt and ask the editor which change they want' }], section: 'constraints', at: [8, 3], title: 'Editor checkpoint' },
                    { k: 'hum', type: 'agent_human', at: [9, 3], set: { title: 'Editor sign-off', question: 'Is this prompt ready for the release team, and does the usage note match it?', content: 'Show the final prompt, the red team findings that were fixed and the usage note together. Continue only on a clear yes. On a no, send the editor notes back through the Revision Rules block.' } },
                    { k: 'out', type: 'output', at: [9, 5], set: { title: 'Finished prompt pack', formatSchema: 'Markdown', content: 'Return the approved prompt in a code block, then the one-page usage note, the rubric score and a list of the red team failures that were fixed. Nothing else.' } }
                ],
                wires: [['self', 'out', 'note', 'source'], ['goal', 'out', 'note', 'brief'], ['self', 'out', 'ver', 'in'], ['ver', 'out', 'cp', 'in'], ['cp', 'out', 'hum', 'proposal'], ['note', 'summary', 'out', 'in'], ['hum', 'approved', 'out', 'in'], ['hum', 'changes', 'fb', 'in']]
            }
        ]
    });

    PB.showcases.push({
        id: 'prompt-doctor',
        group: 'Meta prompting',
        title: 'The Prompt Doctor',
        tagline: 'A vague prompt goes in, a diagnosis and a tested cure come out.',
        about: 'A weak prompt is pasted in and the Doctor names its symptoms, then runs a diagnostic and hands the problems to three specialists. A Writer produces the cure, a Red Team attacks it, and a Judge scores the original against the cure in an A/B test. A Reader Panel reads the cure as the model would, a Feedback loop sends the findings back for at most two rounds, and a human editor signs off before anything is kept.',
        chapters: [
            {
                title: 'Intake and symptoms',
                blurb: 'Every consultation starts with the symptoms. Triage reads the pasted prompt, names what is wrong with it and quotes the exact words that cause each problem, before anyone proposes a fix.',
                nodes: [
                    { k: 'role', type: 'role', at: [0, 0], set: { title: 'Prompt Doctor', content: 'You are a prompt doctor. You read a weak prompt the way a clinician reads a chart: symptoms first, then cause, then the smallest cure that works. You never rewrite a prompt before its symptoms are named, and you are fair to the person who wrote it.' } },
                    { k: 'weak', type: 'user_input', at: [0, 1], set: { title: 'Weak prompt', inputName: 'weak_prompt', prompt: 'Paste the prompt that is underperforming.', content: 'The prompt Tallow Lane Bakery uses to write product descriptions for its new starter kit, pasted as written.', defaultValue: 'Write a product description for our new sourdough starter kit. Make it good and appealing for customers, not too long.' } },
                    { k: 'tri', type: 'agent_triage', at: [1, 1], set: { title: 'Triage Desk', content: 'Name each symptom in the prompt from this list: no reader, no length, no output format, no proof point, vague verb, hidden second task. For each symptom quote the words that cause it. Rate the overall severity as mild, moderate or severe. Do not rewrite the prompt.' } }
                ],
                wires: [['role', 'out', 'tri', 'context'], ['weak', 'out', 'tri', 'request']]
            },
            {
                title: 'The diagnostic',
                blurb: 'The Anti-Pattern Critic runs the full diagnostic against a Prompt Critic record, scoring clarity, constraints and format. A Prompt Debugger record sets out what the prompt actually produced, so the cure targets a real failure and not a guess.',
                nodes: [
                    { k: 'crit', type: 'agent_critic', at: [2, 1], set: { title: 'Anti-Pattern Critic', content: 'Run the full diagnostic. Check the prompt for the symptoms Triage named, and for two it may hide: a success test that cannot be checked, and a request that asks for two things at once. Give yes or no for each, the evidence as a quoted phrase and the cure in one line. Score clarity, constraints and format from 1 to 10 and name the lowest.' } },
                    { k: 'pc', comp: ['meta', 'Prompt Critic', { prompt: 'Write a product description for our new sourdough starter kit. Make it good and appealing for customers, not too long.', '1-10': 'a score from 1 to 10, where 1 is unusable and 10 is ready to ship' }], section: 'quality', at: [2, 3], title: 'Prompt Critic record' },
                    { k: 'pdbg', comp: ['meta', 'Prompt Debugger', { prompt: 'Write a product description for our new sourdough starter kit. Make it good and appealing for customers, not too long.', output: 'Three long paragraphs, a list of ingredients and a claim that the starter keeps for a year', expected: 'A product description of 70 to 90 words with the kit name, the price and one call to action' }], section: 'approach', at: [1, 3], title: 'Prompt Debugger record' }
                ],
                wires: [['weak', 'out', 'pdbg', 'in'], ['weak', 'out', 'crit', 'draft'], ['tri', 'questions', 'crit', 'task'], ['pc', 'out', 'crit', 'criteria'], ['pdbg', 'out', 'crit', 'context']]
            },
            {
                title: 'Three specialists',
                blurb: 'Three specialists each take one family of symptoms. Clarity replaces vague verbs, Constraints adds limits a checker can count, and Format fixes the shape of the answer. The Merge joins their lists into one ordered set of changes.',
                nodes: [
                    { k: 'spc', type: 'agent_specialist', at: [3, 0], set: { title: 'Clarity Specialist', specialty: 'clarity', content: 'Take the vague sentences from the Critic and replace each vague verb with a concrete action. Name the reader in the first line. Output a list of changes as the old phrase, then the new phrase.' } },
                    { k: 'spk', type: 'agent_specialist', at: [3, 2], set: { title: 'Constraints Specialist', specialty: 'constraints', content: 'Add the limits the prompt lacks: a word range, the facts that must appear, the claims that are banned and what to leave out. Each limit must be something a checker can count or find in the text. Use no more than six.' } },
                    { k: 'spf', type: 'agent_specialist', at: [3, 4], set: { title: 'Format Specialist', specialty: 'output format', content: 'Define the shape of the answer: the sections, their order, the word range for each and the final line. Write the shape as a template a person could check by eye in ten seconds.' } },
                    { k: 'mrg', type: 'merge', at: [4, 2], set: { title: 'Specialist Notes', content: 'Join the three specialist lists into one ordered set of instructions for the Writer: clarity changes first, then constraints, then the output format. Drop any duplicate.' } }
                ],
                wires: [['crit', 'recommendations', 'spc', 'task'], ['crit', 'critique', 'spc', 'context'], ['crit', 'recommendations', 'spk', 'task'], ['crit', 'critique', 'spk', 'context'], ['crit', 'recommendations', 'spf', 'task'], ['spc', 'result', 'mrg', 'in'], ['spk', 'result', 'mrg', 'in'], ['spf', 'result', 'mrg', 'in']]
            },
            {
                title: 'The cure',
                blurb: 'The Writer drafts the cure from the merged notes, with the Prompt Improver record as its plan. The draft is only what the specialists asked for. It has not been attacked yet.',
                nodes: [
                    { k: 'wri', type: 'agent_writer', at: [5, 1], set: { title: 'Doctor Writer', content: 'Write the cured prompt for Tallow Lane. Keep the bakery, the kit and the price exactly as the brief gives them. Follow the merged list in order and resolve every point. On a revision round, list each change against the Feedback point it answers, and mark anything you could not fix with the reason.' } },
                    { k: 'imp', comp: ['meta', 'Prompt Improver', { prompt: 'Write a product description for our new sourdough starter kit. Make it good and appealing for customers, not too long.', issue: 'the request names no reader, no word range and no proof point, so the model has to guess all three', summary: 'Adds the reader, a word range, the facts to use and one call to action. Keeps the bakery name and the price.' }], section: 'instructions', at: [5, 3], title: 'Prompt Improver record' }
                ],
                wires: [['weak', 'out', 'wri', 'task'], ['mrg', 'out', 'wri', 'notes'], ['weak', 'out', 'imp', 'in'], ['imp', 'out', 'wri', 'plan']]
            },
            {
                title: 'Attack and compare',
                blurb: 'A Red Team tries to break the cure with an off-topic request, an invented claim and a missing price. The Judge then scores the original against the cure in an A/B test, and the Checklist sets the pass marks.',
                nodes: [
                    { k: 'red', type: 'agent_red_team', at: [6, 0], set: { title: 'Red Team', content: 'Attack the cured prompt. Try three inputs: a request for a shelf life claim, a request to ignore the word range, and a request with no price given. For each attack give the input, what the prompt does with it and a one-line fix. Do not soften a finding.' } },
                    { k: 'chk', comp: ['output', 'Checklist', { task: 'the cured Tallow Lane starter kit prompt', 'item 1': 'Names the kit, the flour blend and the price', 'item 2': 'Stays between 70 and 90 words', 'item 3': 'Makes no shelf life or health claim', 'done when': 'all three items pass on three separate test runs' }], section: 'success', at: [6, 2], title: 'Pass marks' },
                    { k: 'judge', type: 'agent_judge', at: [7, 1], set: { title: 'Judge', content: 'Compare Option A, the original, with Option B, the cure. Score both against the criteria in the A/B Branch Test and the Checklist. Give a verdict of A, B or tie, then one sentence of reasons per criterion. A tie is allowed only when both prompts pass the same items.' } },
                    { k: 'ab', comp: ['meta', 'Prompt A/B', { prompt_a: 'Write a product description for our new sourdough starter kit. Make it good and appealing for customers, not too long.', prompt_b: 'Write 70 to 90 words for a home baker who has never kept a sourdough starter alive. Name the Tallow Lane sourdough starter kit, the rye and wheat flour blend and the 12 pound price. Make no claim about shelf life or health. End with one line inviting the reader to order.', 'which and why': 'the prompt that passes more Checklist items, and if they tie, the shorter one' }], section: 'quality', at: [6, 4], title: 'A/B test record' }
                ],
                wires: [['wri', 'draft', 'red', 'target'], ['chk', 'out', 'red', 'context'], ['wri', 'draft', 'chk', 'in'], ['weak', 'out', 'judge', 'option_a'], ['wri', 'draft', 'judge', 'option_b'], ['ab', 'out', 'judge', 'criteria'], ['weak', 'out', 'ab', 'in']]
            },
            {
                title: 'Reader and feedback',
                blurb: 'A Reader Panel persona reads the draft cold, as the model would. Its confusions, the Red Team findings and the Judge rationale go into one Feedback block, which sends work back to the Writer and the Clarity Specialist for at most two rounds.',
                nodes: [
                    { k: 'per', comp: ['core', 'Persona', { character: 'a home baker who has never kept a sourdough starter alive and reads product pages on a phone' }], section: 'audience', at: [7, 0], title: 'Reader persona' },
                    { k: 'aud', type: 'agent_audience', at: [8, 0], set: { title: 'Reader Panel', content: 'Read the cured prompt as the model would, cold, with no context beyond the persona. Note the first place the instructions are unclear, any number you cannot act on, and whether you could write the product description without asking a question. Give a verdict of ready, revise or unusable.' } },
                    { k: 'fb', type: 'feedback', at: [8, 2], set: { title: 'Revision Rules', feedbackSource: 'Reader Panel, Red Team and Judge', purpose: 'Revision', maxRounds: 2, content: 'Treat every point as work to do. Send each point to the Writer or the Clarity Specialist. Stop after two rounds and report what is still open.' } }
                ],
                wires: [['per', 'out', 'aud', 'audience'], ['wri', 'draft', 'aud', 'draft'], ['aud', 'confusions', 'fb', 'in'], ['red', 'findings', 'fb', 'in'], ['judge', 'rationale', 'fb', 'in'], ['fb', 'to_writer', 'wri', 'feedback'], ['fb', 'to_any', 'spc', 'feedback']]
            },
            {
                title: 'Human sign-off',
                blurb: 'The Writer revised draft goes to a human editor. Nothing is returned until the editor says yes. A no sends the editor notes back to the Writer, and a yes lets the Output block return the cured prompt with its diagnosis.',
                nodes: [
                    { k: 'hum', type: 'agent_human', at: [9, 1], set: { title: 'Editor sign-off', question: 'Does the cure pass the Checklist on three runs, and does the Judge favour Option B?', content: 'Show the cured prompt, the Judge verdict and any open Feedback points together. Continue only on a clear yes. On a no, return the editor notes to the Writer.' } },
                    { k: 'out', type: 'output', at: [9, 3], set: { title: 'Cured prompt', formatSchema: 'Markdown', content: 'Return the cured prompt in a code block, then the diagnosis as a short list: each symptom, the quoted words that show it and the cure. Close with the Judge verdict and the Checklist result.' } }
                ],
                wires: [['wri', 'revised_draft', 'hum', 'proposal'], ['hum', 'changes', 'wri', 'feedback'], ['hum', 'approved', 'out', 'in']]
            }
        ]
    });

    PB.showcases.push({
        id: 'self-improving-prompt',
        group: 'Meta prompting',
        title: 'The Self-Improving Prompt',
        tagline: 'A weekly investor email that checks itself, learns from each round and stops when the bar is met.',
        about: 'A prompt that writes the weekly investor email for Tidewater Ledger, a fictional invoicing tool. The Writer drafts, then checks its own figures. A Critic and a Red Team push back, and Shared Notes keeps each lesson on a dated line for the next round. A Prompt Optimiser rewrites only the rules that failed, a Judge decides whether another round is worth it, and Feedback caps the loop at three rounds. Ruth signs off.',
        chapters: [
            {
                title: 'The numbers and the bar',
                blurb: 'Every run starts from the raw week: the finance sheet, the support log and the team notes. The Assumption Audit and Confidence Cap set how sure the prompt may sound, and the rubric sets the pass mark of 85 out of 100 that every draft has to reach.',
                nodes: [
                    { k: 'brief', type: 'user_input', at: [0, 1], set: { title: 'Week numbers', inputName: 'week_numbers', prompt: 'Paste the week\'s numbers, wins and problems', content: 'The finance sheet, the support log and the team notes for the week ending 13 November 2026.', defaultValue: 'MRR £212,400, up from £205,600 last week. 9 new paying accounts and 2 cancellations. Net burn £118,000 in October. Cash £1,530,000 at 31 October. Support first response time is 9.5 hours, up from 4 hours, since the invoice import release. The fix ships on 20 November. Carrick and Vane Builders signed a 40 seat plan. Two engineers start on 1 December.' } },
                    { k: 'role', type: 'role', at: [0, 0], set: { title: 'Ruth\'s Chief of Staff', content: 'You write for Ruth Adeyemi, CEO of Tidewater Ledger, a fictional invoicing tool for trade businesses in the North of England. Plain English, exact figures, no hype, and no date that nobody has confirmed.' } },
                    { k: 'rub', type: 'meta_rubric', at: [1, 0], set: { title: 'Pass Mark Rubric', threshold: '85', content: 'Score each draft out of 100. Accuracy 30: every figure matches the input sheet to the pound and the day. Honesty 20: the support delay is named with its cause and fix date. Clarity 20: one question per paragraph, no sentence over 25 words. Length 15: 350 to 450 words. Ask 15: one specific ask. Pass at 85 total. Any single criterion under 60 fails the draft.' } },
                    { k: 'assume', comp: ['reasoning', 'Assumption Audit', { 'state clearly': 'the £1,530,000 cash figure is the bank balance at 31 October, not a forecast' }], section: 'approach', at: [1, 2] },
                    { k: 'cap', comp: ['guardrails', 'Confidence Cap', {}], section: 'constraints', at: [2, 2] }
                ],
                wires: [['brief', 'out', 'rub', 'in'], ['brief', 'out', 'assume', 'in'], ['assume', 'out', 'cap', 'in']]
            },
            {
                title: 'First draft and self-check',
                blurb: 'The Writer drafts from the week\'s numbers and the Uncertainty Handling rules. The Self-Critique Pass then rereads the draft as the investor would and removes any claim it cannot trace to a line in the input sheet.',
                nodes: [
                    { k: 'unc', type: 'meta_uncertainty', at: [3, 3], set: { title: 'Missing Figure Rules', content: 'If a figure is not in the input sheet, write "not yet confirmed" and do not estimate it. Label every forecast as a forecast. If two sources disagree, use the finance sheet and log the gap in Shared Notes.' } },
                    { k: 'wri', type: 'agent_writer', at: [3, 1], set: { title: 'Investor Email Writer', content: 'Write this week\'s investor update email in Ruth\'s voice. Open with the MRR and what changed, then the support problem and its fix date, then the hires. Use only figures from the input sheet. On a revision round, fix every point in the feedback and say what changed.' } },
                    { k: 'sc', type: 'meta_selfcheck', at: [4, 1], set: { title: 'Self-Critique Pass', content: 'Reread the draft as an investor who knows the numbers. Trace every figure to a line in the input sheet. List each claim you cannot trace, then rewrite or delete that line. Do not add facts.' } }
                ],
                wires: [['brief', 'out', 'wri', 'task'], ['role', 'out', 'wri', 'context'], ['cap', 'out', 'unc', 'in'], ['unc', 'out', 'wri', 'context'], ['wri', 'draft', 'sc', 'in']]
            },
            {
                title: 'Critic, Red Team and lessons',
                blurb: 'The Critic scores the draft line by line against the rubric. The Red Team tries to find the figure an investor would question. Shared Notes records each lesson on one dated line, and the Writer reads those lines before its next draft.',
                nodes: [
                    { k: 'crt', type: 'agent_critic', at: [5, 0], set: { title: 'Rubric Critic', content: 'Score the draft against each rubric criterion out of 100. For every criterion under 60, give one exact sentence that would replace the weak line. Do not rewrite the whole email.' } },
                    { k: 'rt', type: 'agent_red_team', at: [5, 2], set: { title: 'Investor Red Team', content: 'Make this email embarrassing for Ruth. Find the figure an investor would question, the problem it hides and any claim that goes further than the data. For each finding, give the fix in one line.' } },
                    { k: 'mem', type: 'agent_memory', at: [6, 1], set: { title: 'Shared Notes', content: 'Record each lesson as one dated line: week, what went wrong, the rule that prevents it. Example: 6 Nov, burn quoted without its month, rule: always name the month of a burn figure. Add lines, never edit an old one.' } }
                ],
                wires: [['sc', 'out', 'crt', 'draft'], ['brief', 'out', 'crt', 'task'], ['rub', 'out', 'crt', 'criteria'], ['sc', 'out', 'rt', 'target'], ['brief', 'out', 'rt', 'context'], ['crt', 'recommendations', 'mem', 'write'], ['rt', 'fixes', 'mem', 'write']]
            },
            {
                title: 'The Optimiser rewrites the rules',
                blurb: 'The Prompt Critic scores the Writer\'s standing rules out of 10. The Prompt Optimiser rewrites only the rules that failed. The Feedback block carries revision notes to the Writer and the Optimiser, and stops the loop at three rounds.',
                nodes: [
                    { k: 'pc', comp: ['meta', 'Prompt Critic', { prompt: 'the Writer\'s standing role and house rules for the investor email', '1-10': 'out of 10, below 8 means rewrite the rule' }], section: 'quality', at: [1, 4] },
                    { k: 'fb', type: 'feedback', at: [7, 0], set: { title: 'Revision Rules', feedbackSource: 'Rubric Critic, Investor Red Team, Judge and Ruth', purpose: 'Revision', maxRounds: 3, content: 'Three rounds at most. Each point is fixed in the next round, or the Writer says in one line why it is out of scope.' } },
                    { k: 'opt', type: 'meta_optimizer', at: [7, 2], set: { title: 'Prompt Optimiser', content: 'Read the Feedback notes and the Prompt Critic score. Rewrite only the Writer rules that failed, and keep every rule that passed. Return the new rule set and a one line change log. Do not raise the word limit.' } }
                ],
                wires: [['crt', 'feedback', 'fb', 'in'], ['rt', 'findings', 'fb', 'in'], ['mem', 'read', 'fb', 'in'], ['role', 'out', 'pc', 'in'], ['pc', 'out', 'opt', 'in'], ['fb', 'to_any', 'opt', 'in'], ['opt', 'out', 'wri', 'feedback'], ['fb', 'to_writer', 'wri', 'feedback']]
            },
            {
                title: 'The Judge decides on another round',
                blurb: 'The Judge compares the first draft with the revision. It continues only if the revision gained at least 5 points and a criterion still sits under 60. The Checkpoint Gate then sends the draft back to Feedback, or forward to Ruth.',
                nodes: [
                    { k: 'jud', type: 'agent_judge', at: [7, 4], set: { title: 'Round Judge', content: 'Compare the first draft with the revised draft against the rubric. Verdict: continue or stop. Continue only if the total rose by at least 5 points and any criterion is still under 60. Give the rationale in two sentences.' } },
                    { k: 'gt', type: 'gate', at: [8, 4], set: { title: 'Another Round Gate', condition: 'Judge verdict is stop', content: 'Pass sends the draft to Ruth. Fail sends it back through Feedback, which allows three rounds in total.' } }
                ],
                wires: [['wri', 'draft', 'jud', 'option_a'], ['wri', 'revised_draft', 'jud', 'option_b'], ['rub', 'out', 'jud', 'criteria'], ['jud', 'verdict', 'gt', 'in'], ['gt', 'fail', 'fb', 'in']]
            },
            {
                title: 'Ruth\'s approval',
                blurb: 'Ruth reads the final email with its scores and this week\'s new lessons. Nothing is sent without her yes. The Investor Update Format sets the layout, and the approved text goes out as plain text.',
                nodes: [
                    { k: 'fmt', comp: ['output', 'Investor Update Format', { 'revenue, growth, burn, runway': 'MRR £212,400, up £6,800 week on week, net burn £118,000 in October, 13 months runway', 'monthly/quarterly': 'weekly, sent each Friday by 4pm', '1 page': '1 page, under 450 words' }], section: 'output', at: [8, 2] },
                    { k: 'hum', type: 'agent_human', at: [9, 1], set: { title: 'Ruth Approves', question: 'Would you send this to our investors under your name?', content: 'Show the revised email, the rubric scores and the lessons added to Shared Notes this week. Approve, or return changes to the Feedback block. Nothing is sent without a yes.' } },
                    { k: 'out', type: 'output', at: [9, 3], set: { title: 'Investor Email', formatSchema: 'Plain text', content: 'Return the approved email as plain text: a subject line, then the body. Sign off as Ruth. No headings beyond the template.' } }
                ],
                wires: [['gt', 'pass', 'hum', 'proposal'], ['hum', 'approved', 'out', 'in'], ['fmt', 'out', 'out', 'in'], ['hum', 'changes', 'fb', 'in']]
            }
        ]
    });

    PB.showcases.push({
        id: 'modular-assembly-line',
        group: 'Modular prompts',
        title: 'Modular Prompt Assembly Line',
        tagline: 'A prompt built from tested modules, checked for contradictions and signed off.',
        about: 'A system prompt for a UK insurer is assembled from modules instead of written from scratch. Triage tags the request, a switch and a priority router decide which modules it needs, specialists and library records supply each one, a critic checks the modules against each other, a pipeline puts them in order and a human signs off the finished prompt.',
        chapters: [
            {
                title: 'The request arrives',
                blurb: 'Every prompt on this line starts as a request. Triage tags the job and lists the modules it needs, and the Priority Router decides how much checking the job gets before any module is written.',
                nodes: [
                    { k: 'foreman', type: 'role', at: [0, 0], set: { title: 'Assembly Foreman', content: 'You build system prompts for Quayside Mutual, a UK home insurer. Work from tested modules before writing anything new. Return the assembled prompt, the modules used and one reason for each module.' } },
                    { k: 'brief', type: 'user_input', at: [0, 1], set: { title: 'Product team request', inputName: 'assembly_request', prompt: 'What should the assistant do, and for whom?', content: 'Request from the Quayside Mutual product team, received 14 November. The assistant answers questions about filing a home water damage claim.', defaultValue: 'A Claims Helper chat on the Quayside Mutual website for policyholders filing a home water damage claim. It must never promise a payout, must send anyone with an injury, a gas smell or water near live electrics to 999 first, and must sound calm, not like a legal letter. The last version ran to 2,400 words and once quoted a policy clause that does not exist.' } },
                    { k: 'triage', type: 'agent_triage', at: [1, 1], set: { title: 'Intake Triage', content: 'Tag the request as customer-facing or internal, and as regulated or general. Name the modules it needs from role, context, constraints, tone, output format and safety. Rate priority critical if the assistant could give financial or medical advice, normal if it could mislead a customer, low otherwise. Write no module yet.' } },
                    { k: 'prio', type: 'priority_router', at: [2, 1], set: { title: 'Checking Depth', condition: 'priority from Intake Triage', content: 'Critical jobs get the full module set, the critic and a human sign-off. Normal jobs get the critic and a human sign-off. Low jobs get the critic only.' } }
                ],
                wires: [['foreman', 'out', 'triage', 'context'], ['brief', 'out', 'triage', 'request'], ['triage', 'priority', 'prio', 'in']]
            },
            {
                title: 'Sorting the job',
                blurb: 'The Switch sends customer-facing jobs down the safety path. The Module Planner orders the work, and the Context Specialist fills the scope module from the Scope record in the Component Library.',
                nodes: [
                    { k: 'sw', type: 'switch', at: [3, 1], set: { title: 'Customer-facing?', condition: 'category is customer-facing', caseALabel: 'Customer-facing: safety path', caseBLabel: 'Internal: no safety modules', content: 'Customer-facing jobs go to the safety specialist. Internal jobs skip the safety modules and go straight to the critic.' } },
                    { k: 'planner', type: 'agent_planner', at: [4, 0], set: { title: 'Module Planner', content: 'List the modules this job needs in assembly order: role, context, constraints, tone, output format and safety. For each module, name the specialist or library record that supplies it. Flag any module that conflicts with another and say which one wins.' } },
                    { k: 'scope', comp: ['core', 'Scope', { 'what to include': 'home insurance claims for buildings and contents, UK policies only, from first notice of loss to the claim decision', 'what to exclude': 'pricing, renewals, cover limits, legal advice and any claim already with a loss adjuster', 'primary emphasis': 'helping the customer take the next safe step and know who decides the claim' }], section: 'context', at: [3, 3], title: 'Scope module' },
                    { k: 'ctx', type: 'agent_specialist', at: [4, 3], set: { title: 'Context Specialist', specialty: 'Context and scope', content: 'Write the context module from the scope and the planner list. Name the product, the policy types covered and the three sources the assistant may quote. Keep it under 180 words and do not invent a policy clause.' } }
                ],
                wires: [['triage', 'category', 'sw', 'in'], ['brief', 'out', 'planner', 'task'], ['triage', 'questions', 'planner', 'context'], ['prio', 'critical', 'planner', 'constraints'], ['brief', 'out', 'ctx', 'task'], ['scope', 'out', 'ctx', 'context']]
            },
            {
                title: 'Safety modules',
                blurb: 'Customer-facing prompts get their safety module here. A Data Minimisation Rule and a Refusal Template from the Guardrails records feed the Safety Specialist, which writes the lines that tell the assistant when to stop.',
                nodes: [
                    { k: 'minimise', comp: ['guardrails', 'Data Minimisation Rule', { task: 'explaining how to start a water damage claim', 'unnecessary PII': 'policy numbers beyond the last four digits, bank details and medical details', 'do not store or repeat it back unnecessarily': 'do not store it or repeat it back, and tell the customer not to share bank details in the chat' }], section: 'constraints', at: [3, 5], title: 'Personal data rule' },
                    { k: 'refusal', comp: ['guardrails', 'Refusal Template', { request: 'a question on whether a claim will be paid', reason: 'the claim decision belongs to a Quayside claims handler', alternative: 'the steps to log the claim and the evidence to keep', need: 'a decision on a specific claim', resource: 'the Claims tab in the Quayside app' }], section: 'constraints', at: [4, 5], title: 'Stop and refer rule' },
                    { k: 'saf', type: 'agent_specialist', at: [5, 4], set: { title: 'Safety Specialist', specialty: 'Safety and stop rules', content: 'Write the safety module. For injury, a gas smell, sparking or burning electrics, or water still rising near power, the first line says to call 999. Never promise a payout, a timescale or a cover limit. Use the refusal rule for any decision question. Under 200 words.' } }
                ],
                wires: [['sw', 'caseA', 'saf', 'task'], ['minimise', 'out', 'refusal', 'in'], ['refusal', 'out', 'saf', 'context']]
            },
            {
                title: 'Tone and format modules',
                blurb: 'Two library records supply the voice and the output shape. A Merge block joins them into one style bundle for the Editor, so neither module is written from scratch.',
                nodes: [
                    { k: 'tone', comp: ['core', 'Tone', { 'professional/casual/empathetic': 'calm and plain', 'concise/detailed/direct': 'concise and direct, with one next step per reply' }], section: 'tone', at: [5, 0], title: 'Voice module' },
                    { k: 'outp', comp: ['output', 'Output Format', { 'Structure / length / sections': 'a short opening line, then numbered steps, then one line on who decides', N: '180' }], section: 'output', at: [5, 1], title: 'Output module' },
                    { k: 'mg', type: 'merge', at: [6, 0], set: { title: 'Style bundle', content: 'Join the voice and output modules into one style block for the Editor. Keep both rules. Where they clash, the output module sets length and the voice module sets wording.' } }
                ],
                wires: [['tone', 'out', 'mg', 'in'], ['outp', 'out', 'mg', 'in']]
            },
            {
                title: 'Critic and revision loop',
                blurb: 'The Critic checks the modules against each other, not one at a time. An Assumption Audit from the Reasoning records surfaces facts the prompt relies on. Its feedback goes back through a Feedback block to the Context Specialist, capped at two rounds.',
                nodes: [
                    { k: 'assume', comp: ['reasoning', 'Assumption Audit', { 'state clearly': 'the prompt assumes the customer has already reported the loss to Quayside and has a policy number' }], section: 'quality', at: [6, 3], title: 'Hidden facts check' },
                    { k: 'crt', type: 'agent_critic', at: [7, 3], set: { title: 'Module Critic', content: 'Check the modules against each other. Find any rule that contradicts another, any promise the assistant could not keep and any fact the Assumption Audit cannot support. Give each issue a severity and one concrete fix. Do not rewrite the modules yourself.' } },
                    { k: 'fb', type: 'feedback', at: [8, 4], set: { title: 'Revision Rules', feedbackSource: 'Module Critic', purpose: 'Revision', maxRounds: 2, content: 'Send each blocker back to the Context Specialist for one fix. After two rounds, send what is left to the Prompt Editor with the issues listed.' } }
                ],
                wires: [['assume', 'out', 'crt', 'criteria'], ['brief', 'out', 'crt', 'task'], ['ctx', 'result', 'crt', 'draft'], ['saf', 'result', 'crt', 'context'], ['crt', 'feedback', 'fb', 'in'], ['fb', 'to_any', 'ctx', 'feedback']]
            },
            {
                title: 'Assembly and sign-off',
                blurb: 'A pipeline stacks the modules in a fixed order, with safety last so the refusal rules are the final words the assistant reads. The Aggregator joins them, the Editor tightens them, and Human Approval decides whether the prompt ships.',
                nodes: [
                    { k: 'pipe', type: 'pipeline', at: [7, 0], set: { title: 'Assembly order', content: 'Stack the modules in this order: role, context, constraints, tone, output format, then safety last. Do not reorder for length.' } },
                    { k: 'agg', type: 'agent_aggregator', at: [8, 1], set: { title: 'Module Aggregator', content: 'Join the ordered modules into one system prompt. Where two modules still conflict, keep the safety rule and report the change in one line. Return the merged prompt and a confidence score out of ten.' } },
                    { k: 'ed', type: 'agent_editor', at: [9, 1], set: { title: 'Prompt Editor', content: 'Tighten the assembled prompt without changing a rule. Cut repeated instructions, keep every 999 line and refusal word for word, and list each change in one line.' } },
                    { k: 'human', type: 'agent_human', at: [9, 3], set: { title: 'Product Sign-off', question: 'Is this prompt safe, accurate and in the Quayside voice?', content: 'Read the assembled prompt next to the Critic open issues. Approve only when every blocker is closed. On a no, return the reason to the Prompt Editor.' } },
                    { k: 'out', type: 'output', at: [9, 5], set: { title: 'Approved system prompt', formatSchema: 'Plain text', content: 'Return the approved system prompt as plain text, ready to paste into the chat setup, with the module list at the top.' } }
                ],
                wires: [['planner', 'plan', 'pipe', 'in'], ['pipe', 'out', 'agg', 'planner_out'], ['ctx', 'result', 'agg', 'researcher_out'], ['saf', 'result', 'agg', 'writer_out'], ['crt', 'critique', 'agg', 'critic_out'], ['agg', 'merged', 'ed', 'draft'], ['mg', 'out', 'ed', 'style'], ['ed', 'edited', 'human', 'proposal'], ['human', 'changes', 'ed', 'feedback'], ['human', 'approved', 'out', 'in']]
            }
        ]
    });

    PB.showcases.push({
        id: 'variant-generator',
        group: 'Modular prompts',
        title: 'Prompt Variant Generator',
        tagline: 'One base prompt becomes 16 tested variants, one approval from the shop.',
        about: 'A product description prompt for a fictional 26 cm cast iron skillet is turned into a matrix of 16 variants across audience, tone, length and target model. Two audience tracks write in parallel, a Brainstormer adds unusual openings, and a vote keeps the strongest line per audience. An editor, an A/B test plan and a scored rubric decide what ships, and a person signs off before the prompt pack is released.',
        chapters: [
            {
                title: 'The base prompt and the axes',
                blurb: 'Every matrix starts with one base prompt and four knobs. The base holds the product facts and the job. Each axis is an enum that the Writers must cover in full, so no cell is quietly dropped from the pack.',
                nodes: [
                    { k: 'role', type: 'role', at: [0, 0], set: { title: 'Prompt Engineer', content: 'You are a prompt engineer for a UK kitchenware shop. You write prompts that other models will run, so every prompt must work on its own with no hidden context. The spec sheet is the only source for figures. Never invent a product fact.' } },
                    { k: 'base', type: 'user_input', at: [0, 1], set: { title: 'Base product prompt', inputName: 'base_prompt', prompt: 'Paste the base product prompt', content: 'The one prompt every variant grows from. It names the product, the job and the spec sheet it may use.', defaultValue: 'Write a product description for the Brackenmoor 26 cm cast iron skillet. Use only spec sheet figures: 2.8 kg, 17 cm handle, oven safe to 260°C, pre-seasoned with flaxseed oil, £42.' } },
                    { k: 'p_aud', type: 'input_parameters', at: [0, 2], set: { title: 'Axis 1: audience', paramName: 'audience', paramType: 'enum', paramValues: 'home cook | professional chef', content: 'Two audiences, one track each. Home cooks buy for weeknight cooking, easy cleaning and value. Professional chefs buy for heat retention, handle balance and an oven that finishes a dish for service.' } },
                    { k: 'p_tone', type: 'input_parameters', at: [0, 3], set: { title: 'Axis 2: tone', paramName: 'tone', paramType: 'enum', paramValues: 'plain | warm', content: 'Plain means short declarative sentences and no stacked adjectives. Warm means second person and one line about cooking together. Neither tone may claim what the pan will make a buyer feel.' } },
                    { k: 'p_len', type: 'input_parameters', at: [0, 4], set: { title: 'Axis 3: length', paramName: 'length', paramType: 'enum', paramValues: 'short 40 to 60 words | standard 90 to 120 words', content: 'Short feeds the category grid. Standard feeds the product page. The Editor enforces the word limit for each length.' } },
                    { k: 'p_model', type: 'input_parameters', at: [0, 5], set: { title: 'Axis 4: target model', paramName: 'target_model', paramType: 'enum', paramValues: 'large general model | small local model', content: 'The large model follows long instructions, so it needs only the job and the rules. The small local model needs fixed headings and a numbered output with no nested lists, so its prompts are written differently.' } }
                ],
                wires: []
            },
            {
                title: 'Splitting the matrix',
                blurb: 'The four axes merge into one specification. A Prompt Template from the Component Library turns the base into a reusable shape with named slots, and a Parallel Split sends the matrix to two audience tracks that run at the same time.',
                nodes: [
                    { k: 'axes', type: 'merge', at: [1, 3], set: { title: 'Axis specification', content: 'Merge the four axes into one specification: 2 audiences, 2 tones, 2 lengths and 2 target models. That is 16 cells, with 8 cells per audience track.' } },
                    { k: 'tmpl', comp: ['meta', 'Prompt Template', { 'use case': 'a product description for the Brackenmoor skillet', var1: 'audience', var2: 'tone', 'structured prompt with variable slots': 'a persona line, the spec sheet facts, then one labelled slot for each axis value' }], section: 'approach', at: [2, 3], title: 'Reusable prompt shape' },
                    { k: 'split', type: 'parallel', at: [3, 3], set: { title: 'Audience tracks', content: 'Branch 1 carries the home cook track and branch 2 carries the professional chef track. Each track holds eight cells. The two Writers never see each other drafts.' } }
                ],
                wires: [['p_aud', 'out', 'axes', 'in'], ['p_tone', 'out', 'axes', 'in'], ['p_len', 'out', 'axes', 'in'], ['p_model', 'out', 'axes', 'in'], ['base', 'out', 'tmpl', 'in'], ['axes', 'out', 'tmpl', 'in'], ['tmpl', 'out', 'split', 'in']]
            },
            {
                title: 'Writing the two tracks',
                blurb: 'Each Writer drafts eight prompts for one audience, covering tone, length and target model. A Brainstormer works beside them and proposes openings that nobody on the track would think of, so the vote has something unusual to beat the safe line with.',
                nodes: [
                    { k: 'w_home', type: 'agent_writer', at: [4, 1], set: { title: 'Home cook Writer', content: 'Write eight prompts for home cooks: two tones by two lengths by two target models. Each prompt names the skillet, uses only spec sheet figures and says what a weeknight cook gets from it. For the small local model, use fixed headings and a numbered output.' } },
                    { k: 'w_pro', type: 'agent_writer', at: [4, 3], set: { title: 'Chef Writer', content: 'Write eight prompts for professional chefs in the same matrix. Lead with heat retention and handle balance, quote the 260°C oven limit and never promise restaurant results. Use the same target model rules as the home cook track.' } },
                    { k: 'brain', type: 'agent_brainstormer', at: [4, 5], set: { title: 'Angle Brainstormer', content: 'Propose five unusual openings for each audience. Home cooks: the skillet as the one pan that does not need watching while the oven does the work. Chefs: the skillet that sears on the hob and finishes in a 40 minute bake with no second dish. Mark the opening most likely to be wrong and say why.' } }
                ],
                wires: [['split', 'branch1', 'w_home', 'task'], ['split', 'branch2', 'w_pro', 'task'], ['role', 'out', 'w_home', 'context'], ['role', 'out', 'w_pro', 'context'], ['tmpl', 'out', 'w_home', 'plan'], ['tmpl', 'out', 'w_pro', 'plan'], ['base', 'out', 'brain', 'task'], ['role', 'out', 'brain', 'context'], ['axes', 'out', 'brain', 'constraints']]
            },
            {
                title: 'Choosing the strongest line',
                blurb: 'The Consensus Vote judges each Writer draft against the Brainstormer openings, one audience at a time, so a wild opening wins only where it beats the safe line. A Feedback Rubric from the Core library sets the criterion the Editor holds the winners to.',
                nodes: [
                    { k: 'vote', type: 'agent_vote', at: [5, 2], set: { title: 'Strongest line vote', content: 'Judge each audience on its own. Candidate A is the home cook draft, candidate B is the chef draft and candidate C holds the wild openings. Return one winning opening per audience and one line on why it beat the rest. A wild opening wins only if it presents the spec sheet facts more clearly.' } },
                    { k: 'fr', comp: ['core', 'Feedback Rubric', { criterion: 'Every figure matches the spec sheet' }], section: 'quality', at: [5, 4], title: 'Spec accuracy rubric' },
                    { k: 'edt', type: 'agent_editor', at: [6, 2], set: { title: 'Prompt Editor', content: 'Trim each prompt to its word limit: 60 words for short and 120 words for standard. Keep every spec figure exactly as written. Rewrite any line the rubric marks as unsupported so it relies on the spec sheet alone. List each change in one line.' } }
                ],
                wires: [['w_home', 'draft', 'vote', 'candidate_a'], ['w_pro', 'draft', 'vote', 'candidate_b'], ['brain', 'wildcards', 'vote', 'candidate_c'], ['base', 'out', 'fr', 'in'], ['vote', 'winner', 'edt', 'draft'], ['fr', 'out', 'edt', 'style']]
            },
            {
                title: 'Testing and reviewing',
                blurb: 'An Audience Reviewer reads the edited prompts as the buyer would. An A/B test plan sets the metric that decides between variants, and a Scored Rubric grades them. Feedback goes back to the Writers and is capped at two rounds.',
                nodes: [
                    { k: 'ab', type: 'ab_testing', at: [7, 2], set: { title: 'A/B test plan', metric: 'Product page click-through over 14 days, at least 1,500 sessions per variant', content: 'Run each variant against its nearest rival with the same tone and length. Split traffic by session, do not stop early and report the result per audience. Secondary metric: add-to-basket rate.' } },
                    { k: 'rub', comp: ['output', 'Scored Rubric', { C1: 'Spec accuracy', 'X%': '50%', score: '1 to 5', calc: 'score times weight', C2: 'Fit to the audience', sum: 'sum of the weighted scores', 'A-F': 'A to F', list: 'the two weakest criteria' }], section: 'output', at: [8, 2], title: 'Variant scorecard' },
                    { k: 'aud', type: 'agent_audience', at: [7, 4], set: { title: 'Buyer reviewer', content: 'Read each prompt output as a buyer would. A home cook should not meet a restaurant claim, and a chef should not meet a line they would not believe. Name the first confusing sentence and say whether you would click through.' } },
                    { k: 'fb', type: 'feedback', at: [7, 5], set: { title: 'Revision rules', feedbackSource: 'Scored Rubric, Buyer reviewer and Spec accuracy rubric', purpose: 'Revision', maxRounds: 2, content: 'Every point goes back to the track that wrote the line. Fix it in the next round or say why it is out of scope. Two rounds at most, then Human Approval decides.' } }
                ],
                wires: [['edt', 'edited', 'ab', 'in'], ['edt', 'edited', 'aud', 'draft'], ['p_aud', 'out', 'aud', 'audience'], ['ab', 'out', 'rub', 'in'], ['aud', 'confusions', 'fb', 'in'], ['rub', 'out', 'fb', 'in'], ['fb', 'to_writer', 'w_home', 'feedback'], ['fb', 'to_writer', 'w_pro', 'feedback'], ['fb', 'to_any', 'edt', 'feedback']]
            },
            {
                title: 'The variant matrix',
                blurb: 'A Merge gathers the edited prompts, the A/B plan, the scorecard and the change log into one set. A Prompt Checklist from the Meta library checks the result, and a Structured Dataset lays out the 16 rows that the shop import tool reads.',
                nodes: [
                    { k: 'mrg', type: 'merge', at: [8, 0], set: { title: 'Matrix merge', content: 'Merge the edited prompts, the A/B plan, the scorecard and the change log. Keep one entry per cell, keyed by audience, tone, length and target model.' } },
                    { k: 'dset', type: 'structured_dataset', at: [9, 0], set: { title: 'Variant matrix dataset', format: 'JSON array', schemaNote: 'One object per cell with variant_id, audience, tone, length, target_model, prompt_text, word_count, score and status.', content: 'Sixteen rows, one per cell. Status reads ready, revise or dropped. A dropped row keeps its reason so the copy team can see why it left the pack.' } },
                    { k: 'chk', comp: ['meta', 'Prompt Checklist', {}], section: 'quality', at: [9, 2], title: 'Pre-ship checklist' }
                ],
                wires: [['ab', 'out', 'mrg', 'in'], ['rub', 'out', 'mrg', 'in'], ['edt', 'changes', 'mrg', 'in'], ['mrg', 'out', 'dset', 'in'], ['dset', 'out', 'chk', 'in']]
            },
            {
                title: 'Human sign-off',
                blurb: 'The Human Approval stop shows the checked matrix beside the scorecard and the A/B plan. Only a clear yes releases the prompt pack. A change request goes back through the Feedback block, so the Writers get one more round.',
                nodes: [
                    { k: 'hum', type: 'agent_human', at: [8, 4], set: { title: 'Shop manager sign-off', question: 'Release these 16 prompts to the copy team and start the A/B test?', content: 'Check the scorecard grades and the checklist before saying yes. Every spec figure in the prompts must match the product page. On a no, write the change in one line and it goes back to the Writers.' } },
                    { k: 'out', type: 'output', at: [9, 4], set: { title: 'Prompt pack', formatSchema: 'JSON', content: 'Return the approved matrix as one JSON array of 16 variant objects, each with its full prompt text, preceded by a short header with the A/B test plan.' } }
                ],
                wires: [['chk', 'out', 'hum', 'proposal'], ['hum', 'approved', 'out', 'in'], ['hum', 'changes', 'fb', 'in']]
            }
        ]
    });

    PB.showcases.push({
        id: 'template-foundry',
        group: 'Templates',
        title: 'The Template Foundry',
        tagline: 'One onboarding email template, built, broken on purpose and signed off.',
        about: 'A reusable welcome email for new bookkeeping clients, designed from a brief. A Specialist defines the domain, a Glossary and Data Schema pin down every named variable, and a Planner lays out the sections. The Writer drafts with placeholders, a Tester fills three sample clients to find what breaks, and an Editor and Critic tighten it in a capped loop. A human signs off, and the Output Format documents the template.',
        chapters: [
            {
                title: 'The domain and the variables',
                blurb: 'A new template starts with a brief from the account team. A Specialist sets out what the email must do, then a Glossary and a Data Schema pin down every variable so no account manager has to guess a name or a format.',
                nodes: [
                    { k: 'role', type: 'role', at: [0, 0], set: { title: 'Template Architect', content: 'You design prompt templates that six account managers will reuse for months. Every variable needs a name, a type, an example and a reason to exist. Prefer fewer variables. Plain English beats clever phrasing.' } },
                    { k: 'brief', type: 'user_input', at: [0, 1], set: { title: 'Onboarding brief', inputName: 'onboarding_brief', prompt: 'What should the onboarding email do?', content: 'Request from the account team at Northgate Ledger, a fictional 40-person bookkeeping and payroll firm.', defaultValue: 'We onboard about 60 new clients a month. Each one gets a welcome email from their account manager that confirms the kickoff call, lists the three documents we need and links to the client portal. Build one template the account managers can reuse without rewriting it each time.' } },
                    { k: 'spec', type: 'agent_specialist', at: [1, 1], set: { title: 'Onboarding Email Specialist', specialty: 'B2B client onboarding for a bookkeeping firm', content: 'Define the domain in one paragraph: who reads the email (a business owner who has just signed), what they must do next and what would make them anxious. List four things the email must never do, such as quoting a fee or promising a start date we have not confirmed.' } },
                    { k: 'glossary', type: 'glossary', at: [2, 0], set: { title: 'Onboarding Glossary', content: 'Kickoff call: the 45-minute video call where we agree the first month of work. Onboarding pack: the three documents the client sends before kickoff, namely the last bank statement, the payroll summary and the signed engagement letter. Client portal: the secure upload page linked in every onboarding email. Variable: a named slot the account manager replaces before sending. Placeholder: a variable that has not been filled in yet.' } },
                    { k: 'schema', type: 'data_schema', at: [2, 2], set: { title: 'Variable Data Schema', schemaName: 'onboarding_email_variables', content: 'client_first_name: text, required, example Priya. company_name: text, required, example Mallard Print Works. account_manager_name: text, required, example Tom Ashworth. kickoff_date: date written as Tuesday 14 January, required. kickoff_time: time in UK time, 24-hour, required, example 10:30. portal_link: web address starting with https, required. No other variables exist.' } }
                ],
                wires: [['role', 'out', 'spec', 'context'], ['brief', 'out', 'spec', 'task'], ['spec', 'result', 'glossary', 'in'], ['glossary', 'out', 'schema', 'in']]
            },
            {
                title: 'Structure and parameters',
                blurb: 'The Planner turns the domain and the schema into an ordered section plan. Template Parameters fix the settings the template must accept, so the Writer cannot invent a tone or a mode of its own.',
                nodes: [
                    { k: 'ip', type: 'input_parameters', at: [2, 4], set: { title: 'Template Parameters', paramName: 'tone and send_mode', paramType: 'select', paramValues: 'tone: warm or formal, send_mode: standard or fast_track', content: 'tone defaults to warm. Formal removes the first-name greeting and uses Dear followed by the client name. send_mode defaults to standard. fast_track adds one line saying the first invoice is due within 7 days of kickoff.' } },
                    { k: 'planner', type: 'agent_planner', at: [3, 1], set: { title: 'Template Planner', content: 'Lay the template out in this order: subject line, greeting, what happens next, the three documents, the portal link and the sign-off. For each section state its purpose in one line and list the variables it uses. Flag any section that needs a variable the schema does not define.' } }
                ],
                wires: [['brief', 'out', 'planner', 'task'], ['schema', 'out', 'planner', 'context'], ['ip', 'out', 'planner', 'constraints']]
            },
            {
                title: 'Draft with placeholders',
                blurb: 'The Writer drafts the email from the plan, using square-bracket placeholders only where the schema allows. A Few-Shot Builder supplies worked examples, and a Prompt Template sets the reusable shell the draft must follow.',
                nodes: [
                    { k: 'wri', type: 'agent_writer', at: [4, 1], set: { title: 'Template Writer', content: 'Draft the email using only the variables in the schema, written as square-bracket placeholders such as [client_first_name]. Keep the body under 180 words. Use plain sentences and no marketing language. On a revision round, fix every point raised and say in one line what changed.' } },
                    { k: 'fewshot', comp: ['meta', 'Few-Shot Builder', { task: 'welcome emails for new bookkeeping clients, with the kickoff date and portal link in place' }], section: 'examples', at: [3, 3] },
                    { k: 'pt', comp: ['meta', 'Prompt Template', { 'use case': 'client onboarding welcome email', var1: 'client first name', var2: 'kickoff date', 'structured prompt with variable slots': 'a subject line, a greeting, a short paragraph on what happens next, the three documents as a list, the portal link and a sign-off from the account manager' }], section: 'output', at: [4, 3] },
                    { k: 'ext', comp: ['meta', 'Advanced Variable Extractor', { 'paste prompt here': 'the drafted welcome email with its placeholders', var: 'client first name', 'if select': 'not used, the field is free text', 'suggested value': 'Priya', 'another variable': 'kickoff date', 'what it does': 'fills the greeting line with the first name only' }], section: 'quality', at: [5, 1] }
                ],
                wires: [['planner', 'plan', 'wri', 'plan'], ['brief', 'out', 'wri', 'task'], ['fewshot', 'out', 'wri', 'context'], ['pt', 'out', 'wri', 'notes'], ['wri', 'draft', 'ext', 'in']]
            },
            {
                title: 'Three sample clients',
                blurb: 'The Tester fills the template with three invented clients, each chosen to break it: a very long company name, a kickoff in another time zone and a missing portal link. It reports every failure in the Bug Report format.',
                nodes: [
                    { k: 'ir', comp: ['core', 'Input Template', {}], section: 'task', at: [5, 3] },
                    { k: 'tst', type: 'agent_tester', at: [6, 1], set: { title: 'Sample Client Tester', content: 'Fill the template three times. Sample A: Priya Nair at Mallard Print Works, kickoff Tuesday 14 January at 10:30. Sample B: Marcus Oyelaran at Oyelaran and Sons Dental Studio Partnership, kickoff Monday 9 March at 08:00 West Africa Time. Sample C: Hannah Lowe at Brookfield Vets, with no portal link. Report every placeholder left unfilled, every sentence over 25 words and every field that broke the line length.' } },
                    { k: 'bug', comp: ['writing', 'Bug Report Template', { '1, 2, 3': 'fill sample A, then B, then C, then read each email aloud', 'version, OS, browser': 'template v3, Windows 11, Chrome 128', 'blocker/major/minor': 'major', 'logs, screenshots': 'the three filled emails and the Tester notes' }], section: 'output', at: [7, 1] }
                ],
                wires: [['wri', 'draft', 'tst', 'code'], ['ir', 'out', 'tst', 'task'], ['tst', 'failures', 'bug', 'in']]
            },
            {
                title: 'Edit, critique and feedback',
                blurb: 'The Editor enforces one placeholder style and removes any name the schema does not define. The Critic judges the whole template against the brief. The Feedback block sends both sets of notes back to the Writer, and stops after two rounds.',
                nodes: [
                    { k: 'edt', type: 'agent_editor', at: [7, 3], set: { title: 'Placeholder Editor', content: 'Check placeholder hygiene. Every placeholder must match a name in the schema, be spelt the same way everywhere and sit in square brackets. Remove any placeholder the schema does not list and keep the wording unchanged. List each change in one line.' } },
                    { k: 'crt', type: 'agent_critic', at: [8, 0], set: { title: 'Template Critic', content: 'Judge the template against the brief and the schema. Ask whether a new account manager could send it with no edits beyond the placeholders. Rate each issue as blocker, major or minor. For every blocker give one concrete rewrite. Do not rewrite the template yourself.' } },
                    { k: 'fb', type: 'feedback', at: [8, 2], set: { title: 'Revision Rules', feedbackSource: 'Sample Client Tester, Template Critic and Operations Lead', purpose: 'Revision', maxRounds: 2, content: 'Work every point into the next revision. If a point is out of scope, say why in one line. After two rounds, stop and send the template to sign-off as it stands.' } }
                ],
                wires: [['wri', 'revised_draft', 'edt', 'draft'], ['ext', 'out', 'edt', 'style'], ['wri', 'draft', 'crt', 'draft'], ['brief', 'out', 'crt', 'task'], ['bug', 'out', 'fb', 'in'], ['crt', 'feedback', 'fb', 'in'], ['fb', 'to_writer', 'wri', 'feedback'], ['fb', 'to_any', 'edt', 'feedback']]
            },
            {
                title: 'Sign-off and documentation',
                blurb: 'The Operations Lead reads the edited template beside the Tester report. On approval, the Output Format writes the template documentation: purpose, variables, parameters and sample results. Any change request goes back into the feedback loop.',
                nodes: [
                    { k: 'hum', type: 'agent_human', at: [8, 4], set: { title: 'Operations Lead sign-off', question: 'Can account managers send this template as it stands?', content: 'Show the edited template, the Tester report and the Critic verdict together. Approve only if all three sample clients pass with no edits beyond the placeholders. On a change request, send the notes back through the Revision Rules.' } },
                    { k: 'out', type: 'output', at: [9, 4], set: { title: 'Template Documentation', formatSchema: 'Markdown', content: 'Return the approved template as a Markdown document in five parts: a one-sentence purpose, the variables as a table with name, type, example and required, the template body in a code block, the parameters, and the three sample results with their outcome.' } }
                ],
                wires: [['edt', 'edited', 'hum', 'proposal'], ['hum', 'approved', 'out', 'in'], ['hum', 'changes', 'fb', 'in']]
            }
        ]
    });

    PB.showcases.push({
        id: 'template-family',
        group: 'Templates',
        title: 'Template Family Builder',
        tagline: 'One master template becomes four consistent message variants.',
        about: 'Harbourline Sync needs four messages that share one glossary and one set of tone rules: a support reply, a sales follow-up, a release note and a code review comment. A Team Lead splits the family, specialists draft each variant against Shared Notes, and an Aggregator and Term Checker keep them consistent before a Critic, a capped revision loop, an Editor, a versioning note and Human Approval.',
        chapters: [
            {
                title: 'One master, four variants',
                blurb: 'The family starts with one master template. The variant slot names which message is being written, and the glossary holds the product terms and tone rules that every variant must share.',
                nodes: [
                    { k: 'role', type: 'role', at: [0, 0], set: { title: 'Template Librarian', content: 'You maintain the prompt template library at Harbourline Sync, a 90-person software company that makes a scheduling tool for field engineers. You keep four customer and team messages consistent, and you never let a variant use a term the glossary does not define.' } },
                    { k: 'brief', type: 'user_input', at: [0, 1], set: { title: 'Template family request', inputName: 'template_brief', prompt: 'Which messages does the family cover, and what must every variant share?', content: 'The request from the content team. The Team Lead splits it, so keep it to the four messages and the rules they share.', defaultValue: 'Build one master template for four messages: a support reply, a sales follow-up, a release note and a code review comment. All four must use the same glossary, the same tone rules and the same product names, and each must stay under its word limit.' } },
                    { k: 'variant', type: 'variable', at: [0, 2], set: { title: 'Variant slot', varName: 'variant', content: 'The variant being written. One of support_reply, sales_follow_up, release_note or code_review.', defaultValue: 'support_reply' } },
                    { k: 'master', comp: ['meta', 'Prompt Template', { 'use case': 'the four messages Harbourline Sync sends to customers and its own engineers', var1: 'variant', var2: 'source_text', 'structured prompt with variable slots': 'Write a {{variant}} for Harbourline Sync. Use only the terms in the Shared Notes glossary, spelled exactly as written there. Open with the one thing the reader needs first. Take every fact from source_text and check each one against the glossary before you use it. Tone: plain, calm and direct, with no exclamation marks. Close with one next step. Stay within the word limit for the variant.' }], section: 'instructions', at: [1, 2], title: 'Master template' },
                    { k: 'glossary', type: 'glossary', at: [1, 0], set: { title: 'Shared glossary and tone rules', content: 'Harbourline Sync: the product name, always in this form. Field engineer: a user who works on site, never "technician". Job: one scheduled visit to a site, never "ticket" in customer text. Sync window: the 15 minute slot a job is booked into. Tone rules: plain English, no exclamation marks, no promise about a date we do not control, and "will" only where the product really does the thing. Release versions use three numbers, such as 4.2.0.' } }
                ],
                wires: [['role', 'out', 'glossary', 'in'], ['variant', 'out', 'master', 'in']]
            },
            {
                title: 'Split the work',
                blurb: 'The Team Lead reads the brief and the master, then hands one piece to each specialist. The glossary goes into Shared Notes so that every specialist reads the same terms.',
                nodes: [
                    { k: 'lead', type: 'agent_lead', at: [2, 1], set: { title: 'Team Lead', content: 'Split the family into four pieces. Give worker_a the support reply and worker_b the sales follow-up. Give worker_c the change list, which the Parallel Split turns into the release note and the code review comment. Put a one line summary of the split on the summary port. Do not draft any message yourself.' } },
                    { k: 'notes', type: 'agent_memory', at: [2, 0], set: { title: 'Shared Notes', content: 'Holds the glossary and the master template for every specialist to read. Agents may add a line but never edit an existing one. Each line names the variant it belongs to.' } }
                ],
                wires: [['brief', 'out', 'lead', 'task'], ['master', 'out', 'lead', 'context'], ['glossary', 'out', 'lead', 'reports'], ['glossary', 'out', 'notes', 'write']]
            },
            {
                title: 'Four specialists in parallel',
                blurb: 'Support and sales each get their own specialist. The release note and the code review both come from the same change list, so a Parallel Split sends that list to two specialists at once.',
                nodes: [
                    { k: 'w_support', type: 'agent_specialist', at: [3, 0], set: { title: 'Support Reply Specialist', specialty: 'Support reply', content: 'Write the reply to a field engineer whose job could not start. Open with what happened and when the job now runs. Use only glossary terms. Keep it under 180 words and end with one next step. On feedback, change only the lines that were named.' } },
                    { k: 'w_sales', type: 'agent_specialist', at: [3, 1], set: { title: 'Sales Follow-up Specialist', specialty: 'Sales follow-up', content: 'Write the follow-up to a site manager after a demo. Restate the one problem they named, then the one feature that solves it. No discounts and no dates we do not control. Under 120 words, with one question at the end.' } },
                    { k: 'par', type: 'parallel', at: [3, 2], set: { title: 'Change list split', content: 'Sends the change list to the release note and the code review comment at the same time. Both branches receive the full list, unedited.' } },
                    { k: 'w_release', type: 'agent_specialist', at: [4, 2], set: { title: 'Release Note Specialist', specialty: 'Release note', content: 'Write the release note for version 4.2.0 from the change list. Group changes under New, Changed and Fixed. Name each feature with its glossary term. Under 150 words.' } },
                    { k: 'w_review', type: 'agent_specialist', at: [4, 3], set: { title: 'Code Review Specialist', specialty: 'Code review comment', content: 'Write the review comment for the pull request on the sync window code. Name the file and line, state the risk in one sentence and propose one fix. Under 200 words. Do not restate the diff.' } }
                ],
                wires: [['lead', 'worker_a', 'w_support', 'task'], ['lead', 'worker_b', 'w_sales', 'task'], ['lead', 'worker_c', 'par', 'in'], ['par', 'branch1', 'w_release', 'task'], ['par', 'branch2', 'w_review', 'task'], ['notes', 'read', 'w_support', 'context'], ['notes', 'read', 'w_sales', 'context'], ['notes', 'read', 'w_release', 'context'], ['notes', 'read', 'w_review', 'context']]
            },
            {
                title: 'Merge and check',
                blurb: 'The four drafts are merged into one pack. The Consistency Aggregator checks that the variants agree on names, versions and promises, and the Term Checker tests every line against the glossary.',
                nodes: [
                    { k: 'merge', type: 'merge', at: [5, 1], set: { title: 'Merge the four drafts', content: 'Join the four drafts into one pack, one section per variant, in this order: support reply, sales follow-up, release note, code review comment. Keep each draft unedited.' } },
                    { k: 'agg', type: 'agent_aggregator', at: [6, 0], set: { title: 'Consistency Aggregator', content: 'Check that the four variants agree. The product name, field engineer and job must be spelled the same way, the version number must match the release note, and no variant may promise a date. List each conflict with the two lines that disagree and give a confidence score for the pack.' } },
                    { k: 'term', type: 'agent_fact_checker', at: [6, 2], set: { title: 'Term Checker', content: 'Check every term in the pack against the glossary. Mark each one as defined, undefined or misused and quote the line. Flag any sentence that makes a date promise.' } }
                ],
                wires: [['w_support', 'result', 'merge', 'in'], ['w_sales', 'result', 'merge', 'in'], ['w_release', 'result', 'merge', 'in'], ['w_review', 'result', 'merge', 'in'], ['lead', 'summary', 'agg', 'planner_out'], ['notes', 'read', 'agg', 'researcher_out'], ['merge', 'out', 'agg', 'writer_out'], ['merge', 'out', 'term', 'draft'], ['glossary', 'out', 'term', 'sources']]
            },
            {
                title: 'Critic and revision',
                blurb: 'The Pack Critic judges the whole pack against the glossary and the tone rules. The Feedback block sends every conflict and critique back to the specialists, and it stops after two rounds.',
                nodes: [
                    { k: 'crt', type: 'agent_critic', at: [7, 1], set: { title: 'Pack Critic', content: 'Judge the pack against the glossary and the tone rules. Rate each variant as ready, needs work or rewrite. For each one that needs work or a rewrite, give one concrete change. Do not rewrite the pack yourself.' } },
                    { k: 'fb', type: 'feedback', at: [8, 2], set: { title: 'Revision Rules', feedbackSource: 'Consistency Aggregator, Term Checker and Pack Critic', purpose: 'Revision', maxRounds: 2, content: 'Send each point back to the specialist who wrote that variant. Every point is work for the next round, or a plain reason why it is out of scope. After two rounds the pack goes forward as it stands.' } },
                    { k: 'fmt', comp: ['output', 'Output Format', { 'Structure / length / sections': 'a Markdown index table with one row per variant, then one section for each variant', N: '600' }], section: 'output', at: [6, 4], title: 'Pack format' }
                ],
                wires: [['merge', 'out', 'crt', 'draft'], ['brief', 'out', 'crt', 'task'], ['glossary', 'out', 'crt', 'criteria'], ['crt', 'critique', 'agg', 'critic_out'], ['agg', 'conflicts', 'fb', 'in'], ['term', 'flags', 'fb', 'in'], ['crt', 'feedback', 'fb', 'in'], ['fb', 'to_any', 'w_support', 'feedback'], ['fb', 'to_any', 'w_sales', 'feedback'], ['fb', 'to_any', 'w_release', 'feedback'], ['fb', 'to_any', 'w_review', 'feedback']]
            },
            {
                title: 'Edit, version and approve',
                blurb: 'The Pack Editor applies the output format and the word limits. The versioning note records what changed. Human Approval decides whether the pack ships, and a no goes back into the revision loop.',
                nodes: [
                    { k: 'edt', type: 'agent_editor', at: [7, 4], set: { title: 'Pack Editor', content: 'Tighten each variant to its word limit without changing its meaning. Keep glossary terms exactly as written. Put the index table at the top of the pack. List each change in one line.' } },
                    { k: 'ver', comp: ['core', 'Version Context', { 'version number': '1.4.0', 'what changed': 'the code review variant is new, and the sales follow-up now uses the approved tone rules', 'why this revision': 'support replies drifted from the glossary in the November review', date: '14 December 2026, after the first month of live use' }], section: 'quality', at: [8, 4], title: 'Versioning note' },
                    { k: 'hum', type: 'agent_human', at: [9, 3], set: { title: 'Editor in Chief sign-off', question: 'Does every variant match the glossary, and can the pack ship as template family 1.4.0?', content: 'Read the index table and the Term Checker flags first. Approve only when every variant is ready. A change request goes back into the revision loop.' } },
                    { k: 'out', type: 'output', at: [9, 4], set: { title: 'Template pack index', formatSchema: 'Markdown index table', content: 'The approved template pack for version 1.4.0: an index table with the variant, its word limit, its owner and its glossary status, then the master template, the shared glossary and the versioning note. Nothing ships without approval.' } }
                ],
                wires: [['agg', 'merged', 'edt', 'draft'], ['fmt', 'out', 'edt', 'style'], ['edt', 'edited', 'ver', 'in'], ['ver', 'out', 'hum', 'proposal'], ['hum', 'approved', 'out', 'in'], ['hum', 'changes', 'fb', 'in']]
            }
        ]
    });

    PB.showcases.push({
        id: 'template-fill-desk',
        group: 'Templates',
        title: 'The Template Fill Desk',
        tagline: 'A staff document filled from a template library, checked and signed off.',
        about: 'A document request for an offer letter, incident report or quote is routed to one template in the library. Missing values are asked for, validated against the rules, filled in, localised for the UK or Germany, checked for numbers and dates, and held for sign-off. When no template fits, a fallback hands a gap note to the template owner.',
        chapters: [
            {
                title: 'The request',
                blurb: 'A document request arrives with a type, a recipient and a market. Desk Triage rates it and names what is missing, then the Template Router picks one template from the library by its code.',
                nodes: [
                    { k: 'role', type: 'role', at: [0, 0], set: { title: 'HR Document Desk Lead', content: 'You run the document desk for Larkfield Partners Ltd, a 240-person recruitment and payroll firm in Leeds with a German subsidiary in Hamburg. Documents go to staff and candidates, so every name, figure and date must be right before anything is sent. Fill only from the template you are given and never add wording the template does not contain.' } },
                    { k: 'lib', type: 'variable', at: [1, 0], set: { title: 'Template library v2026.11', varName: 'template_library', content: 'OFFER-UK-03, offer letter, UK, version 3.2, 6 variables. OFFER-DE-02, Angebotsschreiben, Germany, version 2.4, 7 variables. INC-HS-02, incident report, health and safety, version 2.1, 9 variables. QUO-SV-04, quote for services, version 4.0, 8 variables.' } },
                    { k: 'req', type: 'user_input', at: [0, 2], set: { title: 'Document request', inputName: 'document_request', prompt: 'Which document do you need, for whom, and for which market?', content: 'The request from an HR coordinator, team lead or account manager. Name the document type, the recipient and the market.', defaultValue: 'Offer letter for Dara Whitcombe, Senior Data Analyst, Leeds office, start date 3 March 2027, UK market.' } },
                    { k: 'tri', type: 'agent_triage', at: [1, 2], set: { title: 'Desk Triage', content: 'Classify the request as offer letter, incident report, quote or other. Rate urgency high, medium or low: high if the start date is less than 21 days away or an incident is still open, medium if the requester names a deadline, low otherwise. List every value the template needs that the request does not give. Do not fill the template yet.' } },
                    { k: 'router', type: 'agent_router', at: [2, 1], set: { title: 'Template Router', content: 'Choose exactly one template from the library by its code. Match on document type first, then market. Send the choice to the Template Filler as the plan. If no template matches both the document type and the market, send the request to the fallback path and name the nearest template you rejected and why.' } }
                ],
                wires: [['role', 'out', 'tri', 'context'], ['req', 'out', 'tri', 'request'], ['tri', 'category', 'router', 'request'], ['role', 'out', 'router', 'context'], ['lib', 'out', 'router', 'capabilities']]
            },
            {
                title: 'Asking for the missing values',
                blurb: 'The template variables are listed with their formats. Clarifying Questions turns the gaps into a short list, and a Human Approval stop holds the work until the requester has answered every one.',
                nodes: [
                    { k: 'tv', type: 'input_parameters', at: [2, 3], set: { title: 'Offer letter variables', paramName: 'offer_letter_fields', paramType: 'text list', paramValues: 'candidate_name, job_title, department_code, start_date, annual_salary, currency, notice_period_weeks', content: 'Every variable in OFFER-UK-03. start_date is an ISO date. annual_salary is a whole number. currency is GBP or EUR. notice_period_weeks is between 1 and 12. A value the request does not give is asked for, never guessed.' } },
                    { k: 'clar', type: 'meta_clarify', at: [3, 3], set: { title: 'Missing Variables', maxQuestions: 5, content: 'Ask for each missing variable in one plain question, with the expected format in brackets, such as [ISO date, for example 2027-03-03]. Ask no more than five questions. Never ask for bank details, passport numbers or home address history, because the offer letter does not use them.' } },
                    { k: 'human', type: 'agent_human', at: [4, 3], set: { title: 'Requester Approval', question: 'Please confirm the missing values before the letter is filled.', content: 'Show the questions from Missing Variables, each with a blank field. Continue only when every required variable has a value. Record who answered and when.' } }
                ],
                wires: [['tv', 'out', 'clar', 'in'], ['tri', 'questions', 'clar', 'in'], ['clar', 'out', 'human', 'proposal']]
            },
            {
                title: 'Gating the values',
                blurb: 'Answers are saved as an entered dataset. The Validation Gate checks each value against the rules before the writer sees it, and the minimisation rule keeps bank and passport details out of the draft.',
                nodes: [
                    { k: 'vals', type: 'structured_dataset', at: [5, 3], set: { title: 'Entered values', format: 'JSON', schemaNote: 'One object per variable: name, value and source.', content: 'The values as the requester entered them, one row per variable, with the exact original text kept so the checker can compare it later.' } },
                    { k: 'vg', comp: ['control', 'Validation Gate', { 'what is validated': 'the offer letter variables in Entered values', 'type / range / format': 'annual_salary is a whole number from 18000 to 250000, start_date is an ISO date at least 14 days after today, currency is GBP or EUR', 'referential integrity': 'department_code exists in the Larkfield org chart and job_title matches its grade', 'business rule': 'a salary above 60000 needs a second sign-off from the HR Business Partner', 'error message': 'the field name, the rule it broke and the value that was entered', 'correction step': 'return the field to Requester Approval with the exact rule quoted', 'details': 'field name, rule number, value and timestamp', 'who can bypass and how': 'nobody bypasses the salary rule, and the Head of People can override a date rule in writing' }], section: 'constraints', at: [6, 3], title: 'Value gate' },
                    { k: 'priv', comp: ['guardrails', 'Data Minimisation Rule', { 'task': 'drafting a UK offer letter or a German Angebotsschreiben', 'unnecessary PII': 'home address history, bank details, passport or visa numbers, date of birth', 'do not store or repeat it back unnecessarily': 'bank, passport and date of birth must not appear in the draft or the notes' }], section: 'constraints', at: [5, 5], title: 'Data minimisation' }
                ],
                wires: [['human', 'approved', 'vals', 'in'], ['vals', 'out', 'vg', 'in'], ['vals', 'out', 'priv', 'in']]
            },
            {
                title: 'Filling and localising',
                blurb: 'The Template Filler fills the chosen template and changes nothing else. The Specialist then produces the UK and German versions, following the locale rules and keeping every figure the same.',
                nodes: [
                    { k: 'wri', type: 'agent_writer', at: [7, 2], set: { title: 'Template Filler', content: 'Fill OFFER-UK-03 from the validated values only. Keep every clause in its original order and wording, changing only the bracketed fields. Write salaries as GBP 46,500 a year and dates in full, such as 3 March 2027. On a revision round, fix each point raised and list the fields you changed.' } },
                    { k: 'tr', type: 'translation', at: [7, 4], set: { title: 'Locale rules', targetLocale: 'en-GB and de-DE', register: 'formal, with Sie in German', content: 'UK letters use British spelling and dates such as 3 March 2027. German letters use Sie, dates such as 3. März 2027 and amounts such as 46.500 EUR. Never translate the template code, the job title grade or the legal entity name.' } },
                    { k: 'spec', type: 'agent_specialist', at: [8, 2], set: { title: 'UK and German Localiser', specialty: 'UK and German localisation', content: 'Turn the filled letter into two finished versions: the UK letter in en-GB and the German Angebotsschreiben in de-DE, following the Locale rules. Check that both versions show the same salary, start date and notice period. Flag any clause that German employment law requires to be worded differently, for the legal team to decide. Do not change it yourself.' } }
                ],
                wires: [['vg', 'out', 'wri', 'task'], ['router', 'to_writer', 'wri', 'plan'], ['priv', 'out', 'wri', 'context'], ['req', 'out', 'tr', 'in'], ['wri', 'draft', 'spec', 'task'], ['tr', 'out', 'spec', 'context']]
            },
            {
                title: 'Numbers and dates',
                blurb: 'The Fact-Checker compares every figure and date in the finished letter with the entered values. A Letter Critic reads both letters for completeness and tone, and a Values quality check scores the input first.',
                nodes: [
                    { k: 'dq', comp: ['core', 'Data Quality Check', {}], section: 'quality', at: [5, 1], title: 'Values quality check' },
                    { k: 'chk', type: 'agent_fact_checker', at: [9, 1], set: { title: 'Numbers and Dates Checker', content: 'Compare every figure and date in the finished letter with the Entered values. Mark each as verified, unverified or contradicted, and quote the field that contradicts it. Check that the notice period ends on a working day and that 3 March 2027, a Wednesday, is the start date.' } },
                    { k: 'crit', type: 'agent_critic', at: [9, 3], set: { title: 'Letter Critic', content: 'Read the UK letter and the German letter against the brief. Check that the offer is complete, that the start date is a working day and that the tone is plain and warm. List issues by severity. For each blocker give one concrete rewrite of the sentence. Do not rewrite the letter yourself.' } }
                ],
                wires: [['vals', 'out', 'dq', 'in'], ['dq', 'out', 'chk', 'sources'], ['spec', 'result', 'chk', 'draft'], ['spec', 'result', 'crit', 'draft'], ['req', 'out', 'crit', 'task']]
            },
            {
                title: 'Fallback and revision',
                blurb: 'When no template fits, the fallback path stops the fill and hands a gap note to the template owner. Checker and critic findings go through a Feedback block that allows two rounds before the open points go back to the requester.',
                nodes: [
                    { k: 'fbk', type: 'fallback', at: [3, 0], set: { title: 'No template path', content: 'Used when the Template Router finds no template for the document type and market. Stop the fill, keep the request as received, and write one line naming the nearest template and the gap. Never produce a partial letter.' } },
                    { k: 'hand', type: 'agent_handoff', at: [4, 0], set: { title: 'Template gap handoff', content: 'Write a short note for the template owner: the request, the nearest template, the missing document type or market, and the start date. Send it to escalate so the owner can add a template. Log each handoff with the requester name and the date.' } },
                    { k: 'fb', type: 'feedback', at: [8, 4], set: { title: 'Revision rules', feedbackSource: 'Numbers and Dates Checker and Letter Critic', purpose: 'Revision', maxRounds: 2, content: 'Send every contradicted figure and every blocker back to the Template Filler with the field name. After two rounds, stop looping and send the open points to Requester Approval.' } }
                ],
                wires: [['router', 'fallback', 'fbk', 'in'], ['fbk', 'out', 'hand', 'from'], ['req', 'out', 'hand', 'context'], ['chk', 'flags', 'fb', 'in'], ['crit', 'feedback', 'fb', 'in'], ['fb', 'to_writer', 'wri', 'feedback']]
            },
            {
                title: 'Sign-off',
                blurb: 'The finished letters need a clear yes from the HR Business Partner. The Output Format then returns the approved pack, or only the handoff note when no template fitted.',
                nodes: [
                    { k: 'sign', type: 'agent_human', at: [8, 5], set: { title: 'Final Sign-off', question: 'Is this ready to send to the candidate?', content: 'Show the UK letter, the German letter and the checker report together. Continue only on a clear yes from the HR Business Partner. On a no, return the note to the Template Filler with the reason.' } },
                    { k: 'out', type: 'output', at: [6, 0], set: { title: 'Document pack', formatSchema: 'Plain text', content: 'Return the approved UK letter and German letter, each with its template code and version, then the checker report with its count of verified figures. If the request was handed off instead, return only the handoff note. Plain text, no markdown.' } }
                ],
                wires: [['spec', 'result', 'sign', 'proposal'], ['sign', 'approved', 'out', 'in'], ['hand', 'escalate', 'out', 'in']]
            }
        ]
    });

    PB.showcases.push({
        id: 'template-migration',
        group: 'Templates',
        title: 'Template Migration Crew',
        tagline: 'Moves 200 old prompt templates to schema v3 without changing what they say.',
        about: 'A prompt library has 200 templates, each with its own way of naming a variable. The crew inventories every placeholder style, maps each old name to its v3 name and writes the migration rules, then proves them on 12 awkward samples. A Red Team tries to break the rules. Failures get two retries, then go to quarantine and their owners. A Judge rules on the batch and a person signs it off before anything is written.',
        chapters: [
            {
                title: 'Inventory the estate',
                blurb: 'The migration starts with a count. The Estate Analyst reads the export of all 200 templates and records every placeholder style, so the rules are written for what the library really holds, not for what the team remembers.',
                nodes: [
                    { k: 'role', type: 'role', at: [0, 0], set: { title: 'Migration Lead', content: 'You lead the move of 200 prompt templates from schema v2 to schema v3 for the Support Ops team. A migrated template must say exactly what the original said. A template that cannot be migrated safely is quarantined, never guessed at.' } },
                    { k: 'src', type: 'user_input', at: [0, 2], set: { title: 'Template export', inputName: 'template_export', prompt: 'Which export file holds the 200 templates?', content: 'The nightly export from the prompt library, one row per template with its owner, schema version and raw text.', defaultValue: 'templates_v2_export_2026-11-14.csv' } },
                    { k: 'ana', type: 'agent_analyst', at: [1, 1], set: { title: 'Estate Analyst', content: 'Read all 200 rows. Count the placeholder styles in use, such as double curly braces, single curly braces, square brackets and percent signs. List the ten most common variable names with how often each appears. Flag every template with no owner.' } },
                    { k: 'inv', type: 'structured_dataset', at: [2, 1], set: { title: 'Template inventory', format: 'CSV', content: 'One row per template: id, owner, placeholder style, variable count, nested placeholders (yes or no), defaults present (yes or no).', schemaNote: 'Owner is required. A row with a blank owner goes straight to the Quarantine Path.' } },
                    { k: 'v3', type: 'data_schema', at: [2, 3], set: { title: 'Schema v3 target', schemaName: 'prompt_template_v3', content: 'Every variable is snake_case and sits in a named group, for example customer.first_name. Each variable has a type (text, number, date or list), a default and a one-line description. Placeholders never nest. Names use only letters, digits, dots and underscores.' } }
                ],
                wires: [['role', 'out', 'ana', 'context'], ['src', 'out', 'ana', 'data'], ['v3', 'out', 'ana', 'question'], ['ana', 'analysis', 'inv', 'in']]
            },
            {
                title: 'Mapping old names to new',
                blurb: 'Every old name needs exactly one new home. The Variable Mapper maps the legacy names, the Data Dictionary Generator defines each target, and the glossary lets a reviewer who never saw the export read the mapping cold.',
                nodes: [
                    { k: 'spec', type: 'agent_specialist', at: [3, 1], set: { title: 'Variable Mapper', specialty: 'Variable mapping', content: 'Map every legacy variable to a schema v3 name in its correct group. Where two old names mean the same thing, map both to one name and say so. Where an old name has no clear meaning, do not guess: mark it unmapped and give the template ids where it appears.' } },
                    { k: 'dd', comp: ['data', 'Data Dictionary Generator', {}], section: 'knowledge', at: [3, 3], title: 'Target definitions' },
                    { k: 'map', type: 'structured_dataset', at: [4, 1], set: { title: 'Variable map', format: 'CSV', content: 'Columns: old name, v3 name, group, type, default, templates affected, status (mapped or unmapped).', schemaNote: 'Each old name appears once. Unmapped rows block the batch until a person decides them.' } },
                    { k: 'gl', type: 'glossary', at: [4, 3], set: { title: 'Legacy name glossary', content: 'customer_name, CustomerName, cust_nm and client all mean customer.full_name. Sort the entries by schema group so an owner can find the name they used.' } },
                    { k: 'fmt', comp: ['output', 'Glossary Format', { 'clear, concise definition': 'one line saying what the variable holds', 'usage example': 'customer.first_name renders as Ada', 'related terms': 'customer.full_name and account.name', definition: 'the same meaning, shorter, for the second entry', 'alphabetical/thematic': 'thematic, by schema group' }], section: 'output', at: [4, 5] }
                ],
                wires: [['inv', 'out', 'spec', 'task'], ['v3', 'out', 'spec', 'context'], ['spec', 'result', 'map', 'in'], ['spec', 'notes', 'gl', 'in'], ['inv', 'out', 'dd', 'in'], ['dd', 'out', 'gl', 'in'], ['gl', 'out', 'fmt', 'in']]
            },
            {
                title: 'Rules, samples and retries',
                blurb: 'The Migration Coder turns the map into rules that change only placeholder names and never the wording. The Tester runs them on 12 awkward samples. A Retry Handler gives each failure two more attempts before it is set aside.',
                nodes: [
                    { k: 'cod', type: 'agent_coder', at: [5, 1], set: { title: 'Migration Coder', content: 'Write the migration rules as one pure Python function per schema group. No file writes. Each rule keeps the template text unchanged apart from the placeholder names. An unmapped name raises an error that names the template id. Where v2 has no default, add the default from the v3 schema and say which one you used.' } },
                    { k: 'samp', type: 'structured_dataset', at: [5, 3], set: { title: 'Twelve awkward samples', format: 'JSON lines', content: 'Two templates with a placeholder inside another placeholder, three with no defaults, one with a placeholder inside a code block, one with an unmatched brace and six typical templates. Each row holds the v2 text and the expected v3 text.', schemaNote: 'The expected v3 text is written by each template owner. It is never generated by the crew.' } },
                    { k: 'tes', type: 'agent_tester', at: [6, 1], set: { title: 'Migration Tester', content: 'Run the rules on all 12 samples. Compare the rendered text with the expected v3 text character for character. Report pass or fail for each template, and for each failure the first line that differs.' } },
                    { k: 'ret', type: 'retry', at: [6, 3], set: { title: 'Retry Handler', condition: 'Migrated text differs from the expected v3 text', maxAttempts: 2, content: 'Send a failing template back to the Coder with its first differing line. Two attempts only. A third attempt is never made, and a template still failing moves to the Quarantine Path.' } }
                ],
                wires: [['map', 'out', 'cod', 'plan'], ['inv', 'out', 'cod', 'task'], ['v3', 'out', 'cod', 'context'], ['cod', 'code', 'tes', 'code'], ['samp', 'out', 'tes', 'task'], ['tes', 'failures', 'ret', 'in'], ['ret', 'out', 'cod', 'feedback']]
            },
            {
                title: 'Break it on purpose',
                blurb: 'The Red Team tries to break the rules with nested placeholders, missing defaults and names that collide. An Assumption Audit states what the team is taking for granted. Every finding goes through a Feedback block that allows two revision rounds, then stops.',
                nodes: [
                    { k: 'assume', comp: ['reasoning', 'Assumption Audit', { 'state clearly': 'the export is complete and every row is a live template, not a draft' }], section: 'approach', at: [6, 0], title: 'Team assumptions' },
                    { k: 'rt', type: 'agent_red_team', at: [7, 1], set: { title: 'Red Team', content: 'Attack the rules. Try a placeholder nested inside another, a variable with no default, two old names that collide on one new name, placeholders inside quotes or code blocks, an empty owner and a template with 400 variables. For each finding give the template id, the input that breaks it and the smallest fix.' } },
                    { k: 'fb', type: 'feedback', at: [7, 3], set: { title: 'Migration revision rules', feedbackSource: 'Migration Tester and Red Team', purpose: 'Revision', maxRounds: 2, content: 'Every finding becomes work for the Coder in the next round, or it is written down as out of scope with a reason. After two rounds, any finding still open goes to the Quarantine Path.' } }
                ],
                wires: [['cod', 'code', 'rt', 'target'], ['assume', 'out', 'rt', 'context'], ['rt', 'findings', 'fb', 'in'], ['tes', 'feedback', 'fb', 'in'], ['fb', 'to_any', 'cod', 'feedback']]
            },
            {
                title: 'Quarantine and hand over',
                blurb: 'Templates that cannot be migrated are not forced through. The Quarantine Path holds them, the Batch Summariser states what was and was not moved, and the Owner Handoff sends each owner the one decision they need to make.',
                nodes: [
                    { k: 'fbk', type: 'fallback', at: [8, 0], set: { title: 'Quarantine Path', content: 'Hold every template still failing, with its id, its owner and its first differing line. Nothing on this list is written to schema v3 in this batch.' } },
                    { k: 'sum', type: 'agent_summariser', at: [8, 2], set: { title: 'Batch Summariser', content: 'Write the batch summary in five lines: templates migrated, templates quarantined, variables unmapped, defaults added and the three riskiest rules. Keep every number exact.' } },
                    { k: 'hand', type: 'agent_handoff', at: [9, 0], set: { title: 'Owner Handoff', content: 'For each quarantined template, write a note to its owner with the template id, the line that failed, the one decision needed from them and the date the batch closes. One note per owner, not one per template.' } }
                ],
                wires: [['tes', 'failures', 'fbk', 'in'], ['fbk', 'out', 'hand', 'from'], ['fmt', 'out', 'hand', 'context'], ['tes', 'tests', 'sum', 'source'], ['inv', 'out', 'sum', 'brief']]
            },
            {
                title: 'Approve the batch',
                blurb: 'The Judge weighs the summary and the Red Team fixes against the v3 schema. A Decision Checklist sets the walk-away points for the approver. Human Approval holds the batch until a person has read both, and only then is the report written.',
                nodes: [
                    { k: 'jud', type: 'agent_judge', at: [8, 3], set: { title: 'Batch Judge', content: 'Rule on the batch as ready or not ready. Ready only if every sample passes, every Red Team finding is fixed or quarantined, and no unmapped name remains in a migrated template. Give the rationale in three sentences.' } },
                    { k: 'dec', comp: ['core', 'Decision Checklist', { 'what would make you walk away': 'any template migrated with a guessed default or a dropped placeholder', 'what happens if you do nothing': 'v2 names keep breaking when the old schema retires on 1 March 2027' }], section: 'success', at: [8, 5], title: 'Approval checklist' },
                    { k: 'hum', type: 'agent_human', at: [9, 5], set: { title: 'Batch Approval', question: 'Approve the migration of all 200 templates to schema v3?', content: 'Read the Batch Judge verdict, the Batch Summariser and the quarantine list. Approve only if no template was migrated with a guessed default and every quarantined owner has been told.' } },
                    { k: 'out', type: 'output', at: [9, 4], set: { title: 'Migration Report', formatSchema: 'Markdown', content: 'A report for the Support Ops lead: batch numbers, the rules that changed, the quarantine list by owner and the approval record. Written only after Human Approval says yes.' } }
                ],
                wires: [['sum', 'summary', 'jud', 'option_a'], ['rt', 'fixes', 'jud', 'option_b'], ['v3', 'out', 'jud', 'criteria'], ['jud', 'verdict', 'dec', 'in'], ['dec', 'out', 'hum', 'proposal'], ['hum', 'approved', 'out', 'in']]
            }
        ]
    });

    PB.showcases.push({
        id: 'newsroom',
        group: 'Teams at work',
        title: 'The Newsroom',
        tagline: 'An investigative feature from brief to approved copy.',
        about: 'A reporting desk in one prompt. A request is triaged, planned and researched, written, fact checked, read cold by the audience, revised in a capped loop and held for an editor sign-off.',
        chapters: [
            {
                title: 'The assignment',
                blurb: 'Every story starts as a request. Triage names what it is and how urgent it is, and the Planner turns it into an ordered plan before anyone reports a word.',
                nodes: [
                    { k: 'brief', type: 'user_input', at: [0, 1], set: { title: 'Story brief', inputName: 'story_brief', prompt: 'What is the story, and who is it for?', content: 'The assignment from the news desk. Every agent works from this.', defaultValue: 'Why are rents in mid-sized UK cities rising faster than wages, and what is working elsewhere?' } },
                    { k: 'role', type: 'role', at: [0, 0], set: { title: 'Managing Editor', content: 'You run a national newsroom. You are sceptical, fair and fast, and you will not let a claim through without a source.' } },
                    { k: 'tri', type: 'agent_triage', at: [1, 1], set: { title: 'News Desk Triage', content: 'Classify the brief as breaking, feature or explainer. Rate urgency as high, medium or low with one reason. List what you would need to know before reporting starts. Do not begin the story.' } },
                    { k: 'plan', type: 'agent_planner', at: [2, 1], set: { title: 'Story Planner', content: 'Break the brief into a reporting plan: the angle, five questions the story must answer, the sources to approach and the three biggest risks to accuracy. Order the steps so the hardest question is tackled first.' } },
                    { k: 'assume', comp: ['reasoning', 'Assumption Audit', { 'state clearly': 'state it in one plain sentence' }], section: 'approach', at: [2, 3] }
                ],
                wires: [['role', 'out', 'tri', 'context'], ['brief', 'out', 'tri', 'request'], ['brief', 'out', 'plan', 'task'], ['tri', 'priority', 'plan', 'constraints'], ['assume', 'out', 'plan', 'context']]
            },
            {
                title: 'Reporting and notes',
                blurb: 'The Researcher works the plan. A Summariser keeps the findings short enough to use, and Shared Notes holds every source where all the agents can read it.',
                nodes: [
                    { k: 'res', type: 'agent_researcher', at: [3, 0], set: { title: 'Lead Reporter', content: 'Work through the plan question by question. For each claim give the figure, the source, its date and how far you trust it. Separate what is documented from what is only asserted.' } },
                    { k: 'sum', type: 'agent_summariser', at: [4, 0], set: { title: 'Notes Summariser', content: 'Cut the findings to what the plan needs. Keep every figure, name and date exactly as reported. End with one line naming what you left out and why.' } },
                    { k: 'mem', type: 'agent_memory', at: [3, 2], set: { title: 'Source Notebook', content: 'Keep one line per source: who said it, where it was published, the date and the claim it supports. Agents may add sources but never edit an existing line.' } }
                ],
                wires: [['brief', 'out', 'res', 'task'], ['plan', 'plan', 'res', 'context'], ['res', 'findings', 'sum', 'source'], ['plan', 'priorities', 'sum', 'brief'], ['res', 'sources', 'mem', 'write']]
            },
            {
                title: 'Write it, check it',
                blurb: 'The Writer drafts from the plan and the notes. A Fact Check Gate from the Component Library sets the standard for every claim, and the Fact Checker holds the draft to it.',
                nodes: [
                    { k: 'wri', type: 'agent_writer', at: [5, 1], set: { title: 'Feature Writer', content: 'Lead with the human story, then the numbers. Follow the plan, use only facts from the notes and label every figure with its source. On a revision round, resolve every point raised and say what changed.' } },
                    { k: 'gate', comp: ['guardrails', 'Fact Check Gate', { 'High / Medium / Low': 'High, Medium or Low', 'known fact / inference / uncertain': 'known fact, inference or uncertain', 'flag, caveat, or omit': 'flag it, caveat it or leave it out' }], section: 'constraints', at: [5, 3] },
                    { k: 'chk', type: 'agent_fact_checker', at: [6, 0], set: { title: 'Fact Checker', content: 'Check every figure and every named claim against the Source Notebook. Mark each as verified, unverified or contradicted. Quote the line that contradicts it.' } }
                ],
                wires: [['plan', 'plan', 'wri', 'plan'], ['sum', 'summary', 'wri', 'context'], ['brief', 'out', 'wri', 'task'], ['gate', 'out', 'wri', 'notes'], ['wri', 'draft', 'chk', 'draft'], ['mem', 'read', 'chk', 'sources']]
            },
            {
                title: 'A reader and a critic',
                blurb: 'An Audience Reviewer reads the draft cold and says where it lost them. The Critic judges the whole piece. Both sets of notes go back through a Feedback block that caps the rounds at two.',
                nodes: [
                    { k: 'aud', type: 'agent_audience', at: [6, 2], set: { title: 'Reader Panel', content: 'Read as a renter in their thirties who has never followed housing policy. Note the first place you got lost, any number you did not believe and whether you would share this.' } },
                    { k: 'crt', type: 'agent_critic', at: [7, 1], set: { title: 'Section Editor', content: 'Judge the draft against the brief and the plan. List issues by severity. For every blocker give one concrete rewrite. Do not rewrite the piece yourself.' } },
                    { k: 'fb', type: 'feedback', at: [7, 3], set: { title: 'Revision Rules', feedbackSource: 'Fact Checker, Reader Panel and Section Editor', purpose: 'Revision', maxRounds: 2, content: 'Treat every point as work to do. Fix it in the next round or say plainly why it is out of scope.' } }
                ],
                wires: [['wri', 'draft', 'aud', 'draft'], ['brief', 'out', 'crt', 'task'], ['wri', 'draft', 'crt', 'draft'], ['chk', 'flags', 'fb', 'in'], ['aud', 'confusions', 'fb', 'in'], ['crt', 'feedback', 'fb', 'in'], ['fb', 'to_writer', 'wri', 'feedback']]
            },
            {
                title: 'Polish and sign off',
                blurb: 'An Editor tightens the revised draft against a Report Structure component. Nothing is published until Human Approval says yes, then the Output Format fixes what comes out.',
                nodes: [
                    { k: 'edt', type: 'agent_editor', at: [8, 1], set: { title: 'Copy Editor', content: 'Tighten without changing meaning. Keep sentences under 25 words, cut hedging and make every heading a claim. List each change in one line.' } },
                    { k: 'rep', comp: ['writing', 'Report Structure', { title: 'the story headline', '2-3 sentences': 'two or three sentences', context: 'why this matters now', how: 'how the reporting was done', facts: 'the verified figures', interpretation: 'what the figures mean', actions: 'what readers or councils could do' }], section: 'output', at: [8, 3] },
                    { k: 'hum', type: 'agent_human', at: [9, 1], set: { title: 'Editor in Chief', question: 'Is this accurate, fair and ready to publish?', content: 'Show the finished piece and the Fact Checker flags together. Continue only on a clear yes. On a no, return the editor notes to the Writer.' } },
                    { k: 'out', type: 'output', at: [9, 3], set: { title: 'Published Feature', formatSchema: 'Markdown', content: 'Return the approved feature in Markdown with a headline, a standfirst of one sentence, subheadings and a boxed list of sources at the end.' } }
                ],
                wires: [['wri', 'revised_draft', 'edt', 'draft'], ['edt', 'edited', 'hum', 'proposal'], ['hum', 'approved', 'out', 'in'], ['rep', 'out', 'out', 'in']]
            }
        ]
    });

    PB.showcases.push({
        id: 'launch-war-room',
        group: 'Teams at work',
        title: 'Launch War Room',
        tagline: 'Six weeks to decide whether a paid tier ships, argued from every side.',
        about: 'A fintech launch decision in one prompt. Ideas are generated and voted on, then a Proponent and a Devil\'s Advocate argue the case under a Moderator while an Analyst reads the numbers. A Red Team attacks the plan, a Plan Reviser answers it in capped rounds, an Aggregator merges every strand and a human signs off the decision.',
        chapters: [
            {
                title: 'Ideas and a vote',
                blurb: 'Brightjar has 412,000 monthly users and six weeks. The Brainstormer proposes ways to charge without touching the free plan, a scoring sheet ranks the ideas, and a Consensus Vote picks the shape the war room will argue over.',
                nodes: [
                    { k: 'ask', type: 'user_input', at: [0, 1], set: { title: 'Launch question', inputName: 'launch_question', prompt: 'Should Brightjar launch a paid tier by 28 December, and in what shape?', content: 'The one decision the war room must reach. Every agent works from this question and the Aggregator closes it.', defaultValue: 'Should Brightjar launch Brightjar Plus, a paid tier, by 28 December? Our working target is 1.5 per cent of the 412,000 monthly active users paying within the first quarter, about 6,200 people.' } },
                    { k: 'role', type: 'role', at: [0, 0], set: { title: 'War Room Chair', content: 'You chair the Brightjar launch war room. You want a decision by Friday, you distrust any number without a source, and you say plainly when a date is a guess.' } },
                    { k: 'brain', type: 'agent_brainstormer', at: [1, 1], set: { title: 'Monetisation Brainstormer', content: 'Propose 12 ways Brightjar could charge for extra features without changing the free plan that most users rely on. Put any idea that needs a change to app store billing in the wildcards, because billing cannot change inside six weeks. Give each idea one line.' } },
                    { k: 'pool', comp: ['ideation', 'Idea Scoring', {}], section: 'approach', at: [1, 3], title: 'Scoring sheet for the six-week window' },
                    { k: 'opt', type: 'variable', at: [2, 0], set: { title: 'Option C: hold the launch', varName: 'hold_option', content: 'Keep the app free, put the six weeks into retention work on the 4.2 per cent monthly churn, and revisit a paid tier in the spring.' } },
                    { k: 'vote', type: 'agent_vote', at: [2, 2], set: { title: 'Consensus Vote', content: 'Three candidate launch shapes. Vote for one, state the margin and record the strongest dissent in one sentence. Close the question only with two votes in three, otherwise send the top two candidates to the debate.' } }
                ],
                wires: [['role', 'out', 'brain', 'context'], ['ask', 'out', 'brain', 'task'], ['brain', 'ideas', 'pool', 'in'], ['pool', 'out', 'vote', 'candidate_a'], ['brain', 'wildcards', 'vote', 'candidate_b'], ['opt', 'out', 'vote', 'candidate_c']]
            },
            {
                title: 'Price and the numbers',
                blurb: 'The Analyst reads the usage figures against the price options and the unit economics. Every number carries its source and date, so the debate that follows argues from the same facts.',
                nodes: [
                    { k: 'usage', type: 'variable', at: [3, 0], set: { title: 'Usage and beta figures', varName: 'usage_figures', content: 'Last 90 days: 412,000 monthly active users. 1.9 per cent of them, 7,828 people, have paid in the closed beta. Paid beta churn is 4.2 per cent a month. Support tickets run at 14 per 1,000 users a month. Source: product analytics export, 9 November 2026.' } },
                    { k: 'ana', type: 'agent_analyst', at: [4, 0], set: { title: 'Analyst', content: 'Read the usage figures against the price options and the unit economics. Work out the paying base at 1.5 per cent and the monthly revenue at each price. Name the weakest number and what it would take to fix it. Flag any figure with no source.' } },
                    { k: 'price', comp: ['business', 'Pricing Strategy', { 'subscription / one-time / usage': 'monthly at £4.99 or £7.99, or annual at £49', 'min to be profitable': '£3.10 a month after store fees and support', 'max WTP': '£8.50 a month, from 1,200 survey answers' }], section: 'approach', at: [3, 2], title: 'Price options for Brightjar Plus' },
                    { k: 'unit', comp: ['business', 'Unit Economics', { 'cost to acquire': '£11.40 blended across paid search and referrals', 'lifetime value': '£71 gross margin over 18 months at 4.2 per cent churn' }], section: 'context', at: [4, 2], title: 'Unit economics at £7.99' }
                ],
                wires: [['usage', 'out', 'ana', 'data'], ['ask', 'out', 'ana', 'question'], ['price', 'out', 'ana', 'context'], ['unit', 'out', 'ana', 'context']]
            },
            {
                title: 'The debate',
                blurb: 'The Moderator turns the Analyst insights into a case for and a case against. The Proponent and the Devil\'s Advocate argue their side, and the Judge weighs both against the three tests the Moderator sets.',
                nodes: [
                    { k: 'mod', type: 'agent_moderator', at: [5, 0], set: { title: 'Debate Moderator', content: 'Run one round of debate. Give the Proponent the case for launching by 28 December and the Devil\'s Advocate the case against. Keep each side to 150 words, then set out the three tests the Judge must apply.' } },
                    { k: 'steel', comp: ['reasoning', 'Steelman Argument', { 'best version of counter': 'a six-week paid launch lands in the busiest and most distracted weeks of the year for new subscriptions, and a rushed billing path could cost the trust the free plan has built' }], section: 'approach', at: [5, 2], title: 'Strongest counter to the launch' },
                    { k: 'prop', type: 'agent_proponent', at: [6, 0], set: { title: 'Proponent', content: 'Make the strongest honest case for launching on 28 December. Lead with the 1.5 per cent target and the £71 lifetime value. Name the one assumption you rely on most and the figure that would prove it wrong.' } },
                    { k: 'adv', type: 'agent_advocate', at: [6, 2], set: { title: 'Devil\'s Advocate', content: 'Argue against launching on 28 December. Start from the 4.2 per cent monthly churn and the 14 tickets per 1,000 users. Give each objection with the number it rests on. Do not offer alternatives, that is the Judge\'s job.' } },
                    { k: 'judge', type: 'agent_judge', at: [7, 1], set: { title: 'Judge', content: 'Weigh the Proponent case against the objections using the three tests from the Moderator. Return a verdict of launch on 28 December, delay to the spring or redesign the tier, with a confidence out of ten and a rationale of 120 words or fewer.' } }
                ],
                wires: [['ask', 'out', 'mod', 'task'], ['ana', 'insights', 'mod', 'context'], ['mod', 'pro', 'prop', 'proposal'], ['ana', 'analysis', 'prop', 'context'], ['adv', 'objections', 'prop', 'objections'], ['mod', 'con', 'adv', 'proposal'], ['steel', 'out', 'adv', 'context'], ['prop', 'case', 'judge', 'option_a'], ['adv', 'objections', 'judge', 'option_b'], ['mod', 'judge', 'judge', 'criteria']]
            },
            {
                title: 'Red team the plan',
                blurb: 'The Red Team attacks the launch plan as a hostile rival and then as a sceptical regulator. A Pre-mortem and a Risk-Reward Matrix feed it, and the Plan Reviser answers every finding in two capped rounds.',
                nodes: [
                    { k: 'plan', type: 'variable', at: [7, 4], set: { title: 'Six-week launch plan', varName: 'launch_plan', content: 'Weeks 1 and 2: lock prices at £7.99 a month and £49 a year, freeze the billing code, run store billing tests on iOS and Android. Week 3: paywall to 10 per cent of users. Week 4: hire two temporary support agents and write a one-tap rollback switch. Weeks 5 and 6: full release on 28 December.' } },
                    { k: 'rr', comp: ['analysis', 'Risk-Reward Matrix', { 'decision/opportunity': 'the paid tier launch on 28 December', 'list opportunities': 'high reward and low risk: annual plan sign-ups from existing users; high reward and high risk: a paywall on the payments screen; low reward and low risk: a founding member badge; low reward and high risk: a store-only price change', 'the best risk-adjusted opportunity': 'annual plan sign-ups from existing users, with the monthly price held', 'our appetite for risk in this domain': 'low, because a billing error reaches people whose money is at stake' }], section: 'context', at: [7, 3], title: 'Where the risk sits' },
                    { k: 'rt', type: 'agent_red_team', at: [8, 1], set: { title: 'Red Team', content: 'Attack the plan first as a hostile rival, then as a sceptical regulator. Find the three most likely failures, the date each one would bite and a fix that fits inside the six weeks. Rank them by damage to paying users.' } },
                    { k: 'pre', comp: ['reasoning', 'Pre-mortem Analysis', { 'project/plan': 'the paid tier launch on 28 December', 'describe the failure in detail': 'paid sign-ups stall in the holiday week, store billing errors hit the first 3,000 buyers and support queues reach 36 hours', 'first domino': 'the paywall ships in the holiday rush with no staging test on the billing path', 'second domino': 'refund requests climb and app store reviews drop below 4.2 stars', 'third domino': 'a newspaper runs a story about hidden fees before the first monthly invoice', 'root cause 1': 'the billing path has never been load tested', 'root cause 2': 'support has two agents for 412,000 users', 'measure 1': 'a full billing test on both stores before 14 December', 'measure 2': 'two temporary support agents hired by week four', 'signal 1': 'trial to paid below 20 per cent in week one', 'signal 2': 'refund requests above 1.5 per cent of new payers' }], section: 'constraints', at: [8, 3], title: 'Pre-mortem on 28 December' },
                    { k: 'fb', type: 'feedback', at: [8, 5], set: { title: 'Revision Rules', feedbackSource: 'Red Team findings', purpose: 'Revision', maxRounds: 2, content: 'Each finding becomes a change to the plan in the next round, or a written reason it is out of scope. Two rounds at most, then the plan goes forward as it stands.' } },
                    { k: 'rev', type: 'agent_writer', at: [9, 2], set: { title: 'Plan Reviser', content: 'Rewrite the launch plan so every Red Team finding has a dated fix inside the six weeks. Change the plan, not the price. On a revision round, list each finding and what changed.' } }
                ],
                wires: [['plan', 'out', 'rt', 'target'], ['judge', 'rationale', 'rt', 'context'], ['rr', 'out', 'rt', 'context'], ['pre', 'out', 'rt', 'context'], ['rt', 'findings', 'fb', 'in'], ['judge', 'verdict', 'rev', 'task'], ['plan', 'out', 'rev', 'plan'], ['fb', 'to_writer', 'rev', 'feedback'], ['rev', 'revised_draft', 'rt', 'target']]
            },
            {
                title: 'One decision',
                blurb: 'The Aggregator merges the moderator summary, the analyst insights, the revised plan and the Red Team fixes into one recommendation, with its conflicts shown. A human signs off, and only the approved decision reaches the memo.',
                nodes: [
                    { k: 'agg', type: 'agent_aggregator', at: [8, 4], set: { title: 'Strand Aggregator', content: 'Merge the four strands into one recommendation of 300 words or fewer. Where two strands disagree, name both and the figure behind each. Give a confidence out of ten and say what would raise it.' } },
                    { k: 'hum', type: 'agent_human', at: [9, 4], set: { title: 'Launch sign-off', question: 'Launch on 28 December, delay to the spring, or redesign the paid tier?', content: 'Read the merged recommendation, the conflicts and the confidence score together. Continue only on a clear launch or a clear delay. A redesign request goes back to the Plan Reviser with your notes.' } },
                    { k: 'out', type: 'output', at: [9, 5], set: { title: 'Decision memo', formatSchema: 'Markdown', content: 'Return the approved decision as a memo: the decision, the three Red Team risks with their dated fixes, the figures behind each, the confidence score and the date of the first check-in.' } }
                ],
                wires: [['mod', 'summary', 'agg', 'planner_out'], ['ana', 'insights', 'agg', 'researcher_out'], ['rev', 'revised_draft', 'agg', 'writer_out'], ['rt', 'fixes', 'agg', 'critic_out'], ['agg', 'merged', 'hum', 'proposal'], ['hum', 'changes', 'rev', 'feedback'], ['hum', 'approved', 'out', 'in']]
            }
        ]
    });

    PB.showcases.push({
        id: 'software-studio',
        group: 'Teams at work',
        title: 'The Software Studio',
        tagline: 'Ship a rate-limited public API endpoint from design to approved release.',
        about: 'A small engineering studio in one prompt. A Planner designs a rate-limited availability endpoint for a booking platform. A Coder and Tester work in a capped fix loop, a Red Team attacks the result, and Specialists check security and performance in parallel before a Merge. A Summariser writes the review note, a Human Approval stop holds the merge, and an Agent Handoff takes the release to operations.',
        chapters: [
            {
                title: 'The request',
                blurb: 'Partner booking sites need a public availability endpoint that cannot flood the database. The Planner turns the request into a design, and an Assumption Audit and a testing strategy stop it from guessing at the limits.',
                nodes: [
                    { k: 'role', type: 'role', at: [0, 0], set: { title: 'Studio Lead', content: 'You lead a six person engineering studio that ships the Tidewell public API. You prefer simple designs, you write every limit as a number, and you never approve work that has not been tested and reviewed.' } },
                    { k: 'brief', type: 'user_input', at: [0, 1], set: { title: 'Feature request', inputName: 'feature_request', prompt: 'What should the endpoint do, and who calls it?', content: 'Partner booking sites call this endpoint to check whether a venue has free slots. Traffic peaks at 9am on weekdays.', defaultValue: 'Ship GET /v1/availability/{venue_id}, returning free slots for the next 14 days. Partners get 60 requests per minute per API key, with a burst of 20. Over the limit, return 429 with a Retry-After header. Target p95 latency under 120 ms.' } },
                    { k: 'planner', type: 'agent_planner', at: [1, 1], set: { title: 'Design Planner', content: 'Write the design for the availability endpoint: the request and response shape, where the rate limit is enforced, how slot lookups are cached and the order of work. Name the three decisions most likely to be wrong and say how each one will be checked.' } },
                    { k: 'assume', comp: ['reasoning', 'Assumption Audit', { 'state clearly': 'Each partner sends at most 60 requests per minute, and bursts only happen at 9am on weekdays' }], section: 'approach', at: [1, 2] },
                    { k: 'rl', comp: ['coding', 'API Rate Limiting', { 'requests per window': '60 requests per minute', 'second/minute/hour': 'minute', 'IP / user / API key': 'API key' }], section: 'constraints', at: [1, 3] },
                    { k: 'strat', type: 'testing_strategy', at: [2, 0], set: { title: 'Limiter test strategy', content: 'Test the limiter at the boundary: request 60 and 61 inside one minute, a burst of 20 after an idle minute, and two keys sharing one IP. Every case needs a fixed expected status code and Retry-After value.' } }
                ],
                wires: [['role', 'out', 'planner', 'context'], ['brief', 'out', 'planner', 'task'], ['assume', 'out', 'planner', 'context'], ['rl', 'out', 'planner', 'constraints'], ['strat', 'out', 'planner', 'context']]
            },
            {
                title: 'Build and test',
                blurb: 'The Coder writes the handler and the Tester runs it under load and at the edges. A failed gate goes through a Retry Handler and a Feedback block, which sends the work back to the Coder. Three attempts at most, then the open items go to a person.',
                nodes: [
                    { k: 'coder', type: 'agent_coder', at: [2, 1], set: { title: 'Endpoint Coder', content: 'Write the handler on the existing Express service. Use a token bucket keyed by API key in Redis, return 429 with Retry-After in whole seconds, and cache slot lookups for 30 seconds. Do not change the response shape of the v1 booking endpoints.' } },
                    { k: 'cstd', type: 'coding_standards', at: [2, 3], set: { title: 'Tidewell API standards', language: 'TypeScript', content: 'Validate every query parameter with a schema. Return errors as RFC 7807 problem documents. No database calls inside the rate limiter middleware. Every public route has a unit test and an entry in the OpenAPI file.' } },
                    { k: 'tester', type: 'agent_tester', at: [3, 1], set: { title: 'Load and Edge Tester', content: 'Run the unit tests, then send 500 requests in 10 seconds from 20 keys. Check the 60 per minute limit, the burst of 20, the Retry-After value and a venue with no free slots. Report each failure with the request that caused it.' } },
                    { k: 'gate', type: 'gate', at: [4, 1], set: { title: 'Tests and latency gate', condition: 'All tests pass, no 5xx responses and p95 latency under 120 ms', content: 'Pass the code on only when every condition holds. On a fail, send the failure list back into the fix loop.' } },
                    { k: 'retry', type: 'retry', at: [4, 2], set: { title: 'Fix attempt limit', condition: 'Gate failed', maxAttempts: 3, content: 'Count each failed round. After three failed rounds, stop the loop and pass the open items to the release lead.' } },
                    { k: 'fb1', type: 'feedback', at: [3, 3], set: { title: 'Fix loop rules', feedbackSource: 'Tester, Red Team and Gate', purpose: 'Revision', maxRounds: 3, content: 'Turn each failing test or finding into one numbered item. The Coder fixes it in the next round or says in one line why it is out of scope. Never reopen an item that is fixed.' } }
                ],
                wires: [['planner', 'plan', 'coder', 'task'], ['cstd', 'out', 'coder', 'context'], ['coder', 'code', 'tester', 'code'], ['planner', 'plan', 'tester', 'task'], ['tester', 'tests', 'gate', 'in'], ['gate', 'fail', 'retry', 'in'], ['retry', 'out', 'fb1', 'in'], ['tester', 'feedback', 'fb1', 'in'], ['fb1', 'to_any', 'coder', 'feedback']]
            },
            {
                title: 'Red team and security',
                blurb: 'The Red Team attacks the endpoint the way a hostile partner would. A Threat Model and a Security Review frame the attacks, and every finding goes into the fix loop, while the surviving risks go to the security specialist.',
                nodes: [
                    { k: 'threat', comp: ['technical', 'Threat Model', { 'what to protect': 'API keys, venue availability and each partner rate budget', 'potential attackers': 'partners who share keys, scrapers and bots that walk venue IDs', 'attack paths': 'key sharing, rotating IP addresses and enumerating venue IDs', 'mitigations': 'per key limits, a key audit and venue IDs checked against the partner list', 'STRIDE category': 'Denial of service' }], section: 'context', at: [3, 4] },
                    { k: 'sec', type: 'security_review', at: [4, 4], set: { title: 'Partner API security review', content: 'Check key handling, the 429 path, validation of venue_id and the date range, and whether error bodies leak stack traces or another partner data. Flag any route that skips the limiter.' } },
                    { k: 'red', type: 'agent_red_team', at: [5, 4], set: { title: 'Red Team', content: 'Attack the endpoint as a partner trying to take more than its share: rotate keys, send malformed dates and drain the burst. For each finding give the request, the response, the severity and the smallest fix.' } }
                ],
                wires: [['threat', 'out', 'sec', 'in'], ['sec', 'out', 'red', 'context'], ['coder', 'code', 'red', 'target'], ['red', 'findings', 'fb1', 'in']]
            },
            {
                title: 'Specialists in parallel',
                blurb: 'Once the gate passes, the work splits into two checks that run at the same time. A Security Specialist and a Performance Specialist review the same code, and a Merge collects both reports into one list before anyone writes a summary.',
                nodes: [
                    { k: 'par', type: 'parallel', at: [5, 1], set: { title: 'Split into two checks', content: 'Send the same code to both specialists at once. Neither waits for the other.' } },
                    { k: 'pt', comp: ['technical', 'Performance Testing', { 'expected traffic': '60 requests per minute for each of 20 keys', 'beyond capacity': '600 requests per minute across all keys', 'sudden increase': 'a 9am weekday burst, five times normal', 'sustained': '30 minutes at the full limit' }], section: 'quality', at: [5, 2] },
                    { k: 'spec_sec', type: 'agent_specialist', at: [6, 0], set: { title: 'Security Specialist', specialty: 'Security', content: 'Review key handling, the limiter path and every error body. Start from the Red Team findings. Rate each risk as blocker, major or minor.' } },
                    { k: 'spec_perf', type: 'agent_specialist', at: [6, 2], set: { title: 'Performance Specialist', specialty: 'Performance', content: 'Review the cache, the slot query plan and the cost of the limiter on each request. Confirm the p95 target holds at the sustained load before anything is merged.' } },
                    { k: 'merge', type: 'merge', at: [6, 1], set: { title: 'Merge the two reports', content: 'Join the security and performance reports into one list. Keep the owner and the severity of every item.' } }
                ],
                wires: [['gate', 'pass', 'par', 'in'], ['par', 'branch1', 'spec_sec', 'task'], ['par', 'branch2', 'spec_perf', 'task'], ['pt', 'out', 'spec_perf', 'context'], ['red', 'findings', 'spec_sec', 'context'], ['spec_sec', 'result', 'merge', 'in'], ['spec_perf', 'result', 'merge', 'in']]
            },
            {
                title: 'Review note and approval',
                blurb: 'The Summariser turns the merged list into a review note for the pull request. The Release Critic checks each claim against the evidence, and its feedback goes through a Feedback block. A Human Approval stop holds the merge until a person says yes.',
                nodes: [
                    { k: 'summ', type: 'agent_summariser', at: [7, 1], set: { title: 'Review Note Summariser', content: 'Write the pull request review note in under 200 words. Open with the decision, then the blockers, then the numbers: the p95 latency, the limiter tests passed and the open risks. Name an owner for every open item.' } },
                    { k: 'crit', type: 'agent_critic', at: [7, 3], set: { title: 'Release Critic', content: 'Check the note against the feature request. Every claim must match a test result or a finding. List any claim without evidence as a blocker and name the test that would prove it.' } },
                    { k: 'fb2', type: 'feedback', at: [8, 3], set: { title: 'Note revision rules', feedbackSource: 'Release Critic and Editor in Chief', purpose: 'Revision', maxRounds: 2, content: 'Fix every blocker in the next round. Minor points can stay, but the note must say so.' } },
                    { k: 'hum', type: 'agent_human', at: [8, 1], set: { title: 'Editor in Chief', question: 'Merge the rate limiter to main?', content: 'Show the review note, the gate results and the Red Team findings together. Approve only when every blocker is closed and the p95 target is met. On a no, send the reasons back to the Coder through the revision rules.' } }
                ],
                wires: [['merge', 'out', 'summ', 'source'], ['summ', 'summary', 'crit', 'draft'], ['crit', 'feedback', 'fb2', 'in'], ['fb2', 'to_any', 'coder', 'feedback'], ['summ', 'summary', 'hum', 'proposal'], ['hum', 'changes', 'fb2', 'in']]
            },
            {
                title: 'Release',
                blurb: 'After a person approves the merge, an Agent Handoff passes the change to the operations agent with the monitoring plan attached. The Output block records what goes out, so the on-call team starts from one page.',
                nodes: [
                    { k: 'check', comp: ['technical', 'Monitoring Plan', { 'latency, error rate, throughput': 'p95 under 120 ms, 5xx under 0.5%, about 4,000 requests per minute at the 9am peak','threshold → action': 'page on-call above 1% 5xx, and warn the partner above 20% 429s', 'what to show': 'p95 latency, 429 rate by key and slot cache hit rate', 'steps for common alerts': 'check Redis latency, then the slot query plan, then the partner key', 'how long': '30 days' }], section: 'success', at: [8, 0] },
                    { k: 'handoff', type: 'agent_handoff', at: [9, 1], set: { title: 'Release handoff', content: 'Pass the approved change to the operations agent for the Thursday 6pm release window. Include the rollback steps, the alert thresholds for the 429 rate and p95 latency, and the name of the on-call engineer.' } },
                    { k: 'out', type: 'output', at: [9, 2], set: { title: 'Release record', formatSchema: 'Markdown', content: 'Return a one page release record: the change, the limits written as numbers, the tests run, the approver and the rollback plan.' } }
                ],
                wires: [['hum', 'approved', 'handoff', 'from'], ['check', 'out', 'handoff', 'context'], ['handoff', 'to_next', 'out', 'in']]
            }
        ]
    });

    PB.showcases.push({
        id: 'support-desk',
        group: 'Teams at work',
        title: 'The Support Desk',
        tagline: 'A utility support line that triages, routes, checks its tone and stops for a human on refunds.',
        about: 'A live support line for a fictional energy supplier, Lantern Power. Every message is masked for personal data, triaged and routed: billing disputes to the Billing Specialist, power cuts to the Outage Specialist. A gas smell or a vulnerable customer goes straight to a person. The Tone Critic reviews each reply, and any refund over £150 waits for a duty supervisor before it reaches the customer.',
        chapters: [
            {
                title: 'The message arrives',
                blurb: 'Every case starts with the customer\'s own words. Personal data is masked first, then the Triage Agent sorts the case by type and urgency. The Priority Router sends anything with a safety risk straight to a person before any reply is drafted.',
                nodes: [
                    { k: 'role', type: 'role', at: [0, 0], set: { title: 'Support Desk Lead', content: 'You are the senior support agent on the Lantern Power customer line. You write to households in plain English. You never blame the customer, and you never promise a refund, credit or repair date that the case notes do not support.' } },
                    { k: 'brief', type: 'user_input', at: [0, 2], set: { title: 'Customer message', inputName: 'customer_message', prompt: 'Paste the customer message, with account details if you have them.', content: 'The words the customer typed into the live chat or the contact form. Every reply goes back to this customer only.', defaultValue: 'I was charged £212 twice this month and my meter reading is still marked as estimated. I have been on hold for 40 minutes and my account shows a payment plan I never agreed to.' } },
                    { k: 'pii', type: 'pii_protection', at: [1, 2], set: { title: 'Mask personal data', content: 'Replace full names with the first name only. Mask account numbers, bank details and postcodes in every agent input. Never repeat a full address or a card number back to the customer.' } },
                    { k: 'tri', type: 'agent_triage', at: [2, 2], set: { title: 'Intake Triage', content: 'Classify the message as billing dispute, power cut, meter or tariff query, or complaint. Rate priority as critical, normal or low. Critical means a gas smell, a power cut to a home on the Priority Services Register, or a medical need that depends on power. List the two questions you would need answered first.' } },
                    { k: 'prio', type: 'priority_router', at: [3, 2], set: { title: 'Urgency Router', condition: 'Priority from the Intake Triage', content: 'Critical cases go to a human at once. Normal cases go to the Specialist Router. Low cases wait in the queue for the next available agent.' } }
                ],
                wires: [['role', 'out', 'tri', 'context'], ['brief', 'out', 'pii', 'in'], ['pii', 'out', 'tri', 'request'], ['tri', 'priority', 'prio', 'in']]
            },
            {
                title: 'Routing and escalation',
                blurb: 'The Specialist Router sends billing and outage cases to their own specialists. Anything that fits neither goes down the Fallback Path, which hands it to a human rather than guessing. The Identity Check sits in front of the Duty Supervisor Handoff, so no account change is discussed before the caller is verified.',
                nodes: [
                    { k: 'rtr', type: 'agent_router', at: [4, 1], set: { title: 'Specialist Router', content: 'Send billing disputes to the Billing Specialist, outage and supply cases to the Outage Specialist, and account lookups to the Account Researcher. If the case matches none of these, send it to the fallback. Give a one-line reason for each decision.' } },
                    { k: 'esc', comp: ['guardrails', 'Identity Verification Gate', { 'sensitive action': 'a refund, a tariff change or a change of account holder', "decline and explain what's needed": 'decline, and ask for the account PIN or the two-factor code sent to the registered phone', 'self-reported claims alone': 'a caller saying they are the account holder' }], title: 'Identity check before account changes', section: 'constraints', at: [3, 4] },
                    { k: 'hand', type: 'agent_handoff', at: [4, 4], set: { title: 'Duty Supervisor Handoff', content: 'Write a handoff note for the duty supervisor: the customer first name, the case type, the priority, what the customer has already been told and the next action needed. Do not add any fact that is not in the notes. Log the note to the case record.' } },
                    { k: 'fbk', type: 'fallback', at: [5, 3], set: { title: 'Nothing Fits Fallback', content: 'Use this path when no specialist matches, when the customer asks for something the supplier cannot do alone, or when two specialists disagree. Hand the case to a human with the reason in one sentence.' } }
                ],
                wires: [['prio', 'normal', 'rtr', 'request'], ['role', 'out', 'rtr', 'context'], ['prio', 'critical', 'hand', 'from'], ['esc', 'out', 'hand', 'context'], ['rtr', 'fallback', 'fbk', 'in'], ['fbk', 'out', 'hand', 'feedback']]
            },
            {
                title: 'Account facts and specialists',
                blurb: 'The Account Researcher pulls meter readings, the tariff and the last contacts from the account record. The Billing Specialist works the dispute against the refund rules, and the Outage Specialist works from the network operator status only. Shared Notes records each result so no agent asks the customer for the same thing twice.',
                nodes: [
                    { k: 'res', type: 'agent_researcher', at: [5, 0], set: { title: 'Account Researcher', content: 'From the account record, list the last three meter readings with their dates and whether each was an actual or an estimated reading. Give the current tariff, the last two contacts and any open complaint. Mark anything missing as missing. Do not estimate a figure.' } },
                    { k: 'refund', comp: ['writing', 'Customer Support Policy', {}], title: 'Refund and complaint rules', section: 'context', at: [5, 1] },
                    { k: 'bill', type: 'agent_specialist', at: [6, 0], set: { title: 'Billing Specialist', specialty: 'Billing disputes and refunds', content: 'Work out what the customer was charged and what they should have been charged, using the readings in the account record. A refund up to £150 may be offered in the reply. A refund over £150 must be written as a proposal for the duty supervisor and never promised to the customer. Give the amount on a result line in pounds.' } },
                    { k: 'outg', type: 'agent_specialist', at: [6, 1], set: { title: 'Outage Specialist', specialty: 'Power cuts and supply faults', content: 'Use only the network operator status in the notes. Give the fault reference, the time the fault was logged and the restoration time as the operator stated it. If no estimate exists, say so and give the next update time. Do not guess a restoration time.' } },
                    { k: 'mem', type: 'agent_memory', at: [7, 2], set: { title: 'Case Notes', content: 'One line per fact: the source, the time it was recorded and the value. Agents may add lines but never edit an existing line. Keep the first name and the case type only, with no full address or account number.' } }
                ],
                wires: [['rtr', 'to_researcher', 'res', 'task'], ['rtr', 'to_planner', 'bill', 'task'], ['rtr', 'to_writer', 'outg', 'task'], ['res', 'findings', 'bill', 'context'], ['res', 'findings', 'outg', 'context'], ['refund', 'out', 'bill', 'context'], ['bill', 'result', 'mem', 'write'], ['outg', 'result', 'mem', 'write'], ['hand', 'log', 'mem', 'write']]
            },
            {
                title: 'Drafting a calm reply',
                blurb: 'The Reply Writer drafts from the specialist result and the case notes. An empathy pattern sets the opening, and a no-promises rule stops the reply from committing the supplier to anything the notes do not record.',
                nodes: [
                    { k: 'wri', type: 'agent_writer', at: [7, 0], set: { title: 'Reply Writer', content: 'Write the reply to the customer in short sentences. Open with what has happened, then what happens next and by when. Use only facts from the specialist result and the case notes. If a refund is above £150, say that a supervisor will confirm it and give the call-back window. On a revision round, fix every point raised and say what changed.' } },
                    { k: 'emp', comp: ['dialogue', 'Empathy Response', { 'feeling/situation': 'the customer has been on hold for 40 minutes and has been charged twice', reason: 'a double charge hits a household budget hard this month', offer: 'a corrected bill and a call back within four working hours' }], title: 'Empathy opening', section: 'tone', at: [7, 1] },
                    { k: 'ref', type: 'refusal_policy', at: [6, 2], set: { title: 'No promises rule', content: 'Do not promise a refund, credit, repair date or fee waiver unless the case notes record it as approved. Do not discuss other customers, staff names or internal pricing. For legal questions, point the customer to the Energy Ombudsman and state what the supplier will do next.' } }
                ],
                wires: [['bill', 'result', 'wri', 'task'], ['mem', 'read', 'wri', 'notes'], ['emp', 'out', 'wri', 'context'], ['ref', 'out', 'wri', 'context']]
            },
            {
                title: 'Tone check and revision',
                blurb: 'The Tone Critic reads the draft the way the customer will read it and sets a blocker or minor severity on each flag. Its feedback passes through a Feedback block that allows two revision rounds, so the reply cannot loop forever.',
                nodes: [
                    { k: 'crt', type: 'agent_critic', at: [8, 0], set: { title: 'Tone Critic', content: 'Read the reply as the customer would. Flag any sentence that blames the customer, any promise the notes do not support and any jargon such as tariff codes or settlement terms. Mark each flag as blocker or minor. For every blocker give one replacement sentence. Do not rewrite the reply yourself.' } },
                    { k: 'cdr', comp: ['dialogue', 'Tone Calibration', { 'formal/casual/supportive/urgent': 'supportive', 'specific choices': 'short sentences, plain words, no tariff jargon, and the first name only if the customer used it first' }], title: 'Tone standard for this line', section: 'tone', at: [8, 1] },
                    { k: 'fb', type: 'feedback', at: [9, 0], set: { title: 'Revision Rules', feedbackSource: 'Tone Critic and Duty Supervisor', purpose: 'Revision', maxRounds: 2, content: 'Treat every blocker as required work. Send each point back to the Reply Writer with its replacement sentence. After two rounds, pass the reply on with any open points listed for the supervisor.' } }
                ],
                wires: [['wri', 'draft', 'crt', 'draft'], ['cdr', 'out', 'crt', 'criteria'], ['crt', 'feedback', 'fb', 'in'], ['fb', 'to_writer', 'wri', 'feedback']]
            },
            {
                title: 'Refund approval and send',
                blurb: 'A reply that offers a refund above £150 stops at Human Approval. The duty supervisor approves it, or sends notes back to the Reply Writer. Every other reply goes straight to the output, and nothing is sent to a customer until one of these two paths is taken.',
                nodes: [
                    { k: 'ifelse', type: 'ifelse', at: [8, 3], set: { title: 'Refund over £150?', condition: 'the reply offers a refund above £150', content: 'When the condition is true, send the reply to Human Approval. Otherwise send it straight to the output.' } },
                    { k: 'hum', type: 'agent_human', at: [9, 3], set: { title: 'Duty Supervisor Approval', question: 'Is the refund above £150 correct, and is the reply fair to the customer?', content: 'Show the reply, the Billing Specialist result and the Tone Critic flags together. Continue only on a clear yes. On a no, return the supervisor notes to the Reply Writer as changes.' } },
                    { k: 'out', type: 'output', at: [9, 5], set: { title: 'Reply sent to customer', formatSchema: 'Plain text', content: 'Return the approved reply as plain text with a subject line, under 150 words, and a final line stating the next contact time. Include the case reference and nothing else from the case notes.' } }
                ],
                wires: [['wri', 'revised_draft', 'ifelse', 'in'], ['ifelse', 'true', 'hum', 'proposal'], ['ifelse', 'false', 'out', 'in'], ['hum', 'approved', 'out', 'in'], ['hum', 'changes', 'fb', 'in']]
            }
        ]
    });

    PB.showcases.push({
        id: 'due-diligence',
        group: 'Teams at work',
        title: 'Due Diligence Lab',
        tagline: 'A £28m software acquisition, tested by a deal team that argues before it recommends.',
        about: 'An investment committee asks whether to buy Quillmark Systems, a 40-person invoicing software company with £6.2m ARR. Analysts test the accounts and the customer book, specialists review contracts and code, and a fact-checker holds every figure to the data room. An aggregator merges the strands and lists the conflicts, a vote picks the recommendation, and a judge tests it against the deal-breakers.',
        chapters: [
            {
                title: 'The question and the team',
                blurb: 'Every deal starts with one question. The conductor reads the question and the deal thesis, then splits the work into a plan, a research brief, a memo brief and a critique brief, each with its own finish line.',
                nodes: [
                    { k: 'deal', type: 'user_input', at: [0, 1], set: { title: 'Deal question', inputName: 'deal_question', prompt: 'What are we deciding, and at what price?', content: 'The question from the investment committee. Every agent works from this line.', defaultValue: 'Should we buy Quillmark Systems Ltd, a 40-person B2B invoicing software company, for £28m enterprise value, and is there anything in the data room that should stop us?' } },
                    { k: 'role', type: 'role', at: [0, 0], set: { title: 'Head of Corporate Development', content: 'You lead a six-person corporate development team at a growth equity fund. You have closed eleven software deals and walked away from four. You write for an investment committee that reads fast and asks hard questions about price.' } },
                    { k: 'conductor', type: 'multi_agent', at: [1, 1], set: { title: 'Deal Team Conductor', content: 'Split the question into four jobs: a plan for the deal team, a research brief, a memo brief for the writer and a critique brief for the critic. Give each job a finish line that can be checked. Do not answer the question yourself.' } },
                    { k: 'mab', comp: ['business', 'Merger/Acquisition Brief', { 'why acquire': 'add a UK construction invoicing customer base we cannot build in under two years', 'revenue, profitability': 'ARR £6.2m growing 17% a year, EBITDA margin near 9%' }], section: 'context', at: [1, 3], title: 'Deal thesis' }
                ],
                wires: [['role', 'out', 'conductor', 'context'], ['deal', 'out', 'conductor', 'task'], ['mab', 'out', 'conductor', 'config']]
            },
            {
                title: 'Evidence from the data room',
                blurb: 'Two analysts work the evidence in parallel. One tests the management accounts, the other tests the customer book. A researcher tests the vendor claims about the market. Every number arrives with its period and its source.',
                nodes: [
                    { k: 'fin_data', type: 'variable', at: [2, 0], set: { title: 'Financial data pack', varName: 'financial_pack', content: 'Management accounts for FY24 to FY26 from the data room. ARR £6.2m at 31 October 2026. Gross margin 81%. Net revenue retention 104%. Audited accounts exist for FY25 only, and the last two months of FY26 are still marked draft.' } },
                    { k: 'cust_data', type: 'variable', at: [2, 2], set: { title: 'CRM customer export', varName: 'customer_export', content: '212 paying accounts exported from the CRM on 31 October 2026. The largest 19 accounts, 9% of the list, hold 44% of ARR. Logo churn was 11% over the last twelve months. Ten contracts renew between March and June 2027.' } },
                    { k: 'coh', comp: ['data', 'Cohort Analysis', { 'by signup month': 'by first go-live month', 'retention / revenue': 'net revenue retention', 'month': 'March 2025', '% retained at month 1, 3, 6': '96%, 91% and 88% of ARR', 'improving / worsening': 'worsening since the 2025 price rise' }], section: 'quality', at: [2, 4], title: 'Customer cohorts' },
                    { k: 'analyst_fin', type: 'agent_analyst', at: [3, 0], set: { title: 'Financials Analyst', content: 'Test the management accounts against the audited FY25 figures first. Report ARR, gross margin, net revenue retention and monthly burn, with the period and the source for each. Flag every month that is still in draft. Do not extrapolate past the last audited year.' } },
                    { k: 'analyst_cust', type: 'agent_analyst', at: [3, 2], set: { title: 'Customer Data Analyst', content: 'Measure how concentrated ARR is, how churn splits by segment and whether the ten June renewals are at risk. Give every percentage with its denominator. Say which figures rest on too few accounts to trust.' } },
                    { k: 'res', type: 'agent_researcher', at: [3, 4], set: { title: 'Market and Competitor Desk', content: 'Test the vendor deck claims: the UK construction software market size, the win rate against the three named competitors and the claimed 30% price premium. For each claim give the source, its date and how far you trust it.' } }
                ],
                wires: [['fin_data', 'out', 'analyst_fin', 'data'], ['conductor', 'planner', 'analyst_fin', 'question'], ['cust_data', 'out', 'analyst_cust', 'data'], ['conductor', 'planner', 'analyst_cust', 'question'], ['coh', 'out', 'analyst_cust', 'context'], ['deal', 'out', 'res', 'task'], ['conductor', 'researcher', 'res', 'questions']]
            },
            {
                title: 'Specialists and the numbers',
                blurb: 'Specialists read the contracts and the codebase against the data room index. A statistical check decides whether the churn figure is solid enough to price on, and a scenario model shows what the June renewals are worth.',
                nodes: [
                    { k: 'legal', type: 'agent_specialist', at: [4, 0], set: { title: 'Legal Specialist', specialty: 'UK commercial and data protection law', content: 'Review change of control, IP ownership, staff contracts and personal data handling in the 19 largest contracts. Cite each clause by number. Rate every issue as a deal-breaker, a price issue or a fix after completion.' } },
                    { k: 'tech', type: 'agent_specialist', at: [4, 2], set: { title: 'Technical Specialist', specialty: 'Software architecture and security', content: 'Review the codebase summary, hosting, the last penetration test and the open security tickets. Name each risk by system and by date. Say which risks can be fixed within 90 days and which need money or people.' } },
                    { k: 'dd', comp: ['legal', 'Due Diligence Report', { 'issue': 'the 19 largest accounts hold 44% of ARR', 'H/M/L': 'High', 'proceed / proceed with conditions / walk away': 'proceed with conditions' }], section: 'knowledge', at: [4, 4], title: 'Concentration finding' },
                    { k: 'scen', type: 'scenario_analysis', at: [5, 0], set: { title: 'June renewal scenarios', content: 'Model three cases for FY27 ARR. In the first, all ten June renewals hold. In the second, the two largest accounts leave. In the third, the top ten all leave. Show the effect on the £28m price in each case and the earn-out needed to close the gap.' } },
                    { k: 'stat', type: 'statistical_rigor', at: [5, 2], set: { title: 'Churn sample check', content: 'Test whether the 11% churn figure rests on enough accounts to price on. Check the sample size, the renewal dates used and whether contract moves hide any churn. State a confidence range for each headline number.' } }
                ],
                wires: [['dd', 'out', 'legal', 'context'], ['dd', 'out', 'tech', 'context'], ['conductor', 'planner', 'legal', 'task'], ['conductor', 'planner', 'tech', 'task'], ['analyst_cust', 'analysis', 'stat', 'in'], ['analyst_fin', 'analysis', 'scen', 'in']]
            },
            {
                title: 'Fact-check and risk',
                blurb: 'The fact-checker holds every figure to the data room. A source reliability check on the vendor deck flags which claims came from the seller. The legal risk register then scores the specialist findings by likelihood and impact.',
                nodes: [
                    { k: 'risk', type: 'risk_assessment', at: [5, 4], set: { title: 'Legal risk register', content: 'Score each legal issue from the specialist review for likelihood and impact, each out of five. List the three risks that would move the price, with the clause behind each. Mark any risk the seller can cure before completion.' } },
                    { k: 'rob', comp: ['research', 'Risk of Bias Assessment', { 'Cochrane RoB / Newcastle-Ottawa / CASP': 'a CASP style checklist', 'randomisation': 'source independence', 'deviations': 'changes in method between drafts', 'missing data': 'excluded customers and churn', 'outcome measurement': 'the ARR definition used', 'selective reporting': 'which years and segments are shown' }], section: 'quality', at: [6, 3], title: 'Vendor deck reliability' },
                    { k: 'chk', type: 'agent_fact_checker', at: [6, 1], set: { title: 'Fact-Checker', content: 'Check every figure in the analyst and researcher notes against the data room index. Mark each as verified, unverified or contradicted, and quote the line that contradicts it. A figure from the vendor deck counts as unverified unless the data room supports it.' } }
                ],
                wires: [['legal', 'result', 'risk', 'in'], ['analyst_fin', 'insights', 'chk', 'draft'], ['res', 'findings', 'rob', 'in'], ['rob', 'out', 'chk', 'sources']]
            },
            {
                title: 'Draft, critique and vote',
                blurb: 'The writer drafts the investment memo from verified facts only. The critic argues with the draft, and the feedback loop sends blockers back to the writer for at most two rounds. The aggregator merges the four strands and lists every conflict, then a vote picks the recommendation.',
                nodes: [
                    { k: 'wri', type: 'agent_writer', at: [7, 1], set: { title: 'Investment Memo Writer', content: 'Write a two-page memo for the committee: the recommendation first, then the numbers, the price range, the deal-breakers checked and the conditions. Use only figures the fact-checker marked verified, and label each one with its source. On a revision round, answer every point and say what changed.' } },
                    { k: 'crt', type: 'agent_critic', at: [8, 0], set: { title: 'Committee Critic', content: 'Judge the memo against the deal question and the criteria from the conductor. Rank each issue as a blocker, a price issue or a wording fault. For every blocker give one rewrite the writer can use. Do not rewrite the memo yourself.' } },
                    { k: 'fb', type: 'feedback', at: [7, 3], set: { title: 'Revision Rules', feedbackSource: 'Fact-Checker, Legal Risk Register and Committee Critic', purpose: 'Revision', maxRounds: 2, content: 'Every blocker goes back to the writer. Fix it in the next round or say plainly why it is out of scope. After two rounds, send the memo forward with the open points listed at the top.' } },
                    { k: 'agg', type: 'agent_aggregator', at: [8, 2], set: { title: 'Strand Aggregator', content: 'Merge the planner scope, the verified evidence, the revised memo and the critique into one view. List every point where two strands disagree as a conflict, with both sides and the figure in dispute. Give a confidence score for the merged view.' } },
                    { k: 'vote', type: 'agent_vote', at: [8, 4], set: { title: 'Consensus Vote', content: 'Three candidates, one from each strand: the legal view, the technical view and the committee critic view. Vote for the recommendation the evidence supports best. Name the winner, and list each dissent with its reason in one line.' } }
                ],
                wires: [['conductor', 'writer', 'wri', 'task'], ['conductor', 'planner', 'wri', 'plan'], ['chk', 'verified', 'wri', 'context'], ['risk', 'out', 'wri', 'notes'], ['fb', 'to_writer', 'wri', 'feedback'], ['wri', 'draft', 'crt', 'draft'], ['deal', 'out', 'crt', 'task'], ['conductor', 'critic', 'crt', 'criteria'], ['crt', 'feedback', 'fb', 'in'], ['chk', 'flags', 'fb', 'in'], ['risk', 'out', 'fb', 'in'], ['conductor', 'planner', 'agg', 'planner_out'], ['chk', 'verified', 'agg', 'researcher_out'], ['wri', 'revised_draft', 'agg', 'writer_out'], ['crt', 'critique', 'agg', 'critic_out'], ['legal', 'result', 'vote', 'candidate_a'], ['tech', 'result', 'vote', 'candidate_b'], ['crt', 'recommendations', 'vote', 'candidate_c']]
            },
            {
                title: 'Deal-breakers and sign-off',
                blurb: 'The judge checks the winning recommendation against the deal-breaker list and quotes the clause or figure behind each finding. A human chair then decides. Nothing reaches the committee without a clear yes.',
                nodes: [
                    { k: 'breakers', type: 'variable', at: [8, 5], set: { title: 'Deal-breaker list', varName: 'deal_breakers', content: 'Any change of control clause in a top ten contract with no consent route. Any product IP the founders do not own outright. Any unreported security incident in the last 24 months. Any single sector above 50% of ARR. Any FY26 revenue restatement above 3%.' } },
                    { k: 'jud', type: 'agent_judge', at: [9, 3], set: { title: 'Deal-Breaker Judge', content: 'Answer one question: does the winning recommendation break any item on the deal-breaker list? Check each item, quote the clause or figure that triggers it, and return a verdict of clear, conditional or walk away. Keep the rationale to five sentences.' } },
                    { k: 'hum', type: 'agent_human', at: [9, 4], set: { title: 'Investment Committee Chair', question: 'Do we make the offer on these terms?', content: 'Read the memo, the vote and the judge verdict together. Continue only on a clear yes. On a no, the chair writes the open points and the deal team starts again from the memo brief.' } },
                    { k: 'out', type: 'output', at: [9, 5], set: { title: 'Committee Decision Record', formatSchema: 'Markdown', content: 'Return the approved memo as a decision record: the recommendation, the price, each deal-breaker checked and cleared, the open points with an owner for each, and the conditions for completion. No more than two pages.' } }
                ],
                wires: [['vote', 'winner', 'jud', 'option_a'], ['vote', 'dissent', 'jud', 'option_b'], ['breakers', 'out', 'jud', 'criteria'], ['jud', 'verdict', 'hum', 'proposal'], ['hum', 'approved', 'out', 'in']]
            }
        ]
    });

    PB.showcases.push({
        id: 'content-studio',
        group: 'Teams at work',
        title: 'The Content Studio',
        tagline: 'One recycled trainer launch, three channels, one vote and a capped review loop.',
        about: 'A launch desk for a sustainable trainer brand. A team lead splits the Lap 01 launch into jobs, and a brainstormer and a vote pick the hook. A parallel split sends it to a writer for the newsletter, LinkedIn and a video. A materials specialist checks the green claims first. A reader panel and a brand critic send blockers back through a capped revision loop, then a merge, an editor and a human sign-off finish the pack.',
        chapters: [
            {
                title: 'The launch brief',
                blurb: 'Redwater is launching Lap 01 on 14 March, made from 62% recycled content. The brief becomes a content brief, and the Team Lead turns it into one job per channel. The house style guide is wired in now so every later agent writes to the same rules.',
                nodes: [
                    { k: 'role', type: 'role', at: [0, 0], set: { title: 'Head of Content, Redwater', content: 'You write for Redwater, a UK trainer brand that makes Lap 01 from recycled fishing nets and reclaimed rubber. You are warm, plain and honest. You would rather publish one true number than three vague promises.' } },
                    { k: 'brief', type: 'user_input', at: [0, 1], set: { title: 'Launch brief', inputName: 'launch_brief', prompt: 'What are we launching, and for whom?', content: 'The brief from the Redwater marketing team. Every agent works from this.', defaultValue: 'Launch Lap 01, our recycled trainer, on 14 March across the newsletter, LinkedIn and a 45 second short video script.' } },
                    { k: 'style', type: 'style_guide', at: [0, 3], set: { title: 'Redwater house style', content: 'UK spelling. Sentence case headings. Under 22 words a sentence. Name the material before the feeling. Never use eco-friendly, green, sustainable or planet-saving unless a figure sits beside it. Never say carbon neutral: Redwater has not certified that. Prices have no pence.' } },
                    { k: 'brief_comp', comp: ['writing', 'Content Brief', { title: 'Lap 01 spring launch', goal: 'reach 4,000 pre-orders before 14 March', who: 'UK runners aged 28 to 45 who want trainers they will not feel bad about', adjectives: 'warm, plain, honest, a little dry', target: '600 words for the newsletter, 120 for LinkedIn, 45 seconds on video', 'main takeaway': 'Lap 01 is 62% recycled and its sole can be resoled for £14' }], section: 'task', at: [1, 1], title: 'Launch content brief' },
                    { k: 'lead', type: 'agent_lead', at: [2, 1], set: { title: 'Launch Team Lead', content: 'Split the launch into three channel jobs: a newsletter feature for existing customers, a LinkedIn post in the founder voice and a 45 second video script. Give each worker one job it can finish alone, with its word count and the one claim it must make. Pass the winning hook to the specialist and the writers.' } }
                ],
                wires: [['brief', 'out', 'brief_comp', 'in'], ['role', 'out', 'lead', 'context'], ['brief_comp', 'out', 'lead', 'task']]
            },
            {
                title: 'Hooks and a vote',
                blurb: 'The Hook Brainstormer produces twelve openings that start from real facts about the shoe. Its safest six and riskiest three go to a Consensus Vote, alongside a template hook set from the Component Library. The vote picks one hook for the whole launch.',
                nodes: [
                    { k: 'hooks', type: 'agent_brainstormer', at: [3, 0], set: { title: 'Hook Brainstormer', content: 'Write twelve opening hooks for Lap 01 that a UK runner would stop scrolling for. Each hook must start from a real fact: the 62% recycled content, the Cornish fishing nets the shoe is made from, or the £14 resole. Put the safest six in ideas and the riskiest three in wildcards. No hook may call the shoe carbon neutral.' } },
                    { k: 'hookgen', comp: ['writing', 'Hook Generator', {}], section: 'examples', at: [3, 2], title: 'Template hooks' },
                    { k: 'vote', type: 'agent_vote', at: [4, 1], set: { title: 'Hook Vote', content: 'Three candidate sets arrive. Candidate A is the safest hooks, candidate B the riskiest and candidate C the template hooks. Choose one winner for the whole launch and record the dissent in one line. A hook wins only if it is specific, true to the shoe and can be said in three seconds.' } }
                ],
                wires: [['lead', 'summary', 'hooks', 'task'], ['style', 'out', 'hooks', 'constraints'], ['hooks', 'ideas', 'vote', 'candidate_a'], ['hooks', 'wildcards', 'vote', 'candidate_b'], ['hookgen', 'out', 'vote', 'candidate_c']]
            },
            {
                title: 'Three channels',
                blurb: 'A parallel split sends the winning hook down the newsletter branch, then splits the social branch again into LinkedIn and video. The Materials Specialist reads the supplier figures first, so no writer can repeat a claim that has no certificate behind it.',
                nodes: [
                    { k: 'split', type: 'parallel', at: [5, 1], set: { title: 'Channel split', content: 'Send the winning hook to the newsletter branch and to the social branch. The social branch splits again into LinkedIn and video. Every branch keeps the hook word for word.' } },
                    { k: 'specialist', type: 'agent_specialist', at: [5, 3], set: { title: 'Materials Specialist', specialty: 'Recycled materials and environmental claims', content: 'Check every material and environmental claim before any writer uses it. Confirm the 62% recycled content against the supplier certificate, flag any figure without one and list the words the writers must not use. Keep the reply under 150 words.' } },
                    { k: 'split_social', type: 'parallel', at: [6, 2], set: { title: 'Social split', content: 'LinkedIn takes the founder story. Video takes the first three seconds and the proof. Both keep the same hook.' } }
                ],
                wires: [['vote', 'winner', 'split', 'in'], ['split', 'branch2', 'split_social', 'in'], ['lead', 'summary', 'specialist', 'task']]
            },
            {
                title: 'Writers with a voice',
                blurb: 'Each channel gets its own Writer. The newsletter Writer takes the tone modifier, the LinkedIn Writer takes a Voice and Style component, and the video Writer takes a short-form script skeleton. All three draw on the specialist notes.',
                nodes: [
                    { k: 'tone', type: 'tone', at: [6, 0], set: { title: 'Newsletter tone', tone: 'Warm, direct, a little dry', content: 'Write as if to a runner who already owns a pair and is thinking about the next. Short paragraphs. One joke at most. Never make the reader feel guilty for buying trainers.' } },
                    { k: 'voice', comp: ['creative', 'Voice and Style', { '1st/2nd/3rd, limited/omniscient': '1st person plural, the Redwater founders speaking as "we"', 'formal/plain/lyrical': 'plain', 'long/short/varied': 'short, with the odd long line' }], section: 'tone', at: [6, 1], title: 'Founder voice' },
                    { k: 'video_comp', comp: ['social', 'Video Script (Short Form)', { 'first 3 sec': 'Hold up one trainer and say where its sole material was before: a fishing net off the Cornish coast.' }], section: 'context', at: [6, 4], title: 'Video skeleton' },
                    { k: 'writer_news', type: 'agent_writer', at: [7, 0], set: { title: 'Newsletter Writer', content: 'Write the 600 word launch feature for existing customers. Open with the hook. Then explain where the nets come from, what the 62% figure means and how the £14 resole works. Use only figures from the specialist notes and name the source of each one. On a revision round, answer every point in the feedback.' } },
                    { k: 'writer_li', type: 'agent_writer', at: [7, 2], set: { title: 'LinkedIn Writer', content: 'Write one 120 word post in the founder voice. Use the hook as the first line, one lesson from the factory visit in Porto and a closing question. Use no more than three hashtags. Follow the same claim rules as the newsletter.' } },
                    { k: 'writer_video', type: 'agent_writer', at: [7, 4], set: { title: 'Video Script Writer', content: 'Write a 45 second script with timings in seconds. Keep the hook in the first three seconds. Show the shoe before any figure is spoken, and give each line its on screen caption. On a revision round, answer every point in the feedback.' } }
                ],
                wires: [['split', 'branch1', 'writer_news', 'plan'], ['split_social', 'branch1', 'writer_li', 'plan'], ['split_social', 'branch2', 'writer_video', 'plan'], ['lead', 'worker_a', 'writer_news', 'task'], ['lead', 'worker_b', 'writer_li', 'task'], ['lead', 'worker_c', 'writer_video', 'task'], ['tone', 'out', 'writer_news', 'context'], ['voice', 'out', 'writer_li', 'context'], ['tone', 'out', 'writer_video', 'context'], ['video_comp', 'out', 'writer_video', 'notes'], ['specialist', 'result', 'writer_news', 'notes'], ['specialist', 'result', 'writer_li', 'notes']]
            },
            {
                title: 'Reader, critic and feedback',
                blurb: 'A Reader Panel built from a customer profile reads the newsletter cold and says where it lost them. A Brand Critic scores the LinkedIn and video drafts against the rubric. The Feedback block sends every blocker back to the owning Writer, capped at two rounds.',
                nodes: [
                    { k: 'segment', comp: ['business', 'Customer Segment Profile', { 'high/med/low': 'high' }], section: 'audience', at: [8, 0], title: 'Lap 01 buyer' },
                    { k: 'aud', type: 'agent_audience', at: [9, 0], set: { title: 'Reader Panel', content: 'Read as a UK runner in their thirties who has bought three pairs of trainers in five years and wonders where the old ones went. Note the first sentence that lost you, any number you did not believe and whether you would forward it to a running friend.' } },
                    { k: 'rubric', type: 'rubric_scoring', at: [8, 2], set: { title: 'Launch rubric', scale: '1 to 5', content: 'Score each draft from 1 to 5 on four lines: accuracy (every figure sourced), hook strength (the first line makes a runner keep reading), brand voice and the call to action. Any accuracy score below 4 is a blocker.' } },
                    { k: 'crt', type: 'agent_critic', at: [9, 2], set: { title: 'Brand Critic', content: 'Judge each draft against the content brief and the Materials Specialist notes. List blockers first, then softer issues. For every blocker give one concrete rewrite. Reject any environmental claim that has no number and no source beside it.' } },
                    { k: 'fb', type: 'feedback', at: [8, 4], set: { title: 'Revision loop', feedbackSource: 'Reader Panel and Brand Critic', purpose: 'Revision', maxRounds: 2, content: 'Send each blocker back to the Writer who owns that channel. The Writer answers every point in its next draft. After two rounds, anything still open goes to the Launch Editor with a note.' } }
                ],
                wires: [['segment', 'out', 'aud', 'audience'], ['writer_news', 'draft', 'aud', 'draft'], ['writer_li', 'draft', 'crt', 'draft'], ['writer_video', 'draft', 'crt', 'context'], ['brief_comp', 'out', 'crt', 'task'], ['brief_comp', 'out', 'rubric', 'in'], ['rubric', 'out', 'crt', 'criteria'], ['aud', 'confusions', 'fb', 'in'], ['crt', 'feedback', 'fb', 'in'], ['fb', 'to_writer', 'writer_news', 'feedback'], ['fb', 'to_any', 'writer_li', 'feedback'], ['fb', 'to_any', 'writer_video', 'feedback']]
            },
            {
                title: 'Merge, edit and sign off',
                blurb: 'The three finished pieces merge into one launch pack. The Launch Editor checks the pack against the style guide, matching prices and resole fees included. Nothing leaves the studio until a human says yes, and then the approved pack is output in Markdown.',
                nodes: [
                    { k: 'merge', type: 'merge', at: [8, 1], set: { title: 'Launch pack', content: 'Combine the three finished pieces in this order: newsletter feature, LinkedIn post, video script. Keep each piece intact and label it with its channel and word count.' } },
                    { k: 'edt', type: 'agent_editor', at: [9, 1], set: { title: 'Launch Editor', content: 'Check the merged pack against the house style guide. Keep sentences under 22 words, remove any green claim that lacks a number and make sure the £89 price and the £14 resole fee match in every piece. List each change in one line.' } },
                    { k: 'hum', type: 'agent_human', at: [9, 3], set: { title: 'Redwater sign-off', question: 'Are the figures certified, the claims defensible and the pack ready for 14 March?', content: 'Show the edited pack beside the Materials Specialist notes. Release only on a clear yes. On a no, send the notes back to the Launch Editor.' } },
                    { k: 'out', type: 'output', at: [9, 5], set: { title: 'Approved launch pack', formatSchema: 'Markdown', content: 'Return the approved launch pack in Markdown with three sections: Newsletter feature, LinkedIn post and Video script. End with a sources list, one line per figure.' } }
                ],
                wires: [['writer_news', 'revised_draft', 'merge', 'in'], ['writer_li', 'revised_draft', 'merge', 'in'], ['writer_video', 'revised_draft', 'merge', 'in'], ['merge', 'out', 'edt', 'draft'], ['style', 'out', 'edt', 'style'], ['edt', 'edited', 'hum', 'proposal'], ['hum', 'approved', 'out', 'in']]
            }
        ]
    });

    PB.showcases.push({
        id: 'board-room',
        group: 'Teams at work',
        title: 'The Board Room',
        tagline: 'A store closure decision, argued both ways, stress tested and signed by the chair.',
        about: 'A retail board paper in one prompt. The Team Lead splits the question across finance, operations and people. A Proponent argues for turning 12 weak stores into fulfilment hubs, a Devil\'s Advocate argues for closing them, and a Red Team attacks the hub case. An Aggregator, a Judge and a Summariser turn the argument into one chair paper, which waits for a human yes.',
        chapters: [
            {
                title: 'The board paper',
                blurb: 'The chair asks one question. The Board Secretary sets the tone, the decision rules are written down before any argument starts, and the Team Lead splits the question into three strands with one job each.',
                nodes: [
                    { k: 'role', type: 'role', at: [0, 0], set: { title: 'Board Secretary', content: 'You are secretary to the board of Larkin Home Stores, a chain of 214 furniture and homeware shops. You write for directors who have twenty minutes to read the paper and will test every number. Plain English, no jargon, and never state a figure without its source.' } },
                    { k: 'brief', type: 'user_input', at: [0, 1], set: { title: 'Chair question', inputName: 'board_question', prompt: 'What decision is the board being asked to make?', content: 'The question from the chair. Every agent works from this.', defaultValue: 'Should we close 12 underperforming stores, or invest £9.4m to turn them into local fulfilment hubs?' } },
                    { k: 'dfw', type: 'decision_framework', at: [1, 0], set: { title: 'Decision Rules', content: 'Score both options on five tests: three year cash effect, effect on the 186 staff, risk of losing customers, how hard the choice is to reverse, and the quality of the evidence. An option passes a test only if the number behind it has a source. A tie goes to the option that keeps more choices open for twelve months.' } },
                    { k: 'lead', type: 'agent_lead', at: [1, 1], set: { title: 'Team Lead', content: 'Split the question into three strands: finance, operations and people. Give each specialist one question they must answer with numbers and one risk they must name. Do not recommend anything yet. End with a one-paragraph summary of the choice and the deadline for the chair.' } }
                ],
                wires: [['role', 'out', 'lead', 'context'], ['brief', 'out', 'lead', 'task']]
            },
            {
                title: 'Three specialists',
                blurb: 'Finance, operations and people each work their own strand and return figures with sources. A Financial Model component gives the finance strand its cost shape, so the cash comparison is built the same way every time.',
                nodes: [
                    { k: 'fin', comp: ['business', 'Financial Model', { 'fixed, variable': 'rent, rates, salaried staff and insurance, plus stock, card fees and delivery costs', when: 'within 18 months of the decision' }], section: 'context', at: [1, 3], title: 'Cost Shape' },
                    { k: 'spec_fin', type: 'agent_specialist', at: [2, 0], set: { title: 'Finance Specialist', specialty: 'Finance', content: 'Calculate the three year cash effect of closing the 12 stores and of converting them. Use only the figures in the Shared Notes and show the sum for each option. Mark every online volume figure as modelled, because the only evidence is a pilot. Flag any cost that appears in one option but not the other.' } },
                    { k: 'spec_ops', type: 'agent_specialist', at: [2, 1], set: { title: 'Operations Specialist', specialty: 'Operations', content: 'Assess what each option needs from the 12 sites: planning consent for van bays at four sites, which takes 6 to 9 months, stock flow between stores and hubs, the five lease breaks due in 2027, and the risk of stock running short during change. Rate each site green, amber or red for conversion and give the count for each colour.' } },
                    { k: 'spec_ppl', type: 'agent_specialist', at: [2, 2], set: { title: 'People Specialist', specialty: 'People', content: 'Assess the 186 colleagues in the 12 stores. Count how many could move to a store within 10 miles, using the 41 who already live that close to another Larkin store and the 38 roles that are redeployable. Estimate the consultation timetable, the retention risk for those who stay, and the three roles most likely to leave first.' } }
                ],
                wires: [['lead', 'worker_a', 'spec_fin', 'task'], ['lead', 'worker_b', 'spec_ops', 'task'], ['lead', 'worker_c', 'spec_ppl', 'task'], ['fin', 'out', 'spec_fin', 'context'], ['lead', 'summary', 'spec_ops', 'context'], ['lead', 'summary', 'spec_ppl', 'context']]
            },
            {
                title: 'Two cases, argued',
                blurb: 'The Shared Notes hold the facts that every agent may cite, so nobody invents a figure. The Proponent argues for the hubs. The Devil\'s Advocate argues for closing and goes straight at the hub plan.',
                nodes: [
                    { k: 'mem', type: 'agent_memory', at: [3, 1], set: { title: 'Shared Notes', content: 'Store values for the 12 stores: sales of £0.9m each in 2026, down 14 per cent on 2024. Store losses of £1.9m a year after rent and wages, before central costs. Closure one-off cost of £6.8m: lease exits £2.1m, redundancy £2.9m, stock clearance £0.8m, dilapidations £1.0m. Hub conversion capex of £9.4m with an operating uplift of £2.6m a year. Online contribution of £3.9m a year from year two if volumes reach plan. Pilot: three stores over six weeks including the pre-Christmas peak, averaging 1,180 online orders per store a month at peak. Plan: 1,450 a month by month 12. 71 per cent of online orders from these postcodes come from within 15 miles of a store. Agents may add a source line but never edit an existing one.' } },
                    { k: 'prop', type: 'agent_proponent', at: [4, 0], set: { title: 'Hub Case', content: 'Argue for converting all 12 stores into local fulfilment hubs. Make the strongest honest case: most online demand from these postcodes sits within 15 miles of a store, and a closed store leaves that demand with no collection point. Cite a Shared Notes line for every figure. Answer each objection in one paragraph and concede any point that is true.' } },
                    { k: 'adv', type: 'agent_advocate', at: [4, 2], set: { title: 'Closure Case', content: 'Argue for closing all 12 stores and not spending the £9.4m. Attack the hub plan first: the pilot ran through the Christmas peak, the 1,450 target assumes nearby customers all collect in store, and van bays at four sites are unlikely to get consent in under nine months. Name the cheapest exit for each lease. List each objection on its own numbered line with the figure it rests on.' } }
                ],
                wires: [['spec_fin', 'notes', 'mem', 'write'], ['spec_ops', 'notes', 'mem', 'write'], ['spec_ppl', 'notes', 'mem', 'write'], ['lead', 'summary', 'prop', 'proposal'], ['mem', 'read', 'prop', 'context'], ['mem', 'read', 'adv', 'context'], ['prop', 'case', 'adv', 'proposal']]
            },
            {
                title: 'Stress test and revisions',
                blurb: 'The Red Team attacks the hub case as if it were already failing. A Pre-mortem component and a Risk Register feed it, and a Scenario Analysis tests how sensitive the answer is to online volume. The Feedback block sends two rounds of corrections back to the specialists.',
                nodes: [
                    { k: 'pm', comp: ['reasoning', 'Pre-mortem Analysis', { 'project/plan': 'the 12 store hub conversion', 'describe the failure in detail': 'By month 12 collections are averaging 620 orders a store a month, the £9.4m is spent, and the board reverses the plan with two stores still losing money.', 'first domino': 'The pilot peak figure is treated as the normal monthly rate', 'second domino': 'Van bay consent slips beyond month nine at four sites', 'third domino': 'Stock is split between hubs and shop floors, so in-store sales fall faster than online sales rise', 'root cause 1': 'The pilot ran through the pre-Christmas peak', 'root cause 2': 'Collection demand beyond 15 miles was assumed, not tested', 'measure 1': 'Fund the first four hubs only and release the rest against a monthly collection target', 'measure 2': 'Secure consent for all four van bays before any capital is committed', 'signal 1': 'Collections below 900 a store a month for two months running', 'signal 2': 'In-store sales falling more than 8 per cent a month in the first hub stores' }], section: 'approach', at: [4, 3] },
                    { k: 'risk', type: 'risk_assessment', at: [4, 4], set: { title: 'Risk Register', content: 'Score each risk for likelihood and impact on a 1 to 5 scale. Online volume falls short of 1,450 orders a month: likelihood 3, impact 5. Planning consent slips beyond nine months at four sites: likelihood 3, impact 3. Redundancy costs rise above £2.9m if consultation runs long: likelihood 2, impact 3. Five leases break in 2027 and limit the closure timetable: likelihood 4, impact 2. The Chief Financial Officer owns any risk scoring 15 or more.' } },
                    { k: 'scen', type: 'scenario_analysis', at: [5, 3], set: { title: 'Volume Scenarios', scenarioCount: '3', content: 'Three cases for online orders per store a month at month 12: downside 900, base 1,450, upside 1,900. For each case give the three year cash effect of the hub option and say which option wins. Show the point where closure wins even in the upside case, if there is one.' } },
                    { k: 'rt', type: 'agent_red_team', at: [5, 0], set: { title: 'Red Team', content: 'Attack the Hub Case as if it were already failing. Find the three numbers that carry most of the case and show what happens to payback if each one is 25 per cent lower. Check the pilot against the peak season. Use the Risk Register and the Pre-mortem signals. Each finding needs a fix the Finance or Operations Specialist can make within one round.' } },
                    { k: 'fb', type: 'feedback', at: [6, 1], set: { title: 'Revision Rules', feedbackSource: 'Red Team and Devil\'s Advocate', purpose: 'Revision', maxRounds: 2, content: 'Send each finding back to the Finance or Operations Specialist as a numbered correction. Each specialist replies with the corrected figure and its source. Stop after two rounds and list any point still open for the Judge.' } }
                ],
                wires: [['prop', 'case', 'rt', 'target'], ['risk', 'out', 'rt', 'context'], ['pm', 'out', 'scen', 'in'], ['rt', 'findings', 'fb', 'in'], ['adv', 'objections', 'fb', 'in'], ['fb', 'to_any', 'spec_fin', 'feedback'], ['fb', 'to_any', 'spec_ops', 'feedback']]
            },
            {
                title: 'Aggregate and decide',
                blurb: 'The Aggregator merges the specialist reports, the scenarios and the red team findings into one position. Uncertainty tags separate measured figures from modelled ones. The Judge then picks an option, and the Summariser writes the chair paper.',
                nodes: [
                    { k: 'agg', type: 'agent_aggregator', at: [6, 3], set: { title: 'Position Merge', content: 'Merge the four inputs into one position and keep every figure with its source. Where two inputs disagree, put both in the conflicts output, say which figure you used and why. Report the three year cash effect of each option as a range, not a single figure.' } },
                    { k: 'judge', type: 'agent_judge', at: [7, 0], set: { title: 'The Judge', content: 'Choose one option: close all 12 stores, convert all 12, or split (convert the strongest four and close the other eight at lease breaks). Score each option against the Decision Rules. Give the three year cash effect, the number of staff affected and the single fact most likely to change your mind. Reject any option whose key figure has no source.' } },
                    { k: 'meta', type: 'meta_uncertainty', at: [7, 3], set: { title: 'Uncertainty Tags', content: 'Tag every figure in the merged position as measured, modelled or assumed. Measured figures come from store accounts or payroll. Modelled figures come from the pilot or the forecast. Assumed figures have no source. Pass the tags on so the chair can see how much of the case rests on modelled numbers.' } },
                    { k: 'sum', type: 'agent_summariser', at: [8, 1], set: { title: 'Chair Paper', content: 'Write the chair paper in under 600 words: the question, the two options, the Judge verdict with its cash figures, the three risks that matter most and the one decision needed today. Keep every figure exactly as sourced and end with a line naming what you left out.' } }
                ],
                wires: [['spec_fin', 'result', 'agg', 'planner_out'], ['scen', 'out', 'agg', 'researcher_out'], ['spec_ops', 'result', 'agg', 'writer_out'], ['rt', 'findings', 'agg', 'critic_out'], ['prop', 'case', 'judge', 'option_a'], ['adv', 'objections', 'judge', 'option_b'], ['dfw', 'out', 'judge', 'criteria'], ['agg', 'merged', 'meta', 'in'], ['meta', 'out', 'sum', 'source'], ['judge', 'verdict', 'sum', 'brief']]
            },
            {
                title: 'Sign-off',
                blurb: 'Nothing is committed until the chair decides. The paper reaches Human Approval with the uncertainty tags attached, and only a clear yes passes through to the board pack.',
                nodes: [
                    { k: 'hum', type: 'agent_human', at: [9, 1], set: { title: 'Board Chair', question: 'Approve the split plan: release £3.1m now for four hub conversions, and close the other eight stores at lease breaks?', content: 'Show the chair paper together with the uncertainty tags. Continue only on a clear yes. On a no, return the chair notes to the Team Lead for a second pass.' } },
                    { k: 'rep', comp: ['writing', 'Report Structure', { title: 'Split plan: four hubs now, eight closures at lease breaks', '2-3 sentences': 'The Judge chose the split. It keeps £3.1m of the £9.4m budget at risk until collections prove the online case, and closes the weakest eight stores when their leases end.', context: 'Five leases break in 2027, so the chain must decide the timetable before the next break date passes', how: 'Three specialist strands, a Red Team stress test, two rounds of corrections and a Judge scoring against the Decision Rules', facts: 'Store losses of £1.9m a year, closure cost of £6.8m, hub capex of £9.4m, and the pilot peak of 1,180 orders a store a month', interpretation: 'The hub case only beats closure if collections reach 900 a store a month or more, and the pilot figure is not a normal month', actions: 'Fund four hubs, secure consent for four van bays, and review the other eight stores at each lease break' }], section: 'output', at: [8, 3] },
                    { k: 'out', type: 'output', at: [9, 3], set: { title: 'Board Pack', formatSchema: 'Markdown', content: 'Return the approved board paper in Markdown: the question, the decision taken, a cash table for each option, the staff and lease impact and the uncertainty tags, following the report structure supplied.' } }
                ],
                wires: [['sum', 'summary', 'hum', 'proposal'], ['hum', 'approved', 'out', 'in'], ['rep', 'out', 'out', 'in']]
            }
        ]
    });

    PB.showcases.push({
        id: 'course-builder',
        group: 'Teams at work',
        title: 'The Course Builder',
        tagline: 'Four weeks of money basics for school leavers, from first payslip to first savings pot.',
        about: 'A course design desk in one prompt. A request for a UK personal finance course is planned into four weeks, researched against gov.uk figures, split between a Specialist for each week, drafted, quizzed, read cold by a 17 year old, revised in a capped loop and held for a human sign-off.',
        chapters: [
            {
                title: 'The brief and the syllabus',
                blurb: 'A course request arrives as one sentence. The Course Designer turns it into four weeks and the skills a learner should have by the end. Those skills become the yardstick for every check that follows.',
                nodes: [
                    { k: 'role', type: 'role', at: [0, 0], set: { title: 'Course Designer', content: 'You design short courses for school leavers who are about to earn their first wage. Your reader is 17, has a part-time job or is about to start one, and has never paid a bill on their own. Be practical and warm, and never talk down to them.' } },
                    { k: 'brief', type: 'user_input', at: [0, 1], set: { title: 'Course request', inputName: 'course_request', prompt: 'Who is the course for, and what must it cover?', content: 'The request from the Learning Team. Every agent works from this sentence.', defaultValue: 'A four-week beginner course on personal finance for UK school leavers, aged 16 to 18, starting their first job or college. Each week ends with a short quiz.' } },
                    { k: 'plan', type: 'agent_planner', at: [1, 1], set: { title: 'Syllabus Planner', content: 'Write a four-week syllabus. Week 1: money in and money out, covering payslips, take-home pay and opening a current account. Week 2: a monthly budget, with bills first and the 50/30/20 split as a starting point only. Week 3: credit, overdrafts and student loans. Week 4: saving, Individual Savings Accounts and the workplace pension. Give each week one plain English goal, one worked example and one quiz. Keep every lesson to about 20 minutes of reading.' } },
                    { k: 'outcomes', comp: ['education', 'Skill Progression Map', { subject: 'personal finance for UK school leavers', 'beginner skills': 'reading a payslip and building a monthly budget', 'intermediate skills': 'comparing credit options and working out a student loan repayment', 'where learners get stuck, and why': 'mixing up gross and take-home pay, and treating an unused overdraft as spare money' }], section: 'success', at: [0, 3], title: 'Learning goals' }
                ],
                wires: [['role', 'out', 'plan', 'context'], ['brief', 'out', 'plan', 'task'], ['outcomes', 'out', 'plan', 'constraints']]
            },
            {
                title: 'UK facts and sources',
                blurb: 'The Researcher pulls the UK figures each week depends on, with the source and the date checked for every one. A Source Register keeps the list for later checks, and an Uncertainty Map shows what is still missing.',
                nodes: [
                    { k: 'res', type: 'agent_researcher', at: [2, 1], set: { title: 'UK Facts Researcher', content: 'Find the UK facts each week needs: tax rates and thresholds, student loan plan thresholds, ISA and Lifetime ISA rules, and automatic enrolment limits. For every figure give the amount, the tax year it applies to, the official source (gov.uk, HMRC, MoneyHelper or the Financial Conduct Authority) and the date you checked it. Treat blogs and bank marketing pages as weak sources. Do not use a figure you cannot source.' } },
                    { k: 'reg', type: 'agent_memory', at: [3, 1], set: { title: 'Source Register', content: 'One line per source: publisher, page title, date checked and the fact it supports. Agents may add lines but never edit an existing one. Later checks read from this register.' } },
                    { k: 'unc', comp: ['reasoning', 'Uncertainty Mapping', { 'what might be missing entirely': 'a rate change for the coming tax year, and any figure that only applies in Scotland' }], section: 'approach', at: [2, 3] }
                ],
                wires: [['plan', 'outline', 'res', 'questions'], ['plan', 'plan', 'res', 'context'], ['unc', 'out', 'res', 'context'], ['brief', 'out', 'res', 'task'], ['res', 'sources', 'reg', 'write']]
            },
            {
                title: 'Four specialists',
                blurb: 'One Specialist per week reads the plan and only the UK facts for that week. Each one returns the lesson material along with the points it is unsure of, so the writer gets every fact with its limits attached.',
                nodes: [
                    { k: 'spec1', type: 'agent_specialist', at: [4, 0], set: { title: 'Week 1 Specialist', specialty: 'Money in and money out', content: 'Explain a payslip line by line: gross pay, income tax, National Insurance, pension contributions and take-home pay. Work one example for a £20,000 salary using the rates from the UK Facts Researcher, and show the arithmetic. Link the payslip to a current account and a debit card.' } },
                    { k: 'spec2', type: 'agent_specialist', at: [4, 1], set: { title: 'Week 2 Specialist', specialty: 'Budgeting and bills', content: 'Teach the monthly budget in three steps: work out income after tax, list the fixed bills, then set a limit for everything else. Present the 50/30/20 split as a starting point only. Use a flat share with rent of £650 a month, then show what changes when one bill rises by £40.' } },
                    { k: 'spec3', type: 'agent_specialist', at: [4, 2], set: { title: 'Week 3 Specialist', specialty: 'Credit, overdrafts and student loans', content: 'Explain how a credit card, an overdraft and a buy now, pay later plan charge interest, using the annual percentage rate in plain words. Cover the student loan rule: a percentage of income above the plan threshold, taken through payroll. Use one worked example for each product and flag any rate the Researcher could not source.' } },
                    { k: 'spec4', type: 'agent_specialist', at: [4, 3], set: { title: 'Week 4 Specialist', specialty: 'Saving, ISAs and workplace pensions', content: 'Explain an emergency fund of three months of essential spending, a Cash ISA and a Stocks and Shares ISA, the Lifetime ISA and its 25% government bonus for savers aged 18 to 39, and automatic enrolment into a workplace pension. Use only the limits the Researcher sourced and mark any gap.' } }
                ],
                wires: [['res', 'findings', 'spec1', 'task'], ['res', 'findings', 'spec2', 'task'], ['res', 'findings', 'spec3', 'task'], ['res', 'findings', 'spec4', 'task'], ['plan', 'plan', 'spec1', 'context'], ['plan', 'plan', 'spec2', 'context'], ['plan', 'plan', 'spec3', 'context'], ['plan', 'plan', 'spec4', 'context']]
            },
            {
                title: 'Lesson drafts and a fact gate',
                blurb: 'A merge joins the four Specialist outputs in week order. The Writer drafts each lesson from the lesson template at the explanation level for a 17 year old, and the Fact Check Gate stops any claim without a source from reaching the page.',
                nodes: [
                    { k: 'mrg', type: 'merge', at: [5, 0], set: { title: 'Week notes', content: 'Join the four Specialist outputs in week order. Keep every figure with its source line.' } },
                    { k: 'exp', type: 'explanation_level', at: [5, 2], set: { title: 'Reader level', level: 'Informed generalist', content: 'The reader is 17 or 18, may already have a first payslip, and has never filled in a tax form. Define every money term the first time it appears, in a short bracket. Use pounds and pence, and a real example from a payslip rather than a textbook case.' } },
                    { k: 'gate', comp: ['guardrails', 'Fact Check Gate', { 'High / Medium / Low': 'High, Medium or Low', 'known fact / inference / uncertain': 'known fact, inference or uncertain', 'flag, caveat, or omit': 'flag it, caveat it or leave it out' }], section: 'constraints', at: [5, 4] },
                    { k: 'lp', comp: ['education', 'Lesson Plan', { topic: 'Week 1: money in and money out', level: 'school leavers aged 16 to 18', duration: '20 minutes', 'grabs attention, connects to prior knowledge': 'a real payslip with the take-home line circled, and the question why it is lower than the pay from a part-time job they already know', 'core content': 'gross pay, tax, National Insurance, pension and take-home pay', 'worked example together': 'a £20,000 salary, line by line', 'students try alone': 'a payslip with one deduction changed, to see what moves', '1 question checking understanding': 'Why is take-home pay less than the salary, and which line falls if the pension contribution goes up?' }], section: 'instructions', at: [6, 4] },
                    { k: 'wri', type: 'agent_writer', at: [6, 1], set: { title: 'Lesson Writer', content: 'Write four lessons, one per week, in the order of the syllabus. Each lesson has a one sentence goal, a hook, the explanation, one worked example in real pounds, a try-it task and a hand-off to the quiz. Keep every sentence under 20 words. Use only figures the Fact Check Gate marks as known fact or inference, and label each one. On a revision round, fix every point and say what changed.' } }
                ],
                wires: [['spec1', 'result', 'mrg', 'in'], ['spec2', 'result', 'mrg', 'in'], ['spec3', 'result', 'mrg', 'in'], ['spec4', 'result', 'mrg', 'in'], ['mrg', 'out', 'wri', 'notes'], ['plan', 'plan', 'wri', 'plan'], ['role', 'out', 'exp', 'in'], ['exp', 'out', 'wri', 'context'], ['gate', 'out', 'wri', 'context'], ['lp', 'out', 'wri', 'task']]
            },
            {
                title: 'The quiz and the checker',
                blurb: 'The Quiz Generator template sets the shape of each week quiz. The Quiz Tester writes the questions from the lesson draft and checks each one against the learning goals, returning any question that tests a word rather than a skill.',
                nodes: [
                    { k: 'qz', comp: ['education', 'Quiz Generator', { N: '4', topic: 'the learning goal for that week', 'beginner/intermediate/advanced': 'beginner', 'MCQ / short answer': 'multiple choice with four options and one correct answer', question: 'a question built on a payslip, a bill or a bank statement', answer: 'the correct option, with one line on why the others are wrong' }], section: 'examples', at: [7, 3] },
                    { k: 'tst', type: 'agent_tester', at: [7, 1], set: { title: 'Quiz Tester', content: 'Write four questions for the week from the lesson draft. Then check each question against the learning goals from the Skill Progression Map. Rewrite or drop any question that tests memory of a word instead of the skill. Mark each question pass or fail with one reason, and list the failures for the Feedback block.' } }
                ],
                wires: [['wri', 'draft', 'tst', 'code'], ['outcomes', 'out', 'tst', 'task'], ['qz', 'out', 'tst', 'task']]
            },
            {
                title: 'Reader and critic',
                blurb: 'An Audience Reviewer reads the lesson cold as a 17 year old and reports where they lost the thread. The Section Editor judges it against the request and the goals. Both sets of notes, plus the quiz failures, go into a Feedback block capped at two rounds.',
                nodes: [
                    { k: 'aud', type: 'agent_audience', at: [8, 0], set: { title: 'Reader at 17', content: 'Read the lesson as a 17 year old with a part-time job and no savings. Note the first term you did not know, the first sentence you skipped and any number you did not believe. Give a verdict of keep, rewrite or cut.' } },
                    { k: 'crt', type: 'agent_critic', at: [8, 2], set: { title: 'Section Editor', content: 'Judge the lesson against the course request and the learning goals. List issues as blocker, major or minor. For each blocker give one concrete rewrite. Do not rewrite the lesson yourself.' } },
                    { k: 'fb', type: 'feedback', at: [8, 4], set: { title: 'Revision Rules', feedbackSource: 'Reader at 17, Section Editor and Quiz Tester', purpose: 'Revision', maxRounds: 2, content: 'Treat every point as work for the next round. Fix it, or say in one line why it is out of scope. Two rounds at most, then the lesson goes to the Copy Editor whatever is left.' } }
                ],
                wires: [['wri', 'draft', 'aud', 'draft'], ['brief', 'out', 'aud', 'audience'], ['wri', 'draft', 'crt', 'draft'], ['brief', 'out', 'crt', 'task'], ['plan', 'priorities', 'crt', 'criteria'], ['crt', 'feedback', 'fb', 'in'], ['aud', 'confusions', 'fb', 'in'], ['tst', 'failures', 'fb', 'in'], ['fb', 'to_writer', 'wri', 'feedback']]
            },
            {
                title: 'Edit and sign off',
                blurb: 'The Copy Editor tightens the revised lessons without changing what they say. A Human Approval stop holds the course until a person says yes. A no goes back to the Writer as changes, and only a yes lets the course pack be produced.',
                nodes: [
                    { k: 'edt', type: 'agent_editor', at: [9, 0], set: { title: 'Copy Editor', content: 'Tighten each lesson without changing its meaning. Keep sentences under 20 words, cut hedging words such as perhaps and arguably, and make every heading a plain statement. List each change in one line.' } },
                    { k: 'hum', type: 'agent_human', at: [9, 2], set: { title: 'Head of Learning sign-off', question: 'Is every lesson accurate, clear for a 17 year old and ready for the pilot?', content: 'Show the four edited lessons, the quiz results and the Fact Check Gate flags together. Continue only on a clear yes. Anything else goes back to the Writer as changes.' } },
                    { k: 'out', type: 'output', at: [9, 4], set: { title: 'Course pack', formatSchema: 'Markdown', content: 'Return the approved course as Markdown: a title, a one paragraph overview, four week sections each holding the goal, the lesson, the worked example and the quiz with answers, and a closing list of sources taken from the Source Register.' } }
                ],
                wires: [['wri', 'revised_draft', 'edt', 'draft'], ['edt', 'edited', 'hum', 'proposal'], ['hum', 'approved', 'out', 'in'], ['hum', 'changes', 'wri', 'feedback']]
            }
        ]
    });

})();
