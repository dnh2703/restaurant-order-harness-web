# Story Backlog

This backlog will be populated after a user provides a project spec or selects a
specific initiative.

Do not create every possible story packet up front. Create story packets when
the work is selected or when a product decision needs a durable place to land.

## Candidate Epics

| Epic | Description | Status |
| --- | --- | --- |
| E01 — QR access & table session | Customer QR entry (US-1.1 ✅), header context (US-1.2 ✅), admin table QR (US-1.3 ✅, PR #9) | sliced |
| E02 — Menu browsing | US-2.1–2.3 implemented ✅ | sliced |
| E03 — Cart & ordering | US-3.1–3.3 implemented ✅ (order tracking PR #4); **US-3.4 planned** | partially sliced |
| E04 — Kitchen screen | US-4.1–4.3 implemented ✅ (PR #6, #8) | sliced |
| E05 — Cashier & payment | Implemented ✅ (open tables, bill, discount, payment, invoice — PR #14) | sliced |
| E06 — Menu administration | US-6.1–6.3 implemented ✅ + dish image upload (PR #10, #13) | sliced |
| E07 — Reports | **Not started on FE** | unsliced |
| E08 — Auth & authorization | Thin slice done (kitchen login + guard); **staff mgmt (US-8.4) planned** | partially sliced |
| E09 — Realtime (SSE) | Customer + kitchen streams implemented ✅ | partially sliced |

## Next up

Remaining unimplemented work (FE), smallest first:

- **US-3.4** — Customer calls staff / requests bill (`docs/product/menu-browsing.md`); story packet not yet created.
- **US-8.4** — Staff management & authorization (CRUD accounts, roles); story packet not yet created.
- **E07 — Reports** — largest remaining gap; needs intake + product spec before slicing.
