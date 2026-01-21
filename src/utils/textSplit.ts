export function splitTextForTelegram(text: string, maxChunkSize: number): string[] {
  if (text.length <= maxChunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  const paragraphs = text.split(/\n\s*\n/);
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    if (paragraph.trim().length === 0) {
      continue;
    }

    const trimmedParagraph = paragraph.trim();
    const separator = currentChunk ? "\n\n" : "";

    if (trimmedParagraph.length <= maxChunkSize) {
      const potentialChunk = currentChunk
        ? `${currentChunk}${separator}${trimmedParagraph}`
        : trimmedParagraph;

      if (potentialChunk.length <= maxChunkSize) {
        currentChunk = potentialChunk;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = trimmedParagraph;
      }
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = "";
      }

      const sentences = splitIntoSentences(trimmedParagraph);
      let sentenceChunk = "";

      for (const sentence of sentences) {
        const potentialChunk = sentenceChunk
          ? `${sentenceChunk} ${sentence}`
          : sentence;

        if (potentialChunk.length <= maxChunkSize) {
          sentenceChunk = potentialChunk;
        } else {
          if (sentenceChunk) {
            chunks.push(sentenceChunk.trim());
          }

          if (sentence.length > maxChunkSize) {
            const forcedChunks = forceSplit(sentence, maxChunkSize);
            chunks.push(...forcedChunks);
            sentenceChunk = "";
          } else {
            sentenceChunk = sentence;
          }
        }
      }

      if (sentenceChunk) {
        chunks.push(sentenceChunk.trim());
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks.length > 0 ? chunks : [text];
}

function splitIntoSentences(text: string): string[] {
  const sentenceEndings = /([.!?]+\s*)/;
  const sentences: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    const match = remaining.match(sentenceEndings);
    if (!match) {
      if (remaining.trim()) {
        sentences.push(remaining.trim());
      }
      break;
    }

    const endIndex = match.index! + match[0].length;
    const sentence = remaining.slice(0, endIndex).trim();
    if (sentence) {
      sentences.push(sentence);
    }
    remaining = remaining.slice(endIndex);
  }

  return sentences.length > 0 ? sentences : [text];
}

function forceSplit(text: string, maxSize: number): string[] {
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxSize) {
      chunks.push(remaining);
      break;
    }

    const chunk = remaining.slice(0, maxSize);
    const lastSpace = chunk.lastIndexOf(" ");
    const splitPoint = lastSpace > maxSize * 0.8 ? lastSpace : maxSize;
    chunks.push(remaining.slice(0, splitPoint).trim());
    remaining = remaining.slice(splitPoint).trim();
  }

  return chunks;
}

export function addPrefixToChunks(chunks: string[]): string[] {
  if (chunks.length <= 1) {
    return chunks;
  }

  const total = chunks.length;
  return chunks.map((chunk, index) => {
    const prefix = `${index + 1}/${total}\n`;
    return prefix + chunk;
  });
}
