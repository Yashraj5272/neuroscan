"""
Parkinson's Detection API — Production Flask Backend
"""

import os
import time
import json
import logging
import numpy as np
import joblib
from flask import Flask, request, jsonify
from flask_cors import CORS

# ── Setup ─────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("parkinsons_api")

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
DATA_DIR = os.path.join(BASE_DIR, "data")
HISTORY_FILE = os.path.join(DATA_DIR, "history.json")

os.makedirs(DATA_DIR, exist_ok=True)

# ── Load Models ───────────────────────────────────────
def load_models():
    rf = joblib.load(os.path.join(MODELS_DIR, "rf_model.pkl"))
    svm = joblib.load(os.path.join(MODELS_DIR, "svm_model.pkl"))
    scaler = joblib.load(os.path.join(MODELS_DIR, "scaler.pkl"))
    return rf, svm, scaler

try:
    RF_MODEL, SVM_MODEL, SCALER = load_models()
    log.info("Models loaded successfully")
except Exception as e:
    log.warning(f"Model load failed: {e}")
    RF_MODEL = SVM_MODEL = SCALER = None

# ── Features ──────────────────────────────────────────
FEATURE_NAMES = [
    "tap_speed","tap_consistency","tap_interval_std","tap_interval_cv",
    "tremor_frequency","tremor_amplitude","movement_stability",
    "gyro_variance","eye_blink_rate","expression_mobility",
    "questionnaire_score"
]

# ── Health Check ──────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "models_loaded": RF_MODEL is not None,
        "time": time.time()
    })

# ── Predict ───────────────────────────────────────────
@app.route("/predict", methods=["POST"])
def predict():
    if RF_MODEL is None:
        return jsonify({"error": "Models not loaded"}), 503

    data = request.get_json()

    if not data:
        return jsonify({"error": "No input data"}), 400

    features = data.get("features", data)

    try:
        vec = []
        for f in FEATURE_NAMES:
            vec.append(float(features.get(f, 0)))

        X = np.array(vec).reshape(1, -1)
        X = SCALER.transform(X)

        rf_prob = RF_MODEL.predict_proba(X)[0][1]
        svm_prob = SVM_MODEL.predict_proba(X)[0][1]

        prob = (rf_prob + svm_prob) / 2
        pred = int(prob >= 0.5)

        result = {
            "prediction": pred,
            "label": "Parkinson's Detected" if pred else "Healthy",
            "confidence": round(prob * 100, 2),
            "risk_level": "High" if prob > 0.7 else "Moderate" if prob > 0.4 else "Low",
            "timestamp": time.time()
        }

        # Save history (optional)
        try:
            history = []
            if os.path.exists(HISTORY_FILE):
                with open(HISTORY_FILE, "r") as f:
                    history = json.load(f)

            history.append(result)
            history = history[-100:]

            with open(HISTORY_FILE, "w") as f:
                json.dump(history, f)

        except:
            pass

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── History ───────────────────────────────────────────
@app.route("/history", methods=["GET"])
def history():
    if not os.path.exists(HISTORY_FILE):
        return jsonify([])
    with open(HISTORY_FILE) as f:
        return jsonify(json.load(f))

# ── Sample ────────────────────────────────────────────
@app.route("/sample", methods=["GET"])
def sample():
    return jsonify({
        "example": {
            "tap_speed": 4.5,
            "tap_consistency": 0.8,
            "tap_interval_std": 50,
            "tap_interval_cv": 0.1,
            "tremor_frequency": 1.2,
            "tremor_amplitude": 0.2,
            "movement_stability": 0.9,
            "gyro_variance": 0.1,
            "eye_blink_rate": 18,
            "expression_mobility": 0.85,
            "questionnaire_score": 2
        }
    })

# ── Run Server ────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)