/**
 * Shared color theme for FINDER apps (user + driver).
 * All screens should use these tokens for consistency.
 */

import { Platform } from 'react-native';

// ── Primary palette ────────────────────────────────────────────────────────
export const ACCENT = '#FF5F00';   // primary orange
export const ACCENT_LIGHT = '#FFF3EC'; // light orange tint (backgrounds, pills)
export const ACCENT_MID = '#FFD0B0'; // medium orange (avatar bg, highlights)

// ── Neutrals ───────────────────────────────────────────────────────────────
export const BG_WHITE = '#ffffff';
export const BG_LIGHT = '#fafafa';
export const BORDER = '#e8e8e8';
export const TEXT_DARK = '#1a1a1a';
export const TEXT_MID = '#333333';
export const TEXT_SOFT = '#666666';
export const TEXT_HINT = '#aaaaaa';

// ── Status ─────────────────────────────────────────────────────────────────
export const STATUS_SUCCESS = '#22c55e';
export const STATUS_ERROR = '#cc2222';

// ── Legacy Colors export (for existing useColorScheme hooks) ──────────────
const tintColorLight = ACCENT;
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: TEXT_DARK,
    background: BG_WHITE,
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
