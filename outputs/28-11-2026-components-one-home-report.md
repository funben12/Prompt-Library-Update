# Components data: one home per component

Date: 28-11-2026

Starting point: `components-data.js` after the 3 exact duplicates were removed (3,783 blocks).
Result: **3789 blocks**. Every label now appears once, and no two blocks share the same text.

| Measure | Count |
|---|---|
| Label groups that appeared in more than one place | 311 (208 identical copies, 103 with different wording) |
| Copies removed from a non-home category, each replaced | 1031 |
| Same text under different labels, replaced | 23 |
| New distinct components written | 1054 |
| Components moved to a better home category | 6 (Source Attribution Requirement: Core to Guardrails; Feedback Loop Dialogue: Core to Dialogue; What If Scenario Generator: Core to Ideation; Mentor Persona: Core to Personas; Critic Persona: Core to Personas; Facilitator Persona: Core to Personas) |

## New components by category

| Category | New components |
|---|---|
| Core | 183 |
| Writing & Comms | 169 |
| Metaprompting | 150 |
| Guardrails | 147 |
| Agentic | 142 |
| Dialogue | 135 |
| Technical | 61 |
| Analysis | 15 |
| Control Flow | 13 |
| Miscellaneous | 10 |
| Ideation | 9 |
| UX Design | 8 |
| Reasoning | 3 |
| Creative | 3 |
| Social | 2 |
| Output | 1 |
| Data & Knowledge | 1 |
| Education | 1 |
| Research | 1 |

## Rule used to pick the home

The most specific topic wins. Order: Coding, Medical, Legal, Education, Research, Data, Business, UX, Creative, Ideation, Social, Technical, Personas, Reasoning, Analysis, Control, Output, Miscellaneous, Dialogue, Agentic, Guardrails, Metaprompting, Core, Writing. A few blocks were placed by hand where no member category fitted (personas, guardrails, dialogue, agentic, creative, ideation, Press Release, Success Criteria).

## Where each duplicated component now lives

| Component | Kept in | Removed from | Copies | Text |
|---|---|---|---|---|
| A/B Test Analysis | Data & Knowledge | Analysis | 2 | different wording |
| Abstract Writer | Research | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Action Log | Miscellaneous | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Advanced AB Prompt Tester | Metaprompting | Core | 2 | identical |
| Advanced Bias Checker | Metaprompting | Core | 2 | identical |
| Advanced Chain Designer | Metaprompting | Core | 2 | identical |
| Advanced Context Injector | Metaprompting | Core | 2 | identical |
| Advanced Few-Shot Builder | Metaprompting | Core | 2 | identical |
| Advanced Model Adapter | Metaprompting | Core | 2 | identical |
| Advanced Output Formatter | Metaprompting | Core | 2 | identical |
| Advanced Persona Switch | Metaprompting | Core | 2 | identical |
| Advanced Perspective Shifter | Metaprompting | Core | 2 | identical |
| Advanced Prompt Analyzer | Metaprompting | Core | 2 | identical |
| Advanced Prompt Compressor | Metaprompting | Core | 2 | identical |
| Advanced Prompt Critic | Metaprompting | Core | 2 | identical |
| Advanced Prompt Debugger | Metaprompting | Core | 2 | identical |
| Advanced Prompt Generator | Metaprompting | Core | 2 | identical |
| Advanced Prompt Hardener | Metaprompting | Core | 2 | identical |
| Advanced Prompt Improver | Metaprompting | Core | 2 | identical |
| Advanced Prompt Optimiser | Metaprompting | Core | 2 | identical |
| Advanced Prompt Reframer | Metaprompting | Core | 2 | identical |
| Advanced Prompt Splitter | Metaprompting | Core | 2 | different wording |
| Advanced Prompt Stress Tester | Metaprompting | Core | 2 | identical |
| Advanced Prompt to Library | Metaprompting | Core | 2 | identical |
| Advanced Prompt Versioner | Metaprompting | Core | 2 | identical |
| Advanced Response Evaluator | Metaprompting | Core | 2 | identical |
| Advanced Specificity Booster | Metaprompting | Core | 2 | identical |
| Advanced System Prompt Architect | Metaprompting | Core | 2 | identical |
| Advanced Tone Modifier | Metaprompting | Core | 2 | identical |
| Advanced Variable Extractor | Metaprompting | Core | 2 | identical |
| Agent Handoff Protocol | Agentic | Core, Metaprompting, Guardrails | 4 | identical |
| Algorithm Design | Coding | Technical | 2 | different wording |
| Analogy Builder | Education | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Anomaly Detection | Data & Knowledge | Core, Control Flow, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 8 | different wording |
| API Design Spec | Technical | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| API Rate Limiting | Coding | Technical | 2 | identical |
| API Response Mapper | Data & Knowledge | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| API Versioning | Coding | Technical | 2 | identical |
| Apology Message | Social | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Architecture Design | Technical | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Authentication Design | Coding | Technical | 2 | identical |
| Authorisation Design | Coding | Technical | 2 | identical |
| Backup Strategy | Coding | Technical | 2 | identical |
| Balanced Scorecard | Business | Analysis | 2 | different wording |
| Biomimicry Ideation | Ideation | none (second copy in Ideation) | 2 | different wording |
| Boundary Setting | Dialogue | Core, Metaprompting, Guardrails, Agentic | 5 | identical |
| Branching Strategy | Coding | Technical | 2 | identical |
| Break-Even Analysis | Business | Control Flow | 2 | different wording |
| Budget Breakdown | Miscellaneous | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Bug Report Template | Technical | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Caching Strategy | Coding | Technical | 2 | identical |
| Case Brief | Legal | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | different wording |
| Case Study Protocol | Research | Writing & Comms | 2 | different wording |
| Changelog Format | Technical | Output | 2 | different wording |
| Chaos Engineering | Coding | Technical | 2 | identical |
| Churn Analysis | Business | Analysis | 2 | different wording |
| CI/CD Pipeline Generator | Coding | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue, Technical | 8 | identical |
| CI/CD Pipeline Step | Technical | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Citation Context Builder | Research | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Clinical Summary | Medical | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | different wording |
| Cloud Infrastructure | Technical | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Code Explain | Coding | Technical | 2 | identical |
| Code Generation | Coding | Technical | 2 | identical |
| Code Handoff | Coding | Technical | 2 | identical |
| Code Review Comment Set | Technical | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Code Scaffolder | Coding | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue, Technical | 8 | identical |
| Coding Standard Snippet | Technical | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Cognitive Bias Check | Reasoning | Core | 2 | different wording |
| Cohort Analysis | Data & Knowledge | Analysis | 2 | different wording |
| Comedic Timing Beat | Creative | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Commit Message | Coding | Technical | 2 | identical |
| Common Misconceptions | Education | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Community Announcement | Social | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Community Post | Social | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Compare and Contrast | Education | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Competitive Analysis | Business | Analysis | 2 | different wording |
| Compliance Check | Legal | Core, Control Flow, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 8 | different wording |
| Component Design | Coding | Technical | 2 | identical |
| Concept Explainer | Education | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Confirmation Before Action | Agentic | Core, Metaprompting, Guardrails, Dialogue | 5 | identical |
| Conflict De-escalation | Dialogue | Core, Metaprompting, Guardrails, Agentic | 5 | identical |
| Conflict Resolution | Social | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue, Miscellaneous | 8 | different wording |
| Constraint Removal | Ideation | none (second copy in Ideation) | 2 | different wording |
| Constraint-Based Creativity | Creative | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Container Orchestration | Coding | Technical | 2 | identical |
| Contract Clause | Legal | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | different wording |
| Cost-Benefit Analysis | Analysis | Control Flow | 2 | different wording |
| Cost-Benefit Snapshot | Miscellaneous | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Cover Letter (Journal) | Research | Writing & Comms | 2 | different wording |
| Creative Constraints Generator | Creative | Core, Metaprompting, Guardrails, Agentic, Dialogue | 6 | identical |
| Crisis Communication | Social | Writing & Comms | 2 | different wording |
| Crisis Communication Template | Business | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Critic Persona | Personas | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 6 | identical |
| Cross-Cultural Communication Check | Social | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Curriculum Map | Education | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Custom Utility Prompt | Miscellaneous | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Dark Mode Design | UX Design | none (second copy in UX Design) | 2 | different wording |
| Dashboard Design | Data & Knowledge | Technical | 2 | different wording |
| Data Dictionary Generator | Data & Knowledge | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Data Lineage Tracker | Data & Knowledge | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Data Migration Plan | Coding | Technical | 2 | identical |
| Data Minimisation Rule | Guardrails | Core, Metaprompting | 3 | identical |
| Data Modelling | Coding | Technical | 2 | identical |
| Data Quality Check | Data & Knowledge | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Data Retention Policy | Data & Knowledge | Writing & Comms, Technical | 3 | different wording |
| Data Storytelling | Data & Knowledge | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Data Structure Selection | Coding | Technical | 2 | identical |
| Data Synthesis | Research | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Database Migration Script | Coding | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue, Technical | 8 | identical |
| Database Schema Design | Technical | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| De-escalation Script | Dialogue | Core, Metaprompting, Guardrails, Agentic | 5 | identical |
| Debate Moderation | Social | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Debug Request | Coding | Technical | 2 | identical |
| Decision Checklist | Miscellaneous | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Decision Matrix | Analysis | Control Flow | 2 | different wording |
| Dependency Upgrade Plan | Coding | Technical | 2 | identical |
| Deployment Checklist | Technical | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue, Miscellaneous | 8 | different wording |
| Deployment Plan | Coding | Technical | 2 | identical |
| Deprecation Notice | Coding | Technical | 2 | identical |
| Design Pattern Advisor | Coding | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue, Technical | 8 | identical |
| Dietary Plan Outline | Medical | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Diff Review | Coding | Technical | 2 | identical |
| Differential Diagnosis | Medical | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Disaster Recovery Plan | Technical | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 8 | different wording |
| Discharge Summary | Medical | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | different wording |
| Discussion Facilitation | Education | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Dispute Escalation Letter | Legal | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | different wording |
| Docs Generator | Coding | Technical | 2 | identical |
| ELI5 Translator | Education | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Emergency Protocol Summary | Medical | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Encryption Strategy | Coding | Technical | 2 | identical |
| Error Handling Pattern | Coding | Technical | 2 | identical |
| Ethics Review Checklist | Research | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Ethnographic Field Notes | Research | Writing & Comms | 2 | different wording |
| Event Handling | Coding | Technical | 2 | identical |
| Event Invitation | Social | Writing & Comms | 2 | different wording |
| Event Planning Checklist | Miscellaneous | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Event-Driven Architecture | Coding | Technical | 2 | identical |
| Experiment Design | UX Design | Miscellaneous | 2 | different wording |
| Extreme User | Ideation | none (second copy in Ideation) | 2 | different wording |
| Facilitator Persona | Personas | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 6 | identical |
| Failure Recovery Loop | Agentic | Core, Metaprompting, Guardrails | 4 | identical |
| Feedback Delivery (SBI) | Social | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Feedback Loop | Dialogue | Core | 2 | different wording |
| Feedback Loop Dialogue | Dialogue | Core, Metaprompting, Guardrails, Agentic | 4 | identical |
| Feedback Rubric | Education | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| First Principles | Ideation | Reasoning | 2 | different wording |
| Flaky Test Investigation | Coding | Technical | 2 | identical |
| Funnel Analysis | UX Design | Analysis | 2 | different wording |
| Future Backcasting | Ideation | none (second copy in Ideation) | 2 | different wording |
| Gamified Challenge | Education | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Geriatric Assessment Note | Medical | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | different wording |
| Go‑to‑Market Strategy | Business | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| GRADE Assessment | Research | Writing & Comms | 2 | different wording |
| Grounded Theory | Research | Writing & Comms | 2 | different wording |
| Health and Safety Policy | Legal | Writing & Comms | 2 | different wording |
| Health Check Design | Coding | Technical | 2 | identical |
| Heuristic Evaluation | UX Design | none (second copy in UX Design) | 2 | different wording |
| Historical Analogy | Ideation | none (second copy in Ideation) | 2 | different wording |
| HTTP Status Code | Coding | Technical | 2 | identical |
| Hypothesis Refinement | Research | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Icebreaker Generator | Social | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Incident Report | Technical | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Inclusive Language Check | UX Design | Social | 2 | different wording |
| Index Strategy | Coding | Technical | 2 | identical |
| Information Architecture | UX Design | none (second copy in UX Design) | 2 | different wording |
| Infrastructure as Code | Coding | Technical | 2 | identical |
| Innovation Pipeline | Business | Miscellaneous | 2 | different wording |
| IP Assignment Clause | Legal | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | different wording |
| Job Description | Business | Writing & Comms | 2 | different wording |
| Latency Optimisation | Coding | Technical | 2 | identical |
| Learning Objective | Education | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Legal Analysis | Legal | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | different wording |
| Legal Risk Assessment | Legal | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Lesson Plan | Education | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Literature Review | Research | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Load Testing Plan | Coding | Technical | 2 | identical |
| Localisation Check | UX Design | none (second copy in UX Design) | 2 | different wording |
| Logging Strategy | Coding | Technical | 2 | identical |
| Medication Check | Medical | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | different wording |
| Meeting Agenda | Miscellaneous | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Memory Optimisation | Coding | Technical | 2 | identical |
| Mental Health Check-In | Social | Miscellaneous | 2 | different wording |
| Mental Health Screening Summary | Medical | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Mentor Persona | Personas | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 6 | identical |
| Merge Conflict Resolution | Coding | Technical | 2 | identical |
| Message Queue Design | Coding | Technical | 2 | identical |
| Meta-Analysis Framing | Research | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Metaphor Expansion | Creative | Core, Metaprompting, Guardrails, Agentic, Dialogue | 6 | different wording |
| Methodology Critique | Research | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Microservice Boundary | Coding | Technical | 2 | identical |
| Mindset Reframe | Miscellaneous | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Monitoring Plan | Technical | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Monolith vs Microservices | Coding | Technical | 2 | identical |
| Mood Board Description | Creative | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Multi-Turn Memory Recap | Dialogue | Core, Metaprompting, Guardrails, Agentic | 5 | identical |
| NDA Summary | Legal | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | different wording |
| OKR Planner | Business | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Onboarding Flow | UX Design | none (second copy in UX Design) | 2 | different wording |
| Opposite Thinking | Ideation | none (second copy in Ideation) | 2 | different wording |
| Outreach Message | Social | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Paediatric Growth Note | Medical | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | different wording |
| Partnership Proposal | Business | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Patient Education | Medical | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Peer Review Structure | Research | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Peer Teaching Prompt | Education | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Performance Profiling Note | Technical | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| PESTLE Analysis | Business | Analysis | 2 | different wording |
| Phenomenological Analysis | Research | Writing & Comms | 2 | different wording |
| Plain-Language Contract Summary | Legal | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | different wording |
| Plot Twist Generator | Creative | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Porter's Five Forces | Business | Control Flow | 2 | different wording |
| Post-mortem | Technical | Control Flow | 2 | different wording |
| Post-Op Recovery Plan | Medical | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | different wording |
| Pre-mortem | Ideation | Control Flow, Analysis | 3 | different wording |
| Press Release | Miscellaneous | Research | 2 | different wording |
| PRISMA Flow Diagram | Research | Writing & Comms | 2 | different wording |
| Privacy Compliance Check | Data & Knowledge | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Privacy Policy Section | Legal | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | different wording |
| Prompt Psychologist V2 | Metaprompting | Core | 2 | identical |
| Prompt Psychologist V3 | Metaprompting | Core | 2 | identical |
| Pull Request Description | Coding | Technical | 2 | identical |
| Query Optimisation | Coding | Technical | 2 | identical |
| Quick Wins | Miscellaneous | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Quiz Generator | Education | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Random Mashup | Creative | Core, Metaprompting, Guardrails, Agentic, Dialogue | 6 | identical |
| Random Stimulus | Ideation | none (second copy in Ideation) | 2 | different wording |
| Reading Guide | Education | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Real-time Sync | Coding | Technical | 2 | identical |
| Recipe Adaptation | Miscellaneous | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Recognition Message | Social | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Recursive Prompt V2 | Metaprompting | Core | 2 | identical |
| Refactor Request | Coding | Technical | 2 | identical |
| Register Matching | Dialogue | Core, Metaprompting, Guardrails, Agentic | 5 | identical |
| Regression Analysis | Data & Knowledge | Analysis | 2 | different wording |
| Regulatory Applicability Check | Legal | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | different wording |
| Relationship Check-In | Social | Miscellaneous | 2 | different wording |
| Repair After Misunderstanding | Dialogue | Core, Metaprompting, Guardrails, Agentic | 5 | identical |
| Research Design | Research | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Research Gap Identifier | Research | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Result Verification Step | Agentic | Core, Metaprompting, Guardrails | 4 | identical |
| Retry Strategy | Coding | Technical | 2 | identical |
| Reveal Structure | Creative | none (second copy in Creative) | 2 | different wording |
| Rhythm and Cadence Note | Creative | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Risk Register | Business | Miscellaneous | 2 | different wording |
| Rollback Plan | Coding | Technical | 2 | identical |
| Root Cause Analysis | Reasoning | Control Flow, Analysis | 3 | different wording |
| Root Cause Analysis (Code) | Coding | Technical | 2 | identical |
| Scaffolded Explanation | Education | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Scenario Planning | Analysis | Control Flow | 2 | different wording |
| Secrets Management | Coding | Technical | 2 | identical |
| Sensitivity Analysis | Research | Control Flow | 2 | different wording |
| Sentiment Analysis | Data & Knowledge | Analysis | 2 | different wording |
| Serverless Design | Coding | Technical | 2 | identical |
| Six Thinking Hats | Ideation | none (second copy in Ideation) | 2 | different wording |
| Skill Progression Map | Education | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Slide Deck Outline | Output | Miscellaneous | 2 | different wording |
| Small Talk Redirect | Dialogue | Core, Metaprompting, Guardrails, Agentic | 5 | identical |
| SOAP Note | Medical | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Social Media Caption | Social | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Socratic Questioning | Education | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Source Attribution Requirement | Guardrails | Core, Metaprompting | 2 | identical |
| Spaced Repetition Set | Education | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Stakeholder Communication Plan | Business | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| State Management | Coding | Technical | 2 | identical |
| State Tracking Block | Agentic | Core, Metaprompting, Guardrails | 4 | identical |
| Statistical Interpretation | Research | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Story World Builder | Creative | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Study Guide Builder | Education | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Style Pastiche | Creative | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Subtext Layer | Creative | none (second copy in Creative) | 2 | different wording |
| Success Criteria | Core | Education | 2 | different wording |
| Survey Design | Research | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue, Miscellaneous | 8 | different wording |
| Survival Analysis | Research | Data & Knowledge | 2 | different wording |
| SWOT Analysis | Business | Control Flow, Analysis | 3 | different wording |
| Symbolism Layer | Creative | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Synthetic Data Generator | Data & Knowledge | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| System Design Interview | Coding | Technical | 2 | identical |
| Systematic Review Protocol | Research | Writing & Comms | 2 | different wording |
| Task Analysis | UX Design | none (second copy in UX Design) | 2 | different wording |
| Teaching Method | Education | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Team Norms Draft | Social | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Tech Debt Detector | Coding | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue, Technical | 8 | identical |
| Technical Spec | Technical | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Temporal Reasoning | Reasoning | none (second copy in Reasoning) | 2 | different wording |
| Terms of Service Clause | Legal | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | different wording |
| Test Writer | Coding | Technical | 2 | identical |
| Thank You Note | Social | Writing & Comms | 2 | different wording |
| Thematic Analysis | Research | Writing & Comms | 2 | different wording |
| Threat Model | Technical | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Translation | Miscellaneous | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Trend Analysis | Analysis | Control Flow | 2 | different wording |
| Trend Extrapolation | Ideation | Reasoning | 2 | different wording |
| Triage Checklist | Medical | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | different wording |
| Trip Planning Outline | Miscellaneous | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Typography Scale | UX Design | none (second copy in UX Design) | 2 | different wording |
| Uncertainty Disclosure | Guardrails | Core, Metaprompting | 3 | identical |
| Understanding Check | Education | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| Unit Economics | Business | Analysis | 2 | different wording |
| Usability Test Plan | UX Design | Miscellaneous (second copy in UX Design) | 3 | different wording |
| Use Case Expander V2 | Metaprompting | Core | 2 | identical |
| User Persona | UX Design | Analysis | 2 | different wording |
| User Sentiment Detection | Dialogue | Core, Metaprompting, Guardrails, Agentic | 5 | identical |
| Value Chain Analysis | Business | Analysis | 2 | different wording |
| Value Proposition | Business | Writing & Comms | 2 | different wording |
| Vital Signs Interpretation | Medical | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| WebSocket Design | Coding | Technical | 2 | identical |
| Weekly Planning Template | Miscellaneous | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue | 7 | identical |
| What If Scenario Generator | Ideation | Core, Writing & Comms, Metaprompting, Guardrails, Agentic, Dialogue, Creative | 7 | different wording |
| Workshop Facilitation | Ideation | Social | 2 | different wording |
| Worst Possible Idea | Ideation | none (second copy in Ideation) | 2 | different wording |

## Same text under different labels

The first label of each pair is kept. The others got a new component.

| Kept | Replaced |
|---|---|
| Parental Leave Policy | Maternity Policy, Paternity Policy, Military Leave Policy |
| Volunteer Time Off Policy | Community Service Policy |
| Tuition Reimbursement Policy | Educational Assistance Policy |
| Whistleblower Policy | Whistleblower Policy (Finance) |
| Conflict of Interest Policy | Conflict of Interest Policy (Finance) |
| Travel Policy | Travel and Entertainment Policy |
| Corporate Card Policy | Corporate Credit Card Policy |
| Procurement Policy | Procurement Policy (Finance) |
| Records Retention Policy | Records Retention Policy (Finance) |
| Backup Policy | Data Backup Policy |
| Sustainability Policy | Environmental Sustainability Policy, Climate Action Policy |
| Corporate Social Responsibility Policy | Social Responsibility Policy |
| Community Investment Policy | Philanthropy Policy |
| Anti-Bribery Policy | Anti-Corruption Policy |
| Human Rights Policy | Human Rights Commitment |
| Internal Audit Policy | IT Audit Policy |
| Risk Management Policy | IT Risk Management Policy |
| FCPA Compliance Policy | UK Bribery Act Compliance Policy |
| IT Vendor Management Policy | AI Vendor Management Policy |
| Feedback Loop | Feedback Loop Dialogue |
