import { z } from 'zod';

// The customer CSP forbids eval. Disable Zod's optional JIT before browser
// validation starts, including its eval probe; keep the same validation rules.
z.config({ jitless: true });
