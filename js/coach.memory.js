window.CoachMemory = {
  lastResponse: null,
  lastSwingContext: null,
  lastTrainingContext: null,
  lastRoundContext: null,

  setLastResponse(v) { this.lastResponse = v; },
  setLastSwing(v) { this.lastSwingContext = v; },
  setLastTraining(v) { this.lastTrainingContext = v; },
  setLastRound(v) { this.lastRoundContext = v; },

  getLastResponse() { return this.lastResponse; },
  getLastSwing() { return this.lastSwingContext; },
  getLastTraining() { return this.lastTrainingContext; },
  getLastRound() { return this.lastRoundContext; }
};
