/**
 * The opening soundtrack, played through Web Audio so the film can be locked to the audio clock.
 * The file is fetched and decoded ahead of time (it is small), and nothing is audible until
 * begin() is called from the visitor's own click.
 */
export type Soundtrack = {
  /** Fetch and decode the song. Safe to call repeatedly. */
  prepare: () => Promise<AudioBuffer | null>;
  /** Must run inside the click handler. Song time 0 is heard `delay` seconds from now. */
  begin: (delay: number) => void;
  /** Song position currently being heard, or null before playback has started. */
  elapsed: () => number | null;
  fadeOut: (seconds: number) => void;
  suspend: () => void;
  resume: () => void;
  dispose: () => void;
};

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

const ignore = () => undefined;

export function createSoundtrack(src: string): Soundtrack {
  let loading: Promise<AudioBuffer | null> | null = null;
  let ctx: AudioContext | null = null;
  let source: AudioBufferSourceNode | null = null;
  let gain: GainNode | null = null;
  let startedAt = 0;
  let startOffset = 0;
  let disposed = false;
  let fadeEndsAt = 0;

  const prepare = () => {
    loading ??= fetch(src)
      .then((response) => (response.ok ? response.arrayBuffer() : Promise.reject(new Error(String(response.status)))))
      // An offline context decodes without being subject to autoplay rules.
      .then((data) => new OfflineAudioContext(2, 1, 44100).decodeAudioData(data))
      .catch(() => null);
    return loading;
  };

  return {
    prepare,
    begin: (delay) => {
      const Context =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context || ctx) return;
      // Lets iOS play through the ring/silent switch, as a film would.
      const session = (navigator as AudioSessionNavigator).audioSession;
      if (session) session.type = "playback";
      ctx = new Context();
      void ctx.resume().catch(ignore);
      const songZero = ctx.currentTime + delay;

      void prepare().then((buffer) => {
        if (!buffer || !ctx || disposed) return;
        const now = ctx.currentTime + 0.05;
        // If decoding finished late, join the song where the film already is.
        const offset = Math.max(0, now - songZero);
        if (offset >= buffer.duration) return;
        gain = ctx.createGain();
        source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(gain).connect(ctx.destination);
        startedAt = Math.max(songZero, now);
        startOffset = offset;
        source.start(startedAt, offset);
      });
    },
    elapsed: () => {
      if (!ctx || !source || ctx.state !== "running") return null;
      // Compensate for output latency so the picture matches what is heard, not what is scheduled.
      const latency = ctx.outputLatency || ctx.baseLatency || 0;
      const position = ctx.currentTime - latency - startedAt + startOffset;
      return position >= 0 ? position : null;
    },
    fadeOut: (seconds) => {
      if (!ctx || !gain || !source) return;
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + seconds);
      source.stop(now + seconds + 0.05);
      fadeEndsAt = now + seconds;
    },
    suspend: () => void ctx?.suspend().catch(ignore),
    resume: () => void ctx?.resume().catch(ignore),
    dispose: () => {
      disposed = true;
      if (fadeEndsAt === 0) {
        try {
          source?.stop();
        } catch {
          // Already stopped.
        }
      }
      // Let a fade that is still running finish (the curtain outlives the opening), then close.
      const closing = ctx;
      const remaining = closing ? Math.max(0, fadeEndsAt - closing.currentTime) : 0;
      setTimeout(() => void closing?.close().catch(ignore), remaining * 1000 + 100);
      ctx = null;
      source = null;
    },
  };
}
