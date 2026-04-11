"""
Parkinson's Detection API — Flask Backend
==========================================
Endpoints:
  GET  /            → home route
  POST /predict     → run prediction from feature JSON
  GET  /train       → re-train models from scratch
  GET  /metrics     → return stored model metrics
  GET  /health      → health-check
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
CORS(app, origins="*")

BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR   = os.path.join(BASE_DIR, "models")
DATA_DIR     = os.path.join(BASE_DIR, "data")
HISTORY_FILE = os.path.join(DATA_DIR, "prediction_history.json")

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(DATA_DIR,   exist_ok=True)

# ── HOME ROUTE (NEW) ───────────────────────────────────────────────────────────
@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "NeuroScan API is running 🚀",
        "endpoints": ["/predict", "/train", "/metrics", "/health"]
    })

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

# ── Features ───────────────────────────────────────────────────────────────────
FEATURE_NAMES = [
    "tap_speed","tap_consistency","tap_interval_std","tap_interval_cv",
    "tremor_frequency","tremor_amplitude","movement_stability",
    "gyro_variance","eye_blink_rate","expression_mobility","questionnaire_score",
]

HEALTHY_RANGES = {
    "tap_speed": (3.5, 6.0), "tap_consistency": (0.70, 1.00),
    "tap_interval_std": (20, 80), "tap_interval_cv": (0.05, 0.18),
    "tremor_frequency": (0.0, 2.5), "tremor_amplitude": (0.00, 0.25),
    "movement_stability": (0.75, 1.00), "gyro_variance": (0.00, 0.20),
    "eye_blink_rate": (12.0, 24.0), "expression_mobility": (0.65, 1.00),
    "questionnaire_score": (0.0, 5.0),
}

def compute_individual_scores(features):
    scores = {}
    for name in FEATURE_NAMES:
        val = features.get(name)
        if val is None:
            scores[name] = 50
            continue
        lo, hi = HEALTHY_RANGES[name]
        if name in ("tap_interval_std","tap_interval_cv","tremor_frequency",
                    "tremor_amplitude","gyro_variance","questionnaire_score"):
            norm = (val - lo) / max(hi - lo, 1e-9)
        else:
            norm = (hi - val) / max(hi - lo, 1e-9)
        scores[name] = max(0, min(100, round(norm * 100, 1)))
    return scores

def save_to_history(record):
    history = []
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE) as f:
                history = json.load(f)
        except:
            pass
    history.append(record)
    history = history[-100:]
    with open(HISTORY_FILE, "w") as f:
        json.dump(history, f, indent=2)

# ── Routes ─────────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "models_loaded": RF_MODEL is not None,
        "timestamp": time.time()
    })

@app.route("/predict", methods=["POST"])
def predict():
    global RF_MODEL, SVM_MODEL, SCALER

    if RF_MODEL is None:
        return jsonify({"error": "Models not trained"}), 503

    try:
        body = request.get_json(force=True)
        features = body.get("features", body)

        vec = [float(features.get(name, 0)) for name in FEATURE_NAMES]

        X = np.array(vec).reshape(1, -1)
        X_scaled = SCALER.transform(X)

        rf_proba = RF_MODEL.predict_proba(X_scaled)[0]
        svm_proba = SVM_MODEL.predict_proba(X_scaled)[0]

        prob = (rf_proba[1] + svm_proba[1]) / 2
        pred = int(prob >= 0.5)

        label = "Parkinson's Detected" if pred else "Healthy"
        confidence = round(prob * 100 if pred else (1 - prob) * 100, 2)

        result = {
            "label": label,
            "confidence": confidence,
            "risk_level": "High" if prob > 0.7 else "Moderate" if prob > 0.4 else "Low",
            "individual_scores": compute_individual_scores(features),
            "timestamp": time.time()
        }

        save_to_history(result)
        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/train", methods=["GET"])
def train():
    import subprocess, sys
    script = os.path.join(BASE_DIR, "scripts", "train_model.py")
    subprocess.run([sys.executable, script])
    global RF_MODEL, SVM_MODEL, SCALER
    RF_MODEL, SVM_MODEL, SCALER = load_models()
    return jsonify({"status": "retrained"})

@app.route("/metrics", methods=["GET"])
def metrics():
    path = os.path.join(MODELS_DIR, "metrics.json")
    if not os.path.exists(path):
        return jsonify({"error": "No metrics"}), 404
    return jsonify(json.load(open(path)))

# ── Run ────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)