// ── Country-aware configuration ──
export const COUNTRY_CONFIG = {
  IE: { classes: ["Junior Infants", "Senior Infants", "1st Class", "2nd Class", "3rd Class", "4th Class", "5th Class", "6th Class"], currency: "€", currencyCode: "EUR", schoolLabel: "School", campLabel: "Camp" },
  GB: { classes: ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"], currency: "£", currencyCode: "GBP", schoolLabel: "School", campLabel: "Holiday club" },
  US: { classes: ["Pre-K", "Kindergarten", "1st Grade", "2nd Grade", "3rd Grade", "4th Grade", "5th Grade", "6th Grade"], currency: "$", currencyCode: "USD", schoolLabel: "School", campLabel: "Camp" },
  AU: { classes: ["Prep", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"], currency: "$", currencyCode: "AUD", schoolLabel: "School", campLabel: "Holiday program" },
};

export function detectCountry() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz.startsWith("America")) return "US";
    if (tz.startsWith("Australia")) return "AU";
    if (tz.includes("London") || tz.includes("Belfast")) return "GB";
    return "IE";
  } catch (e) {
    return "IE";
  }
}

export const USER_COUNTRY = detectCountry();
export const CC = COUNTRY_CONFIG[USER_COUNTRY] || COUNTRY_CONFIG.IE;

// ── Colour palette for members ──
export const COLS = ["#2d7cb5", "#2d5a3f", "#c4960c", "#9b4dca", "#d64545", "#1a8a7d", "#e67e22", "#e84393"];

// ── Day names ──
export const DAYF = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ── Category emoji/name maps ──
export const CT = {
  sport: "⚽", art: "🎨", music: "🎵", dance: "💃", academic: "📚",
  stem: "🔬", swimming: "🏊", martial_arts: "🥋", outdoors: "🌿", other: "✨"
};

export const CAT_NAMES = {
  sport: "Sport", art: "Art & Craft", music: "Music", dance: "Dance",
  academic: "Academic", stem: "STEM", swimming: "Swimming",
  martial_arts: "Martial Arts", outdoors: "Outdoors", other: "Other"
};

// ── Club category icons + colors ──
export const CLUB_ICONS = {
  gaa: { emoji: "🏑", label: "GAA", color: "#2d7cb5" },
  soccer: { emoji: "⚽", label: "Soccer", color: "#22c55e" },
  rugby: { emoji: "🏉", label: "Rugby", color: "#2d5a3f" },
  swimming: { emoji: "🏊", label: "Swimming", color: "#0ea5e9" },
  athletics: { emoji: "🏃", label: "Athletics", color: "#e85d4a" },
  tennis: { emoji: "🎾", label: "Tennis", color: "#84cc16" },
  gymnastics: { emoji: "🤸", label: "Gymnastics", color: "#d946ef" },
  dance: { emoji: "💃", label: "Dance", color: "#ec4899" },
  arts: { emoji: "🎨", label: "Arts", color: "#f59e0b" },
  music: { emoji: "🎵", label: "Music", color: "#8b5cf6" },
  stem: { emoji: "🔬", label: "STEM", color: "#06b6d4" },
  hockey: { emoji: "🏑", label: "Hockey", color: "#14b8a6" },
  basketball: { emoji: "🏀", label: "Basketball", color: "#f97316" },
  cricket: { emoji: "🏏", label: "Cricket", color: "#65a30d" },
  scouts: { emoji: "⚜️", label: "Scouts", color: "#7c3aed" },
  martial_arts: { emoji: "🥋", label: "Martial Arts", color: "#dc2626" },
  water_sports: { emoji: "🚣", label: "Water Sports", color: "#0284c7" },
  horse_riding: { emoji: "🐎", label: "Horse Riding", color: "#92400e" },
  multi_sport: { emoji: "🏅", label: "Multi-Sport", color: "#1a2a3a" },
  golf: { emoji: "⛳", label: "Golf", color: "#15803d" },
  yoga: { emoji: "🧘", label: "Yoga", color: "#a855f7" },
  indoor: { emoji: "🎳", label: "Indoor", color: "#6366f1" },
  other: { emoji: "✨", label: "Other", color: "#6b7280" },
};

// ── Things to Do category icons + colors ──
export const TTD_ICONS = {
  nature: { emoji: "🌿", label: "Nature", color: "#15803d" },
  cultural: { emoji: "🏛️", label: "Cultural", color: "#7c3aed" },
  outdoor: { emoji: "☀️", label: "Outdoor", color: "#ea580c" },
  adventure: { emoji: "🧗", label: "Adventure", color: "#dc2626" },
  farm: { emoji: "🐄", label: "Farm", color: "#92400e" },
  beach: { emoji: "🏖️", label: "Beach", color: "#0ea5e9" },
  indoor: { emoji: "🎭", label: "Indoor", color: "#6366f1" },
  playground: { emoji: "🛝", label: "Playground", color: "#22c55e" },
  water_sports: { emoji: "🚣", label: "Water Sports", color: "#0284c7" },
  cycling: { emoji: "🚲", label: "Cycling", color: "#65a30d" },
  community: { emoji: "🤝", label: "Community", color: "#f59e0b" },
};
