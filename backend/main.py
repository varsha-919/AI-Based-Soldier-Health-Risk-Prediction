
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import pandas as pd

from src.stress_inference import (
    predict_stress_window,
    FEATURE_COLUMNS,
)

app = FastAPI(
    title="Soldier Health AI API",
    description="Wearable stress-classification research prototype",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class PredictionRequest(BaseModel):
    features: dict[str, Optional[float]]


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model": "physiology_only_baseline",
        "feature_count": len(FEATURE_COLUMNS),
    }

@app.get("/samples")
def get_samples():
    project_root = Path(__file__).resolve().parents[1]

    data_path = (
        project_root
        / "data"
        / "processed"
        / "labeled_stress_windows.csv"
    )

    if not data_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Processed wearable dataset not found.",
        )

    df = pd.read_csv(data_path)

    df["stress_class"] = (
        df["self_reported_stress"] >= 5
    ).astype(int)

    df = df.dropna(subset=FEATURE_COLUMNS)

    samples = []

    for index, row in df.head(25).iterrows():
        features = {
            column: float(row[column])
            for column in FEATURE_COLUMNS
        }

        samples.append({
            "sample_id": int(index),
            "features": features,
            "self_reported_stress": float(
                row["self_reported_stress"]
            ),
            "stress_class": int(row["stress_class"]),
        })

    return {"samples": samples}

@app.post("/predict")
def predict(request: PredictionRequest):
    try:
        return predict_stress_window(request.features)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Prediction failed: {str(exc)}",
        )
