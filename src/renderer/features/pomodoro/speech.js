let isSpeaking = false;
export function speak(text) {
  if (isSpeaking) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.onstart = () => isSpeaking = true;
  utter.onend = () => isSpeaking = false;
  window.speechSynthesis.speak(utter);
}
