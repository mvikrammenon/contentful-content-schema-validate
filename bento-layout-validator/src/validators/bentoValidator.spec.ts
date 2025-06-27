import { validateBentoLayout } from './bentoValidator';
import { ValidationConfig } from '../types';
import { EntryProps } from 'contentful-management/dist/typings/entities/entry';

// Mock EntryProps structure for testing
const createMockEntry = (id: string, contentTypeId: string): EntryProps => ({
  sys: {
    id,
    type: 'Entry',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    space: { sys: { type: 'Link', linkType: 'Space', id: 'mockSpace' } },
    environment: { sys: { type: 'Link', linkType: 'Environment', id: 'master' } },
    contentType: { sys: { type: 'Link', linkType: 'ContentType', id: contentTypeId } },
  },
  fields: {}, // Keep fields empty for simplicity in these tests
});


describe('validateBentoLayout', () => {
  const baseConfig: ValidationConfig = {
    layoutType: 'test-layout',
    targetContentType: 'TestContainer',
    validateField: ['testField'],
    positions: {
      pos1: { index: 0, allowedTypes: ['typeA'] },
      pos2: { index: 1, allowedTypes: ['typeB', 'typeC'] },
    },
    limits: {
      totalEntries: 2,
      typeLimits: {
        typeA: 1,
        typeB: 1,
        typeC: 1,
      },
    },
  };

  it('should return isValid: true for valid layout', () => {
    const entries: EntryProps[] = [
      createMockEntry('entry1', 'typeA'),
      createMockEntry('entry2', 'typeB'),
    ];
    const result = validateBentoLayout(baseConfig, entries);
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  // --- Total Entries ---
  it('should return error if totalEntries do not match', () => {
    const entries: EntryProps[] = [createMockEntry('entry1', 'typeA')];
    const result = validateBentoLayout(baseConfig, entries);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      message: `Expected ${baseConfig.limits.totalEntries} entries, but found ${entries.length}.`,
    });
  });

  it('should handle zero expected entries and zero provided entries', () => {
    const config: ValidationConfig = { ...baseConfig, limits: { ...baseConfig.limits, totalEntries: 0 } };
    const entries: EntryProps[] = [];
    const result = validateBentoLayout(config, entries);
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should return error if zero entries provided but more than zero expected', () => {
    const entries: EntryProps[] = [];
    const result = validateBentoLayout(baseConfig, entries);
    // This will also trigger position errors if positions are defined and totalEntries > 0
    // For this specific test, we focus on the scenario where the primary issue could be total entries mismatch.
    // The current validator logic might produce multiple errors (total + missing positions).
    // Let's check if at least the totalEntries error is present or if it's just position errors.
    // Given the current logic, if totalEntries is 2, and 0 entries are provided,
    // it will report a totalEntries mismatch AND missing entries for pos1 and pos2.
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      { message: `Expected ${baseConfig.limits.totalEntries} entries, but found 0.` },
      { message: `Missing entry at position 0 (pos1).` },
      { message: `Missing entry at position 1 (pos2).` },
    ]));
  });


  // --- Position Validation ---
  it('should return error for missing entry at a position', () => {
    const entries: EntryProps[] = [createMockEntry('entry1', 'typeA')]; // Missing entry for pos2
    const configWithStrictTotal: ValidationConfig = { ...baseConfig, limits: {...baseConfig.limits, totalEntries: 1 }};
    // To isolate the position error, we'd ideally want totalEntries to be 1.
    // However, if totalEntries is 2, and only 1 entry is provided, it will also fail totalEntries.
    // Let's test the original baseConfig.
    const result = validateBentoLayout(baseConfig, entries); // This will fail totalEntries AND missing pos2
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({ message: 'Missing entry at position 1 (pos2).' });
  });

  it('should return error for invalid content type at a position', () => {
    const entries: EntryProps[] = [
      createMockEntry('entry1', 'typeA'),
      createMockEntry('entry2', 'typeD'), // typeD is not allowed at pos2
    ];
    const result = validateBentoLayout(baseConfig, entries);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      message: "Invalid content type 'typeD' at position 1 (pos2). Allowed types: typeB, typeC.",
    });
  });

  it('should handle entry with missing contentType gracefully (though unlikely with fetched EntryProps)', () => {
    const entries: any[] = [ // Using 'any' to simulate malformed entry
      createMockEntry('entry1', 'typeA'),
      { sys: { id: 'entry2', contentType: null } } // Malformed entry
    ];
    const result = validateBentoLayout(baseConfig, entries as EntryProps[]);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
        message: 'Could not determine content type for entry at position 1 (pos2).',
    });
  });


  // --- Type Limits ---
  it('should return error if typeLimits are exceeded', () => {
    const entries: EntryProps[] = [
      createMockEntry('entry1', 'typeA'),
      createMockEntry('entry2', 'typeA'), // Exceeds typeA limit (max 1)
    ];
    const result = validateBentoLayout(baseConfig, entries);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      message: "Too many entries of type 'typeA'. Expected maximum 1, but found 2.",
    });
  });

  it('should pass if typeLimits are met, even if some types are not present', () => {
    const entries: EntryProps[] = [
      createMockEntry('entry1', 'typeA'),
      createMockEntry('entry2', 'typeB'),
    ];
    // typeC is allowed but not present, which is fine.
    const result = validateBentoLayout(baseConfig, entries);
    expect(result.isValid).toBe(true);
  });

  it('should handle typeLimits when typeLimits is not defined in config', () => {
    const configNoTypeLimits: ValidationConfig = {
      ...baseConfig,
      limits: { totalEntries: 2 }, // No typeLimits here
    };
    const entries: EntryProps[] = [
      createMockEntry('entry1', 'typeA'), // Valid for pos1
      createMockEntry('entry2', 'typeB'), // Valid for pos2 (allowed: typeB, typeC)
    ];
    const result = validateBentoLayout(configNoTypeLimits, entries);
    expect(result.isValid).toBe(true); // No typeLimits to fail, positions are fine
  });

  it('should handle typeLimits when a specific type in entries is not in typeLimits', () => {
    const configWithPartialTypeLimits: ValidationConfig = {
      ...baseConfig,
      limits: {
        totalEntries: 2,
        typeLimits: { typeA: 1 } // Only limit typeA
      },
    };
    const entries: EntryProps[] = [
      createMockEntry('entry1', 'typeA'),
      createMockEntry('entry2', 'typeB'), // typeB is not in typeLimits, should be allowed indefinitely by this rule
    ];
    const result = validateBentoLayout(configWithPartialTypeLimits, entries);
    expect(result.isValid).toBe(true);
  });


  // --- Edge Cases ---
  it('should return isValid: true if linkedEntries is null and totalEntries is 0', () => {
    const config: ValidationConfig = { ...baseConfig, limits: { totalEntries: 0 } };
    const result = validateBentoLayout(config, null);
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should return isValid: true if linkedEntries is undefined and totalEntries is 0', () => {
    const config: ValidationConfig = { ...baseConfig, limits: { totalEntries: 0 } };
    const result = validateBentoLayout(config, undefined);
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should return errors if linkedEntries is null but totalEntries > 0', () => {
    const result = validateBentoLayout(baseConfig, null); // totalEntries is 2 in baseConfig
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      // The message for totalEntries might vary if we decide to change behavior for null/undefined entries
      // Currently, it will say "found 0" because linkedEntries.length will be effectively 0
      { message: `Expected ${baseConfig.limits.totalEntries} entries, but found 0.`},
      { message: 'Missing entry at position 0 (pos1).'},
      { message: 'Missing entry at position 1 (pos2).'},
    ]));
  });

  it('should correctly validate when multiple errors are present', () => {
    const entries: EntryProps[] = [
      createMockEntry('entry1', 'typeD'), // Wrong type for pos1 (expected typeA)
      // Missing entry for pos2
    ];
    // This will also fail totalEntries, as 1 entry provided vs 2 expected
    const result = validateBentoLayout(baseConfig, entries);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBe(3); // totalEntries, wrong type for pos1, missing pos2
    expect(result.errors).toEqual(expect.arrayContaining([
      { message: `Expected ${baseConfig.limits.totalEntries} entries, but found ${entries.length}.` },
      { message: "Invalid content type 'typeD' at position 0 (pos1). Allowed types: typeA." },
      { message: 'Missing entry at position 1 (pos2).' },
    ]));
  });

});
