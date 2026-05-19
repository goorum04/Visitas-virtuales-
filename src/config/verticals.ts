import type { Vertical, VerticalConfig } from '../types/index.js';

export const VERTICAL_CONFIGS: Record<Vertical, VerticalConfig> = {
  real_estate: {
    name: 'Real Estate',
    description: 'Virtual property tours',
    tagline: 'Virtual tours that sell homes',
    features: ['floor_plan', 'measurements', 'walkthrough', 'ambient_audio'],
    exportFormats: ['glb', 'gltf', 'obj'],
    aiPrompt:
      'Generate a detailed 3D property tour with floor plan, room measurements, and immersive walkthrough. Focus on spatial accuracy and lighting.',
    postProcessing: ['extractFloorPlan', 'calculateDimensions', 'optimizeForViewer'],
  },

  museum: {
    name: 'Museum',
    description: 'Exhibit digitization',
    tagline: 'Digitize your exhibits in minutes',
    features: ['hotspots', 'audio_guide', 'multilang', 'info_panels'],
    exportFormats: ['glb', 'gltf'],
    aiPrompt:
      'Create an interactive museum exhibit with information hotspots, audio guide integration, and multi-language support. Preserve artifact detail.',
    postProcessing: ['detectArtifacts', 'createHotspots', 'addAudioMarkers'],
  },

  gamedev: {
    name: 'Game Development',
    description: 'Game-ready assets',
    tagline: 'Game-ready assets from photos',
    features: ['lod_levels', 'pbr_materials', 'colliders', 'export_unreal', 'export_unity'],
    exportFormats: ['fbx', 'uasset', 'glb'],
    aiPrompt:
      'Generate game-ready 3D assets with proper PBR materials, LOD levels, and collision meshes. Optimize polygon count for real-time rendering.',
    postProcessing: ['generateLODs', 'createPBRMaterials', 'addColliders', 'exportToEngines'],
  },

  events: {
    name: 'Events',
    description: 'Event capture and sharing',
    tagline: 'Capture & share your event in 3D',
    features: ['web_viewer', 'embed_code', 'analytics', 'social_sharing'],
    exportFormats: ['glb', 'gltf'],
    aiPrompt:
      'Create a shareable 3D environment for event documentation with embedded viewer and analytics tracking.',
    postProcessing: ['optimizeForWeb', 'createEmbedViewer', 'setupAnalytics'],
  },

  retail: {
    name: 'Retail / F&B',
    description: '360° product showcase',
    tagline: '360° product showcase online',
    features: ['rotation_360', 'product_tags', 'seo_optimization', 'shopify_integration'],
    exportFormats: ['glb', 'webp_360'],
    aiPrompt:
      'Generate a 360° product showcase with product tagging and SEO-optimized output for e-commerce platforms.',
    postProcessing: ['isolateProducts', 'create360Rotation', 'addProductTags'],
  },

  architecture: {
    name: 'Architecture',
    description: 'Architectural visualization',
    tagline: 'From sketch to render to reality',
    features: ['photorealistic_renders', 'material_library', 'lighting_presets', 'client_portal'],
    exportFormats: ['glb', 'fbx', 'uasset'],
    aiPrompt:
      'Create photorealistic architectural visualization with accurate materials, lighting, and multiple camera perspectives.',
    postProcessing: ['detectMaterials', 'generateRenders', 'createLightingPresets'],
  },
};

export function getVerticalConfig(vertical: Vertical): VerticalConfig {
  return VERTICAL_CONFIGS[vertical];
}

export const ALL_VERTICALS: Vertical[] = Object.keys(VERTICAL_CONFIGS) as Vertical[];
