export async function runTrainingCoach({ context, userMessage }) {
  if (window.CoachTransport?.trainingAdvice) {
    return window.CoachTransport.trainingAdvice(context, userMessage);
  }

  return buildLocalTrainingFallback(context);
}
