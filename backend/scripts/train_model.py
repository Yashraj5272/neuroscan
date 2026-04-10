"""
Parkinson's Disease Detection - Model Training Script
======================================================
Downloads UCI Parkinson's dataset, generates synthetic motor/tapping data,
trains Random Forest + SVM models, and saves them as .pkl files.
"""

import os
import sys
import requests
import numpy as np
import pandas as pd
from io import StringIO
import joblib
import warnings
warnings.filterwarnings("ignore")

from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.metrics import (classification_report, confusion_matrix,
                              accuracy_score, roc_auc_score)
from sklearn.pipeline import Pipeline
from sklearn.feature_selection import SelectKBest, f_classif

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR   = os.path.join(BASE_DIR, "data")
MODELS_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(DATA_DIR,   exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

UCI_URL = (
    "https://archive.ics.uci.edu/ml/machine-learning-databases/"
    "parkinsons/parkinsons.data"
)

# ── 1. Download UCI Dataset ────────────────────────────────────────────────────
def download_uci_dataset():
    csv_path = os.path.join(DATA_DIR, "parkinsons_uci.csv")
    if os.path.exists(csv_path):
        print("[INFO] UCI dataset already cached.")
        return pd.read_csv(csv_path)

    print("[INFO] Downloading UCI Parkinson's dataset …")
    try:
        r = requests.get(UCI_URL, timeout=15)
        r.raise_for_status()
        df = pd.read_csv(StringIO(r.text))
        df.to_csv(csv_path, index=False)
        print(f"[INFO] Saved → {csv_path}  shape={df.shape}")
        return df
    except Exception as e:
        print(f"[WARN] Download failed ({e}). Using synthetic fallback data.")
        return None

# ── 2. Synthetic Data Generator ────────────────────────────────────────────────
np.random.seed(42)

def generate_synthetic_parkinsons(n=300):
    """Simulate Parkinson's patients: slower tapping, high tremor, poor stability."""
    data = {
        "tap_speed":          np.random.normal(2.1, 0.5, n),   # taps/sec
        "tap_consistency":    np.random.normal(0.45, 0.12, n),  # lower = worse
        "tap_interval_std":   np.random.normal(180, 40, n),     # ms
        "tap_interval_cv":    np.random.normal(0.38, 0.08, n),  # coeff variation
        "tremor_frequency":   np.random.normal(5.5, 1.0, n),    # Hz (4-8 Hz range)
        "tremor_amplitude":   np.random.normal(0.72, 0.15, n),  # 0-1 normalised
        "movement_stability": np.random.normal(0.35, 0.10, n),  # lower = worse
        "gyro_variance":      np.random.normal(0.65, 0.12, n),
        "eye_blink_rate":     np.random.normal(10.5, 2.5, n),   # blinks/min (low)
        "expression_mobility":np.random.normal(0.38, 0.10, n),  # facial mask score
        "questionnaire_score":np.random.normal(14.2, 3.0, n),   # 0-20
        "label":              np.ones(n, dtype=int)
    }
    return pd.DataFrame(data)

def generate_synthetic_healthy(n=300):
    """Simulate healthy controls."""
    data = {
        "tap_speed":          np.random.normal(4.8, 0.6, n),
        "tap_consistency":    np.random.normal(0.82, 0.08, n),
        "tap_interval_std":   np.random.normal(55, 15, n),
        "tap_interval_cv":    np.random.normal(0.11, 0.03, n),
        "tremor_frequency":   np.random.normal(1.2, 0.8, n),
        "tremor_amplitude":   np.random.normal(0.12, 0.06, n),
        "movement_stability": np.random.normal(0.88, 0.07, n),
        "gyro_variance":      np.random.normal(0.08, 0.04, n),
        "eye_blink_rate":     np.random.normal(16.5, 3.0, n),
        "expression_mobility":np.random.normal(0.80, 0.08, n),
        "questionnaire_score":np.random.normal(1.8, 1.5, n),
        "label":              np.zeros(n, dtype=int)
    }
    return pd.DataFrame(data)

# ── 3. Prepare combined feature set ───────────────────────────────────────────
VOICE_FEATURES = [
    "MDVP:Fo(Hz)", "MDVP:Fhi(Hz)", "MDVP:Flo(Hz)",
    "MDVP:Jitter(%)", "MDVP:Jitter(Abs)", "MDVP:RAP", "MDVP:PPQ",
    "Jitter:DDP", "MDVP:Shimmer", "MDVP:Shimmer(dB)",
    "Shimmer:APQ3", "Shimmer:APQ5", "MDVP:APQ", "Shimmer:DDA",
    "NHR", "HNR", "RPDE", "DFA", "spread1", "spread2", "D2", "PPE"
]

SYNTHETIC_FEATURES = [
    "tap_speed", "tap_consistency", "tap_interval_std", "tap_interval_cv",
    "tremor_frequency", "tremor_amplitude", "movement_stability", "gyro_variance",
    "eye_blink_rate", "expression_mobility", "questionnaire_score"
]

def build_training_data():
    uci_df = download_uci_dataset()

    # ── UCI voice features ──
    if uci_df is not None and all(f in uci_df.columns for f in VOICE_FEATURES):
        X_voice = uci_df[VOICE_FEATURES].values
        y_voice = uci_df["status"].values
        scaler_v = StandardScaler()
        X_voice_s = scaler_v.fit_transform(X_voice)
    else:
        X_voice_s = np.empty((0, len(VOICE_FEATURES)))
        y_voice   = np.array([])

    # ── Synthetic motor / multimodal features ──
    df_pk  = generate_synthetic_parkinsons(400)
    df_hlt = generate_synthetic_healthy(400)
    df_syn = pd.concat([df_pk, df_hlt], ignore_index=True)
    df_syn = df_syn.sample(frac=1, random_state=42).reset_index(drop=True)

    X_syn = df_syn[SYNTHETIC_FEATURES].values
    y_syn = df_syn["label"].values

    scaler_syn = StandardScaler()
    X_syn_s = scaler_syn.fit_transform(X_syn)

    return X_syn_s, y_syn, scaler_syn, X_voice_s, y_voice, SYNTHETIC_FEATURES, VOICE_FEATURES

# ── 4. Train models ────────────────────────────────────────────────────────────
def train_and_evaluate(X, y, feature_names, tag="synthetic"):
    print(f"\n{'─'*60}")
    print(f"[TRAIN] Dataset: {tag}  |  samples={len(y)}  |  features={X.shape[1]}")
    print(f"        Parkinsons={y.sum()}  Healthy={(y==0).sum()}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Random Forest
    rf = RandomForestClassifier(
        n_estimators=200,
        max_depth=8,
        min_samples_split=5,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42
    )
    rf.fit(X_train, y_train)
    rf_pred  = rf.predict(X_test)
    rf_proba = rf.predict_proba(X_test)[:, 1]
    rf_acc   = accuracy_score(y_test, rf_pred)
    rf_auc   = roc_auc_score(y_test, rf_proba)

    # Cross-validation
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    rf_cv = cross_val_score(rf, X, y, cv=cv, scoring="accuracy")

    print(f"\n  Random Forest  →  Accuracy: {rf_acc:.4f}  AUC: {rf_auc:.4f}")
    print(f"  CV (5-fold):      {rf_cv.mean():.4f} ± {rf_cv.std():.4f}")
    print("\n  Classification Report (RF):")
    print(classification_report(y_test, rf_pred, target_names=["Healthy", "Parkinson's"]))

    # SVM
    svm = SVC(
        kernel="rbf", C=10, gamma="scale",
        probability=True, class_weight="balanced", random_state=42
    )
    svm.fit(X_train, y_train)
    svm_pred  = svm.predict(X_test)
    svm_proba = svm.predict_proba(X_test)[:, 1]
    svm_acc   = accuracy_score(y_test, svm_pred)
    svm_auc   = roc_auc_score(y_test, svm_proba)
    svm_cv    = cross_val_score(svm, X, y, cv=cv, scoring="accuracy")

    print(f"\n  SVM            →  Accuracy: {svm_acc:.4f}  AUC: {svm_auc:.4f}")
    print(f"  CV (5-fold):      {svm_cv.mean():.4f} ± {svm_cv.std():.4f}")

    # Feature importance (RF)
    if hasattr(rf, "feature_importances_") and len(feature_names) == X.shape[1]:
        imp = pd.Series(rf.feature_importances_, index=feature_names).sort_values(ascending=False)
        print("\n  Top-5 Feature Importances:")
        for fname, fval in imp.head(5).items():
            print(f"    {fname:<30} {fval:.4f}")

    return rf, svm, {
        "rf_accuracy":  round(rf_acc,  4),
        "rf_auc":       round(rf_auc,  4),
        "rf_cv_mean":   round(rf_cv.mean(), 4),
        "rf_cv_std":    round(rf_cv.std(),  4),
        "svm_accuracy": round(svm_acc, 4),
        "svm_auc":      round(svm_auc, 4),
        "svm_cv_mean":  round(svm_cv.mean(), 4),
        "svm_cv_std":   round(svm_cv.std(),  4),
    }

# ── 5. Main ────────────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("  Parkinson's Detection — Model Training Pipeline")
    print("=" * 60)

    X_syn, y_syn, scaler_syn, X_voice, y_voice, syn_features, voice_features = \
        build_training_data()

    # Train on synthetic multi-modal data (primary model)
    rf_main, svm_main, metrics = train_and_evaluate(
        X_syn, y_syn, syn_features, tag="multi-modal (synthetic)"
    )

    # Train on UCI voice data (secondary)
    if len(y_voice) > 0:
        rf_voice, svm_voice, metrics_v = train_and_evaluate(
            X_voice, y_voice, voice_features, tag="UCI voice"
        )
        joblib.dump(rf_voice,  os.path.join(MODELS_DIR, "rf_voice.pkl"))
        joblib.dump(svm_voice, os.path.join(MODELS_DIR, "svm_voice.pkl"))
        print("\n[SAVE] rf_voice.pkl  svm_voice.pkl")

    # Save primary models + scaler
    joblib.dump(rf_main,    os.path.join(MODELS_DIR, "rf_model.pkl"))
    joblib.dump(svm_main,   os.path.join(MODELS_DIR, "svm_model.pkl"))
    joblib.dump(scaler_syn, os.path.join(MODELS_DIR, "scaler.pkl"))

    # Save metrics
    import json
    metrics_path = os.path.join(MODELS_DIR, "metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)

    print("\n[SAVE] rf_model.pkl  svm_model.pkl  scaler.pkl  metrics.json")
    print(f"\n{'='*60}")
    print("  Training complete! Models saved to /backend/models/")
    print(f"{'='*60}\n")

    # Generate sample test data
    sample_pk  = generate_synthetic_parkinsons(3)[syn_features].round(4)
    sample_hlt = generate_synthetic_healthy(3)[syn_features].round(4)
    sample     = pd.concat([sample_pk, sample_hlt])
    sample["actual"] = [1,1,1, 0,0,0]
    sample.to_csv(os.path.join(DATA_DIR, "sample_test_data.csv"), index=False)
    print("[INFO] Sample test data → /backend/data/sample_test_data.csv")

if __name__ == "__main__":
    main()
