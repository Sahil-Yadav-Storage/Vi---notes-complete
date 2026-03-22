const FEATURE_KEYS = [
  'avgTypingSpeed',
  'typingConsistency',
  'pauseCount',
  'pauseRatio',
  'editRatio',
  'pasteRatio',
  'sentenceLengthVariance',
  'vocabularyDiversity',
];

function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

function generateHumanSample() {
  // roughly 30-90 wpm with natural pauses and some backspaces
  return {
    features: {
      avgTypingSpeed: randomInRange(150, 450),
      typingConsistency: randomInRange(0.1, 0.8),
      pauseCount: Math.round(randomInRange(3, 20)),
      pauseRatio: randomInRange(0.05, 0.3),
      editRatio: randomInRange(0.02, 0.15),
      pasteRatio: randomInRange(0, 0.1),
      sentenceLengthVariance: randomInRange(5, 40),
      vocabularyDiversity: randomInRange(0.4, 0.8),
    },
    label: 1, // human
  };
}

function generateAISample() {
  // instant pasting / perfect typing behaviors
  return {
    features: {
      avgTypingSpeed: randomInRange(0, 100),
      typingConsistency: randomInRange(0, 0.1),
      pauseCount: Math.round(randomInRange(0, 1)),
      pauseRatio: randomInRange(0, 0.02),
      editRatio: randomInRange(0, 0.01),
      pasteRatio: randomInRange(0.5, 1.0),
      sentenceLengthVariance: randomInRange(0, 5),
      vocabularyDiversity: randomInRange(0.2, 0.5),
    },
    label: 0,
  };
}

function generateSyntheticData(n = 600) {
  const data = [];
  for (let i = 0; i < n / 2; i++) {
    data.push(generateHumanSample());
    data.push(generateAISample());
  }
  return data;
}

function computeNormParams(data) {
  const params = {};
  for (const key of FEATURE_KEYS) {
    const values = data.map((d) => d.features[key]);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    // fallback to 1 prevents div-by-zero during normalization
    const std = Math.sqrt(
      values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length
    ) || 1;

    params[key] = { mean, std };
  }
  return params;
}

function normalizeFeatures(features, params) {
  return FEATURE_KEYS.map((key) => {
    const { mean, std } = params[key];
    return (features[key] - mean) / std;
  });
}

function sigmoid(z) {
  // hard limits to avoid precision overflow
  if (z > 20) return 1;
  if (z < -20) return 0;
  return 1 / (1 + Math.exp(-z));
}

function predictProbability(featureVector, weights, bias) {
  let z = bias;
  for (let i = 0; i < featureVector.length; i++) {
    z += weights[i] * featureVector[i];
  }
  return sigmoid(z);
}

function train(data, normParams, lr = 0.01, epochs = 1000) {
  const n = FEATURE_KEYS.length;
  // slight random init helps convergence
  const weights = new Array(n).fill(0).map(() => randomInRange(-0.1, 0.1));
  let bias = 0;

  for (let epoch = 0; epoch < epochs; epoch++) {
    for (const sample of data) {
      const x = normalizeFeatures(sample.features, normParams);
      const y = sample.label;
      const p = predictProbability(x, weights, bias);
      const error = p - y;

      for (let i = 0; i < n; i++) {
        weights[i] -= lr * error * x[i];
      }
      bias -= lr * error;
    }
  }

  return { weights, bias };
}

class Classifier {
  constructor() {
    this.weights = null;
    this.bias = null;
    this.normParams = null;
    this.trained = false;
  }

  init() {
    console.log('Training classifier...');
    const data = generateSyntheticData(600);
    this.normParams = computeNormParams(data);
    const model = train(data, this.normParams, 0.05, 1000);
    this.weights = model.weights;
    this.bias = model.bias;
    this.trained = true;
    console.log('Classifier ready.');
  }

  predict(features) {
    if (!this.trained) this.init();

    const x = normalizeFeatures(features, this.normParams);
    const rawProbability = predictProbability(x, this.weights, this.bias);

    // smoothing so we don't return exactly 0% or 100% (feels fake)
    const smoothedProbability = 0.1 + 0.8 * rawProbability;

    return {
      humanProbability: parseFloat(smoothedProbability.toFixed(4)),
      label: smoothedProbability >= 0.5 ? 'human' : 'ai_suspected',
    };
  }
}

const classifier = new Classifier();
classifier.init();

module.exports = classifier;
