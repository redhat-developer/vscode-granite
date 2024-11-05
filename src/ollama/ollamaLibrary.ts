import { parse } from 'node-html-parser';
import { ModelInfo } from '../commons/modelInfo';

const cache = new Map<string, ModelInfo | undefined>();//TODO limit caching lifespan

const INFO_DELIMITER = ' · ';

// This is fugly, extremely brittle, but we have no other choice because The ollama library doesn't seem to expose an API we can query.
export async function getRemoteModelInfo(modelId: string): Promise<ModelInfo | undefined> {
  // Check if the result is already cached
  if (cache.has(modelId)) {
    return cache.get(modelId);
  }
  const start = Date.now();

  const url = `https://ollama.com/library/${modelId}`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });

    if (!response.ok) {
      throw new Error(`Failed to fetch the model page: ${response.statusText}`);
    }

    const html = await response.text();
    const root = parse(html);
    const fileExplorer = root.querySelector('#file-explorer');
    const itemsCenter = fileExplorer?.querySelector('.items-center');
    const lastParagraphElement = itemsCenter?.querySelectorAll('p')?.pop();

    if (lastParagraphElement) {
      const lastParagraph = lastParagraphElement.text.trim();
      if (lastParagraph.includes(INFO_DELIMITER)) {
        const [digest, size] = lastParagraph.split(INFO_DELIMITER).map(item => item.trim());
        const data: ModelInfo = {
          id: modelId,
          size,
          digest
        };
        // Cache the successful result
        cache.set(modelId, data);
        console.log('Model info:', data);
        return data;
      }
    }
  } catch (error) {
    console.error(`Error fetching or parsing model info: ${error}`);
  } finally {
    const elapsed = Date.now() - start;
    console.log(`Fetched remote information for ${modelId} in ${elapsed} ms`);
  }

  // Cache the failure
  cache.set(modelId, undefined);
  return undefined;
}