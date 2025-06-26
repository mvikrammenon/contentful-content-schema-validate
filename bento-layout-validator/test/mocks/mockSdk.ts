import { vi } from 'vitest';
import { FieldAppSDK } from '@contentful/app-sdk';

// Helper to create a more complete mock SDK specific to FieldAppSDK
// We can customize the return values of the vi.fn() mocks in our tests.
const createMockSdk = (): FieldAppSDK => {
  const mockFieldValue = vi.fn();
  const mockOnValueChangedCallback = vi.fn();

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
      app: 'test-app-id',
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
      getEntry: vi.fn().mockImplementation((id: string) => Promise.resolve({
        sys: { id, type: 'Entry', contentType: { sys: { id: 'unknown' } } }, // Default mock entry
        fields: {},
      })),
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
    _mockSpaceGetEntry: vi.fn(), // This will be reassigned to space.getEntry for easier spy/mockReturnValue
  };
};

// Create a default mock SDK instance to be used in tests
// Tests can then further customize this instance if needed.
const mockSdk = createMockSdk();
// Ensure space.getEntry is the same vi.fn instance as _mockSpaceGetEntry for easier test control
mockSdk.space.getEntry = mockSdk._mockSpaceGetEntry!;


export { mockSdk, createMockSdk }; // Export createMockSdk if tests need to create fresh instances
