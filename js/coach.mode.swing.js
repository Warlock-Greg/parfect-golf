export async function runSwingCoach({ context, userMessage }) {
  if (window.CoachTransport?.analyzeSwing) {
    return window.CoachTransport.analyzeSwing(context, userMessage);
  }

  return buildLocalSwingFallback(context);
}
