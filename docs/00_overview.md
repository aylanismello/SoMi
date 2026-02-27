# Overview

SoMi is an iOS app that guides users through short sequences of somatic (body-based) exercises. Before each session the user places themselves on a two-axis nervous system map — how energised they feel and how safe they feel — and picks a duration. The app generates a personalised sequence of video-guided exercises, plays them one by one, and records the session when it ends.

## What a session is

A session (called a **chain**) is one end-to-end practice:

1. Opening check-in — user marks their current state on the energy × safety grid
2. Optional 1-minute body scan
3. A sequence of video blocks (exercises), each ~60s, with a 20s pause between them
4. Optional 1-minute closing body scan
5. Closing check-in — user marks their state again, optionally adds tags and a journal note
6. Session saved to the database

## Inputs that drive a session

| Input | Where set | Range |
|-------|-----------|-------|
| **Energy** | 2D picker (StateXYPicker), X-axis | 0 (low) → 100 (high) |
| **Safety** | 2D picker (StateXYPicker), Y-axis | 0 (unsafe) → 100 (safe) |
| **Duration** | Duration picker on setup screen | 1–60 minutes |
| Body scan on/off | Settings (persisted) | toggle |
| Time of day | Automatic (device clock) | — |

Energy + safety together produce:
- **Polyvagal state** — one of: `restful`, `glowing`, `steady`, `wired`, `shutdown`
- **Intensity** — 0–100, distance from the centre of the grid

## Outputs

| Output | Where it goes |
|--------|--------------|
| **Block queue** — ordered list of exercises to play | Shown in preview, then played in `SoMiRoutine` screen |
| **somi_chains row** — one record per session | `somi_chains` table (Supabase) |
| **somi_chain_entries rows** — one per block played, with seconds elapsed | `somi_chain_entries` table |
| **embodiment_checks rows** — opening and closing check-in values | `embodiment_checks` table |
| **Session stats** — total minutes, blocks completed, state transformation | Shown on `CompletionScreen` |

## Core loop

- User taps **Flow** on home screen
- Sets energy + safety + duration → app calls server to generate a block queue
- Plays through blocks sequentially (video + 20s integration pause per block)
- Closing check-in saves the full session in one batch upload
- Home screen updates with streak and last session data
