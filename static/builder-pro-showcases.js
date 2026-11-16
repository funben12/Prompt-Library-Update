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
    // [blank] placeholders in a component are filled from the map the showcase gives. Any left over stay as written.
    const fillText = (text, fill) => String(text).replace(/\[([^\]\n]+)\]/g, (m, k) => fill && Object.prototype.hasOwnProperty.call(fill, k) ? fill[k] : m);

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
        id: 'newsroom',
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
