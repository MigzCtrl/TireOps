import { describe, it, expect } from 'vitest';
import { cn, formatTime } from './utils';

describe('cn utility', () => {
  it('merges class names correctly', () => {
    expect(cn('px-2', 'py-3')).toBe('px-2 py-3');
  });

  it('handles conditional classes', () => {
    expect(cn('base', true && 'active', false && 'inactive')).toBe('base active');
  });

  it('merges tailwind classes correctly', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});

describe('formatTime', () => {
  it('returns empty string for null input', () => {
    expect(formatTime(null)).toBe('');
  });

  it('returns empty string for empty string input', () => {
    expect(formatTime('')).toBe('');
  });

  it('formats morning time correctly', () => {
    expect(formatTime('09:30')).toBe('9:30am');
  });

  it('formats noon correctly', () => {
    expect(formatTime('12:00')).toBe('12:00pm');
  });

  it('formats afternoon time correctly', () => {
    expect(formatTime('14:30')).toBe('2:30pm');
  });

  it('formats midnight correctly', () => {
    expect(formatTime('00:00')).toBe('12:00am');
  });

  it('formats 11pm correctly', () => {
    expect(formatTime('23:45')).toBe('11:45pm');
  });
});
