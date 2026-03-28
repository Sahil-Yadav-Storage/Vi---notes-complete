interface TextMetrics {
  sentenceLengthVariance: number;
  avgSentenceLength: number;
  vocabularyDiversity: number;
  uniqueWordRatio: number;
  punctuationDensity: number;
  avgWordLength: number;
}

export const analyzeText = (content: string): TextMetrics => {
  const text = content.replace(/<[^>]*>/g, ' ').trim();
  
  if (!text) {
    return {
      sentenceLengthVariance: 0,
      avgSentenceLength: 0,
      vocabularyDiversity: 0,
      uniqueWordRatio: 0,
      punctuationDensity: 0,
      avgWordLength: 0,
    };
  }

  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.toLowerCase().match(/\b[a-z]+\b/gi) || [];
  const uniqueWords = new Set(words);

  const sentenceLengths = sentences.map(s => (s.match(/\b\w+\b/g) || []).length);
  const avgSentenceLength = sentenceLengths.length > 0
    ? sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length
    : 0;

  const mean = avgSentenceLength;
  const variance = sentenceLengths.length > 1
    ? sentenceLengths.reduce((sum, len) => sum + (len - mean) ** 2, 0) / sentenceLengths.length
    : 0;

  const punctuationCount = (text.match(/[.,;:!?]/g) || []).length;
  const totalChars = text.replace(/\s/g, '').length;

  return {
    sentenceLengthVariance: Math.round(variance * 100) / 100,
    avgSentenceLength: Math.round(avgSentenceLength * 100) / 100,
    vocabularyDiversity: uniqueWords.size,
    uniqueWordRatio: words.length > 0 ? Math.round((uniqueWords.size / words.length) * 10000) / 10000 : 0,
    punctuationDensity: totalChars > 0 ? Math.round((punctuationCount / totalChars) * 10000) / 10000 : 0,
    avgWordLength: words.length > 0 ? Math.round((words.join('').length / words.length) * 100) / 100 : 0,
  };
};
