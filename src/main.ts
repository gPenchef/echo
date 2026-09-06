import Phaser from 'phaser';
import './style.css';
import { Session } from './core/session';
import { HZ, idle, normalRules, type Input } from './core/types';
import { campaign } from './levels/campaign';
import { Renderer } from './render';
import { loadSave, writeSave } from './persistence';
import { Audio } from './audio';
import { FixedClock, formatCountdown } from './core/clock';
import type { World } from './core/world';
import { chamberView, pointerToWorld, VIEW_WIDTH, VIEW_HEIGHT } from './view';
import { cheatCodes, parseCheat } from './cheats';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const save = loadSave();
const audio = new Audio(save.settings);
let index = 0,
  session = new Session(campaign[0]),
  paused = true,
  planning = false,
  transition = 0,
  gameReady = false;
const clock = new FixedClock();
let screen:
  | 'menu'
  | 'levels'
  | 'pause'
  | 'settings'
  | 'help'
  | 'complete'
  | 'none'
  | 'cheats'
  | 'restart' = 'menu';
const testing = { rules: normalRules(), slow: false, unlocked: false };
let dialogBack: () => void = () => showMenu();
let returnScreen: 'menu' | 'pause' = 'menu';
let noticeUntil = 0,
  lastWarning = -1,
  interact = false;
let renderer: Renderer;
let timelineWorld: World | undefined;
let trackNodes: { rail: HTMLElement; fill: HTMLElement; status: HTMLElement; seen: number }[] = [];
const keys = new Set<string>();
let pointerAim = 0,
  pointerDown = false;
let shotQueued = false;
let pointerPosition: { x: number; y: number } | undefined;
const app = $('app');
app.innerHTML = `<header><div class="brand">ECHO<small>TEMPORAL CHAMBERS</small></div><div class="status">LOCAL RECONSTRUCTION SYSTEM · ONLINE</div></header>
<div class="topline"><div><div class="eyebrow" id="subtitle"></div><h1 id="level-title"></h1></div><div class="clock"><small id="loop-label"></small><div class="time" id="timer">00:20.0</div></div></div>
<div class="game-layout"><main><div id="stage"><div id="viewport"><div id="game" aria-label="ECHO game chamber. Move with WASD or arrow keys."></div><div id="rewind"></div></div></div><div id="notice" role="status" aria-live="polite"></div><div class="timeline"><div class="timeline-head"><span>RECORDED TIMELINES</span><span id="timeline-scale"></span></div><div id="tracks"></div></div></main>
<aside><h2>CHAMBER OBJECTIVE</h2><p class="objective" id="objective"></p><button class="primary" id="commit">Space · Create Echo</button><button id="plan">Tab · Inspect plan</button><div class="rule"><h2>OPERATOR CONTROLS</h2><div class="controls"><kbd>W A S D</kbd><span>Move / arrow keys</span><kbd>MOUSE</kbd><span>Aim · click to fire</span><kbd>E</kbd><span>Interact / carry</span><kbd>SPACE</kbd><span>Commit & hold end</span><kbd>R</kbd><span>Retry · keep Echoes</span><kbd>Q</kbd><span>Undo latest Echo</span><kbd>ESC</kbd><span>Pause / settings</span></div></div><div class="rule"><button id="hint">Chamber hint</button><button id="pause">Pause</button></div></aside></div>
<footer><span>COOPERATE WITH YOUR PAST SELVES.</span><span id="footer-state">60 Hz · LOCAL SIMULATION</span></footer><div id="overlay" role="dialog" aria-modal="true" aria-label="Game menu"></div>`;
const mapButton = document.createElement('button');
mapButton.id = 'chamber-map';
mapButton.setAttribute('aria-label', 'Open chamber map');
mapButton.title = 'Tab · Pause and inspect the full facility';
$('viewport').append(mapButton);
const restartButton = document.createElement('button');
restartButton.id = 'restart-level';
restartButton.textContent = 'Restart level';
restartButton.title = 'Shift + R · Clear all Echoes and restart this level';
$('pause').before(restartButton);
const testBadge = document.createElement('div');
testBadge.id = 'test-badge';
testBadge.textContent = 'TEST RUN · NOT SAVED';
testBadge.hidden = true;
$('viewport').append(testBadge);

function refreshMap() {
  const l = session.world.level;
  mapButton.hidden = l.width <= VIEW_WIDTH && l.height <= VIEW_HEIGHT;
  mapButton.innerHTML = `<svg viewBox="0 0 ${l.width} ${l.height}" aria-hidden="true">
    <rect width="${l.width}" height="${l.height}" fill="#101c28"/>
    ${l.walls.map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="#536a79"/>`).join('')}
    ${l.portals.map((p) => `<line x1="${p.x}" y1="${p.y}" x2="${p.to.x}" y2="${p.to.y}" stroke="#68dfed" stroke-width="4" stroke-dasharray="10 12"/>`).join('')}
    ${l.plates.map((p) => `<rect x="${p.x - 14}" y="${p.y - 14}" width="28" height="28" fill="#68dfed"/>`).join('')}
    ${l.switches.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="14" fill="#68dfed"/>`).join('')}
    <circle cx="${l.exit.x}" cy="${l.exit.y}" r="24" fill="none" stroke="#f1f5e9" stroke-width="10"/>
    <g id="map-state"></g><g id="map-actors"></g><rect id="map-camera" fill="#ffffff08" stroke="#ffd78b" stroke-width="6"/>
    </svg><span>Tab · Full map</span>`;
}

function applySettings() {
  document.body.classList.toggle('contrast', save.settings.contrast);
  document.body.classList.toggle('reduced', save.settings.reducedMotion);
  audio.sync(paused);
}
applySettings();
function persist() {
  if (!writeSave(save)) notify('Storage unavailable. Progress lasts for this visit only.', 6000);
}
function clearInput() {
  keys.clear();
  interact = false;
  pointerDown = false;
  shotQueued = false;
  clock.clear();
}
function notify(text: string, duration = 4500) {
  $('notice').textContent = text;
  noticeUntil = performance.now() + duration;
}
function overlay(content: string) {
  clearInput();
  paused = true;
  planning = false;
  $('plan').textContent = 'Tab · Inspect plan';
  $('overlay').innerHTML = `<section class="panel">${content}</section>`;
  $('overlay').classList.remove('hidden');
  $('app')
    .querySelectorAll<HTMLElement>('header, .topline, .game-layout, footer')
    .forEach((el) => {
      el.inert = true;
    });
  $('overlay').querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  audio.sync(true);
}
function hideOverlay() {
  $('overlay').classList.add('hidden');
  $('app')
    .querySelectorAll<HTMLElement>('[inert]')
    .forEach((el) => {
      el.inert = false;
    });
  screen = 'none';
  paused = false;
  clearInput();
  audio.sync(false);
}
function button(id: string, action: () => void) {
  $(id).onclick = () => {
    audio.unlock();
    action();
  };
}
function canPlay(i: number) {
  return (
    testing.unlocked ||
    i === 0 ||
    !!save.completed[campaign[i - 1].id] ||
    !!save.completed[campaign[i].id] ||
    new URLSearchParams(location.search).has('debug')
  );
}
function start(i: number) {
  index = i;
  planning = false;
  session = new Session(campaign[i], testing.rules);
  session.assisted ||= testing.slow;
  transition = 0;
  lastWarning = -1;
  renderer?.clearEffects();
  hideOverlay();
  refreshLevel();
  notify(
    i === 0
      ? 'Temporal reconstruction complete. Move with WASD or arrow keys.'
      : campaign[i].subtitle,
    3500,
  );
}
function refreshLevel() {
  refreshMap();
  $('subtitle').textContent = campaign[index].subtitle;
  $('level-title').innerHTML =
    `<span>${String(index + 1).padStart(2, '0')}</span>${campaign[index].name}`;
  $('objective').textContent = campaign[index].objective;
  $('timeline-scale').textContent = `0s ───────── ${campaign[index].seconds}s`;
  updateHud();
}
function showMenu() {
  screen = 'menu';
  returnScreen = 'menu';
  const next = Math.max(
    0,
    campaign.findIndex((l) => !save.completed[l.id]),
  );
  overlay(
    `<div class="eyebrow">A TEMPORAL COOPERATION EXPERIMENT</div><div class="title-art">ECHO</div><p class="quote">You have been here before.<br>This time, you have help.</p><p>Leave a timeline behind. Return to the beginning.<br>Cooperate with your past selves across ${campaign.length} chambers.</p><div class="actions"><button class="primary" id="play">${Object.keys(save.completed).length ? 'Continue experiment' : 'Begin experiment'} →</button><button id="select">Chambers</button><button id="how">How to play</button><button id="settings">Settings</button></div><div class="menu-bottom">KEYBOARD + MOUSE · HEADPHONES OPTIONAL · PROGRESS SAVED LOCALLY</div>`,
  );
  button('play', () => start(next));
  button('select', showLevels);
  button('how', showHelp);
  button('settings', showSettings);
  addCheatButton();
}
function showLevels() {
  screen = 'levels';
  overlay(
    `<div class="eyebrow">EXPERIMENT ARCHIVE</div><h2>${campaign.length} chambers. One you.</h2><div class="levels">${campaign.map((l, i) => `<button class="level-button" id="level-${i}" ${canPlay(i) ? '' : 'disabled'}><div><span class="number">${String(i + 1).padStart(2, '0')}</span>${l.name}<small>${save.completed[l.id] ? `COMPLETE · BEST ${save.completed[l.id].echoes} ECHOES · PAR ${l.par}` : canPlay(i) ? `${l.seconds} SECOND LOOP` : 'COMPLETE PREVIOUS CHAMBER'}</small></div><span>${save.completed[l.id] ? '✓' : canPlay(i) ? '↗' : '—'}</span></button>`).join('')}</div><div class="actions"><button id="back">Main menu</button></div>`,
  );
  campaign.forEach((_, i) => button(`level-${i}`, () => start(i)));
  button('back', showMenu);
  addCheatButton();
}
function showPause() {
  if (session.world.status === 'complete') {
    showComplete();
    return;
  }
  screen = 'pause';
  returnScreen = 'pause';
  overlay(
    `<div class="eyebrow">TIME IS SUSPENDED</div><h2>${campaign[index].name}</h2><p>Your Echoes and all world events are paused.</p><div class="actions"><button class="primary" id="resume">Resume</button><button id="retry">Retry loop</button><button id="undo">Undo latest Echo</button><button id="full-reset">Restart chamber</button><button id="pause-hint">Chamber hint</button><button id="how">Controls</button><button id="settings">Settings</button><button id="select">Chambers</button></div>`,
  );
  button('resume', hideOverlay);
  button('retry', () => {
    hideOverlay();
    reset('retry');
  });
  button('undo', () => {
    hideOverlay();
    reset('undo');
  });
  button('full-reset', showRestart);
  button('how', showHelp);
  button('settings', showSettings);
  button('select', showLevels);
  button('pause-hint', showHint);
  addCheatButton();
}
function addCheatButton() {
  const b = document.createElement('button');
  b.textContent = 'Cheat codes';
  b.onclick = () => showCheats();
  $('overlay').querySelector('.actions')?.append(b);
}
function returnToScreen() {
  const previous = screen,
    wasPlanning = planning;
  return () => {
    if (previous === 'menu') showMenu();
    else if (previous === 'levels') showLevels();
    else if (previous === 'pause') showPause();
    else if (previous === 'complete') showComplete();
    else if (previous === 'settings') showSettings();
    else if (previous === 'help') showHelp();
    else {
      hideOverlay();
      if (wasPlanning) togglePlan();
    }
  };
}
function showRestart() {
  dialogBack = returnToScreen();
  screen = 'restart';
  overlay(
    '<div class="eyebrow">RECONSTRUCT FROM ZERO</div><h2>Restart this level?</h2><p>All Echoes, cargo changes, and current-level counters will be cleared. Saved campaign progress stays intact. Active cheat toggles stay enabled.</p><div class="actions"><button id="cancel" class="primary">Keep playing</button><button id="confirm-restart">Restart level now</button></div>',
  );
  button('cancel', dialogBack);
  button('confirm-restart', () => start(index));
}
function showCheats(message = '') {
  if (screen !== 'cheats') dialogBack = returnToScreen();
  screen = 'cheats';
  overlay(
    `<div class="eyebrow">LOCAL TESTING TOOLS · F2</div><h2>Cheat codes</h2><p>Gameplay cheats mark the current run as a test: no completion or best score is saved. Toggles survive loop resets but are not saved across page reloads. NORMAL starts a clean run.</p><form id="cheat-form"><label for="cheat-input">Enter a code</label><div class="cheat-entry"><input id="cheat-input" autocomplete="off" spellcheck="false" maxlength="40" placeholder="WARP 15"><button class="primary" type="submit">Execute</button></div></form><p id="cheat-result" role="status"></p><div class="cheat-list">${cheatCodes.map(([code, help]) => `<button id="code-${code}" class="cheat-code"><strong>${code}${code === 'GOD' ? (testing.rules.god ? ' · ON' : ' · OFF') : code === 'NOCLIP' ? (testing.rules.noclip ? ' · ON' : ' · OFF') : code === 'POWER' ? (testing.rules.power ? ' · ON' : ' · OFF') : code === 'SLOW' ? (testing.slow ? ' · ON' : ' · OFF') : ''}</strong><small>${help}</small></button>`).join('')}</div><p><kbd>WARP 1–${campaign.length}</kbd> Jump directly to a chamber. No completion is awarded.</p><div class="actions"><button id="cheat-back">Back</button></div>`,
  );
  $('cheat-result').textContent = message;
  $('cheat-form').onsubmit = (event) => {
    event.preventDefault();
    executeCheat($<HTMLInputElement>('cheat-input').value);
  };
  cheatCodes.forEach(([code]) => button(`code-${code}`, () => executeCheat(code)));
  button('cheat-back', dialogBack);
  $('cheat-input').focus();
}
function executeCheat(text: string) {
  const command = parseCheat(text, campaign.length);
  if (!command) {
    $('cheat-result').textContent =
      `Unknown code. Use the buttons below or WARP 1–${campaign.length}.`;
    return;
  }
  if (command.kind === 'WARP' || command.kind === 'NEXT') {
    testing.unlocked = true;
    start(command.kind === 'WARP' ? command.index : (index + 1) % campaign.length);
    return;
  }
  if (command.kind === 'NORMAL') {
    Object.assign(testing.rules, normalRules());
    testing.slow = false;
    start(index);
    return;
  }
  if (command.kind === 'UNLOCK') testing.unlocked = true;
  else {
    if (command.kind === 'SLOW') testing.slow = !testing.slow;
    else {
      const key = command.kind === 'GOD' ? 'god' : command.kind === 'NOCLIP' ? 'noclip' : 'power';
      testing.rules[key] = !testing.rules[key];
    }
    session.rules = testing.rules;
    session.world.rules = testing.rules;
    session.assisted = true;
    if (session.world.status === 'dead') session.retry();
    session.world.updateSignals();
  }
  updateHud();
  showCheats(
    command.kind === 'UNLOCK'
      ? 'All chambers unlocked for this visit. Saved completions unchanged.'
      : `${command.kind} toggled. This run will not be saved.`,
  );
}
function showHelp() {
  screen = 'help';
  overlay(
    `<div class="eyebrow">OPERATOR GUIDE</div><h2>Cooperate with your past selves.</h2><p>Every loop starts from the same world. Your Echoes repeat their recorded movement, aim, and interactions. Doors, hazards and objects remain physical: a changed world can break an old plan.</p><div class="help-grid"><p><kbd>WASD / ↑←↓→</kbd> Move</p><p><kbd>MOUSE / CLICK</kbd> Aim / shoot</p><p><kbd>E</kbd> Activate / pick up / drop</p><p><kbd>SPACE</kbd> Create an Echo now</p><p><kbd>R</kbd> Discard attempt and retry</p><p><kbd>Q</kbd> Undo the latest Echo</p><p><kbd>TAB</kbd> Pause and inspect paths</p><p><kbd>ESC</kbd> Pause menu</p></div><p class="hint-text">When you commit early, the Echo follows your route and holds its final position until the loop ends. Recorded actions happen at their original times. A lost Echo cancels its remaining actions. Retry preserves your committed Echoes.</p><div class="actions"><button class="primary" id="back">Back</button></div>`,
  );
  button('back', () => (returnScreen === 'pause' ? showPause() : showMenu()));
}
function showSettings() {
  screen = 'settings';
  overlay(
    `<div class="eyebrow">OPERATOR PREFERENCES</div><h2>Settings</h2><label class="setting"><span>Master volume<small>Synthesized effects and ambience</small></span><input id="volume" type="range" min="0" max="100" value="${save.settings.volume * 100}" aria-label="Master volume"></label>${(
      [
        ['ambience', 'Ambient sound', 'Low frequency chamber drone'],
        ['reducedMotion', 'Reduced motion', 'Disable rewind sweep and expanding effects'],
        ['trails', 'Echo trails', 'Show recent historical paths'],
        ['contrast', 'High contrast', 'Stronger text and Echo visibility'],
      ] as const
    )
      .map(
        ([key, name, description]) =>
          `<label class="setting"><span>${name}<small>${description}</small></span><input id="${key}" type="checkbox" ${save.settings[key] ? 'checked' : ''}></label>`,
      )
      .join(
        '',
      )}<div class="actions"><button class="primary" id="back">Done</button><button id="erase">Reset saved progress</button></div>`,
  );
  $('volume').oninput = () => {
    save.settings.volume = Number($<HTMLInputElement>('volume').value) / 100;
    applySettings();
    persist();
  };
  for (const key of ['ambience', 'reducedMotion', 'trails', 'contrast'] as const)
    $(key).onchange = () => {
      save.settings[key] = $<HTMLInputElement>(key).checked;
      applySettings();
      persist();
    };
  button('back', () => (returnScreen === 'pause' ? showPause() : showMenu()));
  button('erase', () => {
    overlay(
      '<div class="eyebrow">CLEAR ARCHIVE</div><h2>Reset saved progress?</h2><p>Completed chambers and best scores will be removed. Your settings will be kept.</p><div class="actions"><button id="cancel" class="primary">Keep progress</button><button id="confirm">Reset progress</button></div>',
    );
    button('cancel', showSettings);
    button('confirm', () => {
      save.completed = {};
      persist();
      showSettings();
    });
  });
}
function complete() {
  const world = session.world,
    previous = save.completed[world.level.id];
  if (
    !session.assisted &&
    (!previous ||
      session.runs.length < previous.echoes ||
      (session.runs.length === previous.echoes && world.tick < previous.ticks))
  )
    save.completed[world.level.id] = { echoes: session.runs.length, ticks: world.tick };
  persist();
  audio.play('complete');
  showComplete();
}
function showComplete() {
  screen = 'complete';
  const last = index === campaign.length - 1;
  overlay(
    `<div class="eyebrow">${last ? 'EXPERIMENT COMPLETE' : 'TEMPORAL COOPERATION VERIFIED'}</div><h2>${last ? 'You were never alone.' : 'Chamber reconstructed.'}</h2><p>${last ? 'Every past self brought you here. The chamber can finally let you go.' : `You solved ${campaign[index].name}. The plan held together.`}</p><div class="score"><div><strong>${session.runs.length}</strong><small>ECHOES · PAR ${campaign[index].par}</small></div><div><strong>${(session.world.tick / HZ).toFixed(1)}s</strong><small>FINAL TIMELINE</small></div><div><strong>${session.deaths}</strong><small>DEATHS</small></div></div><p>${session.world.actors.filter((a) => a.id && a.alive).length} Echoes survived · ${session.retries} retries · ${session.commits} timelines recorded</p><div class="actions"><button class="primary" id="next">${last ? 'Return to chambers' : 'Next chamber →'}</button><button id="replay">Replay chamber</button><button id="select">Chambers</button></div>`,
  );
  if (session.assisted)
    $('overlay').querySelector('.eyebrow')!.textContent = 'TEST RUN · COMPLETION NOT SAVED';
  button('next', () => (last ? showLevels() : start(index + 1)));
  button('replay', () => start(index));
  button('select', showLevels);
}
function reset(kind: 'commit' | 'retry' | 'undo' | 'timeout') {
  if (transition > 0) return;
  const committed = kind === 'commit' || kind === 'timeout';
  if (committed && !session.commit(kind === 'timeout')) {
    if (session.runs.length >= 12) {
      paused = true;
      showPause();
      notify('12 Echo capacity. Undo an Echo or restart the chamber.', 8000);
    } else notify('Record a short route first. Failed attempts cannot become Echoes.');
    return;
  }
  if (kind === 'retry') session.retry();
  if (kind === 'undo') session.undo();
  clearInput();
  renderer?.clearEffects();
  transition = 0.4;
  lastWarning = -1;
  audio.play('reset');
  $('rewind').classList.remove('active');
  void $('rewind').offsetWidth;
  $('rewind').classList.add('active');
  notify(
    committed
      ? `E${session.runs.length} recorded. It repeats your route, then holds its final position.`
      : kind === 'undo'
        ? 'Latest Echo removed. Remaining history preserved.'
        : 'Attempt discarded. Committed Echoes preserved.',
  );
  updateHud();
}
function togglePlan() {
  if (screen !== 'none') return;
  planning = !planning;
  paused = planning;
  clearInput();
  audio.sync(paused);
  $('plan').textContent = planning ? 'Tab · Resume timeline' : 'Tab · Inspect plan';
  notify(
    planning
      ? 'PLAN VIEW · Historical paths shown. Time is paused. Tab to resume.'
      : 'Timeline resumed.',
  );
}
function updateHud() {
  testBadge.hidden = !session.assisted;
  const w = session.world,
    left = Math.max(0, (w.limit - w.tick) / HZ);
  $('timer').textContent = formatCountdown(left);
  $('timer').style.color = left <= 5 ? '#ff8799' : '';
  $('loop-label').textContent =
    `LOOP ${String(session.runs.length + 1).padStart(2, '0')} · ${session.runs.length} ECHOES`;
  const all = [...session.runs, w.recording];
  if (!mapButton.hidden) {
    const view = chamberView(w.level, w.player, planning);
    const camera = $('map-camera');
    for (const [key, value] of Object.entries({
      x: Math.max(0, view.x),
      y: Math.max(0, view.y),
      width: Math.min(w.level.width, view.w),
      height: Math.min(w.level.height, view.h),
    }))
      camera.setAttribute(key, String(value));
    $('map-state').innerHTML =
      w.level.doors
        .map(
          (d) =>
            `<rect x="${d.x}" y="${d.y}" width="${d.w}" height="${d.h}" fill="${w.doorOpen.get(d.id) ? '#68dfed' : '#ff657d'}"/>`,
        )
        .join('') +
      w.objects
        .map(
          (o) =>
            `<rect x="${o.x - 14}" y="${o.y - 14}" width="28" height="28" fill="${o.kind === 'core' ? '#ffd78b' : '#ffffff'}"/>`,
        )
        .join('');
    $('map-actors').innerHTML = w.actors
      .map(
        (a) =>
          `<circle cx="${a.x}" cy="${a.y}" r="${a.id ? 13 : 20}" fill="${!a.alive ? '#ff657d' : a.id ? '#68dfed' : '#ffd78b'}"/>`,
      )
      .join('');
    mapButton.classList.toggle('overview', planning);
    mapButton.querySelector('span')!.textContent = planning ? 'Tab · Return' : 'Tab · Full map';
    mapButton.setAttribute('aria-label', planning ? 'Return to player view' : 'Open chamber map');
  }
  if (timelineWorld !== w) {
    timelineWorld = w;
    $('tracks').style.setProperty('--track-columns', String(Math.ceil(all.length / 4)));
    $('tracks').innerHTML = all
      .map(
        (run, i) =>
          `<div class="track ${i === session.runs.length ? 'current' : ''}"><span>${i === session.runs.length ? 'YOU' : `ECHO ${String(run.number).padStart(2, '0')}`}</span><div class="rail"><div class="rail-fill"></div></div><em></em></div>`,
      )
      .join('');
    trackNodes = Array.from($('tracks').children).map((row) => ({
      rail: row.querySelector<HTMLElement>('.rail')!,
      fill: row.querySelector<HTMLElement>('.rail-fill')!,
      status: row.querySelector<HTMLElement>('em')!,
      seen: 0,
    }));
  }
  all.forEach((run, i) => {
    const current = i === session.runs.length,
      actor = current ? w.player : w.actors[i];
    const status = !actor.alive
      ? 'LOST'
      : actor.conflict
        ? 'CONFLICT'
        : actor.desync
          ? 'DESYNC'
          : current
            ? 'REC ●'
            : w.tick >= run.duration
              ? 'HOLD'
              : 'STABLE';
    const node = trackNodes[i];
    node.rail.style.setProperty('--cursor', `${(w.tick / w.limit) * 100}%`);
    node.fill.style.width = `${(run.duration / w.limit) * 100}%`;
    if (node.status.textContent !== status) node.status.textContent = status;
    node.status.className = !actor.alive ? 'lost' : actor.conflict || actor.desync ? 'desync' : '';
    node.status.title = actor.conflict;
    for (; node.seen < run.events.length; node.seen++) {
      const event = run.events[node.seen],
        marker = document.createElement('i');
      marker.className = 'event';
      marker.style.left = `${(event.tick / w.limit) * 100}%`;
      marker.title = `${event.kind} ${event.target ?? ''} at ${(event.tick / HZ).toFixed(1)}s`;
      node.rail.append(marker);
    }
  });
  $('footer-state').textContent = planning
    ? 'PLAN VIEW · TIME SUSPENDED'
    : `${paused ? 'PAUSED' : '60 Hz'} · ${w.bullets.length ? w.bullets.length + ' PROJECTILES' : 'ALL EVENTS LOCAL'}`;
}

button('commit', () => {
  if (!paused) reset('commit');
});
button('pause', showPause);
restartButton.onclick = showRestart;
button('plan', togglePlan);
mapButton.onclick = togglePlan;
function showHint() {
  returnScreen = 'pause';
  overlay(
    `<div class="eyebrow">CHAMBER ${index + 1} · OPTIONAL HINT</div><h2>${campaign[index].name}</h2><p class="hint-text">${campaign[index].hint}</p><div class="actions"><button id="resume" class="primary">Return to chamber</button></div>`,
  );
  screen = 'pause';
  button('resume', hideOverlay);
}
button('hint', showHint);

window.addEventListener('keydown', (e) => {
  if (e.code === 'F2' && !e.repeat) {
    e.preventDefault();
    if (screen === 'cheats') dialogBack();
    else if (screen !== 'restart') showCheats();
    return;
  }
  if (e.code === 'Tab' && screen !== 'none') {
    const focusable = Array.from(
      $('overlay').querySelectorAll<HTMLElement>('button:not(:disabled), input'),
    );
    const first = focusable[0],
      last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
    return;
  }
  if (
    ['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) &&
    screen === 'none'
  )
    e.preventDefault();
  if (e.repeat) return;
  if (e.target instanceof HTMLInputElement && e.code !== 'Escape') return;
  audio.unlock();
  if (e.code === 'Escape') {
    if (screen === 'cheats' || screen === 'restart') dialogBack();
    else if (planning) togglePlan();
    else if (screen === 'none') showPause();
    else if (screen === 'pause') hideOverlay();
    else if (screen === 'settings' || screen === 'help') {
      if (returnScreen === 'pause') showPause();
      else showMenu();
    } else if (screen === 'levels') showMenu();
    return;
  }
  if (screen !== 'none') return;
  if (e.code === 'KeyR' && e.shiftKey) {
    e.preventDefault();
    showRestart();
    return;
  }
  if (e.code === 'Tab') {
    togglePlan();
    return;
  }
  if (paused) return;
  if (e.code === 'KeyR') {
    reset('retry');
    return;
  }
  if (e.code === 'KeyQ') {
    reset('undo');
    return;
  }
  if (e.code === 'Space') {
    reset('commit');
    return;
  }
  if (e.code === 'KeyE') interact = true;
  keys.add(e.code);
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => {
  clearInput();
  if (screen === 'none' && !planning) showPause();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearInput();
    if (screen === 'none') showPause();
  }
});
window.addEventListener('pointerup', () => {
  pointerDown = false;
});

class ChamberScene extends Phaser.Scene {
  hudElapsed = 0;
  constructor() {
    super('chamber');
  }
  create() {
    renderer = new Renderer(this);
    gameReady = true;
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      pointerPosition = { x: p.x, y: p.y };
    });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!paused && p.leftButtonDown()) {
        pointerDown = true;
        shotQueued = true;
        pointerPosition = { x: p.x, y: p.y };
      }
    });
    refreshLevel();
    showMenu();
  }
  update(_time: number, delta: number) {
    if (!gameReady) return;
    const dt = Math.min(delta / 1000, 0.1);
    if (!paused && transition > 0) {
      transition = Math.max(0, transition - dt);
      clock.clear();
    } else if (!paused && session.world.status === 'playing') {
      clock.advance(delta * (testing.slow ? 0.5 : 1), () => {
        if (pointerPosition) {
          const target = pointerToWorld(pointerPosition, renderer.view);
          pointerAim = Math.atan2(
            target.y - session.world.player.y,
            target.x - session.world.player.x,
          );
        }
        const input: Input = {
          x:
            Number(keys.has('KeyD') || keys.has('ArrowRight')) -
            Number(keys.has('KeyA') || keys.has('ArrowLeft')),
          y:
            Number(keys.has('KeyS') || keys.has('ArrowDown')) -
            Number(keys.has('KeyW') || keys.has('ArrowUp')),
          aim: pointerAim,
          shoot: pointerDown || shotQueued,
          interact,
        };
        interact = false;
        shotQueued = false;
        session.world.step(input);
        renderer.effects(session.world.feedback);
        const sounds = new Set(session.world.feedback.map((f) => f.kind));
        sounds.forEach((kind) => audio.play(kind));
        session.world.feedback.filter((f) => f.text).forEach((f) => notify(f.text!, 7000));
        const status = session.world.getStatus();
        if (status === 'timeout') {
          reset('timeout');
          return false;
        }
        if (status === 'complete') {
          complete();
          return false;
        }
        if (status === 'dead') {
          session.deaths++;
          clearInput();
          return false;
        }
        const second = Math.ceil((session.world.limit - session.world.tick) / HZ);
        if (second <= 5 && second !== lastWarning) {
          audio.play('warning');
          lastWarning = second;
        }
      });
    }
    renderer.draw(session.world, save.settings, paused ? 0 : delta, planning);
    this.hudElapsed += delta;
    if (this.hudElapsed > 80) {
      updateHud();
      this.hudElapsed = 0;
    }
    if (noticeUntil && performance.now() > noticeUntil && session.world.status !== 'dead') {
      $('notice').textContent = '';
      noticeUntil = 0;
    }
  }
}
const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: VIEW_WIDTH,
  height: VIEW_HEIGHT,
  parent: 'game',
  backgroundColor: '#101c28',
  scene: ChamberScene,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, roundPixels: false },
  audio: { noAudio: true },
  banner: false,
});
// The chamber can resize when Echo tracks change, not just on window resize.
// Keep Phaser's pointer-to-world transform aligned with the fitted canvas.
const gameResize = new ResizeObserver(() => game.scale.refresh());
gameResize.observe($('game'));

// Opt-in local instrumentation for replay tests and chamber authoring; absent from normal play.
if (import.meta.env.DEV && new URLSearchParams(location.search).has('debug')) {
  Object.assign(window, {
    echoDebug: {
      get session() {
        return session;
      },
      get paused() {
        return paused;
      },
      get ready() {
        return gameReady;
      },
      start,
      step(input: Input = idle(), ticks = 1) {
        for (let i = 0; i < ticks; i++) session.world.step(input);
        updateHud();
      },
      freeze(value = true) {
        paused = value;
        clock.clear();
      },
    },
  });
}
