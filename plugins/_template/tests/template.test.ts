import { describe, expect, it } from 'vitest';
import { __PLUGIN_EXPORT__ } from '../src/index.js';

describe('__PLUGIN_EXPORT__()', () => {
    it('should create middleware', () => {
        expect(typeof __PLUGIN_EXPORT__()).toBe('function');
    });
});
