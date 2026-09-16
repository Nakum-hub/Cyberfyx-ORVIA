import { randomUUID } from 'node:crypto';
import { ErrorResponse } from '../../../../packages/contracts/src/index.ts';
import { AccessError } from '../../../../packages/authz/src/index.ts';
import { runtime } from './runtime.ts';

export async function safeRoute(work: (requestId: string) => Promise<Response>, operation: 'AUTH_STAFF' | 'AUTH_PRINCIPAL' | 'SESSION_READ' | 'PRINCIPAL_LIST' | 'PRINCIPAL_CREATE') {
  const requestId = randomUUID();
  let response: Response;
  try {
    response = await work(requestId);
  } catch (error) {
    const status = error instanceof AccessError ? error.status : 503;
    const code = error instanceof AccessError ? error.code : 'SERVICE_UNAVAILABLE';
    response = Response.json(ErrorResponse.parse({ error: { code, message: code === 'FORBIDDEN' ? 'Access denied; privileged staff must complete MFA.' : 'Request could not be completed.',
      retry: status === 401 ? 'REAUTHENTICATE' : status === 503 ? 'AFTER_DELAY' : 'NEVER',
      ...(error instanceof AccessError && error.fieldErrors ? { field_errors: error.fieldErrors } : {}) }, request_id: requestId }),
    { status, headers: { 'Cache-Control': 'no-store', 'X-Request-Id': requestId } });
  }
  try {
    await runtime().pool.query('INSERT INTO app.request_audit (id,operation,status) VALUES ($1,$2,$3)',[requestId,operation,response.status]);
  } catch {
    return Response.json(ErrorResponse.parse({error:{code:'SERVICE_UNAVAILABLE',message:'Request audit unavailable.',retry:'AFTER_DELAY'},request_id:requestId}),{status:503,headers:{'Cache-Control':'no-store','X-Request-Id':requestId}});
  }
  response.headers.set('Cache-Control','no-store');response.headers.set('X-Request-Id',requestId);return response;
}
