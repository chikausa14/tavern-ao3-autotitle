/*
 * AO3 ♡ Kai Stickerbook — Dynamic work title / byline
 * CSS-only theme companion. NO chat/prompt/preset data is modified.
 *
 * Current character/group -> --ao3-title
 * Active user persona     -> --ao3-author
 *
 * The AO3 theme already displays both with CSS content variables.
 * This extension only updates those existing variables on #chat.
 */
(() => {
    'use strict';

    const PREFIX = '[Kai AO3 Auto Title]';
    const chatSelector = '#chat';

    function context() {
        try {
            return window.SillyTavern?.getContext?.() ?? null;
        } catch (error) {
            console.warn(`${PREFIX} Could not read SillyTavern context`, error);
            return null;
        }
    }

    // Make a CSS string token safe for use with content: var(--ao3-title).
    // Inline style values are strings; we never evaluate markup or alter chat data.
    function cssString(value) {
        const cleaned = String(value ?? '')
            .replace(/[\u0000-\u001f\u007f]/g, ' ')
            .trim()
            .slice(0, 180);
        return '"' + cleaned.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
    }

    function getNames(ctx) {
        const user = String(ctx?.name1 ?? '').trim();
        const group = ctx?.groupId != null
            ? ctx.groups?.find(item => String(item?.id) === String(ctx.groupId))
            : null;
        const charIndex = ctx?.characterId;
        const character = charIndex !== undefined && charIndex !== null
            ? ctx.characters?.[charIndex]
            : null;
        const title = String(group?.name || character?.name || ctx?.name2 || '').trim();
        return { title, user };
    }


    // SillyTavern stores tag assignments by character avatar (or group ID),
    // with IDs resolved via the context's tags catalog.
    // Some imported V2 cards also carry plain tag names in data.tags.
    function getCardTags(ctx) {
        const group = ctx?.groupId != null
            ? ctx.groups?.find(item => String(item?.id) === String(ctx.groupId))
            : null;
        const character = !group && ctx?.characterId != null
            ? ctx.characters?.[ctx.characterId]
            : null;

        const key = group ? String(group.id) : character?.avatar;
        const catalog = Array.isArray(ctx?.tags) ? ctx.tags : [];
        const lookup = new Map(catalog.map(tag => [String(tag?.id), String(tag?.name ?? '').trim()]));
        const assigned = key != null && ctx?.tagMap ? ctx.tagMap[key] : null;
        const assignedNames = Array.isArray(assigned)
            ? assigned.map(id => lookup.get(String(id))).filter(Boolean)
            : [];
        const imported = character?.data?.tags ?? character?.tags;
        const importedNames = Array.isArray(imported)
            ? imported.map(tag => typeof tag === 'string' ? tag.trim()
                : (typeof tag?.name === 'string' ? tag.name.trim() : '')).filter(Boolean)
            : [];
        const names = [...new Set([...assignedNames, ...importedNames])]
            .filter(tag => tag.length > 0)
            .slice(0, 12);
        return names.length ? names.join(', ') : null;
    }

    function updateHeader() {
        const chat = document.querySelector(chatSelector);
        const ctx = context();
        if (!chat) return;
        if (!ctx) {
            chat.style.removeProperty('--ao3-title');
            chat.style.removeProperty('--ao3-author');
            chat.style.removeProperty('--ao3-tags');
            return;
        }

        const { title, user } = getNames(ctx);
        // If no chat/persona is selected, keep the CSS theme's fallback values.
        if (title) chat.style.setProperty('--ao3-title', cssString(title));
        else chat.style.removeProperty('--ao3-title');
        if (user) chat.style.setProperty('--ao3-author', cssString(user));
        else chat.style.removeProperty('--ao3-author');

        // Never reuse tags from the previously selected chat.
        const cardTags = getCardTags(ctx);
        if (cardTags) chat.style.setProperty('--ao3-tags', cssString(cardTags));
        else chat.style.removeProperty('--ao3-tags');
    }

    // Context state changes may occur before the visual chat finishes painting.
    let rafId = 0;
    function scheduleUpdate() {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
            rafId = 0;
            updateHeader();
        });
    }

    const ctx = context();
    if (!ctx) {
        console.warn(`${PREFIX} SillyTavern API was not ready; refresh after enabling extension.`);
        return;
    }
    const events = ctx.event_types || ctx.eventTypes || {};
    const names = [
        'APP_READY', 'APP_INITIALIZED',
        'CHAT_CHANGED', 'CHAT_CREATED',
        'CHARACTER_EDITED', 'CHARACTER_MESSAGE_RENDERED',
        'PERSONA_CHANGED', 'PERSONA_RENAMED', 'PERSONA_UPDATED',
        'GROUP_UPDATED', 'SETTINGS_UPDATED',
        'USER_MESSAGE_RENDERED',
    ];
    for (const name of names) {
        if (events[name]) ctx.eventSource?.on?.(events[name], scheduleUpdate);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scheduleUpdate, { once: true });
    }
    scheduleUpdate();
    console.info(`${PREFIX} Ready. Work titles, bylines and card tags follow the active chat.`);
})();
