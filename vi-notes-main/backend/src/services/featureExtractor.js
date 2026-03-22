function extractFeatures(events, stats, text) {
  const safeDiv = (num, den) => (den === 0 || isNaN(den) ? 0 : num / den);
  const textLen = text ? text.length : (stats.textLength || 0);

  const keydownEvents = events.filter((e) => e.type === 'keydown');
  
  // ignore first event and outliers (>30s) since they skew the mean 
  const intervals = keydownEvents
    .map((e) => e.meta.pause)
    .filter((p) => p > 0 && p < 30000);

  const avgTypingSpeed = stats.avgTypingSpeed || 0;

  let typingSpeedVariance = 0;
  if (intervals.length > 1) {
    const meanInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const squaredDiffs = intervals.map((i) => (i - meanInterval) ** 2);
    typingSpeedVariance = squaredDiffs.reduce((a, b) => a + b, 0) / intervals.length;
  }

  // normalizes variance against speed so fast/slow typists are compared fairly
  const typingConsistency = safeDiv(typingSpeedVariance, avgTypingSpeed);

  // 1s threshold catches actual thinking pauses vs slow typing
  const pauses = intervals.filter((i) => i > 1000);
  const pauseCount = pauses.length;
  const totalPauseTime = pauses.reduce((a, b) => a + b, 0);

  const totalSessionTime = intervals.reduce((a, b) => a + b, 0) || 1;
  const pauseRatio = safeDiv(totalPauseTime, totalSessionTime);

  const totalActions = (stats.totalKeystrokes || 0) + (stats.totalBackspaces || 0);
  const editRatio = safeDiv(stats.totalBackspaces || 0, totalActions);
  const pasteRatio = safeDiv(stats.totalPastedChars || 0, textLen);

  let sentenceLengthVariance = 0;
  let vocabularyDiversity = 0;

  if (text && text.trim().length > 0) {
    const sentences = text
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (sentences.length > 1) {
      const wordCounts = sentences.map(
        (s) => s.split(/\s+/).filter((w) => w.length > 0).length
      );
      const meanLen = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;
      const sqDiffs = wordCounts.map((c) => (c - meanLen) ** 2);
      sentenceLengthVariance = sqDiffs.reduce((a, b) => a + b, 0) / wordCounts.length;
    }

    // type-token ratio for basic vocab richness check
    const words = text
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 0)
      .map((w) => w.replace(/[^a-z0-9]/g, ''))
      .filter((w) => w.length > 0);

    if (words.length > 0) {
      const uniqueWords = new Set(words);
      vocabularyDiversity = safeDiv(uniqueWords.size, words.length);
    }
  }

  return {
    avgTypingSpeed: Math.round(avgTypingSpeed),
    typingConsistency: parseFloat(typingConsistency.toFixed(4)),
    pauseCount,
    pauseRatio: parseFloat(pauseRatio.toFixed(4)),
    editRatio: parseFloat(editRatio.toFixed(4)),
    pasteRatio: parseFloat(pasteRatio.toFixed(4)),
    sentenceLengthVariance: parseFloat(sentenceLengthVariance.toFixed(4)),
    vocabularyDiversity: parseFloat(vocabularyDiversity.toFixed(4)),
  };
}

module.exports = { extractFeatures };
