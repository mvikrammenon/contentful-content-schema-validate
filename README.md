# contentful-content-schema-validate
A field level validator of JSON schema


## Core Functionality:
Due to content model validation limitations, retro fitting content entries with additional validations based on new dynamic bentobox like visual format - this contentful app can assist with adding validations retro actively.

So given a content entry that can reference other content entries, say Card Container with individual cards, given a config as provided below, where the cards have to be displayed as dynamic bento box layout, a simple validation can be done on the fly to verify if the created content follows the validations. This is not enforced, only verifies and provides a soft warning within the content creation interface. Could be extended to enforce or highlight individual content fields. 

### Example Config: 
[
 {
  layoutType: 'bento-1-2',
  targetContentType: 'CardsContainer',
  validateField: ['ContentCards'],
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
 },
 {
  layoutType: 'bento-2-1',
  ....
 }
];

Bento Layout Validation: The primary use case is to validate collections of linked content entries (referred to as "cards") against a specific layout definition. This is useful for complex UI patterns like Bento Grids, carousels, or structured promotional sections.
Configurable Rules: Validations are provided within the target content type as a JSON object - hence multiple content type can be validated in different ways. Can be extended to provide a JSON object during the app's installation parameters.

### JSON specifications:
**positions**: Rules for each card slot, including its index and an array of allowedTypes (allowed content type IDs).
**limits**: Overall constraints, such as the totalEntries expected and typeLimits (maximum count for specific content types across all cards).


Real-time Feedback: The validator runs directly within the Contentful entry editor, providing immediate visual feedback (success messages or specific error details) below the relevant field.
Automatic Re-validation: It automatically re-validates when the linked references in the configured field are changed.
Technical Details:


