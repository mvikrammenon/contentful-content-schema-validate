import { ValidationConfig, ValidationResult, ValidationError } from '../types';
import { EntryProps } from 'contentful-management/dist/typings/entities/entry'; // Using EntryProps for linked entries

// Helper to get content type ID from an entry link
const getContentTypeIdFromLink = (entry: any): string | null => {
  // Assuming the linked entry structure provides content type information
  // This might need adjustment based on actual Contentful SDK response
  if (entry && entry.sys && entry.sys.contentType && entry.sys.contentType.sys && entry.sys.contentType.sys.id) {
    return entry.sys.contentType.sys.id;
  }
  return null;
};

export const validateBentoLayout = (
  config: ValidationConfig,
  linkedEntriesInput: EntryProps[] | null | undefined // Array of linked content entries
): ValidationResult => {
  const errors: ValidationError[] = [];
  const linkedEntries = linkedEntriesInput || []; // Normalize to empty array if null/undefined

  // 1. Validate total number of entries
  // This check handles cases:
  // - Correct number of entries
  // - Too few entries (including 0 when more are expected)
  // - Too many entries
  if (linkedEntries.length !== config.limits.totalEntries) {
    errors.push({
      message: `Expected ${config.limits.totalEntries} entries, but found ${linkedEntries.length}.`,
    });
  }

  // Early exit if totalEntries is 0 and linkedEntries is also 0 (valid case, no further checks needed)
  // Also, if totalEntries check failed AND no entries were provided, no point in checking positions or type limits.
  if (config.limits.totalEntries === 0 && linkedEntries.length === 0) {
    return { isValid: errors.length === 0, errors }; // errors should be empty here
  }

  // If there's a total entry mismatch and no entries are present, further checks for positions are not super useful
  // but the current structure runs them. This is acceptable.

  // 2. Validate positions and allowed content types
  for (const positionKey in config.positions) {
    const positionRule = config.positions[positionKey];
    const entryAtIndex = linkedEntries[positionRule.index];

    if (!entryAtIndex) {
      errors.push({
        message: `Missing entry at position ${positionRule.index} (${positionKey}).`,
      });
      continue; // Skip further checks for this position if entry is missing
    }

    const entryContentTypeId = getContentTypeIdFromLink(entryAtIndex);

    if (!entryContentTypeId) {
      errors.push({
        message: `Could not determine content type for entry at position ${positionRule.index} (${positionKey}).`,
      });
      continue;
    }

    if (!positionRule.allowedTypes.includes(entryContentTypeId)) {
      errors.push({
        message: `Invalid content type '${entryContentTypeId}' at position ${positionRule.index} (${positionKey}). Allowed types: ${positionRule.allowedTypes.join(', ')}.`,
      });
    }
  }

  // 3. Validate type limits (if specified)
  if (config.limits.typeLimits) {
    const contentTypeCounts: { [key: string]: number } = {};
    linkedEntries.forEach(entry => {
      const entryContentTypeId = getContentTypeIdFromLink(entry);
      if (entryContentTypeId) {
        contentTypeCounts[entryContentTypeId] = (contentTypeCounts[entryContentTypeId] || 0) + 1;
      }
    });

    for (const typeKey in config.limits.typeLimits) {
      const limit = config.limits.typeLimits[typeKey];
      const count = contentTypeCounts[typeKey] || 0;
      if (count > limit) {
        errors.push({
          message: `Too many entries of type '${typeKey}'. Expected maximum ${limit}, but found ${count}.`,
        });
      }
    }
  }

  return { isValid: errors.length === 0, errors };
};
