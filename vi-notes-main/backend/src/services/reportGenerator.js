function generateReport(features, mlResult, flags) {
  // ml score is already sigmoid-smoothed (0.1 - 0.9) by the classifier
  const mlScore = mlResult.humanProbability;

  // start at total trust, deduct based on behavioral red flags
  let heuristicScore = 1.0;
  for (const flag of flags) {
    switch (flag.severity) {
      case 'high':
        heuristicScore -= 0.4;
        break;
      case 'medium':
        heuristicScore -= 0.2;
        break;
      case 'low':
        heuristicScore -= 0.05;
        break;
    }
  }
  
  heuristicScore = Math.max(0, Math.min(1, heuristicScore));

  // 60/40 weighting leans slightly toward the learned model while keeping obvious bot flags relevant
  let confidenceScore = (mlScore * 0.6) + (heuristicScore * 0.4);

  // hard ceiling: if we catch a high-severity flag (like massive copy-paste), fail them regardless of ML
  const hasHighFlag = flags.some((f) => f.severity === 'high');
  if (hasHighFlag && confidenceScore > 0.45) {
    confidenceScore = 0.45;
  }
  
  confidenceScore = Math.max(0, Math.min(1, parseFloat(confidenceScore.toFixed(4))));

  const label = confidenceScore >= 0.5 && !hasHighFlag ? 'Likely Human' : 'Suspicious';

  return {
    confidenceScore,
    label,
    flags: flags.map((f) => `[${f.severity.toUpperCase()}] ${f.message}`),
    metrics: {
      ...features,
      _mlRawScore: mlScore,
      _heuristicBaseScore: heuristicScore
    }
  };
}

module.exports = { generateReport };
