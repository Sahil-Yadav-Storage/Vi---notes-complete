function crossVerify(features, stats, textLength) {
  const flags = [];

  // anything above 30% paste is a huge red flag for original writing
  if (features.pasteRatio > 0.3) {
    flags.push({
      code: 'paste_heavy',
      severity: 'high',
      message: `${Math.round(features.pasteRatio * 100)}% of text was pasted.`,
    });
  }

  // 500 cpm is roughly 100 wpm consistently; very rare to sustain without pauses
  if (features.avgTypingSpeed > 500) {
    flags.push({
      code: 'speed_too_high',
      severity: 'high',
      message: `Typing speed of ${features.avgTypingSpeed} cpm is impossible for typical human typing.`,
    });
  }

  // humans pause to think over paragraph-length text
  if (textLength > 200 && features.pauseCount === 0) {
    flags.push({
      code: 'no_pauses',
      severity: 'medium',
      message: 'No thinking pauses detected in a long text (> 200 chars).',
    });
  }

  // natural typing usually involves typos; 0 edits over 150 chars is suspicious
  if (textLength > 150 && features.editRatio === 0) {
    flags.push({
      code: 'no_backspaces',
      severity: 'medium',
      message: 'Zero mistakes or backspaces over 150+ characters is highly suspicious.',
    });
  }

  // catches LLM outputs that lean heavily on a narrow vocabulary
  if (features.vocabularyDiversity > 0 && features.vocabularyDiversity < 0.35) {
    flags.push({
      code: 'low_vocabulary_diversity',
      severity: 'low',
      message: 'Very low vocabulary diversity — text may be highly repetitive.',
    });
  }

  // humans vary sentence lengths naturally
  if (features.sentenceLengthVariance >= 0 && features.sentenceLengthVariance < 1 && textLength > 100) {
    flags.push({
      code: 'uniform_sentences',
      severity: 'low',
      message: 'Sentence lengths are identically uniform.',
    });
  }

  return flags;
}

module.exports = { crossVerify };
