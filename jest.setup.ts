import '@testing-library/jest-dom/jest-globals';

// Polyfill TextEncoder/TextDecoder for Node test environment (used by server-auth.ts)
import { TextEncoder, TextDecoder } from 'util';
Object.assign(global, { TextEncoder, TextDecoder });
