from pathlib import Path

import joblib
import numpy as np
import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = PROJECT_ROOT / "models" / "stress_baseline.joblib"

_artifact = joblib.load(MODEL_PATH)
_model = _artifact["model"]
FEATURE_COLUMNS = _artifact["feature_columns"]


def predict_stress_window(window_features):
    """
    Predict a stress class from one window of physiological features.

    This is a research prototype, not a medical assessment.
    """
    window = pd.DataFrame([window_features])
    window = window.reindex(columns=FEATURE_COLUMNS)
    window = window.replace([np.inf, -np.inf], np.nan)

    prediction = int(_model.predict(window)[0])
    probabilities = _model.predict_proba(window)[0]
    classes = list(_model.classes_)

    elevated_probability = float(
        probabilities[classes.index(1)]
    )

    return {
        "predicted_class": prediction,
        "predicted_label": (
            "Elevated stress" if prediction == 1 else "Low stress"
        ),
        "elevated_stress_probability": round(
            elevated_probability, 3
        ),
    }
