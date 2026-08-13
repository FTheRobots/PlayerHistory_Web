export function promptPrivateMessage(): string | null {
  const message = window.prompt('Private message to send to this player:');
  if (message === null) return null;
  const trimmed = message.trim();
  return trimmed || null;
}

export function promptKickMessage(): string | undefined {
  const reason = window.prompt('Kick reason (optional — shown to the player):');
  if (reason === null) return undefined;
  const trimmed = reason.trim();
  return trimmed || undefined;
}

export function promptBanDetails(): { message?: string; banDurationMinutes: number } | null {
  const reason = window.prompt('Ban reason (optional — shown to the player):');
  if (reason === null) return null;

  const durationRaw = window.prompt(
    'Ban duration in minutes (leave empty for permanent):',
    ''
  );
  if (durationRaw === null) return null;

  const trimmedDuration = durationRaw.trim();
  let banDurationMinutes = 0;
  if (trimmedDuration) {
    const parsed = Number.parseInt(trimmedDuration, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      window.alert('Invalid ban duration. Use minutes as a number, or leave empty for permanent.');
      return null;
    }
    banDurationMinutes = parsed;
  }

  const trimmedReason = reason.trim();
  return {
    message: trimmedReason || undefined,
    banDurationMinutes,
  };
}
