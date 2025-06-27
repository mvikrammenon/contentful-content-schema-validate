import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import Field from './Field';
// import * as Mocks from '../../test/mocks'; // Import all exports from mocks - REMOVED FOR LOCAL createMockSdk
import { vi } from 'vitest';
import { ValidationConfig } from '../types';
import { EntryProps } from 'contentful-management/dist/typings/entities/entry';
import { FieldAppSDK } from '@contentful/app-sdk'; // Needed for local createMockSdk

// Helper to create a more complete mock SDK specific to FieldAppSDK
// We can customize the return values of the vi.fn() mocks in our tests.
const createMockSdk = (): FieldAppSDK => {
  const mockFieldValue = vi.fn();
  const mockOnValueChangedCallback = vi.fn();
  const anActualViFnForSpaceGetEntry = vi.fn(); // THE vi.fn() instance we will use

  return {
    // App event methods
    app: {
      onConfigure: vi.fn(),
      getParameters: vi.fn().mockResolvedValue({}), // Typically async
      setReady: vi.fn(),
      getCurrentState: vi.fn().mockReturnValue(null), // Or some default state
      isInstalled: vi.fn().mockResolvedValue(true), // Typically async
      onConfigurationCompleted: vi.fn(),
      setConfiguration: vi.fn(),
      patchInstallation: vi.fn()
    },
    // IDs
    ids: {
      app: 'test-app-id', // This will be used by the component tests
      field: 'test-field-id',
      entry: 'test-entry-id',
      contentType: 'test-contentType-id',
      space: 'test-space-id',
      environment: 'test-environment-id',
      user: 'test-user-id',
    } as any, // Cast to any to avoid listing all possible ids
    // Field API
    field: {
      id: 'test-field-id',
      locale: 'en-US',
      type: 'Array', // Default to a valid type for our component
      required: false,
      validations: [],
      items: {
        // Default to valid items type for our component
        type: 'Link',
        linkType: 'Entry',
        validations: [],
      },
      getValue: mockFieldValue,
      setValue: vi.fn().mockResolvedValue(undefined), // Typically async
      removeValue: vi.fn().mockResolvedValue(undefined), // Typically async
      onValueChanged: (callback: (value: any) => void) => {
        mockOnValueChangedCallback.mockImplementation(callback); // Store the callback
        return () => mockOnValueChangedCallback.mockReset(); // Return an unsubscribe function
      },
      onIsDisabledChanged: vi.fn(() => () => {}),
      onSchemaErrorsChanged: vi.fn(() => () => {}),
      setInvalid: vi.fn(),
    },
    // Entry API
    entry: {
      getSys: vi.fn().mockReturnValue({
        id: 'test-entry-id',
        type: 'Entry',
        version: 1,
        space: { sys: { type: 'Link', linkType: 'Space', id: 'test-space-id' } },
        environment: { sys: { type: 'Link', linkType: 'Environment', id: 'test-environment-id' } },
        contentType: { sys: { type: 'Link', linkType: 'ContentType', id: 'test-contentType-id' } },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      fields: {} as any, // Mock fields as needed
      onSysChanged: vi.fn(() => () => {}),
      onIsDisabledChanged: vi.fn(() => () => {}),
      onSchemaErrorsChanged: vi.fn(() => () => {}),
    } as any, // Cast to any to avoid exhaustive mocking
    // Space API
    space: {
      getEntry: anActualViFnForSpaceGetEntry, // Use the instance directly
      getEntries: vi.fn().mockResolvedValue({ items: [], total: 0, skip: 0, limit: 0 }),
      // ... other space methods if needed
    } as any, // Cast to any for brevity
    // Dialogs API
    dialogs: {
      selectSingleEntry: vi.fn(),
      selectMultipleEntries: vi.fn(),
      // ... other dialog methods
    } as any, // Cast for brevity
    // Navigator API
    navigator: {} as any, // Mock as needed
    // Notifier API
    notifier: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    },
    // Locales API
    locales: {
      available: ['en-US', 'de-DE'],
      default: 'en-US',
      optional: { 'en-US': false, 'de-DE': true },
      fallbacks: {},
    } as any, // Cast for brevity
    // Location API
    location: {
      is: vi.fn((location) => location === 'entry-field'), // Assume it's an entry field
    },
    // Parameters API
    parameters: {
      instance: {},
      installation: {},
    },
    // Window API
    window: {
      startAutoResizer: vi.fn(),
      stopAutoResizer: vi.fn(),
      updateHeight: vi.fn(),
    },
    // CMA is available via useCMA, but if sdk.cma were used:
    cma: {} as any, // Mock CMA if used directly via sdk.cma
    // Access API
    access: {
      can: vi.fn().mockResolvedValue(true), // Typically async
    } as any, // Cast for brevity
    // user API
    user: {
      sys: { id: 'test-user-id', type: 'User' },
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      avatarUrl: '',
      spaceMembership: {
        sys: { id: 'test-space-membership-id', type: 'SpaceMembership' },
        admin: false,
        roles: [],
      }
    } as any, // Cast for brevity

    // Store the mock functions directly for easier access in tests
    _mockFieldGetValue: mockFieldValue,
    _mockOnValueChanged: mockOnValueChangedCallback,
    _mockSpaceGetEntry: anActualViFnForSpaceGetEntry, // Ensure _mockSpaceGetEntry points to the same instance
  };
  return returnValue;
};
// No need for the default mockSdk from the external file anymore if createMockSdk is local
// const mockSdk = createMockSdk();
// mockSdk.space.getEntry = mockSdk._mockSpaceGetEntry!;


// Mock the actual validator to ensure we are testing Field.tsx's interaction
// and not re-testing the validator's logic here.
// However, for these tests, we want to test the integration, so we use the real validator.
// If Field.tsx had more complex logic *around* the validator, we might mock it.
// vi.mock('../validators/bentoValidator');

vi.mock('@contentful/react-apps-toolkit', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    useSDK: () => mockSdk, // Use the global mockSdk instance by default
  };
});

// Global mockSdk instance that can be modified by tests
let mockSdk: any;

// Helper to create mock Contentful EntryProps for use in tests
const createMockContentfulEntry = (id: string, contentTypeId: string): Partial<EntryProps> => ({
  sys: {
    id,
    type: 'Entry',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    locale: 'en-US',
    version: 1,
    space: { sys: { type: 'Link', linkType: 'Space', id: 'mockSpace' } },
    environment: { sys: { type: 'Link', linkType: 'Environment', id: 'master' } },
    contentType: { sys: { type: 'Link', linkType: 'ContentType', id: contentTypeId } },
  } as any, // Cast to any for sys to avoid full sys mocking
  fields: {}, // Keep fields empty for simplicity
});

const bento12Config: ValidationConfig = {
  layoutType: 'bento-1-2',
  targetContentType: 'CardsContainer',
  validateField: ['contentCards'],
  positions: {
    leftColumnFullHeightCard: { index: 0, allowedTypes: ['CardTypeA'] },
    rightColumnTopCard: { index: 1, allowedTypes: ['CardTypeB', 'CardTypeC'] },
    rightColumnBottomCard: { index: 2, allowedTypes: ['CardTypeB'] },
  },
  limits: {
    totalEntries: 3,
    typeLimits: {
      CardTypeA: 1,
      CardTypeB: 2,
      CardTypeC: 1,
    },
  },
};

declare global {
  interface Window { __TEST_VALIDATION_CONFIG__?: ValidationConfig; }
}

describe('Field Component Validation', () => {
  beforeEach(() => {
    // Reset mockSdk instance for each test to ensure isolation
    mockSdk = createMockSdk(); // Now using the local version
    // The vi.mock for @contentful/react-apps-toolkit is already set up globally.
    // We just need to ensure our global mockSdk instance is fresh for each test.

    window.__TEST_VALIDATION_CONFIG__ = undefined; // Reset test config override
    mockSdk.field.type = 'Array';
    mockSdk.field.items = { type: 'Link', linkType: 'Entry' };
  });

  afterEach(() => {
    vi.restoreAllMocks(); // Restore all mocks after each test
    window.__TEST_VALIDATION_CONFIG__ = undefined;
  });

  const renderComponent = () => render(<Field />);

  describe('With bento-1-2 Configuration', () => {
    beforeEach(() => {
      window.__TEST_VALIDATION_CONFIG__ = bento12Config;
    });

    it('Scenario 1.1 (Valid): should display success for a valid layout', async () => {
      const linkedEntries = [
        { sys: { id: 'entryA1' } },
        { sys: { id: 'entryB1' } },
        { sys: { id: 'entryB2' } },
      ];
      mockSdk._mockFieldGetValue.mockReturnValue(linkedEntries);
      mockSdk._mockSpaceGetEntry
        .mockResolvedValueOnce(createMockContentfulEntry('entryA1', 'CardTypeA'))
        .mockResolvedValueOnce(createMockContentfulEntry('entryB1', 'CardTypeB'))
        .mockResolvedValueOnce(createMockContentfulEntry('entryB2', 'CardTypeB'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Bento layout validation passed.')).toBeInTheDocument();
      });
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument(); // No error textarea
    });

    it('Scenario 1.2 (Invalid - Wrong Content Type): should display error for wrong content type', async () => {
      const linkedEntries = [
        { sys: { id: 'entryA1' } },
        { sys: { id: 'entryC1' } }, // Should be CardTypeB or CardTypeC, let's make it CardTypeA
        { sys: { id: 'entryB1' } },
      ];
      mockSdk._mockFieldGetValue.mockReturnValue(linkedEntries);
      mockSdk._mockSpaceGetEntry
        .mockResolvedValueOnce(createMockContentfulEntry('entryA1', 'CardTypeA'))
        .mockResolvedValueOnce(createMockContentfulEntry('entryC1', 'CardTypeA')) // Invalid here
        .mockResolvedValueOnce(createMockContentfulEntry('entryB1', 'CardTypeB'));

      renderComponent();

      await waitFor(() => {
        const errorTextarea = screen.getByRole('textbox');
        expect(errorTextarea).toBeInTheDocument();
        // expect(errorTextarea).toHaveValue(expect.stringContaining("Invalid content type 'CardTypeA' at position 1 (rightColumnTopCard). Allowed types: CardTypeB, CardTypeC."));
        const value = (errorTextarea as HTMLTextAreaElement).value;
        const expectedSubstring = "Invalid content type 'CardTypeA' at position 1 (rightColumnTopCard). Allowed types: CardTypeB, CardTypeC.";
        expect(value.includes(expectedSubstring)).toBe(true);
      });
    });

    it('Scenario 1.3 (Invalid - Incorrect Total Count): should display error for wrong total count', async () => {
      const linkedEntries = [
        { sys: { id: 'entryA1' } },
        { sys: { id: 'entryB1' } },
      ]; // Expected 3, got 2
      mockSdk._mockFieldGetValue.mockReturnValue(linkedEntries);
      mockSdk._mockSpaceGetEntry
        .mockResolvedValueOnce(createMockContentfulEntry('entryA1', 'CardTypeA'))
        .mockResolvedValueOnce(createMockContentfulEntry('entryB1', 'CardTypeB'));

      renderComponent();

      await waitFor(() => {
        const errorTextarea = screen.getByRole('textbox');
        expect(errorTextarea).toBeInTheDocument();
        const value = (errorTextarea as HTMLTextAreaElement).value;
        expect(value.includes("Expected 3 entries, but found 2.")).toBe(true);
        // It will also show missing entry for the 3rd position
        expect(value.includes("Missing entry at position 2 (rightColumnBottomCard).")).toBe(true);
      });
    });

    it('Scenario 1.4 (Invalid - Type Limit Exceeded): should display error for type limit exceeded', async () => {
      const linkedEntries = [
        { sys: { id: 'entryA1' } },
        { sys: { id: 'entryA2' } }, // CardTypeA limit is 1
        { sys: { id: 'entryB1' } },
      ];
      mockSdk._mockFieldGetValue.mockReturnValue(linkedEntries);
      mockSdk._mockSpaceGetEntry
        .mockResolvedValueOnce(createMockContentfulEntry('entryA1', 'CardTypeA'))
        .mockResolvedValueOnce(createMockContentfulEntry('entryA2', 'CardTypeA'))
        .mockResolvedValueOnce(createMockContentfulEntry('entryB1', 'CardTypeB'));

      renderComponent();

      await waitFor(() => {
        const errorTextarea = screen.getByRole('textbox');
        expect(errorTextarea).toBeInTheDocument();
        const value = (errorTextarea as HTMLTextAreaElement).value;
        expect(value.includes("Too many entries of type 'CardTypeA'. Expected maximum 1, but found 2.")).toBe(true);
      });
    });
  });

  it('Test Case 2: Field is not a valid reference field (wrong field type)', async () => {
    mockSdk.field.type = 'Symbol'; // Not an Array
    mockSdk._mockFieldGetValue.mockReturnValue(null);

    renderComponent();

    await waitFor(() => {
      const errorTextarea = screen.getByRole('textbox');
      expect(errorTextarea).toBeInTheDocument();
      const value = (errorTextarea as HTMLTextAreaElement).value;
      expect(value.includes("This validator is intended for multiple entry reference fields.")).toBe(true);
    });
  });

  it('Test Case 2: Field is not a valid reference field (wrong item linkType)', async () => {
    mockSdk.field.items = { type: 'Link', linkType: 'Asset' }; // Not Entry linkType
    mockSdk._mockFieldGetValue.mockReturnValue(null);

    renderComponent();

    await waitFor(() => {
      const errorTextarea = screen.getByRole('textbox');
      expect(errorTextarea).toBeInTheDocument();
      const value = (errorTextarea as HTMLTextAreaElement).value;
      expect(value.includes("This validator is intended for multiple entry reference fields.")).toBe(true);
    });
  });

  it('Test Case 3: Error fetching entries', async () => {
    const linkedEntries = [{ sys: { id: 'entryA1' } }];
    mockSdk._mockFieldGetValue.mockReturnValue(linkedEntries);
    mockSdk._mockSpaceGetEntry.mockRejectedValueOnce(new Error('Fetch failed'));

    renderComponent();

    await waitFor(() => {
      const errorTextarea = screen.getByRole('textbox');
      expect(errorTextarea).toBeInTheDocument();
      const value = (errorTextarea as HTMLTextAreaElement).value;
      expect(value.includes("Error fetching linked entry details for validation.")).toBe(true);
    });
  });

  it('Test Case 4: No linked entries (empty field) when entries are expected', async () => {
    window.__TEST_VALIDATION_CONFIG__ = bento12Config; // Expects 3 entries
    mockSdk._mockFieldGetValue.mockReturnValue(null); // No entries

    renderComponent();

    await waitFor(() => {
      const errorTextarea = screen.getByRole('textbox');
      expect(errorTextarea).toBeInTheDocument();
      const value = (errorTextarea as HTMLTextAreaElement).value;
      expect(value.includes("Expected 3 entries, but found 0.")).toBe(true);
      expect(value.includes("Missing entry at position 0 (leftColumnFullHeightCard).")).toBe(true);
    });
  });

  it('Test Case 5: Re-validation on value change', async () => {
    window.__TEST_VALIDATION_CONFIG__ = bento12Config;

    // Initial state: Valid
    const initialLinkedEntries = [
      { sys: { id: 'entryA1' } }, { sys: { id: 'entryB1' } }, { sys: { id: 'entryB2' } },
    ];
    mockSdk._mockFieldGetValue.mockReturnValue(initialLinkedEntries);
    mockSdk._mockSpaceGetEntry
      .mockResolvedValueOnce(createMockContentfulEntry('entryA1', 'CardTypeA'))
      .mockResolvedValueOnce(createMockContentfulEntry('entryB1', 'CardTypeB'))
      .mockResolvedValueOnce(createMockContentfulEntry('entryB2', 'CardTypeB'));

    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Bento layout validation passed.')).toBeInTheDocument();
    });

    // Simulate value change to an invalid state
    const newLinkedEntries = [{ sys: { id: 'entryX1' } }]; // Invalid: too few, wrong type potentially
    mockSdk._mockSpaceGetEntry.mockReset(); // Reset for new calls
    mockSdk._mockSpaceGetEntry
        .mockResolvedValueOnce(createMockContentfulEntry('entryX1', 'CardTypeX')); // Some other type

    // Act: Simulate Contentful calling the onValueChanged callback
    await act(async () => {
      // The callback is stored in mockSdk._mockOnValueChanged by the Field component's useEffect
      mockSdk._mockOnValueChanged(newLinkedEntries);
    });

    await waitFor(() => {
      const errorTextarea = screen.getByRole('textbox');
      expect(errorTextarea).toBeInTheDocument();
      const value = (errorTextarea as HTMLTextAreaElement).value;
      expect(value.includes("Expected 3 entries, but found 1.")).toBe(true);
      expect(value.includes("Invalid content type 'CardTypeX' at position 0 (leftColumnFullHeightCard).")).toBe(true);
    });
  });
});
