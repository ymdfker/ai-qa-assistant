// OpenAI-compatible API streaming engine.
// Works with DeepSeek, Qwen, and any OpenAI-compatible endpoint.

import { ipcMain } from 'electron';
import https from 'https';
import http from 'http';
import { stmts } from '../db/Database';

export function setupApiIPC(): void {

  // Dedicated summarize channel — doesn't interfere with main chat
  ipcMain.on('api:summarize', (event, job: any) => {
    const { modelName, sessionId, messages: msgs } = job;
    const models = stmts.getModels.all() as any[];
    const model = models.find((m: any) => m.model_name === modelName);
    if (!model?.api_endpoint || !model?.api_key) return;
    const body = JSON.stringify({ model: modelName, messages: msgs, stream: true, max_tokens: 64 });
    const url = new URL(model.api_endpoint);
    const transport = url.protocol === 'https:' ? https : http;
    const req = transport.request({
      hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${model.api_key}` },
      timeout: 30_000,
    }, (res) => {
      let buf = '', result = '';
      res.on('data', (c: Buffer) => { buf += c.toString(); const es = buf.split(/\n\n|\r\n\r\n/); buf = es.pop() || ''; for (const e of es) { const ls = e.split(/\n|\r\n/); for (const l of ls) { const t = l.trim(); if (t.startsWith('data:') && t.slice(5).trim() !== '[DONE]') { try { const j = JSON.parse(t.slice(5).trim()); result += j.choices?.[0]?.delta?.content || ''; } catch {} } } } });
      res.on('end', () => { try { event.sender.send('api:summarize-done', { sessionId, title: result.trim().slice(0, 30) }); } catch {} });
    });
    req.on('error', () => { try { event.sender.send('api:summarize-done', { sessionId, title: '' }); } catch {} });
    req.write(body); req.end();
  });

  ipcMain.on('api:send', (event, job: any) => {
    const { modelName, sessionId, messages: msgs } = job;
    const reply = (channel: string, data: any) => {
      try { event.sender.send(channel, data); } catch {}
    };

    // Get model config from DB
    const models = stmts.getModels.all() as any[];
    const model = models.find((m: any) => m.model_name === modelName);
    if (!model || !model.api_endpoint) {
      reply('api:error', { sessionId, modelName, error: `模型 "${modelName}" 未配置API端点。请在设置中填写。` });
      return;
    }
    if (!model.api_key) {
      reply('api:error', { sessionId, modelName, error: `请先在设置中填写 ${model.display_name} 的 API Key。` });
      return;
    }

    const endpoint = model.api_endpoint;
    const key = model.api_key;

    const body = JSON.stringify({
      model: modelName,
      messages: msgs || [{ role: 'user', content: 'Hello' }],
      stream: true,
      max_tokens: 4096,
    });
    console.log(`[api:${modelName}] (${msgs?.length || 0} msgs)`);

    const startTime = Date.now();
    const url = new URL(endpoint);
    const transport = url.protocol === 'https:' ? https : http;

    const req = transport.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'Accept': 'text/event-stream',
      },
      timeout: 120_000,
    }, (res) => {
      console.log(`[api:${modelName}] HTTP ${res.statusCode} ${res.statusMessage}`);
      if (res.statusCode !== 200) {
        let errBody = '';
        res.on('data', (c: Buffer) => errBody += c.toString());
        res.on('end', () => {
          let errMsg = `HTTP ${res.statusCode}`;
          try { const j = JSON.parse(errBody); errMsg = j.error?.message || errMsg; } catch {}
          reply('api:error', { sessionId, modelName, error: errMsg });
        });
        return;
      }

      let buffer = '';
      let chunkCount = 0;
      let forwardCount = 0;

      res.on('data', (chunk: Buffer) => {
        chunkCount++;
        if (chunkCount === 1) console.log(`[api:${modelName}] first chunk after ${Date.now() - startTime}ms`);
        // Split by SSE double-newline, handling both \n and \r\n
        buffer += chunk.toString();
        const events = buffer.split(/\n\n|\r\n\r\n/);
        buffer = events.pop() || '';

        for (const event of events) {
          const lines = event.split(/\n|\r\n/);
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;
            const data = trimmed.slice(5).trim();
            if (data === '[DONE]') {
              console.log(`[api:${modelName}] done, ${forwardCount} chunks`);
              reply('api:done', { sessionId, modelName });
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                forwardCount++;
                reply('api:chunk', { sessionId, modelName, content });
              }
            } catch { /* skip */ }
          }
        }
      });

      res.on('end', () => {
        reply('api:done', { sessionId, modelName });
      });

      res.on('error', (e: Error) => {
        reply('api:error', { sessionId, modelName, error: e.message });
      });
    });

    req.on('error', (e: Error) => {
      reply('api:error', { sessionId, modelName, error: e.message });
    });

    req.on('timeout', () => {
      req.destroy();
      reply('api:error', { sessionId, modelName, error: '请求超时' });
    });

    req.write(body);
    req.end();
  });

  ipcMain.on('api:cancel', () => {
    // Cancellation handled by timeout + frontend ignoring chunks
  });
}