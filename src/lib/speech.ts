/**
 * Speech Recognition utility for voice-note journaling
 */

export interface SpeechRecognitionHook {
  isListening: boolean;
  transcript: string;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

// Global declaration for SpeechRecognition window objects
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export class VoiceRecorderService {
  private recognition: any = null;
  public isSupported: boolean = false;
  private onTranscriptUpdate?: (text: string, isFinal: boolean) => void;
  private onStatusChange?: (isListening: boolean) => void;
  private isListeningState: boolean = false;

  constructor() {
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (SpeechRecognition) {
      this.isSupported = true;
      try {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          if (this.onTranscriptUpdate) {
            const combined = finalTranscript || interimTranscript;
            this.onTranscriptUpdate(combined, Boolean(finalTranscript));
          }
        };

        this.recognition.onerror = (event: any) => {
          console.warn('Speech recognition event note:', event.error);
          if (event.error === 'not-allowed') {
            this.stop();
          }
        };

        this.recognition.onend = () => {
          if (this.isListeningState) {
            // Auto restart if still marked active
            try {
              this.recognition.start();
            } catch (e) {
              this.isListeningState = false;
              if (this.onStatusChange) this.onStatusChange(false);
            }
          } else {
            if (this.onStatusChange) this.onStatusChange(false);
          }
        };
      } catch (e) {
        this.isSupported = false;
      }
    }
  }

  public setCallbacks(
    onTranscript: (text: string, isFinal: boolean) => void,
    onStatus: (isListening: boolean) => void
  ) {
    this.onTranscriptUpdate = onTranscript;
    this.onStatusChange = onStatus;
  }

  public start() {
    if (!this.recognition) return;
    try {
      this.isListeningState = true;
      this.recognition.start();
      if (this.onStatusChange) this.onStatusChange(true);
    } catch (e) {
      console.warn('Recognition start exception:', e);
    }
  }

  public stop() {
    this.isListeningState = false;
    if (!this.recognition) return;
    try {
      this.recognition.stop();
    } catch (e) {
      // ignore
    }
    if (this.onStatusChange) this.onStatusChange(false);
  }
}
