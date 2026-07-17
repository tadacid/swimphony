export const PERFORMANCE_PRESET_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "name",
    "description",
    "root",
    "scale",
    "bpm",
    "octaveRange",
    "synth",
    "light",
    "safety",
  ],
  properties: {
    name: { type: "string", minLength: 1, maxLength: 60 },
    description: { type: "string", minLength: 1, maxLength: 180 },
    root: {
      type: "string",
      enum: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
    },
    scale: {
      type: "string",
      enum: ["major_pentatonic", "minor_pentatonic", "dorian", "major", "minor"],
    },
    bpm: { type: "number", minimum: 40, maximum: 140 },
    octaveRange: {
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: { type: "integer", minimum: 2, maximum: 6 },
    },
    synth: {
      type: "object",
      additionalProperties: false,
      required: [
        "oscillator",
        "attack",
        "release",
        "reverb",
        "filterMinHz",
        "filterMaxHz",
      ],
      properties: {
        oscillator: {
          type: "string",
          enum: ["sine", "triangle", "sawtooth", "square"],
        },
        attack: { type: "number", minimum: 0.01, maximum: 3 },
        release: { type: "number", minimum: 0.05, maximum: 8 },
        reverb: { type: "number", minimum: 0, maximum: 0.8 },
        filterMinHz: { type: "number", minimum: 120, maximum: 4000 },
        filterMaxHz: { type: "number", minimum: 800, maximum: 12000 },
      },
    },
    light: {
      type: "object",
      additionalProperties: false,
      required: [
        "hueRange",
        "saturationRange",
        "brightnessRange",
        "transitionMs",
      ],
      properties: {
        hueRange: {
          type: "array",
          minItems: 2,
          maxItems: 2,
          items: { type: "number", minimum: 0, maximum: 360 },
        },
        saturationRange: {
          type: "array",
          minItems: 2,
          maxItems: 2,
          items: { type: "number", minimum: 0, maximum: 100 },
        },
        brightnessRange: {
          type: "array",
          minItems: 2,
          maxItems: 2,
          items: { type: "number", minimum: 8, maximum: 60 },
        },
        transitionMs: { type: "integer", minimum: 1200, maximum: 6000 },
      },
    },
    safety: {
      type: "object",
      additionalProperties: false,
      required: [
        "maxNotesPerSecond",
        "maxGain",
        "maxBrightness",
        "minLightTransitionMs",
      ],
      properties: {
        maxNotesPerSecond: { type: "number", minimum: 0.5, maximum: 8 },
        maxGain: { type: "number", minimum: 0.05, maximum: 0.75 },
        maxBrightness: { type: "number", minimum: 15, maximum: 60 },
        minLightTransitionMs: { type: "integer", minimum: 1200, maximum: 6000 },
      },
    },
  },
} as const;
