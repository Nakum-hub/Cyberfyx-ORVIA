import { createHash, createHmac } from 'node:crypto';
import net from 'node:net';
import tls from 'node:tls';
import http from 'node:http';
import https from 'node:https';

/**
 * Transport clients for customer-controlled delivery (EX09).
 *
 * Both clients distinguish three outcomes. SENT means the far end accepted the
 * message (SMTP 250 after DATA, or an HTTP 2xx). FAILED means it certainly did
 * not, and says whether trying again could help. UNKNOWN means the connection
 * ended after the message had been handed over and before an answer came back:
 * the message may or may not have arrived, and a retry may duplicate it.
 * Neither client follows redirects, logs content or keeps a response body.
 */
export type SendResult = { outcome: 'SENT' | 'FAILED' | 'UNKNOWN'; retryable: boolean; response_code: string | null; receipt: string | null; error_code: string | null };
export type SmtpTarget = { host: string; port: number; security: 'TLS' | 'NONE'; from_address: string; credential: { username: string; password: string } | null };
export type Message = { id: string; recipient: string; subject: string; body: string; attempt: number };
const LOOPBACK = new Set(['127.0.0.1', '::1', 'localhost']);
export const isLoopback = (host: string) => LOOPBACK.has(host.toLowerCase());
const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
export const validEmail = (value: string) => EMAIL.test(value) && value.length <= 254;
const clean = (value: string) => value.replace(/[\r\n]+/g, ' ').slice(0, 300);
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');

/** A minimal SMTP submission client: EHLO, optional AUTH PLAIN, MAIL, RCPT, DATA, QUIT. */
export function sendSmtp(target: SmtpTarget, message: Message, timeoutMs = 15_000): Promise<SendResult> {
  if (target.security === 'NONE' && !isLoopback(target.host)) return Promise.resolve({ outcome: 'FAILED', retryable: false, response_code: null, receipt: null, error_code: 'PLAINTEXT_ONLY_TO_LOOPBACK' });
  if (!validEmail(message.recipient) || !validEmail(target.from_address)) return Promise.resolve({ outcome: 'FAILED', retryable: false, response_code: null, receipt: null, error_code: 'INVALID_ADDRESS' });
  return new Promise(resolve => {
    let settled = false; let buffer = ''; let dataSent = false; let step = 0;
    const socket: net.Socket = target.security === 'TLS' ? tls.connect({ host: target.host, port: target.port, servername: target.host, rejectUnauthorized: true }) : net.connect({ host: target.host, port: target.port });
    const finish = (result: SendResult) => { if (settled) return; settled = true; socket.destroy(); resolve(result); };
    socket.setTimeout(timeoutMs, () => finish(dataSent ? { outcome: 'UNKNOWN', retryable: true, response_code: null, receipt: null, error_code: 'TIMEOUT_AFTER_DATA' } : { outcome: 'FAILED', retryable: true, response_code: null, receipt: null, error_code: 'TIMEOUT' }));
    socket.on('error', error => finish(dataSent ? { outcome: 'UNKNOWN', retryable: true, response_code: null, receipt: null, error_code: 'CONNECTION_LOST_AFTER_DATA' }
      : { outcome: 'FAILED', retryable: true, response_code: null, receipt: null, error_code: String((error as NodeJS.ErrnoException).code ?? 'CONNECTION_ERROR').slice(0, 40) }));
    socket.on('close', () => finish(dataSent ? { outcome: 'UNKNOWN', retryable: true, response_code: null, receipt: null, error_code: 'CLOSED_AFTER_DATA' } : { outcome: 'FAILED', retryable: true, response_code: null, receipt: null, error_code: 'CLOSED' }));
    const write = (line: string) => socket.write(`${line}\r\n`);
    const messageId = `<${message.id}.${message.attempt}@orvia.local>`;
    const date = new Date().toUTCString();
    const payload = [`From: ${target.from_address}`, `To: ${message.recipient}`, `Subject: ${clean(message.subject)}`, `Date: ${date}`, `Message-ID: ${messageId}`,
      `X-Orvia-Message: ${message.id}`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: 8bit', '',
      ...message.body.replace(/\r\n?/g, '\n').split('\n').map(l => (l.startsWith('.') ? `.${l}` : l))].join('\r\n');
    const steps: { expect: number[]; send?: () => void }[] = [
      { expect: [220], send: () => write('EHLO orvia.local') },
      { expect: [250], send: () => target.credential ? write(`AUTH PLAIN ${Buffer.from(`\u0000${target.credential.username}\u0000${target.credential.password}`).toString('base64')}`) : (step++, write(`MAIL FROM:<${target.from_address}>`)) },
      { expect: [235], send: () => write(`MAIL FROM:<${target.from_address}>`) },
      { expect: [250], send: () => write(`RCPT TO:<${message.recipient}>`) },
      { expect: [250, 251], send: () => write('DATA') },
      { expect: [354], send: () => { dataSent = true; socket.write(`${payload}\r\n.\r\n`); } },
      { expect: [250] },
    ];
    socket.on('data', chunk => {
      buffer += chunk.toString('utf8');
      for (;;) {
        const lines = buffer.split('\r\n');
        const done = lines.findIndex(l => /^\d{3} /.test(l));
        if (done < 0) return;
        const reply = lines.slice(0, done + 1); buffer = lines.slice(done + 1).join('\r\n');
        const code = Number(reply[done]!.slice(0, 3)); const text = clean(reply[done]!);
        const current = steps[step]!;
        if (!current.expect.includes(code)) {
          const permanent = code >= 500;
          finish({ outcome: 'FAILED', retryable: !permanent && !dataSent, response_code: String(code), receipt: null, error_code: permanent ? 'REJECTED_PERMANENTLY' : 'REJECTED_TEMPORARILY' });
          return;
        }
        if (step === steps.length - 1) { write('QUIT'); finish({ outcome: 'SENT', retryable: false, response_code: String(code), receipt: `${text} ${messageId}`.slice(0, 300), error_code: null }); return; }
        step++;
        current.send?.();
      }
    });
  });
}

/** Signs and posts a JSON payload to an approved webhook. The key is the transport's derived signing key. */
export function sendWebhook(url: string, secret: string, message: Message, source: { kind: string; id: string | null }, timeoutMs = 10_000): Promise<SendResult> {
  const target = new URL(url);
  if (target.username || target.password) return Promise.resolve({ outcome: 'FAILED', retryable: false, response_code: null, receipt: null, error_code: 'CREDENTIALS_IN_URL' });
  if (target.protocol !== 'https:' && !(target.protocol === 'http:' && isLoopback(target.hostname.replace(/^\[|\]$/g, '')))) return Promise.resolve({ outcome: 'FAILED', retryable: false, response_code: null, receipt: null, error_code: 'HTTPS_REQUIRED' });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body = JSON.stringify({ id: message.id, attempt: message.attempt, source, recipient: message.recipient, subject: message.subject, body: message.body, sent_at: new Date().toISOString() });
  const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  return new Promise(resolve => {
    let settled = false; let written = false;
    const finish = (r: SendResult) => { if (!settled) { settled = true; resolve(r); } };
    const request = (target.protocol === 'https:' ? https : http).request(target, {
      method: 'POST', timeout: timeoutMs,
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body), 'x-orvia-delivery': message.id, 'x-orvia-attempt': String(message.attempt),
        'x-orvia-timestamp': timestamp, 'x-orvia-signature': `sha256=${signature}`, 'idempotency-key': message.id, 'user-agent': 'ORVIA-delivery/1' },
    }, response => {
      const chunks: Buffer[] = []; let size = 0;
      response.on('data', (c: Buffer) => { if (size < 4096) { chunks.push(c); size += c.length; } });
      response.on('end', () => {
        const status = response.statusCode ?? 0; const digest = sha(Buffer.concat(chunks).subarray(0, 4096)).slice(0, 16);
        if (status >= 200 && status < 300) finish({ outcome: 'SENT', retryable: false, response_code: String(status), receipt: `HTTP ${status} response ${digest}`, error_code: null });
        else finish({ outcome: 'FAILED', retryable: status >= 500 || status === 408 || status === 429, response_code: String(status), receipt: null, error_code: status >= 300 && status < 400 ? 'REDIRECT_NOT_FOLLOWED' : 'HTTP_ERROR' });
      });
    });
    request.on('timeout', () => { request.destroy(); finish(written ? { outcome: 'UNKNOWN', retryable: true, response_code: null, receipt: null, error_code: 'TIMEOUT_AFTER_REQUEST' } : { outcome: 'FAILED', retryable: true, response_code: null, receipt: null, error_code: 'TIMEOUT' }); });
    request.on('error', error => finish(written ? { outcome: 'UNKNOWN', retryable: true, response_code: null, receipt: null, error_code: 'CONNECTION_LOST_AFTER_REQUEST' }
      : { outcome: 'FAILED', retryable: true, response_code: null, receipt: null, error_code: String((error as NodeJS.ErrnoException).code ?? 'CONNECTION_ERROR').slice(0, 40) }));
    request.end(body, () => { written = true; });
  });
}
