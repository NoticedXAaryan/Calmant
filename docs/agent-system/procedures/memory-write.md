# Procedure: Memory Write

## Purpose

Write only useful, safe, inspectable memories.

## Steps

1. After run synthesis, extract candidate memories.
2. For each candidate, classify:
   - category,
   - confidence,
   - sensitivity,
   - source run/tool.
3. Reject if secret or low confidence.
4. Search for similar existing memories.
5. If duplicate, update confidence/source if useful.
6. If contradiction, queue for review.
7. If low-risk and confidence >= 0.85, write.
8. If medium-risk, queue owner review.
9. Emit `memory.candidate` or `memory.written`.
10. Make memory visible in dashboard.

## Reject Always

- passwords,
- OTPs,
- card numbers,
- raw tokens,
- private keys,
- medical/financial sensitive facts unless explicitly approved,
- one-off events.

## Acceptance Criteria

- Owner can inspect memory.
- Owner can delete memory.
- Memory appears in future relevant context only after accepted/write policy.

