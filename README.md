# AO3 ♡ Kai Stickerbook — Automatic Work Title

A tiny optional SillyTavern / TauriTavern companion extension for the AO3 Kai Stickerbook theme.

## What it does

- **Work title** = the current character card name, or group name for group chats.
- **“by” line** = your currently selected user/persona name.
- **Tags** = assigned SillyTavern character/group tags (and imported card tags when present), shown as an AO3-style comma-separated tag list. If none exist, the theme says “No card tags provided.”
- Switching chats updates title and tag list; switching personas updates the byline when the relevant event is available.
- Does **not** modify messages, prompts, character cards, chat data, or textbox behavior.

This extension is designed to work with **AO3 ♡ Kai Stickerbook v0.3.12 (Strawberry Stationery + Card Tags)** and other theme versions using the CSS variables `--ao3-title` and `--ao3-author` in the work header.

## Install from your phone

1. Import/select the AO3 Stickerbook theme JSON in TauriTavern.
2. Open **Extensions → Install Extension**.
3. Paste this repository URL: `https://github.com/chikausa14/tavern-ao3-autotitle`
4. Complete installation and reload the page if prompted.
5. Open a character chat and check the work-details title/byline and tag list. If you already installed v0.1.0, run **Manage Extensions → Check for Updates / Update** (or reload after updating) to receive v0.2.0.

The repo is public so TauriTavern should be able to fetch it without GitHub authentication.

## Current limitations

- Rating, archive warnings, category, fandom, relationship, characters, and summary are **not inferred** from RP dialogue. The recommended theme has neutral safe defaults. This extension only updates title, author and tags.
- If the extension doesn't load or no character/persona is selected, the theme's static CSS title/author remain as fallback.
- TauriTavern's event support can vary across versions, so a reload may help if a new selection isn't reflected immediately.
- The first-work-header display is handled by the CSS theme; this extension doesn't change which messages it appears on.

## Implementation

Uses the supported `window.SillyTavern.getContext()` surface to read `name1`, `name2`, group/character selections, and available chat events. The extension writes at most three CSS custom properties on `#chat`: `--ao3-title`, `--ao3-author`, and `--ao3-tags`.

No external dependencies or asset hosting are required.
