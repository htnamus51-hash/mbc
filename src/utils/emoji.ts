const SHORTCODE_MAP: Record<string, string> = {
  smile: '😄',
  grin: '😁',
  joy: '😂',
  wink: '😉',
  heart: '❤️',
  thumbsup: '👍',
  thumbsdown: '👎',
  clap: '👏',
  tada: '🎉',
  fire: '🔥',
  star: '⭐',
  robot: '🤖',
  brain: '🧠',
  med: '🩺',
  party: '🥳',
};

/** Replace shortcodes like :smile: with the corresponding emoji char */
export function renderShortcodes(text?: string | null): string {
  if (!text) return '';
  return text.replace(/:([a-z0-9_+-]+):/gi, (match, code) => {
    const key = code.toLowerCase();
    return SHORTCODE_MAP[key] ?? match;
  });
}

export function shortcodeToEmoji(shortcode: string): string | undefined {
  return SHORTCODE_MAP[shortcode.toLowerCase()];
}
