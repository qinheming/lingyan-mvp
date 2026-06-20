export function canSpeak(): boolean {
  return "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

export function speakNavigation(text: string): void {
  if (!canSpeak()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";
  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.volume = 0.9;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (!canSpeak()) return;
  window.speechSynthesis.cancel();
}
