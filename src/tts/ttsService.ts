export class TTSService {
  private synth: SpeechSynthesis | null = null;
  private voice: SpeechSynthesisVoice | null = null;
  private enabled: boolean = true;
  private voicesLoaded: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
    this.enabled = localStorage.getItem('kinesight_tts_enabled') !== 'false';

    // Voices may take time to load — listen for the async event
    if (this.synth) {
      this.loadVoices();
      this.synth.addEventListener('voiceschanged', () => this.loadVoices());
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    if (voices.length === 0) return;

    this.voicesLoaded = true;

    // Prefer high-quality, calm English voices (Google US, Samantha, Daniel, etc.)
    const preferredKeywords = ['Google US', 'Google UK', 'Samantha', 'Daniel', 'Karen', 'Moira', 'Premium', 'Natural', 'Enhanced'];
    const englishVoices = voices.filter(v => v.lang.startsWith('en'));

    const premium = englishVoices.filter(v =>
      preferredKeywords.some(kw => v.name.includes(kw))
    );

    if (premium.length > 0) {
      this.voice = premium[0];
    } else if (englishVoices.length > 0) {
      this.voice = englishVoices[0];
    } else {
      this.voice = voices[0];
    }
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    localStorage.setItem('kinesight_tts_enabled', String(val));
    if (!val && this.synth) {
      this.synth.cancel();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public speak(text: string) {
    if (!this.enabled || !text.trim() || !this.synth) return;

    // Chrome bug workaround: cancel() immediately before speak() can swallow the utterance.
    // We cancel first, then use a microtask delay before speaking.
    this.synth.cancel();

    setTimeout(() => {
      if (!this.synth) return;

      // Re-check voices if not loaded yet (lazy init on first user gesture)
      if (!this.voicesLoaded) {
        this.loadVoices();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      if (this.voice) {
        utterance.voice = this.voice;
      }

      // Natural, calm settings
      utterance.rate = 1.05;
      utterance.pitch = 0.95;
      utterance.volume = 1.0;

      this.synth.speak(utterance);
    }, 100); // 100ms delay to let Chrome's cancel() fully flush
  }
}

export const ttsService = new TTSService();
