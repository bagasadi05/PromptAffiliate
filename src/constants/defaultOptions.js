/**
 * Shared default options used by both gemini.js service and AdvancedOptions component.
 * Single source of truth to prevent drift between the two.
 */
export const DEFAULT_OPTIONS = {
    productName: '',
    targetAudience: '',
    keySellingPoints: '',
    mustInclude: '',
    avoidElements: '',
    sceneMustIncludeMap: '',
    outputLanguage: 'EN',
    subjectDescription: '',
    creativity: 85,
    realismLevel: 'Med',
    cameraDistance: 'medium',
    background: 'keep from reference',
    lighting: 'soft daylight',
    includeNegativePrompt: true,
    sceneCount: 4,
    voiceStyle: 'none',
    voiceCharacter: 'auto',
    customVoiceCharacter: '',
    voiceLanguage: 'ID',
    voiceScriptMode: 'manual',
    voiceScript: '',
    customInstructions: '',
    aspectRatio: '9:16',
    targetDuration: null,
    systemPromptTemplate: null,
    // Cinematic Product Hook (Pro-Level)
    cinematicMode: false,
    cameraMovement: 'auto',
    microExpressions: 'auto',
    productInteraction: '',
    renderQuality: '4k',
    // Affiliate Intelligence Options
    platformTarget: 'tiktok',
    conversionGoal: 'purchase',
    psychologyTrigger: 'auto',
    hookStrength: 'medium',
    hookFormula: null,
};
