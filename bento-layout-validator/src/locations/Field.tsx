import React, { useEffect, useState } from 'react';
import { Paragraph, Textarea } from '@contentful/f36-components';
import { FieldAppSDK } from '@contentful/app-sdk';
import { useSDK } from '@contentful/react-apps-toolkit';
import { validateBentoLayout } from '../validators/bentoValidator';
import { ValidationConfig, ValidationError } from '../types';
import { EntryProps } from 'contentful-management/dist/typings/entities/entry';

// Allow tests to override config
declare global {
  interface Window { __TEST_VALIDATION_CONFIG__?: ValidationConfig; }
}

// Define a sample configuration for now
// In a real scenario, this would come from app config or content type settings
const DEFAULT_CONFIG: ValidationConfig = {
  layoutType: 'bento-1-2',
  targetContentType: 'CardsContainer', // This should match the content type of the entry being edited
  validateField: ['contentCards'], // This should match the field ID where this component is used
  positions: {
    leftColumnFullHeightCard: { index: 0, allowedTypes: ['cardTypeA'] },
    rightColumnTopCard: { index: 1, allowedTypes: ['cardTypeB', 'cardTypeC'] },
    rightColumnBottomCard: { index: 2, allowedTypes: ['cardTypeB'] },
  },
  limits: {
    totalEntries: 3,
    typeLimits: {
      cardTypeA: 1,
      cardTypeB: 2,
      cardTypeC: 1,
    },
  },
};

const getConfig = (): ValidationConfig => (typeof window !== 'undefined' && window.__TEST_VALIDATION_CONFIG__) || DEFAULT_CONFIG;

const Field = () => {
  const sdk = useSDK<FieldAppSDK>();
  const [errors, setErrors] = useState<ValidationError[]>([]);

  // Function to run validation
  const runValidation = async (currentValue: any) => {
    // Ensure the field is a multiple entries reference field
    if (sdk.field.type !== 'Array' || sdk.field.items?.type !== 'Link' || sdk.field.items?.linkType !== 'Entry') {
      // Not a reference field that we can validate for bento layout
      // Or, we can show a message that this app only works on multi-entry reference fields
      setErrors([{ message: "This validator is intended for multiple entry reference fields." }]);
      return;
    }

    const linkedEntryIds: { sys: { id: string } }[] = currentValue || [];

    if (!linkedEntryIds || linkedEntryIds.length === 0) {
      // Validate with empty array if no entries are linked yet
      const result = validateBentoLayout(getConfig(), []);
      setErrors(result.errors);
      return;
    }

    try {
      // Fetch the full linked entries.
      // Note: sdk.space.getEntries() might be better if we need to fetch many entries
      // and their content types are not directly available on the link objects.
      // For simplicity, we'll assume for now that content type info might be part of the link
      // or we might need to adjust `getContentTypeIdFromLink` or fetch full entries.
      // The `EntryProps` from contentful-management might not be what `sdk.field.getValue()` returns directly for links.
      // This part needs careful handling of how linked entries are fetched and what data they contain.

      // Let's simulate fetching entries and their content types for now.
      // This is a placeholder. In a real app, you'd use sdk.space.getEntries() or similar.
      const fetchedEntries: EntryProps[] = await Promise.all(
        linkedEntryIds.map(async (link) => {
          // This is a simplified mock. `sdk.space.getEntry` would be the actual call.
          // The `getContentTypeIdFromLink` function expects a certain structure.
          // If `sdk.field.getValue()` returns links that don't have contentType info directly,
          // we MUST fetch the full entry.
          const entry = await sdk.space.getEntry<EntryProps>(link.sys.id);
          return entry;
        })
      );

      const result = validateBentoLayout(getConfig(), fetchedEntries);
      setErrors(result.errors);

    } catch (error) {
      console.error("Error fetching linked entries:", error);
      setErrors([{ message: "Error fetching linked entry details for validation." }]);
    }
  };

  useEffect(() => {
    // Run validation on initial load
    runValidation(sdk.field.getValue());

    // Subscribe to field value changes
    const unsubscribe = sdk.field.onValueChanged((value) => {
      runValidation(value);
    });

    // Cleanup subscription on component unmount
    return () => unsubscribe();
  }, [sdk.field, sdk.space]); // Added sdk.space as a dependency due to its use in runValidation

  // Adjusting layout for better visibility of errors
  return (
    <div>
      <Paragraph>
        Field: {sdk.field.id} (AppId: {sdk.ids.app})
      </Paragraph>
      {/* Default field editor can be rendered here if needed using sdk.field.set méthod */}
      {/* For now, we'll just display validation errors */}
      {errors.length > 0 && (
        <Textarea
          isReadOnly
          value={errors.map((err) => `- ${err.message}`).join('\\n')}
          style={{ marginTop: '10px', color: 'red', minHeight: '80px' }} // Basic styling for errors
        />
      )}
      {errors.length === 0 && (
         <Paragraph style={{ marginTop: '10px', color: 'green' }}>
           Bento layout validation passed.
         </Paragraph>
      )}
    </div>
  );
};

export default Field;
