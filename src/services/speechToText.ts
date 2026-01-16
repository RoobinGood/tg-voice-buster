export interface SpeechToTextService {
  transcribe(audioPath: string, requestId?: string): Promise<string>;
}
