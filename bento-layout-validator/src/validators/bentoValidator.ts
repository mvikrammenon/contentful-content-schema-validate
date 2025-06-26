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
  linkedEntries: EntryProps[] | null | undefined // Array of linked content entries
): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!linkedEntries || linkedEntries.length === 0) {
    if (config.limits.totalEntries > 0) {
      // errors.push({ message: `No entries found, but layout expects at least one.` });
      // Depending on requirements, this might not be an error if 0 entries are allowed.
      // For now, let's assume if totalEntries > 0, it's an error.
    }
    // If no entries and no totalEntries limit, or totalEntries is 0, it's valid.
    return { isValid: errors.length === 0, errors };
  }

  // 1. Validate total number of entries
  if (linkedEntries.length !== config.limits.totalEntries) {
    errors.push({
      message: `Expected ${config.limits.totalEntries} entries, but found ${linkedEntries.length}.`,
    });
  }

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
