import { injectNavButtons } from '../shared.js';
import { lineSlug } from '../data/schematicLayout.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
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

    const container = document.createElement('div');
    container.className = 'schemapro-container';
    container.style.textAlign = 'center';

    const healthEl = document.createElement('div');
    healthEl.style.fontSize = '1.6rem';
    healthEl.style.marginBottom = '6px';
    container.appendChild(healthEl);

    const promptEl = document.createElement('div');
    promptEl.id = 'signal-name';
    promptEl.style.fontSize = '1.3rem';
    promptEl.style.fontWeight = '600';
    promptEl.style.margin = '6px 0 14px';
    container.appendChild(promptEl);

    const svgWrap = document.createElement('div');
    container.appendChild(svgWrap);
    app.appendChild(container);

    // Load this line's schematic (generated JSON, no image needed).
    let schematic;
    try {
      const res = await fetch(`/src/data/schematics/${lineSlug(line)}.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      schematic = await res.json();
    } catch (err) {
      promptEl.style.color = '#c62828';
      promptEl.textContent = `Could not load the schematic for "${line}".`;
      return;
    }

    let health = MAX_HEALTH;
    const found = new Set();
    const targets = shuffle(schematic.signals.map((s) => s.label));
    let ti = 0;

    const renderHealth = () => {
      healthEl.textContent = '❤'.repeat(health) + '🖤'.repeat(MAX_HEALTH - health);
    };
    const renderPrompt = () => {
      promptEl.textContent = `Find signal: ${targets[ti]}`;
    };

    // Build the SVG schematic: a track line plus one clickable dot per signal.
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', schematic.viewBox.join(' '));
    svg.setAttribute('width', '320');
    svg.style.maxWidth = '90vw';
    svg.style.height = 'auto';
    svg.style.touchAction = 'manipulation';

    const [p1, p2] = schematic.track;
    const track = document.createElementNS(SVG_NS, 'line');
    track.setAttribute('x1', p1[0]);
    track.setAttribute('y1', p1[1]);
    track.setAttribute('x2', p2[0]);
    track.setAttribute('y2', p2[1]);
    track.setAttribute('stroke', '#9e9e9e');
    track.setAttribute('stroke-width', '6');
    svg.appendChild(track);

    schematic.signals.forEach((sig) => {
      const g = document.createElementNS(SVG_NS, 'g');
      g.style.cursor = 'pointer';

      const circle = document.createElementNS(SVG_NS, 'circle');
      circle.setAttribute('cx', sig.x);
      circle.setAttribute('cy', sig.y);
      circle.setAttribute('r', '24');
      circle.setAttribute('fill', '#1976d2');
      circle.setAttribute('stroke', '#0d47a1');
      circle.setAttribute('stroke-width', '3');

      const label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('x', sig.x);
      label.setAttribute('y', sig.y);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('dominant-baseline', 'central');
      label.setAttribute('fill', '#fff');
      label.setAttribute('font-size', '18');
      label.setAttribute('font-family', 'sans-serif');
      label.style.pointerEvents = 'none';
      label.textContent = sig.label;

      g.appendChild(circle);
      g.appendChild(label);
      g.addEventListener('click', () => handleClick(sig.label, circle));
      svg.appendChild(g);
    });
    svgWrap.appendChild(svg);

    function handleClick(label, circle) {
      if (found.has(label) || ti >= targets.length) return;

      if (label === targets[ti]) {
        found.add(label);
        circle.setAttribute('fill', '#43a047'); // correct = green, stays found
        circle.setAttribute('stroke', '#1b5e20');
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
        circle.setAttribute('fill', '#e53935'); // brief wrong flash
        setTimeout(() => {
          if (circle.getAttribute('fill') === '#e53935') {
            circle.setAttribute('fill', original);
          }
        }, 300);
        if (health <= 0) {
          promptEl.textContent = 'Out of hearts!';
          setTimeout(onLose, 800);
        }
      }
    }

    renderHealth();
    renderPrompt();
  },
};

export default SchemaPro;
