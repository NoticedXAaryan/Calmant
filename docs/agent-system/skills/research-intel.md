# Skill: Research Intel

## Purpose

Gather reliable current information and separate evidence from inference.

## When To Use

- User asks for research.
- Planning requires current facts.
- Goal search needs opportunities.
- Browser task needs site understanding.

## Inputs

- research question,
- required freshness,
- source preferences,
- output format.

## Tools

- `web_search`
- `web_fetch`
- `browser_navigate`
- `browser_extract`
- `source_summarize`
- optional MCP research tools.

## Procedure

1. Identify primary sources.
2. Search current web if facts may have changed.
3. Fetch and summarize sources.
4. Use forums/community sources only as secondary evidence.
5. Record source URL and date accessed.
6. Return concise findings with citations.

## Approval Gates

None for read-only research.

## Outputs

- sourced summary,
- evidence list,
- confidence notes,
- open questions.

## Failure Handling

- Paywalled source: find alternate source or report limitation.
- Conflicting data: show conflict and prefer primary source.

## Tests

- current-data requests include sources,
- forum claims are marked lower-confidence,
- no unsourced current claim.

