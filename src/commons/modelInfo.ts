export const DEFAULT_MODEL_INFO = new Map<string, ModelInfo>();
[{
  id: 'nomic-embed-text:latest',
  size: '274MB',
  digest: ''
},
{
  id: 'granite-code:3b',
  size: '274MB',
  digest: ''
},
{
  id: 'granite-code:8b',
  size: '4GB',
  digest: ''
},
{
  id: 'granite-code:20b',
  size: '12GB',
  digest: ''
},
{
  id: 'granite-code:34b',
  size: '20GB',
  digest: ''
}
].forEach((m: ModelInfo) => {
  DEFAULT_MODEL_INFO.set(m.id, m);
});

export interface ModelInfo {
  id: string;
  size: string;
  digest: string;
}
