"""
Parkinson's Detection API — Flask Backend
==========================================
Endpoints:
  POST /predict  → run prediction from feature JSON
  GET  /train    → re-train models from scratch
  GET  /metrics  → return stored model metrics
  GET  /health   → health-check
"""

import os, json, time, logging
import numpy as np
import joblib
from flask import Flask, request, jsonify
from flask_cors import CORS

# ── Setup ──────────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s")
log = logging.getLogger("parkinsons_api")

app = Flask(__name__)
CORS(app)  # allow React dev-server on any port

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
DATA_DIR   = os.path.join(BASE_DIR, "data")
HISTORY_FILE = os.path.join(DATA_DIR, "prediction_history.json")

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(DATA_DIR,   exist_ok=True)

# ── Load models ────────────────────────────────────────────────────────────────
def load_models():
    rf  = joblib.load(os.path.join(MODELS_DIR, "rf_model.pkl"))
    svm = joblib.load(os.path.join(MODELS_DIR, "svm_model.pkl"))
    sc  = joblib.load(os.path.join(MODELS_DIR, "scaler.pkl"))
    return rf, svm, sc

try:
    RF_MODEL, SVM_MODEL, SCALER = load_models()
    log.info("Models loaded successfully.")
except FileNotFoundError:
    log.warning("Models not found. Run /train first.")
    RF_MODEL = SVM_MODEL = SCALER = None

# ── Feature names (must match training) ───────────────────────────────────────
FEATURE_NAMES = [
    "tap_speed",           # taps / second
    "tap_consistency",     # 0-1, higher = more consistent
    "tap_interval_std",    # ms, std of inter-tap intervals
    "tap_interval_cv",     # coefficient of variation
    "tremor_frequency",    # Hz
    "tremor_amplitude",    # 0-1 normalised
    "movement_stability",  # 0-1, higher = more stable
    "gyro_variance",       # gyroscope variance score
    "eye_blink_rate",      # blinks / minute
    "expression_mobility", # 0-1, facial movement score
    "questionnaire_score", # 0-20 symptom score
]

# Healthy reference ranges for individual scores
HEALTHY_RANGES = {
    "tap_speed":           (3.5, 6.0),
    "tap_consistency":     (0.70, 1.00),
    "tap_interval_std":    (20,  80),
    "tap_interval_cv":     (0.05, 0.18),
    "tremor_frequency":    (0.0, 2.5),
    "tremor_amplitude":    (0.00, 0.25),
    "movement_stability":  (0.75, 1.00),
    "gyro_variance":       (0.00, 0.20),
    "eye_blink_rate":      (12.0, 24.0),
    "expression_mobility": (0.65, 1.00),
    "questionnaire_score": (0.0,  5.0),
}

def compute_individual_scores(features: dict) -> dict:
    """
    Return a 0-100 risk score per feature.
    100 = strongly suggests Parkinson's, 0 = healthy.
    """
    scores = {}
    for name in FEATURE_NAMES:
        val = features.get(name)
        if val is None:
            scores[name] = 50  # unknown → neutral
            continue
        lo, hi = HEALTHY_RANGES[name]
        # features where HIGH = bad
        if name in ("tap_interval_std", "tap_interval_cv",
                    "tremor_frequency", "tremor_amplitude",
                    "gyro_variance", "questionnaire_score"):
            norm = (val - lo) / max(hi - lo, 1e-9)
        # features where LOW = bad
        else:
            norm = (hi - val) / max(hi - lo, 1e-9)
        scores[name] = max(0, min(100, round(norm * 100, 1)))
    return scores

def save_to_history(record: dict):
    history = []
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE) as f:
            history = json.load(f)
    history.append(record)
    history = history[-100:]   # keep last 100 records
    with open(HISTORY_FILE, "w") as f:
        json.dump(history, f, indent=2)

# ── Routes ─────────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status":        "ok",
        "models_loaded": RF_MODEL is not None,
        "timestamp":     time.time()
    })


@app.route("/predict", methods=["POST"])
def predict():
    """
    Expects JSON body with keys matching FEATURE_NAMES.
    Returns prediction + confidence + per-feature risk scores.
    """
    global RF_MODEL, SVM_MODEL, SCALER

    if RF_MODEL is None:
        return jsonify({"error": "Models not trained. Call GET /train first."}), 503

    try:
        body = request.get_json(force=True)
        if not body:
            return jsonify({"error": "Empty request body."}), 400

        features = body.get("features", body)  # accept both wrappers

        # Build feature vector in the correct order
        vec = []
        missing = []
        for name in FEATURE_NAMES:
            val = features.get(name)
            if val is None:
                missing.append(name)
                vec.append(0.0)  # default 0 for missing
            else:
                vec.append(float(val))

        X = np.array(vec).reshape(1, -1)
        X_scaled = SCALER.transform(X)

        # Predictions
        rf_pred   = int(RF_MODEL.predict(X_scaled)[0])
        rf_proba  = RF_MODEL.predict_proba(X_scaled)[0]
        svm_pred  = int(SVM_MODEL.predict(X_scaled)[0])
        svm_proba = SVM_MODEL.predict_proba(X_scaled)[0]

        # Ensemble: average probabilities
        ensemble_prob_pk = float((rf_proba[1] + svm_proba[1]) / 2)
        ensemble_pred    = int(ensemble_prob_pk >= 0.5)
        confidence       = round(ensemble_prob_pk * 100 if ensemble_pred else
                                 (1 - ensemble_prob_pk) * 100, 2)

        label = "Parkinson's Detected" if ensemble_pred else "Healthy"
        risk  = ("High" if ensemble_prob_pk > 0.7 else
                 "Moderate" if ensemble_prob_pk > 0.4 else "Low")

        individual_scores = compute_individual_scores(features)
        overall_risk_score = round(sum(individual_scores.values()) / len(individual_scores), 1)

        result = {
            "prediction":        ensemble_pred,
            "label":             label,
            "confidence":        confidence,
            "risk_level":        risk,
            "overall_risk_score": overall_risk_score,
            "rf_prediction":     rf_pred,
            "rf_probability":    round(float(rf_proba[1]) * 100, 2),
            "svm_prediction":    svm_pred,
            "svm_probability":   round(float(svm_proba[1]) * 100, 2),
            "individual_scores": individual_scores,
            "missing_features":  missing,
            "timestamp":         time.time(),
            "disclaimer": (
                "This result is for screening purposes only and "
                "is NOT a medical diagnosis. Consult a neurologist."
            )
        }

        # Persist to history
        try:
            save_to_history({
                "timestamp": time.time(),
                "features":  features,
                "result":    result
            })
        except Exception:
            pass  # non-critical

        log.info(f"Prediction: {label}  confidence={confidence}%  risk={risk}")
        return jsonify(result)

    except Exception as e:
        log.exception("Prediction error")
        return jsonify({"error": str(e)}), 500


@app.route("/train", methods=["GET", "POST"])
def train():
    """Trigger re-training pipeline."""
    try:
        import subprocess, sys
        script = os.path.join(BASE_DIR, "scripts", "train_model.py")
        result = subprocess.run(
            [sys.executable, script],
            capture_output=True, text=True, timeout=120
        )
        if result.returncode != 0:
            return jsonify({"error": result.stderr}), 500

        # Reload models
        global RF_MODEL, SVM_MODEL, SCALER
        RF_MODEL, SVM_MODEL, SCALER = load_models()

        return jsonify({
            "status":  "ok",
            "message": "Models retrained and reloaded.",
            "output":  result.stdout[-2000:]  # last 2000 chars of training log
        })
    except Exception as e:
        log.exception("Training error")
        return jsonify({"error": str(e)}), 500


@app.route("/metrics", methods=["GET"])
def metrics():
    """Return stored model performance metrics."""
    metrics_file = os.path.join(MODELS_DIR, "metrics.json")
    if not os.path.exists(metrics_file):
        return jsonify({"error": "metrics.json not found. Run /train first."}), 404
    with open(metrics_file) as f:
        return jsonify(json.load(f))


@app.route("/history", methods=["GET"])
def history():
    """Return last N prediction records."""
    n = min(int(request.args.get("n", 20)), 100)
    if not os.path.exists(HISTORY_FILE):
        return jsonify([])
    with open(HISTORY_FILE) as f:
        data = json.load(f)
    return jsonify(data[-n:])


@app.route("/sample-features", methods=["GET"])
def sample_features():
    """Return example feature payloads for testing."""
    parkinsons_sample = {
        "tap_speed": 2.1, "tap_consistency": 0.42, "tap_interval_std": 185,
        "tap_interval_cv": 0.39, "tremor_frequency": 5.8, "tremor_amplitude": 0.74,
        "movement_stability": 0.32, "gyro_variance": 0.68, "eye_blink_rate": 9.5,
        "expression_mobility": 0.35, "questionnaire_score": 15
    }
    healthy_sample = {
        "tap_speed": 4.9, "tap_consistency": 0.85, "tap_interval_std": 52,
        "tap_interval_cv": 0.10, "tremor_frequency": 0.8, "tremor_amplitude": 0.10,
        "movement_stability": 0.91, "gyro_variance": 0.07, "eye_blink_rate": 17,
        "expression_mobility": 0.82, "questionnaire_score": 1
    }
    return jsonify({
        "parkinsons_example": parkinsons_sample,
        "healthy_example":    healthy_sample,
        "feature_descriptions": {
            name: f"Range: {HEALTHY_RANGES[name]}" for name in FEATURE_NAMES
        }
    })


# ── Entry ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import os
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000))
    )