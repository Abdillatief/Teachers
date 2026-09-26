import { PhotoScene } from "../types";
import arabFamilyHome169 from "../assets/images/arab_family_home_1789804328432.jpg";
import arabFamilyPortrait916 from "../assets/images/arab_family_portrait_1789804345436.jpg";

export const SCENES_DATA: PhotoScene[] = [
  {
    id: "cinematic-living-room-16-9",
    title: "The Focused Screen & The Mother's Care",
    subtitle: "Wide Advertising Still (16:9 Landscape)",
    aspectRatio: "16:9",
    imageUrl: arabFamilyHome169,
    description:
      "A realistic cinematic photo of an Arab family at home. An 8-year-old Arab boy sits comfortably on a modern beige sofa, deeply focused on his smartphone. Standing quietly behind him, his mother gazes downward with a concerned, loving, and thoughtful expression in an elegant modern modest Arabic home filled with soft natural daylight.",
    cinematicDetails: {
      lighting: "Soft directional morning light filtering through sheer curtains with warm amber bounce",
      cameraAngle: "Eye-level medium wide, shallow depth of field (f/2.2) centering the emotional tension",
      palette: "Warm desert sand, gentle taupe, soft cream, muted olive accents",
      focalDepth: "Crisp focal plane on the boy's focused gaze and phone screen, gentle drop-off to the mother",
      storyContext: "Modern digital childhood meets gentle parental contemplation in a tranquil Arabic household",
    },
    suggestedPrompt:
      "Cinematic slow camera track-in on an Arab family at home. An 8-year-old boy on a modern sofa stays deeply absorbed in his smartphone, while his mother behind him breathes a soft, thoughtful sigh and places a gentle comforting hand on the back of the sofa. Warm golden sun rays drift softly through the curtains, ultra photorealistic, 4k.",
  },
  {
    id: "cinematic-portrait-9-16",
    title: "Quiet Contemplation",
    subtitle: "Vertical Editorial Portrait (9:16 Portrait)",
    aspectRatio: "9:16",
    imageUrl: arabFamilyPortrait916,
    description:
      "Vertical cinematic portrait emphasizing the vertical emotional connection between the mother's thoughtful, protective stance and her 8-year-old son sitting on the sofa below, illuminated by the gentle ambient daylight and the soft glow of his device.",
    cinematicDetails: {
      lighting: "Subtle rim lighting catching hair edges, delicate daylight fill across the living room",
      cameraAngle: "Vertical 9:16 portrait framing with vertical leading lines of the architectural room",
      palette: "Rich warm ochre, warm off-white, honey wood tones",
      focalDepth: "Portrait compression with 85mm aesthetic lens rendering pleasing cinematic bokeh",
      storyContext: "Capturing the modern parental balance of nurturing guidance and technology awareness",
    },
    suggestedPrompt:
      "Vertical 9:16 cinematic video. An Arab mother in modest attire stands behind the living room sofa looking down thoughtfully at her 8-year-old son playing on a smartphone. The boy smiles at the screen, and the mother's expression softens with warm affection. Soft ambient interior light, photorealistic.",
  },
];

export const VEO_PRESET_PROMPTS = [
  {
    title: "Cinematic Push-in & Gentle Touch",
    prompt:
      "Cinematic slow push-in of an Arab family at home. An 8-year-old boy sits on a modern sofa deeply focused on his smartphone. His mother standing behind him gently rests a loving hand on the sofa edge, watching him with thoughtful care as warm afternoon sunlight glimmers through sheer curtains, photorealistic advertising film.",
    aspectRatio: "16:9" as const,
    tag: "Emotional Landscape",
  },
  {
    title: "Vertical Story: Mother & Son Moment",
    prompt:
      "Vertical 9:16 cinematic scene. In a modern modest Arab living room, an Arab mother looks concerned yet tenderly at her 8-year-old son engrossed in a phone. She steps closer and gently taps his shoulder; he looks up and beams a warm smile. Soft golden hour light, high-end commercial look.",
    aspectRatio: "9:16" as const,
    tag: "Vertical Portrait",
  },
  {
    title: "Subtle Living Room Atmosphere",
    prompt:
      "A slow, peaceful cinematic camera pan across a sunlit modern Arabic home. An 8-year-old boy is deeply focused on his smartphone on the couch while his mother stands behind him in quiet, loving contemplation. Sheer curtains flutter in a gentle breeze, soft ambient dust motes in warm sunlight.",
    aspectRatio: "16:9" as const,
    tag: "Ambient Film",
  },
  {
    title: "Shared Smile & Connection",
    prompt:
      "Realistic advertising film of an Arab mother and her 8-year-old son at home. The boy is initially glued to his phone screen, then turns to show his mother a funny drawing on the screen. The mother laughs warmly, leaning down. Warm natural lighting, 16:9 widescreen.",
    aspectRatio: "16:9" as const,
    tag: "Heartwarming",
  },
];
