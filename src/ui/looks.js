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

  let roomIndex = 0;
  let lookIndex = 0; // one look runs through the whole home
  const stageOf = rooms.map(() => 0); // every room starts empty

  /* ---------- photographs ---------- */

  const shots = new Map(); // url -> <img>, oldest first
  let shown = null;
  const urlOf = (r, l, s) => `${base}/${rooms[r].id}/${s === 0 ? 'empty' : `${looks[l].id}-${s}`}`;
  function shot(key) {
    let img = shots.get(key);
    if (!img) {
      img = new Image();
      img.className = 'cfg__canvas cfg__shot';
      img.alt = '';
      img.decoding = 'async';
      img.sizes = '(max-aspect-ratio: 16/9) 178vh, 100vw';
      img.srcset = `${key}-s.webp?v=${__ASSET_VERSION__} 1408w, ${key}.webp?v=${__ASSET_VERSION__} 2816w`;
      img.src = `${key}.webp?v=${__ASSET_VERSION__}`;
      img.ready = img.decode().catch(() => {});
      view.append(img);
      shots.set(key, img);
    } else {
      shots.delete(key); // most recently wanted goes to the back of the queue
      shots.set(key, img);
    }
    // Large photographs are heavy to hold: let go of the ones wanted longest ago.
    for (const [old, picture] of shots) {
      if (shots.size <= 10) break;
      if (picture === shown || old === wanted || old === key || picture.classList.contains('is-under') || picture.classList.contains('is-leaving')) continue;
      picture.remove();
      shots.delete(old);
    }
    return img;
  }

  let ticket = 0;
  let wanted = null; // the photograph being brought up
  // Dissolve to a photograph. `push` is the stronger move used between rooms.
  async function show(key, push = false) {
    const mine = ++ticket;
    wanted = key;
    const next = shot(key);
    await next.ready;
    if (mine !== ticket || next === shown) return;
    const previous = shown;
    shown = next;
    for (const img of shots.values()) if (img !== next && img !== previous) img.classList.remove('is-active', 'is-under', 'is-leaving');
    next.classList.remove('is-under', 'is-leaving');
    next.classList.add('is-active');
    if (previous) {
      previous.classList.remove('is-active');
      previous.classList.add(push ? 'is-leaving' : 'is-under');
      setTimeout(() => previous !== shown && previous.classList.remove('is-under', 'is-leaving'), 1300);
    }
  }
  const showNow = (push) => show(urlOf(roomIndex, lookIndex, stageOf[roomIndex]), push);
  // Have the likely next photograph ready: the next stage of this look.
  function warm() {
    const s = stageOf[roomIndex];
    if (s < 3) shot(urlOf(roomIndex, lookIndex, s + 1));
  }
  // While the list of looks is open, fetch this room in the other looks one at a time,
  // nearest in the list first, so choosing one is immediate without a burst of decoding.
  let warming = 0;
  async function warmLooks() {
    const mine = ++warming;
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
    const button = list.children[index]?.lastChild;
    if (moveFocus) button?.focus({ preventScroll: true });
    button?.scrollIntoView({ block: 'nearest' });
  }

  const pad = (n) => String(n).padStart(2, '0');
  function setStage(stage) {
    stageOf[roomIndex] = stage;
    showNow();
    warm();
  }
  function showRoot(focusIndex = 0) {
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
    ], { focusIndex });
  }
  // What a stage puts into the room, in this look.
  function showStage(stage) {
    const room = rooms[roomIndex];
    const look = looks[lookIndex];
    const spec = look.spec;
    const items =
      stage === 1
        ? [
            { label: 'Flooring', value: spec.Flooring },
            { label: 'Walls', value: spec.Walls },
          ]
        : stage === 2
          ? [...room.fixtures.map((name) => ({ label: name })), { label: 'Joinery', value: spec.Joinery }, { label: 'Stone', value: spec.Stone }, { label: 'Metal', value: spec.Metal }]
          : [...room.furniture.map((name) => ({ label: name })), { label: 'Fabric', value: spec.Fabric }];
    const next = stage < 3 ? [{ stage: 'Next', label: `${pad(stage + 1)}  ${STAGES[stage + 1].label}`, more: true, note: STAGES[stage + 1].note, select: () => (setStage(stage + 1), showStage(stage + 1)) }] : [];
    draw(`${pad(stage)}  ${STAGES[stage].label}`, [...items.map((item) => ({ ...item, plain: true, note: `${look.label}. ${look.line}` })), ...next], {
      back: () => showRoot(2 + stage),
      focusIndex: next.length ? items.length : 0,
    });
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
    if (index === roomIndex && shown) return;
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

  roomIndex = -1;
  goTo(0);
  await shot(urlOf(0, 0, 0)).ready;
  root.classList.add('is-ready');
  return { root };
}
