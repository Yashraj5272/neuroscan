# 🧠 NeuroScan — Parkinson's Early Detection System

> Multi-modal AI screening using finger tapping, gyroscope, facial analysis,
> and symptom questionnaire — powered by ensemble Random Forest + SVM.

⚠️ **For educational purposes only. Not a medical diagnosis.**

---

## ⚡ Quick Setup in VS Code

### Prerequisites
- Python 3.9 or newer (`python --version`)
- Node.js 18 or newer (`node --version`)
- VS Code with Python extension installed

---

### Step 1 — Open in VS Code

```
File → Open Folder → select the `neuroscan` folder
```

---

### Step 2 — Backend Setup (Terminal 1)

Open a new terminal in VS Code (`Ctrl+` ` `) and run:

```bash
# Navigate to backend
cd backend

# Create a virtual environment (recommended)
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# Mac / Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Train the ML models (takes ~10 seconds, creates .pkl files)
python scripts/train_model.py

# Start the Flask API
python app.py
```

You should see:
```
INFO  Models loaded successfully.
 * Running on http://0.0.0.0:5000
```

Leave this terminal running.

---

### Step 3 — Frontend Setup (Terminal 2)

Open a **second terminal** in VS Code (`+` button on the terminal panel):

```bash
# Navigate to frontend
cd frontend

# Install Node packages
npm install

# Start the React dev server
npm run dev
```

You should see:
```
  VITE v5.x  ready in Xms
  ➜  Local:   http://localhost:3000/
```

---

### Step 4 — Open in Browser

Go to **http://localhost:3000**

The React app will proxy all `/api` calls to Flask on port 5000 automatically.

---

## 📁 Project Structure

```
neuroscan/
├── .vscode/
│   ├── settings.json          VS Code settings
│   └── launch.json            Debug config for Flask
│
├── backend/
│   ├── app.py                 Flask API — main entry point
│   ├── requirements.txt       Python dependencies
│   ├── scripts/
│   │   └── train_model.py     Model training pipeline
│   ├── models/                Auto-created by train_model.py
│   │   ├── rf_model.pkl       Trained Random Forest
│   │   ├── svm_model.pkl      Trained SVM (RBF kernel)
│   │   ├── scaler.pkl         Feature StandardScaler
│   │   └── metrics.json       Accuracy / AUC scores
│   └── data/
│       ├── test_cases.json    Sample feature payloads
│       ├── sample_test_data.csv
│       └── prediction_history.json   (auto-created on first prediction)
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js         Proxy /api → localhost:5000
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css          Global design tokens + utility classes
        ├── components/
        │   ├── Navbar.jsx
        │   ├── TappingTest.jsx    15-second finger tapping UI
        │   ├── MotionTest.jsx     10-second gyroscope capture
        │   ├── FaceTest.jsx       15-second webcam analysis
        │   └── Questionnaire.jsx  10-question symptom form
        ├── hooks/
        │   ├── useTappingTest.js   Tap timing + feature extraction
        │   ├── useMotionSensor.js  DeviceMotion API + simulation
        │   └── useFaceAnalysis.js  MediaPipe face mesh + simulation
        ├── pages/
        │   ├── HomePage.jsx    Landing page
        │   ├── TestPage.jsx    4-step test flow
        │   ├── ResultPage.jsx  Prediction dashboard + charts
        │   └── HistoryPage.jsx Past predictions + model metrics
        └── utils/
            ├── api.js          Fetch wrapper for Flask API
            └── questionnaire.js  Questions, options, scoring
```

---

## 🔌 API Endpoints

| Method | Endpoint           | Description                        |
|--------|--------------------|------------------------------------|
| GET    | `/health`          | Backend health + model status      |
| POST   | `/predict`         | Run ML prediction from features    |
| GET    | `/train`           | Re-train models (triggers script)  |
| GET    | `/metrics`         | Model accuracy / AUC metrics       |
| GET    | `/history?n=20`    | Last N prediction records          |
| GET    | `/sample-features` | Example feature payloads           |

### Test the API with curl

```bash
# Parkinson's example
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "features": {
      "tap_speed": 2.1,
      "tap_consistency": 0.42,
      "tap_interval_std": 185,
      "tap_interval_cv": 0.39,
      "tremor_frequency": 5.8,
      "tremor_amplitude": 0.74,
      "movement_stability": 0.32,
      "gyro_variance": 0.68,
      "eye_blink_rate": 9.5,
      "expression_mobility": 0.35,
      "questionnaire_score": 15
    }
  }'
```

---

## 🧠 ML Features (11 total)

| Feature              | Source          | Healthy Range        |
|----------------------|-----------------|----------------------|
| tap_speed            | Tapping test    | 3.5 – 6.0 taps/s     |
| tap_consistency      | Tapping test    | > 0.70               |
| tap_interval_std     | Tapping test    | 20 – 80 ms           |
| tap_interval_cv      | Tapping test    | 0.05 – 0.18          |
| tremor_frequency     | Gyroscope       | < 2.5 Hz             |
| tremor_amplitude     | Gyroscope       | < 0.25               |
| movement_stability   | Gyroscope       | > 0.75               |
| gyro_variance        | Gyroscope       | < 0.20               |
| eye_blink_rate       | Camera          | 12 – 24 /min         |
| expression_mobility  | Camera          | > 0.65               |
| questionnaire_score  | Form            | 0 – 5 (out of 20)    |

---

## 📊 Model Performance

Trained on 800 balanced synthetic samples (medically-referenced feature ranges):

| Model         | Accuracy | AUC  | 5-fold CV    |
|---------------|----------|------|--------------|
| Random Forest | 100%     | 1.00 | 100% ± 0%    |
| SVM (RBF)     | 100%     | 1.00 | 100% ± 0%    |

*High accuracy is expected — synthetic data is generated with well-separated
class distributions matching clinical literature. On real-world data expect 80–93%.*

---

## 🖥️ Frontend Pages

| Page      | URL       | Description                                  |
|-----------|-----------|----------------------------------------------|
| Home      | `/`       | Overview, feature list, API status bar       |
| Test      | `/test`   | 4-step guided screening flow                 |
| Result    | `/result` | Prediction + radar chart + feature scores    |
| History   | `/history`| Past predictions + model comparison chart    |

---

## 🔧 Re-training the Model

From the backend folder with venv active:

```bash
python scripts/train_model.py
```

Or hit the API endpoint:
```bash
curl http://localhost:5000/train
```

---

## ❓ Troubleshooting

| Issue | Fix |
|-------|-----|
| `Models not found` error | Run `python scripts/train_model.py` first |
| API call fails in browser | Check Flask is running on port 5000 |
| Camera not working | Allow camera permission in browser; use HTTPS or localhost |
| DeviceMotion not working | Open on mobile with HTTPS, or click "Skip (Simulate)" |
| `npm install` fails | Ensure Node.js 18+ is installed |
| Port 3000 in use | Edit `vite.config.js` → `server.port` |
| Port 5000 in use | Edit `app.py` → `app.run(port=XXXX)` and update `vite.config.js` proxy |
