/**
 * Translate raw Supabase / network errors into friendly, human copy.
 * We never surface raw provider strings to users.
 */

interface LikeAuthError {
  message?: string;
  code?: string;
  status?: number;
}

export function authErrorMessage(
  error: LikeAuthError | null | undefined,
): string {
  if (!error) return "Something went wrong. Please try again.";

  const code = (error.code ?? "").toLowerCase();
  const msg = (error.message ?? "").toLowerCase();
  const has = (...needles: string[]) => needles.some((n) => msg.includes(n));

  // Network / connectivity
  if (has("failed to fetch", "networkerror", "network request failed")) {
    return "Can't reach the server. Check your connection and try again.";
  }

  // Duplicate signup
  if (
    code.includes("user_already_exists") ||
    has("already registered", "already exists", "already been registered")
  ) {
    return "That email already has an account — try logging in instead.";
  }

  // Bad login
  if (code === "invalid_credentials" || has("invalid login credentials")) {
    return "That email or password doesn't look right.";
  }

  // Unverified email (only relevant if confirmation gets re-enabled)
  if (code === "email_not_confirmed" || has("email not confirmed")) {
    return "Please confirm your email first — check your inbox.";
  }

  // Weak password
  if (code === "weak_password" || has("password should be", "weak password")) {
    return "Choose a stronger password — at least 8 characters.";
  }

  // Rate limiting
  if (
    error.status === 429 ||
    code.includes("over_request_rate_limit") ||
    has("for security purposes", "rate limit", "too many requests")
  ) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  // Invalid email format slipping past client validation
  if (has("invalid format", "unable to validate email")) {
    return "That email address looks invalid.";
  }

  return "Something went wrong. Please try again.";
}

/** Friendly fallback for non-auth (e.g. database) failures. */
export function genericErrorMessage(): string {
  return "Something went wrong on our end. Please try again.";
}
