
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from pathlib import Path
import json
import os
import logging
from routers.rest import router as rest_router
from routers.dataset import router as dataset_router

app = FastAPI(
    title="InsightForge AI API",
    description="Backend API for InsightForge AI Platform",
    version="1.0.0"
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure CORS for Next.js frontend
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:3000", "http://127.0.0.1:3000", "https://insightforge-ai-sand.vercel.app"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STORAGE_DIR = Path(os.getenv("STORAGE_DIR", "storage/datasets"))
EXPERIMENTS_FILE = STORAGE_DIR / "experiments.json"

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "InsightForge AI Backend is running."}

@app.get("/api/stats")
def get_dashboard_stats():
    # Count datasets and file extensions
    datasets = []
    file_types = {}
    if STORAGE_DIR.exists():
        for f in STORAGE_DIR.glob("*.json"):
            if f.name != "experiments.json":
                try:
                    with open(f, "r") as meta_f:
                        meta = json.load(meta_f)
                        datasets.append(meta)
                        
                        # determine original file extension (assumes dataset_id maps to .csv or .xlsx)
                        # We don't have the original filename easily, but we can check the storage dir for the file
                        dataset_id = f.stem
                        if (STORAGE_DIR / f"{dataset_id}.csv").exists():
                            file_types["CSV"] = file_types.get("CSV", 0) + 1
                        elif (STORAGE_DIR / f"{dataset_id}.xlsx").exists():
                            file_types["Excel"] = file_types.get("Excel", 0) + 1
                        elif (STORAGE_DIR / f"{dataset_id}.xls").exists():
                            file_types["Excel"] = file_types.get("Excel", 0) + 1
                except Exception as e:
                    logger.warning(f"Error reading metadata for {f.name}: {e}")
            
    # Count experiments and models
    model_counts = {}
    best_score = 0
    try:
        with open(EXPERIMENTS_FILE, "r") as f:
            experiments = json.load(f)
            for exp in experiments:
                model_name = exp.get("model", "Unknown")
                model_counts[model_name] = model_counts.get(model_name, 0) + 1
                
                # Check for best score (Accuracy or R-Squared depending on task)
                metrics = exp.get("metrics", {})
                acc = str(metrics.get("Testing Accuracy", "0%")).replace("%", "")
                r2 = metrics.get("Testing R-Squared", 0)
                try:
                    acc_val = float(acc) / 100
                    if acc_val > best_score: best_score = acc_val
                except (ValueError, TypeError): 
                    pass
                try:
                    r2_val = float(r2)
                    if r2_val > best_score: best_score = r2_val
                except (ValueError, TypeError): 
                    pass
    except FileNotFoundError:
        experiments = []
    except Exception as e:
        logger.warning(f"Error reading experiments file: {e}")
        experiments = []
        
    return {
        "datasets_count": len(datasets),
        "experiments_count": len(experiments),
        "file_types": file_types,
        "model_counts": model_counts,
        "best_score": round(best_score * 100, 2)
    }

app.include_router(rest_router)
app.include_router(dataset_router)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
