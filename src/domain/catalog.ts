import type { Attribute } from "./assignment";
export type Quest = {
  id: string;
  title: string;
  instructions: string;
  attribute: Attribute;
  effort: "light" | "standard" | "deep";
  xp: number;
  focusTags: string[];
  repeatable: boolean;
  version: number;
  catalogVersion: number;
};
const authored: Record<
  Attribute,
  [string, string, "light" | "standard" | "deep", boolean][]
> = {
  Strength: [
    [
      "Gentle mobility",
      "Spend five minutes moving your shoulders, wrists and ankles through a comfortable range. Stay seated if preferred. Stop if anything hurts.",
      "light",
      true,
    ],
    [
      "Build a movement habit",
      "Choose a comfortable movement such as walking or seated stretches. Practice for ten minutes at your own pace, with breaks whenever needed.",
      "standard",
      true,
    ],
    [
      "A steady posture break",
      "Take three short posture breaks today. Relax your shoulders, change position and gently stretch only within a pain-free range.",
      "light",
      true,
    ],
    [
      "Plan your movement space",
      "Spend fifteen minutes setting up a clear, safe place for movement. Remove trip hazards and choose one accessible activity for tomorrow.",
      "standard",
      false,
    ],
    [
      "Practice with patience",
      "Spend twenty minutes on an easy movement you already know. Include a gentle start and finish. Rest as needed; completing the time is optional if you feel discomfort.",
      "deep",
      true,
    ],
  ],
  Intelligence: [
    [
      "Read one useful idea",
      "Read a short article or two pages of a book. Write one idea you could explain in your own words.",
      "light",
      true,
    ],
    [
      "Learn and recall",
      "Spend ten minutes learning a small concept. Close the source and write three things you remember; reopen it to check.",
      "standard",
      true,
    ],
    [
      "Ask a better question",
      "Choose something you do not understand. Write a precise question and find one reliable source that helps answer it.",
      "light",
      true,
    ],
    [
      "Practice a small skill",
      "Spend twenty minutes practicing a skill you want to develop. Pick a manageable exercise and note what became easier.",
      "deep",
      true,
    ],
    [
      "Build a learning list",
      "Make a list of three topics you want to explore. For each, save one reputable free resource and choose the first small step.",
      "standard",
      false,
    ],
  ],
  Vitality: [
    [
      "A quiet breathing break",
      "Sit comfortably for three minutes. Breathe naturally and notice the breath without holding it or forcing a rhythm.",
      "light",
      true,
    ],
    [
      "Step into daylight",
      "Spend ten minutes near a window or outdoors in a safe place. Avoid looking at the sun and follow your usual sun protection habits.",
      "standard",
      true,
    ],
    [
      "Prepare for restful sleep",
      "Spend ten minutes making your sleeping space comfortable. Choose a realistic wind-down time and put one distraction away.",
      "standard",
      true,
    ],
    [
      "Make room for a meal",
      "Take twenty unhurried minutes to prepare or enjoy a familiar meal that suits your needs. Notice its taste and take breaks from screens.",
      "deep",
      true,
    ],
    [
      "Create a rest cue",
      "Choose one simple evening cue, such as dimming a light or placing a book by your bed. Write when you will use it.",
      "light",
      false,
    ],
  ],
  Charisma: [
    [
      "Offer a sincere thank-you",
      "Thank someone for one specific action, in person or through a message you choose to send. Respect their time and privacy.",
      "light",
      true,
    ],
    [
      "Listen with attention",
      "In a conversation today, spend a few minutes listening without interrupting. Ask one respectful follow-up question. If no conversation is available, practice with a recorded interview.",
      "standard",
      true,
    ],
    [
      "Practice a clear introduction",
      "Write a two-sentence introduction about yourself and say it aloud once. Keep it natural and share only what you are comfortable sharing.",
      "light",
      true,
    ],
    [
      "Reconnect thoughtfully",
      "Spend fifteen minutes drafting a considerate check-in to someone you know. Sending it is optional; respect boundaries and do not expect a reply.",
      "standard",
      false,
    ],
    [
      "Express an idea clearly",
      "Spend twenty minutes outlining a small idea, then explain it aloud in two minutes. Listen back if comfortable and identify one way to be clearer.",
      "deep",
      true,
    ],
  ],
  Perception: [
    [
      "Choose one priority",
      "Write the one small action that would make today feel worthwhile. Make it specific and achievable in ten minutes or less.",
      "light",
      true,
    ],
    [
      "A focused ten minutes",
      "Choose one manageable task. Put aside optional distractions and work on it for ten minutes, then note your next step.",
      "standard",
      true,
    ],
    [
      "Notice your surroundings",
      "Spend three minutes noticing five ordinary details around you. Write one observation without judging it.",
      "light",
      true,
    ],
    [
      "Clear one source of friction",
      "Spend fifteen minutes organizing a small surface or a folder you use often. Stop when the time is up and keep useful items accessible.",
      "standard",
      false,
    ],
    [
      "Review and reset",
      "Spend twenty minutes reviewing your recent week. Write one thing that worked, one difficulty and one realistic adjustment for tomorrow.",
      "deep",
      true,
    ],
  ],
};
export const catalog: Quest[] = Object.entries(authored).flatMap(
  ([attribute, items]) =>
    items.map(([title, instructions, effort, repeatable], index) => ({
      id: `${attribute.toLowerCase()}-${index + 1}`,
      title,
      instructions,
      attribute: attribute as Attribute,
      effort,
      xp: { light: 10, standard: 15, deep: 25 }[effort],
      focusTags: [attribute],
      repeatable,
      version: 1,
      catalogVersion: 1,
    })),
);
