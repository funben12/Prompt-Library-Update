---
name: unslop
description: Edit or rewrite text to remove obvious AI-writing patterns and restore a specific, natural human voice while preserving meaning and intended tone. Use for drafts, articles, emails, posts, scripts, documentation, and other prose that feels generic, polished-but-empty, promotional, robotic, overstructured, jargon-heavy, or obviously AI-generated.
---

# Unslop

Edit text to remove AI patterns and add human voice.

## Process

1. Scan for the patterns below.
2. Rewrite while preserving meaning and matching the intended tone.
3. Add soul using the guidance below.
4. Self-audit by asking, "What makes this obviously AI generated?" Fix the remaining tells.

## Add soul

Removing patterns is half the job. Sterile, voiceless writing is just as obvious.

- Have opinions. React to facts instead of neutrally listing pros and cons.
- Vary rhythm. Use short sentences, then longer ones that take their time. Mix it up.
- Acknowledge complexity. "Impressive but also kind of unsettling" beats "impressive."
- Use "I" when it fits. First person is not unprofessional.
- Let some mess in. Perfect structure looks machine-made.
- Be specific. Not "this is concerning" but "there's something unsettling about agents churning away at 3am."

## Detect and fix these patterns

### Content

1. Puffery. Cut phrases such as "pivotal moment," "testament to," "evolving landscape," "setting the stage for," "indelible mark," and "deeply rooted." State what happened.
2. Name-dropping. Do not list media outlets without context. Pick one and say what it reported.
3. Superficial -ing phrases. Delete or expand phrases such as "highlighting," "ensuring," "reflecting," "showcasing," and "fostering" with real evidence.
4. Promotional language. Replace "nestled," "vibrant," "breathtaking," "groundbreaking," "renowned," "stunning," and "must-visit" with neutral descriptions.
5. Vague attributions. Name the source behind "experts believe," "industry reports suggest," or "some critics argue," or delete the claim.
6. Formulaic challenges. Replace constructions such as "Despite challenges, it continues to thrive" with specific facts.

### Language

7. AI vocabulary. Replace words such as additionally, crucial, delve, enduring, enhance, fostering, garner, interplay, intricate, landscape used abstractly, pivotal, showcase, tapestry used abstractly, testament, underscore, and vibrant with plain words.
8. Fancy ways to say "is." Replace "serves as," "stands as," "boasts," and "features" with "is" or "has."
9. "Not just X, but Y." State the point directly.
10. Rule of three. Do not force ideas into groups of three. Use the natural number.
11. Synonym cycling. Pick one term and repeat it instead of cycling through synonyms such as protagonist, main character, central figure, and hero.
12. False ranges. Do not use "from X to Y" unless X and Y sit on a meaningful scale. List the topics directly.

### Style

13. Em dash overuse. Avoid em dashes entirely. Use periods or commas only. Do not substitute parentheses, en dashes, or hyphens as dashes. If a thought needs separation, end the sentence or use a comma.
14. Colon overuse. Use colons before lists or examples, not as mid-sentence connectors. Rewrite the sentence so the point stands on its own.
15. Boldface overuse. Do not bold every proper noun or acronym.
16. Inline-header lists. Replace a bold label and colon that restates the line, such as "**Performance:** Performance improved," with prose. A bold lead-in that ends in a period, names the item, and introduces genuinely new detail is acceptable.
17. Title case headings. Use sentence case.
18. Decorative emojis. Remove them from headings and bullets.
19. Curly quotes. Replace them with straight quotes.

### Communication artifacts

20. Chatbot phrases. Remove "I hope this helps," "Let me know if," "Of course," "Certainly," and "Found the smoking gun."
21. Cutoff disclaimers. Do not write "While specific details are limited." Find sources or remove the claim.
22. Sycophantic tone. Remove phrases such as "Great question" and "You're absolutely right." Respond directly.

### Filler

23. Filler phrases. Replace "in order to" with "to" and "due to the fact that" with "because." Delete "it is important to note that."
24. Excessive hedging. Reduce strings such as "could potentially possibly be argued that it might" to "may."
25. Generic conclusions. Replace "The future looks bright" with specific plans or facts.

### Jargon

26. Abstract metaphor nouns. Replace substrate, wedge, vector, locus, vantage, nexus, primitive used as a noun, harness used as a metaphor, surface as in "API surface," bedrock, scaffolding used as a metaphor, modality, paradigm, gold-plating, ratchet used as a metaphor, evacuate for moving code, endgame, north star, and flywheel with concrete words. For example, use "base" for "substrate," "add" for "wedge in," "way" or "method" for "vector," "more than the job needs" for "gold-plating," "move out" for "evacuate," and "last phase" for "endgame." Name the actual mechanism when possible.

### Plain speech

27. Say what it does, not how it feels. Replace vague feelings with a mechanism, instruction, fact, or number. For example, "`.toSQL()` returns the exact string sent to the database" and "a column rename fails the build" say something concrete. If a sentence could appear unchanged in another project's documentation, it probably says nothing about this project. Cut it.
28. Shorten or split dense sentences. If the reader must backtrack, break the sentence in two or drop clauses. Keep one idea per sentence.
29. Prefer active voice. Catch "is," "are," "was," or "were" plus a past participle and name the actor. For example, replace "queries are validated" with "the compiler validates queries." Keep passive voice only when the actor is unknown or does not matter.
30. Cut adverbs or use a stronger verb. Replace "runs quickly" with "is fast" or a measured number. Replace "significantly improves" with the measured change. An adverb propping up a weak verb usually means the verb is wrong.
31. Prefer the plain word. Replace "utilize" and "leverage" with "use," "facilitate" with "help," "numerous" with "many," and "in the event that" with "if."

## Output

Return the revised text directly. Preserve facts, intent, and useful nuance. Do not explain every edit unless the user asks for commentary or a change log.
