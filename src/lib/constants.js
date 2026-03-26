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
