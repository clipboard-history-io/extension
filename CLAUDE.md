# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` — run extension in dev mode (Chrome MV3); `pnpm dev:firefox` for Firefox MV2
- `pnpm build` / `pnpm build:firefox` — production builds (the Firefox build runs setup/teardown scripts that temporarily rewrite the manifest in package.json)
- `pnpm lint` — ESLint; `pnpm format` — Prettier (with import sorting)
- `pnpm generate:translations` — regenerate `locales/` from the English source via DeepL (requires API key)

There are no tests.

## What this is

A Plasmo-based browser extension (Chrome MV3 + Firefox MV2) for clipboard history, built with React, Mantine v6, and Jotai. Local-first storage with optional paid cloud sync via InstantDB.

## Architecture

**Entry ID convention (load-bearing, used everywhere):** local entries use SHA-256(content) as their ID (64 hex chars); cloud entries use UUIDs (36 chars). `entryId.length === 36` is how code routes an ID to local vs. cloud handlers — see `handleEntryIds()` in [utils/entries.ts](utils/entries.ts). Local IDs being content hashes is also the dedup mechanism; cloud dedup uses a unique `emailContentHash` (`${email}+${contentHash}`).

**Background** ([background/index.ts](background/index.ts)): polls the clipboard every 800ms (`watchClipboard()` in [utils/background.ts](utils/background.ts)). In Chrome MV3 the polling runs in an offscreen document ([offscreen.ts](offscreen.ts)); Firefox MV2 uses a persistent background page instead. Also owns context menus, the badge count, and keyboard commands (Alt+Shift+1/2/3 paste via `chrome.scripting.executeScript`). Popup↔background communication goes through `@plasmohq/messaging` handlers in [background/messages/](background/messages/).

A timestamp race exists between popup-triggered copies and the background monitor: the popup backdates its clipboard snapshot by 2000ms so its writes win over monitor captures. Be careful changing anything around `clipboardSnapshot`.

**Popup** ([popup/](popup/)): one `popup.html` serves three surfaces — toolbar popup, side panel, and floating window — distinguished by a `?ref=` query param. Three tabs (All / Favorites / Cloud). State is Jotai atoms ([popup/states/atoms.ts](popup/states/atoms.ts)); [popup/contexts/EntriesContext.tsx](popup/contexts/EntriesContext.tsx) merges local and cloud entries by timestamp (two-pointer merge, reverse-chronological) and handles entries mid-migration between local and cloud. Entry lists are virtualized with react-window.

**Storage** ([storage/](storage/)): one module per storage key, each wrapping `@plasmohq/storage` with Zod-validated get/watch helpers. The entries array itself is managed in [utils/storage.ts](utils/storage.ts), which is also the routing layer for create/delete/update/toggle-storage-location across local and cloud.

**Cloud sync**: InstantDB schema in [instant.schema.ts](instant.schema.ts) (entries, subscriptions, settings, linked to `$users`). Clients live in [utils/db/](utils/db/) (`core.ts` for background/utilities, `react.ts` for hooks). Auth is a magic-code email flow in [tabs/sign-in.tsx](tabs/sign-in.tsx); the refresh token is persisted to storage and the background watches cloud entries with it. Cloud writes are gated on an active subscription and capped by a cloud item limit (oldest non-favorited entries evicted).

**i18n**: `chrome.i18n.getMessage()` with `locales/<lang>/messages.json`. All non-English locales are machine-generated from `locales/en` by [scripts/generate-translations.ts](scripts/generate-translations.ts); manual fixes go in [locale-overrides/](locale-overrides/), never directly in generated files.

## Constraints

- Must support Chrome 109: `Array.prototype.toReversed()`/`toSorted()` are banned by ESLint — use `.slice().reverse()`/`.slice().sort()`.
- TypeScript is strict with `noUncheckedIndexedAccess`. Path alias `~*` maps to the repo root.
- CI runs lint and format checks on PRs; releases are cut from `v*` tags and build both Chrome and Firefox artifacts.
