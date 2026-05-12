const SAMPLE_RATE = 22050;
const DURATION = 0.6;
const FREQUENCY = 880;
const NUM_SAMPLES = Math.floor(SAMPLE_RATE * DURATION);

function generateWavBase64(): string {
  const dataSize = NUM_SAMPLES * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset: number, value: string) {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < NUM_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const envelope = Math.exp(-3 * t);
    const sample = Math.sin(2 * Math.PI * FREQUENCY * t) * envelope;
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, clamped * 32767, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const ALERT_SOUND_URI = `data:audio/wav;base64,${generateWavBase64()}`;

let audioElement: HTMLAudioElement | null = null;

export function startAlertSound() {
  if (audioElement) {
    return;
  }

  audioElement = new Audio(ALERT_SOUND_URI);
  audioElement.loop = true;
  audioElement.volume = 0.8;
  void audioElement.play();
}

export function stopAlertSound() {
  if (!audioElement) {
    return;
  }

  audioElement.pause();
  audioElement.currentTime = 0;
  audioElement = null;
}
