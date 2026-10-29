export function fakeAudioContext() {
  const context = {
    sampleRate: 1000, currentTime: 0, state: 'suspended', destination: {}, gains: [], nodes: [], sources: [],
    node() {
      const node = { connect() {}, disconnect() { this.disconnected = true; } };
      this.nodes.push(node);
      return node;
    },
    createGain() {
      const node = Object.assign(this.node(), { gain: {
        value: 0, targets: [], times: [], cancelAndHoldAtTime() {},
        linearRampToValueAtTime(value, time) { this.targets.push(value); this.times.push(time); this.value = value; },
      } });
      this.gains.push(node);
      return node;
    },
    createBufferSource() {
      const node = Object.assign(this.node(), {
        start() { this.started = true; }, stop() { this.stopped = true; },
      });
      this.sources.push(node);
      return node;
    },
    createBuffer(channels, length, sampleRate = this.sampleRate) {
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      return { numberOfChannels: channels, length, sampleRate, getChannelData: (channel) => data[channel] };
    },
    async resume() { this.state = 'running'; },
    async suspend() { this.state = 'suspended'; },
    async close() { this.state = 'closed'; },
  };
  return context;
}

export function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
