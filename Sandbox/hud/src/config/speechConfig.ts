export interface SpeechConfig {
  api: {
    defaultModel: string;
  };
  tts: {
    enabled: boolean;
    defaultVoiceKey: string;
    rate: number;
    pitch: number;
    volume: number;
  };
}

export const SYSTEM_CONFIG: SpeechConfig = {
  api: {
    defaultModel: 'maddie:latest',
  },
  tts: {
    enabled: true,
    defaultVoiceKey: 'Google US English',
    rate: 1.05,
    pitch: 1.28,
    volume: 1.0,
  },
};