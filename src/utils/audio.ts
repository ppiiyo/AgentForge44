let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtxClass) {
      audioCtx = new AudioCtxClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Plays a short, subtle tactile "click" sound.
 */
export function playClickSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    // A fast, crisp sine transient for a clean, non-obtrusive tactile pop
    osc.type = 'sine';
    const now = ctx.currentTime;
    
    osc.frequency.setValueAtTime(1000, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.05);

    gainNode.gain.setValueAtTime(0.03, now); // Quiet and comfortable
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.start(now);
    osc.stop(now + 0.06);
  } catch (err) {
    console.debug('Failed to play click sound:', err);
  }
}

/**
 * Plays a pleasant, warm ascending "connect" sound.
 */
export function playConnectSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.type = 'triangle'; // Softer, warmer timbre
    const now = ctx.currentTime;

    // Upward pitch sweep
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.12);

    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.04, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.start(now);
    osc.stop(now + 0.16);
  } catch (err) {
    console.debug('Failed to play connect sound:', err);
  }
}
