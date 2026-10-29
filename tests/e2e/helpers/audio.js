import { expect } from '@playwright/test';

/** Observe real Web Audio topology without exposing any product debug API. */
export async function installAudioProbe(page) {
  await page.addInitScript(() => {
    const NativeContext = window.AudioContext ?? window.webkitAudioContext;
    const probe = { contexts: [], gains: [], sources: [], nextId: 0 };
    window.__havenAudioProbe = probe;
    const connections = (node, record) => {
      record.connections = [];
      const connect = node.connect.bind(node);
      const disconnect = node.disconnect.bind(node);
      node.connect = (destination, ...args) => {
        record.connections.push(destination);
        return connect(destination, ...args);
      };
      node.disconnect = (...args) => {
        record.disconnected = true;
        return disconnect(...args);
      };
    };
    window.AudioContext = class extends NativeContext {
      constructor(...args) { super(...args); probe.contexts.push(this); }
      createGain() {
        const node = super.createGain();
        const record = { id: ++probe.nextId, node, targets: [], disconnected: false };
        for (const method of ['setTargetAtTime', 'linearRampToValueAtTime', 'setValueAtTime']) {
          const original = node.gain[method].bind(node.gain);
          node.gain[method] = (value, ...args) => {
            record.targets.push({ value, method, time: args[0] });
            return original(value, ...args);
          };
        }
        connections(node, record);
        probe.gains.push(record);
        return node;
      }
      createBufferSource() {
        const node = super.createBufferSource();
        const record = { id: ++probe.nextId, node, stopped: false, disconnected: false };
        const stop = node.stop.bind(node);
        node.stop = (...args) => { record.stopped = true; return stop(...args); };
        connections(node, record);
        probe.sources.push(record);
        return node;
      }
    };
  });
}

export async function audioSnapshot(page) {
  return page.evaluate(() => {
    const probe = window.__havenAudioProbe;
    return {
      contexts: probe.contexts.length,
      states: probe.contexts.map((context) => context.state),
      gains: probe.gains.map((gain) => ({
        id: gain.id, target: gain.targets.at(-1)?.value ?? gain.node.gain.value,
        actual: gain.node.gain.value, disconnected: gain.disconnected,
        master: probe.contexts.some((context) => gain.connections.includes(context.destination)),
        ramps: gain.targets.filter(({ method }) => method === 'linearRampToValueAtTime').length,
      })),
      sources: probe.sources.map((source) => ({
        id: source.id, gainId: probe.gains.find((gain) => source.connections.includes(gain.node))?.id,
        stopped: source.stopped, disconnected: source.disconnected,
        hasBuffer: source.node.buffer !== null, loop: source.node.loop,
      })),
    };
  });
}

export async function expectMaster(page, value) {
  await expect.poll(async () => (await audioSnapshot(page)).gains.find(({ master }) => master)?.target).toBe(value);
}

export async function expectLayerTarget(page, gainId, value) {
  await expect.poll(async () => (await audioSnapshot(page)).gains.find(({ id }) => id === gainId)?.target).toBe(value);
}

export async function setSlider(slider, value) {
  await slider.fill(String(value));
}

export function mixer(page) { return page.getByRole('dialog', { name: 'Cozy Sound Mixer', exact: true }); }
export function layerRow(page, id) { return mixer(page).locator(`[data-layer="${id}"]`); }
export function presetSelect(page) { return mixer(page).getByRole('combobox', { name: 'Atmosphere', exact: true }); }
export async function openMixer(page) {
  await page.getByRole('button', { name: 'Abrir Cozy Sound Mixer', exact: true }).click();
  await expect(mixer(page)).toBeVisible();
}
export async function closeMixer(page) {
  await mixer(page).getByRole('button', { name: 'Fechar mixer', exact: true }).click();
  await expect(mixer(page)).toHaveCount(0);
}
export async function savedPreferences(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('haven.preferences.v1')));
}
