export interface TextPostProcessor {
  process(text: string, requestId?: string): Promise<string>;
}
