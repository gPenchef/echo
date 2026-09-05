import Phaser from 'phaser';
import './style.css';
import { Session } from './core/session';
import { HZ, idle, type Input } from './core/types';
import { campaign } from './levels/campaign';
import { Renderer } from './render';
import { loadSave, writeSave } from './persistence';
import { Audio } from './audio';
import { FixedClock } from './core/clock';
import type { World } from './core/world';

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
let screen: 'menu' | 'levels' | 'pause' | 'settings' | 'help' | 'complete' | 'none' = 'menu';
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
<div class="game-layout"><main><div id="viewport"><div id="game" aria-label="ECHO game chamber. Move with WASD or arrow keys."></div><div id="rewind"></div></div><div id="notice" role="status" aria-live="polite"></div><div class="timeline"><div class="timeline-head"><span>RECORDED TIMELINES</span><span id="timeline-scale"></span></div><div id="tracks"></div></div></main>
<aside><h2>CHAMBER OBJECTIVE</h2><p class="objective" id="objective"></p><button class="primary" id="commit">Space · Create Echo</button><button id="plan">Tab · Inspect plan</button><div class="rule"><h2>OPERATOR CONTROLS</h2><div class="controls"><kbd>W A S D</kbd><span>Move / arrow keys</span><kbd>MOUSE</kbd><span>Aim · click to fire</span><kbd>E</kbd><span>Interact / carry</span><kbd>SPACE</kbd><span>Commit & hold end</span><kbd>R</kbd><span>Retry · keep Echoes</span><kbd>Q</kbd><span>Undo latest Echo</span><kbd>ESC</kbd><span>Pause / settings</span></div></div><div class="rule"><button id="hint">Chamber hint</button><button id="pause">Pause</button></div></aside></div>
<footer><span>COOPERATE WITH YOUR PAST SELVES.</span><span id="footer-state">60 Hz · LOCAL SIMULATION</span></footer><div id="overlay" role="dialog" aria-modal="true" aria-label="Game menu"></div>`;

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
    i === 0 ||
    !!save.completed[campaign[i - 1].id] ||
    !!save.completed[campaign[i].id] ||
    new URLSearchParams(location.search).has('debug')
  );
}
function start(i: number) {
  index = i;
  session = new Session(campaign[i]);
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
}
function showLevels() {
  screen = 'levels';
  overlay(
    `<div class="eyebrow">EXPERIMENT ARCHIVE</div><h2>${campaign.length} chambers. One you.</h2><div class="levels">${campaign.map((l, i) => `<button class="level-button" id="level-${i}" ${canPlay(i) ? '' : 'disabled'}><div><span class="number">${String(i + 1).padStart(2, '0')}</span>${l.name}<small>${save.completed[l.id] ? `COMPLETE · BEST ${save.completed[l.id].echoes} ECHOES · PAR ${l.par}` : canPlay(i) ? `${l.seconds} SECOND LOOP` : 'COMPLETE PREVIOUS CHAMBER'}</small></div><span>${save.completed[l.id] ? '✓' : canPlay(i) ? '↗' : '—'}</span></button>`).join('')}</div><div class="actions"><button id="back">Main menu</button></div>`,
  );
  campaign.forEach((_, i) => button(`level-${i}`, () => start(i)));
  button('back', showMenu);
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
  button('full-reset', () => {
    hideOverlay();
    reset('clear');
  });
  button('how', showHelp);
  button('settings', showSettings);
  button('select', showLevels);
  button('pause-hint', showHint);
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
    !previous ||
    session.runs.length < previous.echoes ||
    (session.runs.length === previous.echoes && world.tick < previous.ticks)
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
  button('next', () => (last ? showLevels() : start(index + 1)));
  button('replay', () => start(index));
  button('select', showLevels);
}
function reset(kind: 'commit' | 'retry' | 'undo' | 'clear' | 'timeout') {
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
  if (kind === 'clear') session.clear();
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
        : kind === 'clear'
          ? 'Chamber reset. All timelines cleared.'
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
  const w = session.world,
    left = Math.max(0, (w.limit - w.tick) / HZ);
  $('timer').textContent = `00:${left.toFixed(1).padStart(4, '0')}`;
  $('timer').style.color = left <= 5 ? '#ff8799' : '';
  $('loop-label').textContent =
    `LOOP ${String(session.runs.length + 1).padStart(2, '0')} · ${session.runs.length} ECHOES`;
  const all = [...session.runs, w.recording];
  if (timelineWorld !== w) {
    timelineWorld = w;
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
button('plan', togglePlan);
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
  audio.unlock();
  if (e.code === 'Escape') {
    if (planning) togglePlan();
    else if (screen === 'none') showPause();
    else if (screen === 'pause') hideOverlay();
    else if (screen === 'settings' || screen === 'help') {
      if (returnScreen === 'pause') showPause();
      else showMenu();
    } else if (screen === 'levels') showMenu();
    return;
  }
  if (screen !== 'none') return;
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
      clock.advance(delta, () => {
        if (pointerPosition)
          pointerAim = Math.atan2(
            pointerPosition.y - session.world.player.y,
            pointerPosition.x - session.world.player.x,
          );
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
new Phaser.Game({
  type: Phaser.AUTO,
  width: 960,
  height: 560,
  parent: 'game',
  backgroundColor: '#101c28',
  scene: ChamberScene,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, roundPixels: false },
  audio: { noAudio: true },
  banner: false,
});

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
