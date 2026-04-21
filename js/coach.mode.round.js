export async function runRoundCoach({ context, userMessage }) {
  if (window.CoachTransport?.roundSupport) {
    return window.CoachTransport.roundSupport(context, userMessage);
  }

  return buildLocalRoundFallback(context, userMessage);
}
