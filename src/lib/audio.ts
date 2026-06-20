type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

export function playAmbientTone(durationMs = 3600): void {
  const AudioContextClass = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    const audioContext = new AudioContextClass();
    const master = audioContext.createGain();
    const low = audioContext.createOscillator();
    const overtone = audioContext.createOscillator();
    const now = audioContext.currentTime;
    const duration = durationMs / 1000;

    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.075, now + 0.24);
    master.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    low.type = "sine";
    low.frequency.setValueAtTime(92, now);
    low.frequency.linearRampToValueAtTime(84, now + duration);

    overtone.type = "triangle";
    overtone.frequency.setValueAtTime(184, now);
    overtone.frequency.linearRampToValueAtTime(168, now + duration);

    low.connect(master);
    overtone.connect(master);
    master.connect(audioContext.destination);
    low.start(now);
    overtone.start(now + 0.08);
    low.stop(now + duration);
    overtone.stop(now + duration);
    window.setTimeout(() => void audioContext.close(), durationMs + 300);
  } catch {
    // Audio is optional; browser autoplay or device policies should not block the flow.
  }
}
