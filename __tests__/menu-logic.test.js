/**
 * Unit tests for XenoMenu core logic (menu navigation, status shaping).
 * These are pure logic tests independent of Electron.
 */

'use strict';

// Simulated menu items (mirrors renderer)
const MENU_ITEMS = [
  { id: 'status', label: 'STATUS' },
  { id: 'launch', label: 'LAUNCH' },
  { id: 'inventory', label: 'INVENTORY' },
  { id: 'skills', label: 'SKILLS' },
  { id: 'config', label: 'CONFIG' },
  { id: 'about', label: 'ABOUT' },
  { id: 'exit', label: 'EXIT' }
];

function selectNext(current, delta, length) {
  return (current + delta + length) % length;
}

function shapeCpuStatus(rawLoad, cores) {
  const usage = Math.round(rawLoad || 0);
  return {
    name: 'PROCESSOR',
    usage,
    cores: cores || 0,
    hp: 100 - usage,
    maxHp: 100
  };
}

function shapeMemoryStatus(used, total) {
  const usage = total > 0 ? Math.round((used / total) * 100) : 0;
  return {
    name: 'MEMORY',
    usage,
    total: Math.round(total / (1024 * 1024 * 1024)),
    used: Math.round(used / (1024 * 1024 * 1024)),
    hp: 100 - usage,
    maxHp: 100
  };
}

function isSafePath(p) {
  if (typeof p !== 'string' || p.length > 1024) return false;
  if (/[;&|`$]/.test(p)) return false;
  return true;
}

describe('Menu navigation', () => {
  test('selectNext wraps correctly forward', () => {
    expect(selectNext(0, 1, 7)).toBe(1);
    expect(selectNext(6, 1, 7)).toBe(0);
  });

  test('selectNext wraps correctly backward', () => {
    expect(selectNext(0, -1, 7)).toBe(6);
    expect(selectNext(3, -1, 7)).toBe(2);
  });

  test('menu has expected commands', () => {
    expect(MENU_ITEMS).toHaveLength(7);
    expect(MENU_ITEMS.map(i => i.id)).toEqual(
      expect.arrayContaining(['status', 'launch', 'exit', 'config'])
    );
  });
});

describe('Status shaping (Xenogears-style HP)', () => {
  test('CPU high load reduces HP', () => {
    const s = shapeCpuStatus(85, 8);
    expect(s.usage).toBe(85);
    expect(s.hp).toBe(15);
    expect(s.cores).toBe(8);
  });

  test('CPU idle has full HP', () => {
    const s = shapeCpuStatus(0, 4);
    expect(s.hp).toBe(100);
  });

  test('Memory calculation', () => {
    const used = 8 * 1024 * 1024 * 1024; // 8 GB
    const total = 16 * 1024 * 1024 * 1024; // 16 GB
    const s = shapeMemoryStatus(used, total);
    expect(s.usage).toBe(50);
    expect(s.hp).toBe(50);
    expect(s.total).toBe(16);
    expect(s.used).toBe(8);
  });
});

describe('Security path checks', () => {
  test('rejects shell metacharacters', () => {
    expect(isSafePath('/tmp; rm -rf /')).toBe(false);
    expect(isSafePath('$(whoami)')).toBe(false);
    expect(isSafePath('path|pipe')).toBe(false);
  });

  test('accepts normal paths', () => {
    expect(isSafePath('/Users/prince/Documents')).toBe(true);
    expect(isSafePath('C:\\Users\\Prince\\Desktop')).toBe(true);
  });

  test('rejects overly long paths', () => {
    expect(isSafePath('a'.repeat(2000))).toBe(false);
  });
});
