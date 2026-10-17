// Volatile live window only: no camera bytes are written to disk.
export class PilotError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export class StreamWindow {
  constructor({ windowMs = 60_000, maxBytes = 16 * 1024 * 1024, offlineMs = 8000, clock = Date.now } = {}) {
    this.windowMs = windowMs;
    this.maxBytes = maxBytes;
    this.offlineMs = offlineMs;
    this.clock = clock;
    this.items = [];
    this.bytes = 0;
    this.counter = 0;
    this.discontinuities = 0;
    this.retired = new Set();
  }

  prune() {
    while (this.items.length && (this.clock() - this.items[0].receivedAt > this.windowMs
      || this.bytes > this.maxBytes || this.items.length > 90)) {
      const item = this.items.shift();
      this.bytes -= item.data.length;
      if (item.discontinuity) this.discontinuities++;
    }
  }

  push({ epoch, sequence, duration, capturedAt, data }) {
    this.prune();
    if (!/^[0-9a-f-]{36}$/.test(epoch) || !Number.isSafeInteger(sequence) || sequence < 0
      || !Number.isFinite(duration) || duration < 0.04 || duration > 2
      || !Number.isFinite(Date.parse(capturedAt))
      || Math.abs(this.clock() - Date.parse(capturedAt)) > 10_000) {
      throw new PilotError(422, 'Segmento fuera de límites; comprobar GOP y reloj NTP.');
    }
    let transportValid = true;
    for (let index = 0; index < data.length; index += 188)
      if (data[index] !== 0x47) { transportValid = false; break; }
    if (!data.length || data.length % 188 !== 0 || data.length > this.maxBytes || !transportValid) {
      throw new PilotError(422, 'Se requiere un segmento MPEG-TS completo.');
    }
    const previous = this.items.find(item => item.epoch === epoch && item.sequence === sequence);
    if (previous) {
      if (!previous.data.equals(data) || previous.duration !== duration || previous.capturedAt !== capturedAt)
        throw new PilotError(409, 'El segmento ya existe con otro contenido.');
      return; // Retries must not make a stopped camera appear live.
    }
    let discontinuity = false;
    if (this.epoch !== epoch) {
      if (this.retired.has(epoch)) throw new PilotError(409, 'Sesión de publicación antigua.');
      if (this.epoch) {
        this.retired.add(this.epoch);
        if (this.retired.size > 16) this.retired.delete(this.retired.values().next().value);
        discontinuity = true;
      }
      this.epoch = epoch;
      this.sourceSequence = sequence - 1;
    }
    if (sequence !== this.sourceSequence + 1) throw new PilotError(409, 'Secuencia incompleta: reiniciar publicación.');
    this.sourceSequence = sequence;
    this.items.push({
      epoch, sequence, duration, capturedAt, data, discontinuity,
      number: this.counter++, receivedAt: this.clock(), filename: `${epoch}-${sequence}.ts`,
    });
    this.lastReceivedAt = this.clock();
    this.bytes += data.length;
    this.prune();
  }

  status() {
    this.prune();
    return {
      ready: this.items.length >= 3 && this.clock() - (this.lastReceivedAt ?? -Infinity) <= this.offlineMs,
      segments: this.items.length,
      bufferedBytes: this.bytes,
      lastReceivedAt: this.lastReceivedAt ? new Date(this.lastReceivedAt).toISOString() : null,
    };
  }

  playlist() {
    if (!this.status().ready) throw new PilotError(503, 'Cámara desconectada o preparando segmentos.');
    const lines = [
      '#EXTM3U', '#EXT-X-VERSION:3', '#EXT-X-TARGETDURATION:2',
      `#EXT-X-MEDIA-SEQUENCE:${this.items[0].number}`,
      `#EXT-X-DISCONTINUITY-SEQUENCE:${this.discontinuities}`,
    ];
    for (const item of this.items) {
      if (item.discontinuity) lines.push('#EXT-X-DISCONTINUITY');
      lines.push(`#EXT-X-PROGRAM-DATE-TIME:${item.capturedAt}`, `#EXTINF:${item.duration.toFixed(6)},`, item.filename);
    }
    return lines.join('\n') + '\n';
  }

  segment(filename) {
    this.prune();
    const item = this.items.find(segment => segment.filename === filename);
    if (!item) throw new PilotError(404, 'Segmento vencido o inexistente.');
    return item.data;
  }
}
