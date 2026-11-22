// The material board. Each room starts as an empty shell and is built up in three stages
// (surfaces, fixtures and fittings, furniture and styling) in one of the studio's looks.
// Every view is one whole photograph, so there are no joins: choosing a look or a stage
// dissolves from one photograph to the next.
/* global __ASSET_VERSION__ */

const STAGES = [
  { label: 'Empty shell', note: 'The room as the builder leaves it.' },
  { label: 'Surface selections', note: 'Flooring and wall finishes.' },
  { label: 'Fixtures and fittings', note: 'Joinery, sanitary ware, lighting and hardware.' },
  { label: 'Furniture and styling', note: 'The pieces that make it yours.' },
];

export async function initLooks() {
  const root = document.querySelector('[data-customiser]');
  if (!root) return null;
  const view = root.querySelector('.cfg__view');
  const panel = root.querySelector('.lsc');
  const list = root.querySelector('.lsc__list');
  const crumb = root.querySelector('.lsc__crumb');
  const counter = root.querySelector('.lsc__count');
  const note = root.querySelector('.lsc__desc');
  const base = root.dataset.customiser;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  root.querySelector('.cfg__original')?.remove();

  const data = await fetch(`${base}/looks.json?v=${__ASSET_VERSION__}`).then((r) => r.json());
  const rooms = data.rooms; // [{ id, label, fixtures: [names], furniture: [names] }]
  const looks = data.looks; // [{ id, label, line, spec: { Flooring, Walls, ... } }]
  // Every item and material, each with its options: { groups: { id: { label, kind, options:
  // [{ label, spec }] } }, rooms: { room id: { stage: [group ids] } } }
  const catalogue = await fetch(`${base}/options.json?v=${__ASSET_VERSION__}`).then((r) => r.json());
  const picks = {}; // 'room:group' for things in a room, 'group' for materials -> option index
  const pickKey = (gid) => (catalogue.groups[gid].kind === 'item' ? `${rooms[roomIndex].id}:${gid}` : gid);
  // What the look itself uses, shown until the visitor chooses otherwise.
  const lookDefault = (gid, look) => ({ flooring: look.spec.Flooring, wallfinish: look.spec.Walls, wallcolour: look.spec.Walls, joinery: look.spec.Joinery, stone: look.spec.Stone, metal: look.spec.Metal, fabric: look.spec.Fabric, glass: 'Clear' })[gid];
  // Shared materials have close-ups of their own for some rooms (metal on a door handle in
  // the living room, not on a tap).
  // Looks for which every option of every item has been photographed in the room itself,
  // so choosing one changes the room at once.
  const inRoom = () => Boolean(data.pre?.includes(looks[lookIndex].id));
  const roomShot = (gid, n, stage) => `${base}/${rooms[roomIndex].id}/pre/${looks[lookIndex].id}-${stage}-${gid}-${n + 1}`;
  const latest = {}; // 'room:stage' -> the choice made most recently there: { gid, n }
  const optionShot = (gid, n) => `${base}/opts/${gid}${catalogue.groups[gid].rooms?.includes(rooms[roomIndex].id) ? `-${rooms[roomIndex].id}` : ''}-${n + 1}`;

  let roomIndex = 0;
  let lookIndex = 0; // one look runs through the whole home
  const stageOf = rooms.map(() => 0); // every room starts empty

  /* ---------- photographs ---------- */

  const urlOf = (r, l, s) => `${base}/${rooms[r].id}/${s === 0 ? 'empty' : `${looks[l].id}-${s}`}`;
  // A stack of photographs of which one is on show, dissolving from one to the next.
  // There are two: the room itself, and over it the floor of the visitor's choice (a
  // photograph of the same room with only its floor kept).
  function makeStack(extraClass, limit) {
    const shots = new Map(); // url -> <img>, oldest first
    let shown = null;
    let wanted = null; // the photograph being brought up
    function shot(key) {
      const [small, large] = key.includes('/pre/') ? [960, 1920] : [1408, 2816];
      let img = shots.get(key);
      if (!img) {
        img = new Image();
        img.className = `cfg__canvas cfg__shot ${extraClass}`;
        img.alt = '';
        img.decoding = 'async';
        if (key.startsWith('http')) img.src = key; // a photograph rendered for this visitor
        else {
          img.sizes = '(max-aspect-ratio: 16/9) 178vh, 100vw';
          img.srcset = `${key}-s.webp?v=${__ASSET_VERSION__} ${small}w, ${key}.webp?v=${__ASSET_VERSION__} ${large}w`;
          img.src = `${key}.webp?v=${__ASSET_VERSION__}`;
        }
        img.ready = img.decode().catch(() => {});
        view.append(img);
        shots.set(key, img);
      } else {
        shots.delete(key); // most recently wanted goes to the back of the queue
        shots.set(key, img);
      }
      // Large photographs are heavy to hold: let go of the ones wanted longest ago.
      for (const [old, picture] of shots) {
        if (shots.size <= limit) break;
        if (picture === shown || old === wanted || old === key || picture.classList.contains('is-under') || picture.classList.contains('is-leaving')) continue;
        picture.remove();
        shots.delete(old);
      }
      return img;
    }
    // Put a photograph on show (already decoded by the caller). `push` is the stronger
    // move used between rooms. A null key takes the stack off show.
    function put(key, push = false) {
      wanted = key;
      const next = key ? shot(key) : null;
      if (next === shown) return;
      const previous = shown;
      shown = next;
      for (const img of shots.values()) if (img !== next && img !== previous) img.classList.remove('is-active', 'is-under', 'is-leaving');
      if (next) {
        next.classList.remove('is-under', 'is-leaving');
        next.classList.add('is-active');
      }
      if (previous) {
        previous.classList.remove('is-active');
        if (next) {
          previous.classList.add(push ? 'is-leaving' : 'is-under');
          setTimeout(() => previous !== shown && previous.classList.remove('is-under', 'is-leaving'), 1300);
        }
      }
    }
    return { shot, put, isShown: () => Boolean(shown) };
  }
  const main = makeStack('', 10);
  const floors = makeStack('cfg__shot--floor', 4);
  const { shot } = main;

  // Surfaces. Until the visitor chooses a floor or a wall, a room shows its look as
  // photographed. Once they do, the surfaces stage shows the wall of their choice with the
  // floor of their choice laid over it: two photographs of the same empty room.
  const FINISHES = ['paint', 'limewash', 'venetian', 'slats', 'fluted', 'stone'];
  let trial = null; // a surface being tried out: { flooring | wallfinish | wallcolour: option index }
  const surfaceOf = (key) => (trial && key in trial ? trial[key] : picks[key]);
  const customSurfaces = () => ['flooring', 'wallfinish', 'wallcolour'].some((key) => surfaceOf(key) != null);
  function surfaceKeys(r) {
    const from = looks[lookIndex].surface; // what the look itself has
    const floor = surfaceOf('flooring') ?? from.floor;
    const finish = FINISHES[surfaceOf('wallfinish') ?? FINISHES.indexOf(from.finish)];
    const colour = surfaceOf('wallcolour') ?? from.colour;
    const dir = `${base}/${rooms[r].id}`;
    return { wall: finish === 'slats' || finish === 'stone' ? `${dir}/wall-${finish}` : `${dir}/wall-${finish}-${colour + 1}`, floor: `${dir}/floor-${floor + 1}` };
  }

  /* ---------- rendering the room with the visitor's choices ---------- */

  // Fittings and furniture cannot be swapped inside a photograph, so the room is
  // photographed afresh for the visitor's exact choices by /api/render (about 40 seconds;
  // offered only when the studio has set it up).
  let renderOn = false;
  const renders = {}; // 'room:stage' -> { signature, url }
  let rendering = null; // { key, started }
  const RENDERS_A_DAY = 5;
  // This room's choices up to a stage, by group id.
  function choicesFor(stage) {
    const out = {};
    for (const s of [1, 2, 3]) {
      if (s > stage) break;
      for (const gid of catalogue.rooms[rooms[roomIndex].id][s]) if (picks[pickKey(gid)] != null) out[gid] = picks[pickKey(gid)];
    }
    return out;
  }
  const signature = (stage) => JSON.stringify([looks[lookIndex].id, choicesFor(stage)]);
  function rendersLeft(spend = false) {
    try {
      const today = new Date().toDateString();
      const kept = JSON.parse(localStorage.getItem('cs-renders') || '{}');
      const used = kept.day === today ? kept.used : 0;
      if (spend) localStorage.setItem('cs-renders', JSON.stringify({ day: today, used: used + 1 }));
      return RENDERS_A_DAY - used;
    } catch {
      return RENDERS_A_DAY;
    }
  }
  async function startRender(stage, redraw) {
    if (rendering) return;
    const room = rooms[roomIndex];
    const key = `${room.id}:${stage}`;
    const mine = signature(stage);
    const say = (text) => {
      if (crumb.textContent.startsWith(pad(stage))) note.textContent = text;
    };
    if (!Object.keys(choicesFor(stage)).length) return say('Choose at least one option first, then render.');
    if (rendersLeft() <= 0) return say('That is all the renders for today. Your choices are saved and sent with your enquiry.');
    rendering = { key, started: Date.now() };
    redraw();
    const clock = setInterval(() => {
      const value = list.querySelector('[data-render] .lsc__value');
      if (value) value.textContent = `${Math.round((Date.now() - rendering.started) / 1000)} s`;
    }, 1000);
    try {
      const started = await fetch('/api/render', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room: room.id, look: looks[lookIndex].id, stage, picks: choicesFor(stage) }) });
      const { id, error } = await started.json();
      if (!id) throw new Error(error || 'The render could not be started.');
      rendersLeft(true);
      let url = null;
      for (let tries = 0; tries < 50 && !url; tries++) {
        await new Promise((done) => setTimeout(done, 3000));
        const state = await (await fetch(`/api/render?id=${id}`)).json();
        if (state.status === 'failed') throw new Error('The render did not come out. Please try again.');
        url = state.url ?? null;
      }
      if (!url) throw new Error('The render is taking too long. Please try again.');
      await main.shot(url).ready;
      renders[key] = { signature: mine, url };
      clearInterval(clock);
      rendering = null;
      if (rooms[roomIndex] === room && crumb.textContent.startsWith(pad(stage))) {
        showNow();
        redraw();
      } else if (rooms[roomIndex] === room) showNow();
    } catch (error) {
      clearInterval(clock);
      rendering = null;
      redraw();
      say(error.message);
    }
  }

  let ticket = 0;
  // Dissolve to a photograph, with or without a floor over it. Both are decoded first so
  // they arrive together.
  async function show(key, push = false, floorKey = null) {
    const mine = ++ticket;
    const pictures = [shot(key), ...(floorKey ? [floors.shot(floorKey)] : [])];
    await Promise.all(pictures.map((picture) => picture.ready));
    if (mine !== ticket) return;
    main.put(key, push);
    floors.put(floorKey, push);
  }
  function showNow(push) {
    const stage = stageOf[roomIndex];
    // Surfaces are always the wall and floor photographs of the empty room, so the garden
    // and everything else stay put from the empty shell through every choice.
    if (stage === 1) {
      const keys = surfaceKeys(roomIndex);
      return show(keys.wall, push, keys.floor);
    }
    // A photograph rendered for exactly the choices now made, if there is one.
    const made = renders[`${rooms[roomIndex].id}:${stage}`];
    if (stage >= 2 && made && made.signature === signature(stage)) return show(made.url, push);
    // Otherwise the room with the visitor's most recent choice in it.
    const last = latest[`${rooms[roomIndex].id}:${stage}`];
    if (stage >= 2 && last && inRoom() && picks[pickKey(last.gid)] === last.n) return show(roomShot(last.gid, last.n, stage), push);
    return show(urlOf(roomIndex, lookIndex, stage), push);
  }
  // Have the likely next photograph ready: the next stage of this look.
  function warm() {
    const s = stageOf[roomIndex];
    if (s === 0) {
      const keys = surfaceKeys(roomIndex);
      shot(keys.wall);
      floors.shot(keys.floor);
    } else if (s < 3) shot(urlOf(roomIndex, lookIndex, s + 1));
  }
  // While the list of looks is open, fetch this room in the other looks one at a time,
  // nearest in the list first, so choosing one is immediate without a burst of decoding.
  let warming = 0;
  async function warmLooks() {
    const mine = ++warming;
    if (stageOf[roomIndex] <= 1) return; // surfaces do not use the looks' own photographs
    const s = Math.max(1, stageOf[roomIndex]);
    const order = looks.map((_, l) => l).sort((x, y) => Math.abs(x - lookIndex) - Math.abs(y - lookIndex));
    for (const l of order.slice(1, 7)) {
      if (mine !== warming) return;
      await shot(urlOf(roomIndex, l, s)).ready;
    }
  }

  /* ---------- camera: a slight drift, and fitting the room above the board on phones ---------- */

  const cam = { x: 0, y: 0 };
  function applyCamera() {
    const box = root.getBoundingClientRect();
    const menu = panel.getBoundingClientRect();
    if (menu.width >= box.width * 0.7) {
      const free = Math.max(0.3, (menu.top - box.top) / box.height);
      view.style.transform = `translate(0px, ${(-((1 - free) / 2) * box.height).toFixed(1)}px) scale(${Math.max(free * 1.04, 0.5).toFixed(3)})`;
    } else {
      view.style.transform = `scale(1.035) translate(${(-cam.x * 1.4).toFixed(2)}%, ${(-cam.y * 1.4).toFixed(2)}%)`;
    }
  }

  /* ---------- the menu ---------- */

  let rows = [];
  let menuBack = null;
  let current = 0;
  function draw(title, items, { back = null, focusIndex = 0 } = {}) {
    rows = items;
    menuBack = back;
    panel.classList.toggle('has-back', Boolean(back));
    list.classList.remove('lsc__list--samples');
    crumb.textContent = title;
    list.replaceChildren(
      ...items.map((item, i) => {
        const li = document.createElement('li');
        li.setAttribute('role', 'none');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'lsc__row';
        button.setAttribute('role', 'menuitem');
        if (item.current) button.setAttribute('aria-current', 'true');
        if (item.plain) button.classList.add('lsc__row--plain');
        if (item.chosen) button.classList.add('lsc__row--chosen');
        if (item.id) button.dataset[item.id] = '';
        if (item.stack) button.classList.add('lsc__row--stack');
        if (item.swatch) {
          // floor and wall of the look, as a two-tone sample
          const swatch = document.createElement('i');
          swatch.className = 'lsc__swatch';
          swatch.style.setProperty('--a', item.swatch[0]);
          swatch.style.setProperty('--b', item.swatch[1]);
          button.append(swatch);
        }
        const label = document.createElement('span');
        label.className = 'lsc__label';
        label.textContent = item.label;
        button.append(label);
        if (item.value) {
          const value = document.createElement('span');
          value.className = 'lsc__value';
          value.textContent = item.value;
          button.append(value);
        }
        if (item.current || item.more) {
          const mark = document.createElement('span');
          mark.className = item.current ? 'lsc__tick' : 'lsc__more';
          mark.setAttribute('aria-hidden', 'true');
          button.append(mark);
        }
        button.addEventListener('click', () => item.select?.());
        const over = () => highlight(i, false);
        button.addEventListener('pointerenter', (event) => event.pointerType === 'mouse' && over());
        button.addEventListener('focus', over);
        if (item.stage) {
          const heading = document.createElement('p');
          heading.className = 'lsc__stage';
          heading.textContent = item.stage;
          li.append(heading);
        }
        li.append(button);
        return li;
      }),
    );
    highlight(Math.min(focusIndex, items.length - 1), false);
    applyCamera();
  }
  function highlight(index, moveFocus = true) {
    current = index;
    for (const [i, li] of [...list.children].entries()) li.lastChild.classList.toggle('is-current', i === index);
    counter.textContent = `${index + 1} / ${rows.length}`;
    note.textContent = rows[index]?.note ?? '';
    rows[index]?.over?.();
    const button = list.children[index]?.lastChild;
    if (moveFocus) button?.focus({ preventScroll: true });
    // Keep the row in view inside the list only. (scrollIntoView would also scroll the
    // page, dragging the visitor back to the board as rooms change on the way past.)
    if (button && list.scrollHeight > list.clientHeight) {
      const row = button.getBoundingClientRect();
      const box = list.getBoundingClientRect();
      if (row.top < box.top) list.scrollTop -= box.top - row.top;
      else if (row.bottom > box.bottom) list.scrollTop += row.bottom - box.bottom;
    }
  }

  const pad = (n) => String(n).padStart(2, '0');
  function setStage(stage) {
    stageOf[roomIndex] = stage;
    showNow();
    warm();
  }
  function showRoot(focusIndex = 0) {
    trial = null;
    warming++; // stop fetching other looks
    const room = rooms[roomIndex];
    const look = looks[lookIndex];
    const stage = stageOf[roomIndex];
    draw(room.label, [
      { label: 'Room', value: room.label, more: true, note: 'Move to another room. Scrolling also takes you through them.', select: showRooms },
      { label: 'Look', value: look.label, more: true, note: `${look.line} ${looks.length} looks to choose from.`, select: showLooks },
      ...STAGES.map((s, i) => ({
        stage: i === 0 ? 'Build it up' : null,
        label: i === 0 ? s.label : `${pad(i)}  ${s.label}`,
        value: i === 0 ? '' : i <= stage ? 'In place' : 'Add',
        current: i === stage,
        more: i !== stage && i > 0,
        note: s.note,
        select: () => {
          setStage(i);
          if (i === 0) showRoot(2);
          else showStage(i);
        },
      })),
      { stage: 'Your specification', label: 'Your choices', value: `${Object.keys(picks).length} chosen`, more: true, note: 'Everything you have chosen so far. It is sent with your enquiry.', select: showSpecification },
    ], { focusIndex });
  }
  // The enquiry form carries the visitor's choices with it.
  const field = document.querySelector('input[name="specification"]');
  function chosen() {
    return Object.entries(picks).map(([key, n]) => {
      const [a, b] = key.split(':');
      const group = catalogue.groups[b ?? a];
      return { key, where: b ? rooms.find((r) => r.id === a).label : 'Whole home', label: group.label, value: group.options[n].label };
    });
  }
  function record() {
    if (field) field.value = [`Look: ${looks[lookIndex].label}`, ...chosen().map((c) => `${c.where} - ${c.label}: ${c.value}`)].join('\n');
  }

  // What a stage puts into the room. Every item and material opens its own options.
  function showStage(stage, focusIndex = null) {
    const room = rooms[roomIndex];
    const look = looks[lookIndex];
    const ids = catalogue.rooms[room.id][stage];
    const heading = stage === 1 ? 'Shown in the room' : inRoom() ? 'Shown in the room, one at a time' : renderOn ? 'Choose, then render the room' : `Shown up close · room in ${look.label}`;
    const key = `${room.id}:${stage}`;
    const count = Object.keys(choicesFor(stage)).length;
    const upToDate = renders[key]?.signature === signature(stage);
    const busy = rendering?.key === key;
    const redraw = () => crumb.textContent.startsWith(pad(stage)) && showStage(stage, ids.length);
    const renderRow =
      stage >= 2 && renderOn
        ? [{
            stage: 'See it in the room',
            id: 'render',
            label: busy ? 'Rendering your room' : upToDate ? 'Rendered with your choices' : 'Render my room',
            value: busy ? '0 s' : upToDate ? '' : `${count} ${count === 1 ? 'choice' : 'choices'}`,
            current: upToDate && !busy,
            more: !upToDate && !busy,
            note: busy
              ? 'A new photograph of this room is being made with your choices. About 40 seconds.'
              : upToDate
                ? 'This photograph was made for your choices. Change any of them and render again.'
                : rendering
                  ? 'Another room is rendering. One at a time.'
                  : `Makes a new photograph of this room with your choices. About 40 seconds. ${Math.max(0, rendersLeft())} left today.`,
            select: () => startRender(stage, redraw),
          }]
        : [];
    const items = ids.map((gid, i) => {
      const group = catalogue.groups[gid];
      const picked = picks[pickKey(gid)];
      return {
        label: group.label,
        value:
          gid === 'wallcolour' && ['slats', 'stone'].includes(FINISHES[picks.wallfinish ?? FINISHES.indexOf(look.surface.finish)])
            ? 'Set by the finish'
            : picked != null
              ? group.options[picked].label
              : gid === 'flooring'
                ? group.options[look.surface.floor].label
                : gid === 'wallfinish'
                  ? group.options[FINISHES.indexOf(look.surface.finish)].label
                  : gid === 'wallcolour'
                    ? group.options[look.surface.colour].label
                    : (lookDefault(gid, look) ?? 'Choose'),
        chosen: picked != null,
        stack: true,
        stage: i === 0 ? heading : null,
        more: true,
        note: stage === 1 ? `${group.options.length} options. Each one is shown in the room.` : inRoom() ? `${group.options.length} options. Each one is shown in the room as you move through them.` : renderOn ? `${group.options.length} options, each shown up close. Render the room to see your choices in it.` : `${group.options.length} options, each shown up close. The room stays in the ${look.label} look.`,
        select: () => showOptions(gid, stage, i),
      };
    });
    const next = stage < 3 ? [{ stage: 'Next', label: `${pad(stage + 1)}  ${STAGES[stage + 1].label}`, more: true, note: STAGES[stage + 1].note, select: () => (setStage(stage + 1), showStage(stage + 1)) }] : [];
    draw(`${pad(stage)}  ${STAGES[stage].label}`, [...items, ...renderRow, ...next], { back: () => showRoot(2 + stage), focusIndex: focusIndex ?? 0 });
  }
  // One item's options. Moving through them brings up each one's own photograph; selecting
  // keeps it. Going back returns to the room.
  function showOptions(gid, stage, rowIndex) {
    const group = catalogue.groups[gid];
    const key = pickKey(gid);
    const surface = ['flooring', 'wallfinish', 'wallcolour'].includes(gid);
    // (these rooms have no glass screen to change, so glass is always shown up close)
    const shownInRoom = inRoom() && gid !== 'glass';
    const back = () => {
      trial = null;
      showNow();
      showStage(stage, rowIndex);
    };
    draw(group.label, group.options.map((option, n) => ({
      label: option.label,
      swatch: gid === 'wallcolour' ? [option.spec, option.spec] : null,
      current: picks[key] === n,
      note: surface || shownInRoom ? `${option.spec} Shown in the room.` : `${option.spec} Shown up close.`,
      over: () => {
        if (!surface) return show(shownInRoom ? roomShot(gid, n, stage) : optionShot(gid, n));
        // floors and walls are tried in the room itself
        trial = { [gid]: n };
        // a colour only shows on a painted or plastered wall
        if (gid === 'wallcolour' && ['slats', 'stone'].includes(FINISHES[surfaceOf('wallfinish') ?? FINISHES.indexOf(looks[lookIndex].surface.finish)])) trial.wallfinish = 0;
        showNow();
      },
      select: () => {
        const place = `${rooms[roomIndex].id}:${stage}`;
        if (picks[key] === n) {
          delete picks[key];
          if (latest[place]?.gid === gid) delete latest[place];
        } else {
          picks[key] = n;
          if (shownInRoom) latest[place] = { gid, n };
          if (surface && trial?.wallfinish != null && gid === 'wallcolour') picks.wallfinish = trial.wallfinish;
        }
        record();
        showOptions(gid, stage, rowIndex);
        highlight(n, true);
      },
    })), { back, focusIndex: picks[key] ?? 0 });
  }
  function showSpecification() {
    const list = chosen();
    draw('Your specification', [
      { label: 'Look', value: looks[lookIndex].label, plain: true, note: looks[lookIndex].line },
      ...list.map((c) => ({ label: c.label, value: c.value, plain: true, note: c.where })),
      ...(list.length
        ? [{ stage: 'Start again', label: 'Clear my choices', more: true, note: 'Removes every choice; the look stays.', select: () => { for (const k of Object.keys(picks)) delete picks[k]; for (const k of Object.keys(latest)) delete latest[k]; record(); showSpecification(); } }]
        : []),
    ], { back: () => showRoot(6) });
    note.textContent = list.length ? 'These choices are sent with your enquiry.' : 'Nothing chosen yet. Open a stage and choose from any item.';
  }
  function showLooks() {
    warmLooks();
    draw('Look', looks.map((look, i) => ({
      label: look.label,
      swatch: look.swatch,
      current: i === lookIndex,
      note: look.line,
      select: () => {
        lookIndex = i;
        record();
        // a look is only visible once something is in the room
        if (stageOf[roomIndex] === 0) stageOf[roomIndex] = 1;
        showNow();
        warm();
        showLooks();
      },
    })), { back: () => showRoot(1), focusIndex: lookIndex });
  }
  function showRooms() {
    draw('Room', rooms.map((room, i) => ({
      label: room.label,
      current: i === roomIndex,
      note: i === roomIndex ? 'You are here.' : 'Select to go there.',
      select: () => (i === roomIndex ? showRoot() : scrollToRoom(i)),
    })), { back: () => showRoot(0), focusIndex: roomIndex });
  }

  root.querySelector('.lsc__back')?.addEventListener('click', () => menuBack?.());
  panel.addEventListener('keydown', (event) => {
    const move = (by) => {
      event.preventDefault();
      highlight(Math.max(0, Math.min(rows.length - 1, current + by)));
    };
    if (event.key === 'ArrowDown') return move(current === rows.length - 1 ? -current : 1);
    if (event.key === 'ArrowUp') return move(current === 0 ? rows.length - 1 : -1);
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      return rows[current]?.select?.();
    }
    if ((event.key === 'Escape' || event.key === 'Backspace' || event.key === 'ArrowLeft') && menuBack) {
      event.preventDefault();
      menuBack();
      list.children[current]?.lastChild.focus({ preventScroll: true });
    }
  });

  /* ---------- rooms follow the scroll ---------- */

  function goTo(index) {
    if (index === roomIndex && main.isShown()) return;
    roomIndex = index;
    showNow(true);
    warm();
    showRoot();
  }
  const section = root.closest('[data-film]');
  let filmEnd = 1;
  const bandOf = (progress) => Math.min(rooms.length - 1, Math.max(0, Math.floor(((progress - filmEnd) / (1 - filmEnd)) * rooms.length)));
  let warmed = false;
  section?.addEventListener('film:progress', (event) => {
    filmEnd = event.detail.filmEnd;
    if (!warmed && event.detail.progress > filmEnd * 0.8) {
      warmed = true;
      for (let r = 1; r < rooms.length; r++) shot(urlOf(r, lookIndex, 0)); // the other rooms' shells
    }
    if (event.detail.progress >= filmEnd) goTo(bandOf(event.detail.progress));
  });
  function scrollToRoom(index) {
    if (!section || filmEnd >= 1) return goTo(index);
    const progress = filmEnd + ((index + 0.5) / rooms.length) * (1 - filmEnd);
    const top = section.getBoundingClientRect().top + window.scrollY + (section.offsetHeight - window.innerHeight) * progress;
    if (window.__lenis) window.__lenis.scrollTo(top, { duration: 1.1 });
    else window.scrollTo(0, top);
  }

  if (finePointer && !reducedMotion) {
    root.addEventListener('pointermove', (event) => {
      const box = root.getBoundingClientRect();
      cam.x = (event.clientX - box.left) / box.width - 0.5;
      cam.y = (event.clientY - box.top) / box.height - 0.5;
      applyCamera();
    });
  }
  window.addEventListener('resize', applyCamera);

  fetch('/api/render')
    .then((response) => response.json())
    .then((answer) => {
      renderOn = Boolean(answer.enabled);
    })
    .catch(() => {});
  record();
  roomIndex = -1;
  goTo(0);
  await shot(urlOf(0, 0, 0)).ready;
  root.classList.add('is-ready');
  return { root };
}
