export async function streamPipelineExecution(
  nodes: any[], 
  connections: any[], 
  variables: Record<string, any>,
  onEvent: (event: string, data: any) => void
) {
  const response = await fetch('/api/execute/stream-pipeline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodes, connections, variables })
  });

  if (!response.body) throw new Error('ReadableStream not supported');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    let currentEvent = '';
    for (const line of lines) {
      if (line.startsWith('event:')) {
        currentEvent = line.replace('event:', '').trim();
      } else if (line.startsWith('data:') && currentEvent) {
        try {
          const data = JSON.parse(line.substring(5).trim());
          onEvent(currentEvent, data);
        } catch {
          // ignore parsing noise on chunk boundary
        }
        currentEvent = '';
      }
    }
  }
}
