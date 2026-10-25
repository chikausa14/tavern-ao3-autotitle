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


/* ─── Strawberry Archive: optional, per-chat editable Work Details ───
   Pairs with AO3 Kai Stickerbook theme v0.3.13+. No generation/prompt changes.
   This module only adds a visual metadata card and saves into chatMetadata. */
(() => {
  'use strict';
  if (window.__kaiAo3EditorInstalled) return;
  window.__kaiAo3EditorInstalled = true;
  const NS='kaiAo3WorkDetails';
  const SEL='#chat > .mes:not([is_user="true"]):nth-child(1 of .mes:not([is_user="true"])) .mes_text';
  const SUMMARY='A story unfolding one scene at a time, written together with a little love. ♡';
  const ratings=['Not Rated','General Audiences','Teen And Up Audiences','Mature','Explicit'];
  const categories=['','Gen','F/F','F/M','M/M','Multi','Other'];
  const warnings=['','No Archive Warnings Apply','Creator Chose Not To Use Archive Warnings','Graphic Depictions of Violence','Major Character Death','Rape/Non-Con','Underage','custom'];
  const fields=['rating','warnings','category','fandom','relationship','characters','tags','summary'];
  const ctx=()=>{try{return window.SillyTavern?.getContext?.()||null}catch(e){return null}};
  const clean=(s,n=500)=>typeof s==='string'?s.trim().slice(0,n):'';
  const key=c=>{
    const id=c?.getCurrentChatId?.()||c?.chatId;
    return id==null||id===''?'':(c.groupId!=null?'g:'+c.groupId:'c:'+c.characterId)+'/'+id;
  };
  const node=(tag,cls,text)=>{
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    if(text!==undefined)el.textContent=text;
    return el;
  };
  const selected=c=>{
    const group=c?.groupId!=null?c.groups?.find(g=>String(g.id)===String(c.groupId)):null;
    const ch=!group&&c?.characterId!=null?c.characters?.[c.characterId]:null;
    return {group,ch};
  };
  function cardTags(c){
    const {group,ch}=selected(c), tagKey=group?String(group.id):ch?.avatar;
    const catalog=new Map((Array.isArray(c?.tags)?c.tags:[]).map(t=>[String(t.id),clean(t.name,70)]));
    const ids=tagKey!=null?c?.tagMap?.[tagKey]:null;
    const names=Array.isArray(ids)?ids.map(id=>catalog.get(String(id))).filter(Boolean):[];
    const imported=ch?.data?.tags??ch?.tags;
    if(Array.isArray(imported)) for(const tag of imported){
      const t=clean(typeof tag==='string'?tag:tag?.name,70);
      if(t)names.push(t);
    }
    return [...new Set(names)].slice(0,12).join(', ');
  }
  const read=c=>{
    const source=c?.chatMetadata?.[NS],out={};
    for(const f of fields)out[f]=clean(source?.[f],f==='summary'?1500:500);
    return out;
  };
  let frame=0, dialog=null, dialogKey='',lastFocus=null;
  function row(target,label,text){
    if(!text)return;
    const item=node('div','kai-ao3-detail-row');
    item.append(node('span','kai-ao3-detail-label','♡ '+label+': '),node('span','kai-ao3-detail-value',text));
    target.append(item);
  }
  function render(target,data,signature){
    let card=target.querySelector(':scope > .kai-ao3-work-card');
    if(card?.dataset.signature===signature)return;
    if(!card){card=node('section','kai-ao3-work-card');card.setAttribute('aria-label','AO3 work details');target.prepend(card)}
    card.dataset.signature=signature;
    card.replaceChildren();
    const header=node('div','kai-ao3-work-head');
    const btn=node('button','kai-ao3-edit-button','✎ Edit details');
    btn.type='button';btn.dataset.kaiAo3Edit='1';btn.setAttribute('aria-label','Edit this chat’s work details');
    header.append(node('span','kai-ao3-work-heading','♡ FIC DETAILS'),btn);
    card.append(header);
    const details=node('div','kai-ao3-details');
    for(const [label,value] of [
      ['RATING',data.rating],['WARNINGS',data.warnings],['CATEGORY',data.category],
      ['FANDOM',data.fandom],['RELATIONSHIP',data.relationship],
      ['CHARACTERS',data.characters],['TAGS',data.tags],['LANGUAGE','English']
    ])row(details,label,value);
    card.append(details);
    if(data.summary){
      const summary=node('div','kai-ao3-summary');
      summary.append(node('div','kai-ao3-summary-label','✿ SUMMARY'),node('p','kai-ao3-summary-content',data.summary));
      card.append(summary);
    }
    card.append(node('div','kai-ao3-stats','✧ An ongoing story ✧'));
  }
  function close(){
    if(dialog)dialog.remove();
    dialog=null;dialogKey='';
    if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});
    lastFocus=null;
  }
  function refresh(){
    const chat=document.querySelector('#chat'),c=ctx();
    if(!chat||!c)return;
    const ready=getComputedStyle(chat).getPropertyValue('--kai-ao3-editor-theme').trim()==='enabled';
    const target=ready?document.querySelector(SEL):null;
    if(!target){
      chat.classList.remove('kai-ao3-enhanced');
      for(const old of chat.querySelectorAll('.kai-ao3-work-card'))old.remove();
      return;
    }
    for(const old of chat.querySelectorAll('.kai-ao3-work-card'))if(old.parentElement!==target)old.remove();
    const saved=read(c);
    const data={
      rating:saved.rating||'Not Rated', warnings:saved.warnings,category:saved.category,
      fandom:saved.fandom,relationship:saved.relationship,characters:saved.characters,
      tags:saved.tags||cardTags(c),summary:saved.summary||SUMMARY
    };
    render(target,data,JSON.stringify({key:key(c),data}));
    chat.classList.add('kai-ao3-enhanced');
    if(dialog&&dialogKey!==key(c))close();
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;refresh()})}
  function formField(form,keyName,label,type='text',choices=[]){
    const group=node('div','kai-ao3-field');
    const id='kai-ao3-field-'+keyName;
    const lbl=node('label','',label);lbl.htmlFor=id;group.append(lbl);
    const control=node(type==='textarea'?'textarea':type==='select'?'select':'input');
    control.id=id;control.name=keyName;
    if(type==='select')for(const [value,text] of choices){
      const op=node('option','',text);op.value=value;control.append(op);
    }
    if(type==='textarea'){control.rows=3;control.maxLength=1500}
    if(type==='text'){control.type='text';control.maxLength=500}
    group.append(control);form.append(group);return control;
  }
  function open(){
    const c=ctx();
    if(!c?.chatMetadata||typeof c.saveMetadataDebounced!=='function'||!key(c)){
      alert('Open a saved chat first so these details can be stored with that chat.');return;
    }
    if(dialog)close();
    dialogKey=key(c);lastFocus=document.activeElement;
    const saved=read(c);
    dialog=node('div','kai-ao3-dialog-backdrop');
    const sheet=node('section','kai-ao3-dialog-sheet');
    sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');
    sheet.setAttribute('aria-label','Edit AO3 work details');
    const top=node('div','kai-ao3-dialog-top');
    const exit=node('button','kai-ao3-dialog-close','×');
    exit.type='button';exit.setAttribute('aria-label','Close without saving');exit.addEventListener('click',close);
    top.append(node('div','kai-ao3-dialog-title','🎀 Edit Work Details'),exit);sheet.append(top);
    sheet.append(node('p','kai-ao3-dialog-tip','♡ Details are saved to this chat only. Blank fields disappear.'));
    const form=node('form','kai-ao3-form');
    const rating=formField(form,'rating','Rating','select',ratings.map(t=>[t,t]));
    const category=formField(form,'category','Category (optional)','select',categories.map(t=>[t,t||'Leave blank']));
    const warning=formField(form,'warnings','Archive warnings (optional)','select',warnings.map(t=>[t,t==='custom'?'Custom warning…':t||'Leave blank']));
    const custom=formField(form,'customWarning','Custom warning text');
    const fandom=formField(form,'fandom','Fandom (optional)');
    const relationship=formField(form,'relationship','Relationship (optional)');
    const characters=formField(form,'characters','Characters (optional)');
    const tags=formField(form,'tags','Tag override (optional)');
    tags.placeholder='Leave blank to use character card tags';
    const summary=formField(form,'summary','Custom summary (optional)','textarea');
    summary.placeholder=SUMMARY;
    rating.value=ratings.includes(saved.rating)?saved.rating:'Not Rated';
    category.value=categories.includes(saved.category)?saved.category:'';
    const known=warnings.includes(saved.warnings)?saved.warnings:'custom';
    warning.value=saved.warnings?known:'';
    custom.value=known==='custom'?saved.warnings:'';
    fandom.value=saved.fandom;relationship.value=saved.relationship;
    characters.value=saved.characters;tags.value=saved.tags;summary.value=saved.summary;
    const toggle=()=>{custom.parentElement.hidden=warning.value!=='custom'};
    warning.addEventListener('change',toggle);toggle();
    const actions=node('div','kai-ao3-dialog-actions');
    const cancel=node('button','kai-ao3-cancel','Cancel');cancel.type='button';cancel.addEventListener('click',close);
    const clear=node('button','kai-ao3-reset','Clear fields');clear.type='button';
    clear.addEventListener('click',()=>{
      rating.value='Not Rated';category.value='';warning.value='';
      custom.value='';fandom.value='';relationship.value='';
      characters.value='';tags.value='';summary.value='';toggle();
    });
    const save=node('button','kai-ao3-save','♡ Save');save.type='submit';
    actions.append(cancel,clear,save);form.append(actions);
    form.addEventListener('submit',e=>{
      e.preventDefault();
      const now=ctx();
      if(!now?.chatMetadata||typeof now.saveMetadataDebounced!=='function'||key(now)!==dialogKey){
        alert('The chat changed. Reopen the editor to save.');close();return;
      }
      const val={
        rating:clean(rating.value,100),
        warnings:clean(warning.value==='custom'?custom.value:warning.value),
        category:clean(category.value,50),
        fandom:clean(fandom.value),relationship:clean(relationship.value),
        characters:clean(characters.value),tags:clean(tags.value),
        summary:clean(summary.value,1500)
      };
      if(Object.entries(val).some(([f,v])=>f!=='rating'&&v)||val.rating!=='Not Rated')now.chatMetadata[NS]=val;
      else delete now.chatMetadata[NS];
      now.saveMetadataDebounced();close();schedule();
    });
    sheet.append(form);dialog.append(sheet);
    dialog.addEventListener('pointerdown',e=>{if(e.target===dialog)close()});
    document.body.append(dialog);
    rating.focus({preventScroll:true});
  }
  document.addEventListener('click',e=>{
    const button=e.target.closest?.('[data-kai-ao3-edit="1"]');
    if(!button)return;
    e.preventDefault();e.stopPropagation();open();
  });
  document.addEventListener('keydown',e=>{if(dialog&&e.key==='Escape'){e.preventDefault();close()}});
  function init(){
    const c=ctx();
    if(!c)return;
    const ev=c.eventTypes||c.event_types||{};
    for(const name of ['CHAT_CHANGED','CHAT_CREATED','CHARACTER_EDITED','CHARACTER_MESSAGE_RENDERED','USER_MESSAGE_RENDERED','PERSONA_CHANGED','PERSONA_UPDATED','GROUP_UPDATED'])
      if(ev[name])c.eventSource?.on?.(ev[name],schedule);
    const chat=document.querySelector('#chat');
    if(chat&&typeof MutationObserver==='function')new MutationObserver(schedule).observe(chat,{childList:true,subtree:true});
    schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
