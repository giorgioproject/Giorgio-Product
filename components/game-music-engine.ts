import {
  MUSIC_LOOP_SEC,
  MUSIC_THEMES,
  musicTrackForScene,
  shouldKeepExistingTrack,
  shouldRestartMainTrackFromStart,
  shouldStartMusic,
  type MusicScene,
} from "@/lib/game-music";

export type GameMusicEngine = {
  unlock: () => Promise<void>;
  setMuted: (muted: boolean) => void;
  setScene: (scene: MusicScene | null) => void;
  dispose: () => void;
};

export type GameMusicEngineOptions = {
  getAudio?: () => HTMLAudioElement | null;
};

const FILE_VOLUME = 0.45;
const SYNTH_VOLUME = 0.35;

const trackedAudio = new Set<HTMLAudioElement>();

function silenceElement(el: HTMLAudioElement | null | undefined) {
  if (!el) return;
  el.pause();
  el.muted = true;
  el.volume = 0;
}

export function registerGameMusicAudio(el: HTMLAudioElement | null) {
  if (!el) return;
  trackedAudio.add(el);
}

/** Stop every copy of the song, including leftovers from a remount. */
export function silenceAllGameMusic() {
  trackedAudio.forEach((el) => silenceElement(el));
  if (typeof document === "undefined") return;
  document.querySelectorAll<HTMLAudioElement>("[data-game-music]").forEach((el) => {
    silenceElement(el);
  });
}

/** Welcome + maps play the song file; other moments use the original synth. */
export function createGameMusicEngine(
  options: GameMusicEngineOptions = {}
): GameMusicEngine | null {
  if (typeof window === "undefined") return null;

  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let fallbackAudio: HTMLAudioElement | null = null;
  let muted = false;
  let scene: MusicScene | null = null;
  let loopTimer: ReturnType<typeof setTimeout> | null = null;
  let unlocked = false;
  let closed = false;
  let playGen = 0;

  const fileEl = (): HTMLAudioElement | null => {
    const provided = options.getAudio?.() ?? null;
    if (provided) {
      registerGameMusicAudio(provided);
      return provided;
    }
    return fallbackAudio;
  };

  const ensureFileEl = (): HTMLAudioElement | null => {
    const existing = fileEl();
    if (existing) return existing;
    // A hidden Audio() is not in the page, so mute/pause on the visible
    // player would miss it. Only create one when there is no page player.
    if (options.getAudio) return null;
    const created = new Audio();
    created.loop = true;
    created.setAttribute("data-game-music", "1");
    registerGameMusicAudio(created);
    fallbackAudio = created;
    return created;
  };

  const clearLoop = () => {
    if (loopTimer !== null) {
      clearTimeout(loopTimer);
      loopTimer = null;
    }
  };

  const resetFilePosition = () => {
    const el = fileEl();
    if (!el) return;
    try {
      el.currentTime = 0;
    } catch {
      /* ignore seek before metadata */
    }
  };

  const stopFile = (resetPosition = false) => {
    playGen += 1;
    silenceElement(options.getAudio?.());
    silenceElement(fallbackAudio);
    silenceAllGameMusic();
    if (resetPosition) resetFilePosition();
  };

  const playFile = (src: string, fromStart: boolean) => {
    clearLoop();
    if (closed || muted) {
      stopFile();
      return;
    }
    const el = ensureFileEl();
    if (!el) return;
    registerGameMusicAudio(el);
    const nextUrl = new URL(src, window.location.origin).href;
    if (el.src !== nextUrl) {
      el.src = src;
    }
    el.loop = true;
    if (fromStart) resetFilePosition();
    el.muted = false;
    el.volume = FILE_VOLUME;
    const gen = playGen;
    void el
      .play()
      .then(() => {
        if (closed || muted || gen !== playGen) {
          silenceElement(el);
          silenceAllGameMusic();
        }
      })
      .catch(() => undefined);
  };

  const scheduleNotes = (
    theme: (typeof MUSIC_THEMES)[MusicScene],
    baseTime: number
  ) => {
    if (!ctx || !master || muted) return;
    for (const note of theme) {
      if (note.at >= MUSIC_LOOP_SEC) continue;
      const t = baseTime + note.at;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = note.wave ?? "sine";
      osc.frequency.setValueAtTime(note.freq, t);
      const peak = note.vol ?? 0.1;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + note.dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + note.dur + 0.05);
    }
  };

  const scheduleSynth = () => {
    clearLoop();
    stopFile();
    if (closed || !ctx || !master || muted || !scene) return;
    if (musicTrackForScene(scene)) return;
    const theme = MUSIC_THEMES[scene];
    const loopStart = ctx.currentTime + 0.05;
    scheduleNotes(theme, loopStart);
    loopTimer = setTimeout(() => {
      scheduleSynth();
    }, MUSIC_LOOP_SEC * 1000);
  };

  const startScene = () => {
    if (!shouldStartMusic(muted, unlocked, scene)) {
      if (muted || closed) stopFile();
      return;
    }
    const track = musicTrackForScene(scene);
    if (track) {
      clearLoop();
      playFile(track, shouldRestartMainTrackFromStart(scene));
      return;
    }
    scheduleSynth();
  };

  return {
    async unlock() {
      if (muted) {
        stopFile();
        return;
      }
      if (!unlocked) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        ctx = new AudioCtx();
        master = ctx.createGain();
        master.gain.value = SYNTH_VOLUME;
        master.connect(ctx.destination);
        unlocked = true;
      }
      // Start the file in this tap — awaiting resume first can miss the gesture.
      if (!closed && !muted) startScene();
      if (ctx && ctx.state === "suspended") await ctx.resume();
      if (!closed && !muted) startScene();
      else stopFile();
    },
    setMuted(next) {
      muted = next;
      if (master) master.gain.value = muted ? 0 : SYNTH_VOLUME;
      if (ctx) {
        if (muted && ctx.state === "running") void ctx.suspend();
        if (!muted && ctx.state === "suspended") void ctx.resume();
      }
      if (muted) {
        clearLoop();
        stopFile();
        return;
      }
      const el = fileEl();
      if (el) {
        el.muted = false;
        el.volume = FILE_VOLUME;
      }
      startScene();
    },
    setScene(next) {
      const prevTrack = musicTrackForScene(scene);
      const nextTrack = musicTrackForScene(next);
      const restartFromStart = shouldRestartMainTrackFromStart(next);
      const el = fileEl();

      scene = next;

      if (muted) {
        stopFile();
        return;
      }

      if (
        shouldKeepExistingTrack({
          muted,
          prevTrack,
          nextTrack,
          restartFromStart,
          isPlaying: !!el && !el.paused,
        })
      ) {
        return;
      }

      clearLoop();

      if (next === "caught") {
        stopFile(true);
      } else if (!nextTrack) {
        stopFile(restartFromStart);
      }

      if (shouldStartMusic(muted, unlocked, scene)) startScene();
    },
    dispose() {
      closed = true;
      clearLoop();
      stopFile();
      if (fallbackAudio) {
        trackedAudio.delete(fallbackAudio);
        fallbackAudio.removeAttribute("src");
        fallbackAudio.load();
        fallbackAudio = null;
      }
      if (ctx) void ctx.close();
      ctx = null;
      master = null;
      unlocked = false;
    },
  };
}
