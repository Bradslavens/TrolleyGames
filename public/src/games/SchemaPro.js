import { injectNavButtons, palette } from '../shared.js';
import { schematicRegistry, schematicPath } from '../data/schematicRegistry.js';
import { signalsForDirection } from '../data/schematicLayout.js';
import { renderSchematic } from './schematicRenderer.js';

const MAX_HEALTH = 3;

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const SchemaPro = {
  async start(line, user, { onWin, onLose }) {
    const app = document.getElementById('app');
    app.innerHTML = '';
    injectNavButtons(() => window.location.reload());
    const pal = palette();

    const container = document.createElement('div');
    container.className = 'schemapro-container';

    const healthEl = document.createElement('div');
    healthEl.className = 'sp-health';
    container.appendChild(healthEl);

    const promptEl = document.createElement('div');
    promptEl.id = 'signal-name';
    promptEl.className = 'sp-prompt';
    container.appendChild(promptEl);

    const svgWrap = document.createElement('div');
    container.appendChild(svgWrap);
    app.appendChild(container);

    const entry = schematicRegistry[line];
    if (!entry) {
      promptEl.classList.add('is-error');
      promptEl.textContent = `"${line}" is coming soon — no schematic yet.`;
      return;
    }

    let schematic;
    try {
      const res = await fetch(schematicPath(line));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      schematic = await res.json();
    } catch (err) {
      promptEl.classList.add('is-error');
      promptEl.textContent = `Could not load the schematic for "${line}".`;
      return;
    }

    // The testable signals for this direction, asked in a shuffled order so the
    // player can't just click straight down the track — they must know where
    // each signal sits (the icons carry no labels).
    const targets = shuffle(signalsForDirection(schematic, entry));
    if (targets.length === 0) {
      promptEl.classList.add('is-error');
      promptEl.textContent = `No signals to find on "${line}" yet.`;
      return;
    }

    let health = MAX_HEALTH;
    let ti = 0;
    const found = new Set();

    const renderHealth = () => {
      healthEl.textContent = '❤'.repeat(health) + '🖤'.repeat(MAX_HEALTH - health);
    };
    const renderPrompt = () => {
      promptEl.textContent = `Find signal: ${targets[ti]}`;
    };

    function handleClick(label, circle) {
      if (found.has(label) || ti >= targets.length) return;
      if (label === targets[ti]) {
        found.add(label);
        circle.setAttribute('fill', pal.green); // correct = green, stays found
        ti++;
        if (ti >= targets.length) {
          promptEl.textContent = 'Schematic complete! 🎉';
          setTimeout(onWin, 1000);
        } else {
          renderPrompt();
        }
      } else {
        health--;
        renderHealth();
        const original = circle.getAttribute('fill');
        circle.setAttribute('fill', pal.red); // brief wrong flash
        setTimeout(() => {
          if (circle.getAttribute('fill') === pal.red) circle.setAttribute('fill', original);
        }, 300);
        if (health <= 0) {
          promptEl.textContent = 'Out of hearts!';
          setTimeout(onLose, 800);
        }
      }
    }

    renderSchematic(schematic, svgWrap, {
      pal,
      interactiveTrack: entry.track,
      onSignalClick: handleClick,
    });

    renderHealth();
    renderPrompt();
  },
};

export default SchemaPro;
