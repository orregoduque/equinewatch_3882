export const TIMELAPSE_FPS = 15;
export const TIMELAPSE_FRAME_MS = 1000 / TIMELAPSE_FPS;

/** Only current + next two frames are retained; eviction cancels pending loads. */
export class TimelapseFrames {
  private entries = new Map<number, {
    controller: AbortController; promise: Promise<string>; url?: string;
  }>();
  private closed = false;
  constructor(
    private count: number,
    private load: (index: number, signal: AbortSignal) => Promise<string>,
    private release: (url: string) => void = URL.revokeObjectURL,
  ) {}

  async frame(index: number): Promise<string> {
    if (this.closed) throw new DOMException('Aborted', 'AbortError');
    if (index < 0 || index >= this.count) throw new Error('Fotograma inválido.');
    for (const [key, entry] of this.entries) {
      if (key < index || key > index + 2) {
        entry.controller.abort();
        if (entry.url) this.release(entry.url);
        this.entries.delete(key);
      }
    }
    for (let next = index; next < Math.min(this.count, index + 3); next++) {
      if (this.entries.has(next)) continue;
      const controller = new AbortController();
      const entry: { controller: AbortController; promise: Promise<string>; url?: string } = {
        controller, promise: Promise.resolve(''),
      };
      entry.promise = this.load(next, controller.signal).then(url => {
        if (this.closed || controller.signal.aborted) {
          this.release(url);
          throw new DOMException('Aborted', 'AbortError');
        }
        entry.url = url;
        return url;
      });
      // Prefetch can fail before that frame is displayed. Surface it when requested.
      void entry.promise.catch(() => {});
      this.entries.set(next, entry);
    }
    return this.entries.get(index)!.promise;
  }

  close() {
    this.closed = true;
    for (const entry of this.entries.values()) {
      entry.controller.abort();
      if (entry.url) this.release(entry.url);
    }
    this.entries.clear();
  }
}
