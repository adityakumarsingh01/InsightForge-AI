from fastapi import APIRouter, UploadFile, File, HTTPException
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
import uuid
import os
import json
from pathlib import Path
from datetime import datetime
from pydantic import BaseModel

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.svm import SVC, SVR
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_curve, auc, mean_absolute_error, mean_squared_error, r2_score, confusion_matrix, classification_report
from sklearn.impute import SimpleImputer

router = APIRouter(prefix="/api/dataset", tags=["Dataset"])

STORAGE_DIR = Path("storage/datasets")
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

def get_dataset_path(dataset_id: str):
    for ext in ["csv", "xlsx", "xls"]:
        path = STORAGE_DIR / f"{dataset_id}.{ext}"
        if path.exists():
            return path
    return None

def get_metadata_path(dataset_id: str):
    return STORAGE_DIR / f"{dataset_id}.json"

def load_dataset_df(dataset_id: str, metadata: dict = None) -> pd.DataFrame:
    dataset_file = get_dataset_path(dataset_id)
    if not dataset_file: return None
    ext = dataset_file.suffix.lower()
    
    if ext == ".csv":
        return pd.read_csv(dataset_file)
    else:
        if not metadata:
            meta_path = get_metadata_path(dataset_id)
            if meta_path.exists():
                with open(meta_path, "r") as f:
                    metadata = json.load(f)
            else:
                metadata = {}
        
        selected_sheets = metadata.get("selected_sheets", [])
        if not selected_sheets:
            return pd.read_excel(dataset_file, engine="calamine")
        else:
            dfs = pd.read_excel(dataset_file, sheet_name=selected_sheets, engine="calamine")
            if isinstance(dfs, dict):
                # Concatenate all selected sheets, ignoring index to avoid duplicates
                return pd.concat(dfs.values(), ignore_index=True)
            return dfs

@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    ext = file.filename.split(".")[-1].lower() if file.filename else ""
    if ext not in ["csv", "xlsx", "xls"]:
        raise HTTPException(status_code=400, detail="Invalid format. Only CSV and Excel supported.")

    dataset_id = str(uuid.uuid4())
    safe_filename = f"{dataset_id}.{ext}"
    file_path = STORAGE_DIR / safe_filename
    meta_path = get_metadata_path(dataset_id)

    try:
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        if ext == "csv":
            df = pd.read_csv(file_path)
            sheet_names = []
            selected_sheets = []
        else:
            xl = pd.ExcelFile(file_path, engine="calamine")
            sheet_names = xl.sheet_names
            selected_sheets = [sheet_names[0]] if sheet_names else []
            # Only read the first sheet for the initial upload overview
            df = pd.read_excel(file_path, sheet_name=selected_sheets[0] if selected_sheets else 0, engine="calamine")
            
        num_rows = len(df)
        num_cols = len(df.columns)
        
        metadata = {
            "dataset_id": dataset_id,
            "original_filename": file.filename,
            "format": ext.upper(),
            "rows": num_rows,
            "columns": num_cols,
            "size_bytes": file_path.stat().st_size,
            "uploaded_at": datetime.utcnow().isoformat(),
            "available_sheets": sheet_names,
            "selected_sheets": selected_sheets
        }
        
        with open(meta_path, "w") as f:
            json.dump(metadata, f)
            
        return {"dataset_id": dataset_id, "status": "success", "metadata": metadata}
    except Exception as e:
        if file_path.exists(): file_path.unlink()
        if meta_path.exists(): meta_path.unlink()
        raise HTTPException(status_code=500, detail=f"Failed to process: {str(e)}")

class UpdateSheetsRequest(BaseModel):
    selected_sheets: list[str]

@router.post("/{dataset_id}/update_sheets")
def update_sheets(dataset_id: str, request: UpdateSheetsRequest):
    meta_path = get_metadata_path(dataset_id)
    if not meta_path.exists():
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    try:
        with open(meta_path, "r") as f:
            metadata = json.load(f)
            
        metadata["selected_sheets"] = request.selected_sheets
        
        # We also need to update row count since sheets changed
        df = load_dataset_df(dataset_id, metadata)
        if df is not None:
            metadata["rows"] = len(df)
            
        with open(meta_path, "w") as f:
            json.dump(metadata, f)
            
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class CleanRequest(BaseModel):
    outlier_multiplier: float = 1.5

@router.post("/{dataset_id}/clean")
def clean_dataset(dataset_id: str, request: CleanRequest = None):
    if request is None:
        request = CleanRequest()
    meta_path = get_metadata_path(dataset_id)
    dataset_file = get_dataset_path(dataset_id)
    
    if not dataset_file or not meta_path.exists():
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    try:
        # Load metadata
        with open(meta_path, "r") as f:
            metadata = json.load(f)
            
        # Load dataset
        ext = dataset_file.suffix.lower()
        df = load_dataset_df(dataset_id, locals().get("metadata", None))
        
        # 1. Clean Column Names
        df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_')
        
        # 2. Drop Missing Values
        df.dropna(inplace=True)
        
        # 3. Handle Outliers by IQR method (for numerical columns only)
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            Q1 = df[col].quantile(0.25)
            Q3 = df[col].quantile(0.75)
            IQR = Q3 - Q1
            # Keep rows where the value is not an outlier
            multiplier = request.outlier_multiplier
            df = df[~((df[col] < (Q1 - multiplier * IQR)) | (df[col] > (Q3 + multiplier * IQR)))]
            
        # Save cleaned dataset back
        if ext == ".csv":
            df.to_csv(dataset_file, index=False)
        else:
            df.to_excel(dataset_file, index=False)
            
        # Update metadata counts
        metadata["rows"] = len(df)
        metadata["columns"] = len(df.columns)
        
        with open(meta_path, "w") as f:
            json.dump(metadata, f)
            
        return {"status": "success", "message": "Dataset cleaned successfully.", "rows": len(df)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clean dataset: {str(e)}")

@router.get("/")
def list_datasets():
    datasets = []
    for meta_file in STORAGE_DIR.glob("*.json"):
        if meta_file.name == "experiments.json":
            continue
        try:
            with open(meta_file, "r") as f:
                datasets.append(json.load(f))
        except:
            pass
    # Sort by uploaded_at descending
    datasets.sort(key=lambda x: x.get("uploaded_at", ""), reverse=True)
    return {"datasets": datasets}

@router.get("/{dataset_id}/overview")
def get_dataset_overview(dataset_id: str):
    meta_path = get_metadata_path(dataset_id)
    dataset_file = get_dataset_path(dataset_id)
    
    if not dataset_file or not meta_path.exists():
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    try:
        with open(meta_path, "r") as f:
            metadata = json.load(f)
            
        # Add extra overview stats (missing cells, duplicates)
        ext = dataset_file.suffix.lower()
        df = load_dataset_df(dataset_id, locals().get("metadata", None))
        
        metadata["total_missing"] = int(df.isnull().sum().sum())
        metadata["total_duplicates"] = int(df.duplicated().sum())
        metadata["memory_usage_kb"] = float(df.memory_usage(deep=True).sum() / 1024)
        metadata["size"] = int(df.size)
        
        return metadata
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load overview: {str(e)}")

@router.get("/{dataset_id}/preview")
def get_dataset_preview(dataset_id: str):
    dataset_file = get_dataset_path(dataset_id)
    if not dataset_file:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    try:
        ext = dataset_file.suffix.lower()
        df = load_dataset_df(dataset_id, locals().get("metadata", None))
        
        df = df.replace({np.nan: None}) # handle NaN for JSON serialization
        preview_data = df.to_dict(orient="records")
        return {"dataset_id": dataset_id, "columns": list(df.columns), "data": preview_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load preview: {str(e)}")

@router.get("/{dataset_id}/profiling")
def get_dataset_profiling(dataset_id: str):
    dataset_file = get_dataset_path(dataset_id)
    if not dataset_file:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    try:
        ext = dataset_file.suffix.lower()
        df = load_dataset_df(dataset_id, locals().get("metadata", None))
        
        profiling_data = []
        for col in df.columns:
            non_null_count = int(df[col].count())
            dtype = str(df[col].dtype)
            unique_values = int(df[col].nunique())
            profiling_data.append({
                "column": col,
                "non_null_count": non_null_count,
                "dtype": dtype,
                "unique_values": unique_values
            })
        
        return {"dataset_id": dataset_id, "columns_profile": profiling_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load profiling: {str(e)}")

@router.get("/{dataset_id}/eda")
def get_dataset_eda(dataset_id: str):
    dataset_file = get_dataset_path(dataset_id)
    if not dataset_file:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    try:
        ext = dataset_file.suffix.lower()
        df = load_dataset_df(dataset_id, locals().get("metadata", None))
        
        eda_response = {"dataset_id": dataset_id}
        
        # 1. Descriptive stats
        numeric_df = df.select_dtypes(include=[np.number])
        if not numeric_df.empty:
            desc = numeric_df.describe()
            eda_response["describe"] = {
                "columns": list(desc.columns),
                "index": list(desc.index),
                "data": desc.replace({np.nan: None}).values.tolist()
            }
            
            if len(numeric_df.columns) > 1:
                # 2. Correlation Heatmap Data
                corr_matrix = numeric_df.corr().replace({np.nan: None})
                eda_response["heatmap"] = {
                    "z": corr_matrix.values.tolist(),
                    "x": list(corr_matrix.columns),
                    "y": list(corr_matrix.index)
                }

            # 3. Box plot Data (Limit to 10 columns, 1000 samples max per column for performance)
            cols_to_plot = numeric_df.columns[:10]
            box_data = {}
            for col in cols_to_plot:
                samp = numeric_df[col].dropna()
                if len(samp) > 1000:
                    samp = samp.sample(1000, random_state=42)
                box_data[col] = samp.tolist()
            eda_response["box_plots"] = box_data

        # 4. Null values bar chart
        null_counts = df.isnull().sum()
        null_counts = null_counts[null_counts > 0]
        if not null_counts.empty:
            eda_response["null_counts"] = {
                "x": list(null_counts.index),
                "y": null_counts.tolist()
            }
            
        # 5. Categorical Value Counts (Top 10 for each category)
        cat_df = df.select_dtypes(exclude=[np.number])
        cat_data = []
        for col in cat_df.columns[:5]: # limit to first 5 categorical columns
            counts = cat_df[col].value_counts().head(10)
            if not counts.empty:
                cat_data.append({
                    "column": col,
                    "labels": list(counts.index.astype(str)),
                    "values": counts.tolist()
                })
        eda_response["categorical"] = cat_data

        return eda_response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate EDA: {str(e)}")

@router.get("/{dataset_id}/ai")
def get_dataset_ai(dataset_id: str):
    dataset_file = get_dataset_path(dataset_id)
    if not dataset_file:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    try:
        ext = dataset_file.suffix.lower()
        df = load_dataset_df(dataset_id, locals().get("metadata", None))
        
        # Simple AI heuristics
        num_rows, num_cols = df.shape
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        categorical_cols = df.select_dtypes(exclude=[np.number]).columns.tolist()
        
        summary = f"This dataset contains {num_rows} records and {num_cols} features. "
        summary += f"There are {len(numeric_cols)} numerical columns and {len(categorical_cols)} categorical columns. "
        
        suggestions = []
        
        # Smarter Target Guessing Heuristic
        target = None
        target_keywords_exact = ['y', 'label', 'class', 'target']
        target_keywords_sub = ['winner', 'result', 'status', 'outcome', 'price', 'churn', 'predict']
        
        # 1. Look for obvious keywords in column names (case insensitive)
        for col in df.columns:
            col_lower = col.lower()
            if col_lower in target_keywords_exact or any(k in col_lower for k in target_keywords_sub):
                target = col
                break
                
        # 2. If no keywords found, assume the absolute last column of the dataframe is the target (very standard for ML datasets)
        if not target and len(df.columns) > 0:
            target = df.columns[-1]

        if target:
            is_categorical = target in categorical_cols or df[target].nunique() < 15
            summary += f"Based on dataset structure, the column '{target}' has been identified as the most likely target variable. "
            
            if is_categorical:
                suggestions.append({
                    "model": "Random Forest Classifier",
                    "reason": "Excellent for handling categorical target variables with a mix of numeric and categorical features. Highly robust to outliers.",
                    "target": target
                })
                suggestions.append({
                    "model": "XGBoost Classifier",
                    "reason": "Often yields the best performance for tabular classification tasks. Good if dataset is large.",
                    "target": target
                })
            else:
                suggestions.append({
                    "model": "Linear Regression",
                    "reason": "A great baseline model to start with for continuous predictions. Provides high interpretability.",
                    "target": target
                })
                suggestions.append({
                    "model": "Gradient Boosting Regressor",
                    "reason": "Powerful ensemble method that can capture complex non-linear relationships in tabular data.",
                    "target": target
                })

            
        if df.isnull().sum().sum() > 0:
            summary += " Note: You have missing values in this dataset, which should be imputed or dropped before training."
            
        anomalies = []
        correlations = []
        
        # Calculate Correlations
        if len(numeric_cols) > 1:
            corr_matrix = df[numeric_cols].corr()
            # Get upper triangle of correlation matrix
            upper = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))
            # Find index features with correlation greater than 0.7 or less than -0.7
            for col1 in upper.columns:
                for col2 in upper.index:
                    score = upper.loc[col2, col1]
                    if not pd.isna(score) and abs(score) > 0.7:
                        correlations.append({"col1": col2, "col2": col1, "score": float(score)})
                        
        # Calculate Anomalies (using 3 standard deviations rule)
        for col in numeric_cols:
            if df[col].nunique() > 10:  # Only for continuous vars
                mean = df[col].mean()
                std = df[col].std()
                if not pd.isna(mean) and not pd.isna(std) and std > 0:
                    outliers = df[(df[col] < mean - 3 * std) | (df[col] > mean + 3 * std)]
                    if len(outliers) > 0:
                        anomalies.append({"column": col, "count": int(len(outliers))})
                        
        # Keep top 5 to avoid bloating
        correlations = sorted(correlations, key=lambda x: abs(x["score"]), reverse=True)[:5]
        anomalies = sorted(anomalies, key=lambda x: x["count"], reverse=True)[:5]

        return {
            "dataset_id": dataset_id,
            "summary": summary,
            "model_suggestions": suggestions,
            "anomalies": anomalies,
            "correlations": correlations
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate AI suggestions: {str(e)}")

class TrainRequest(BaseModel):
    target: str
    model_type: str
    exclude_features: list[str] = []

class ForecastRequest(BaseModel):
    date_col: str
    target_col: str
    horizon: int = 30

@router.post("/{dataset_id}/train")
def train_model(dataset_id: str, request: TrainRequest):
    dataset_file = get_dataset_path(dataset_id)
    if not dataset_file:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    try:
        ext = dataset_file.suffix.lower()
        df = load_dataset_df(dataset_id, locals().get("metadata", None))
        
        target = request.target
        if target not in df.columns:
            raise HTTPException(status_code=400, detail=f"Target column '{target}' not found")
            
        if request.exclude_features:
            cols_to_drop = [col for col in request.exclude_features if col in df.columns and col != target]
            if cols_to_drop:
                df = df.drop(columns=cols_to_drop)
            
        # Drop rows where target is missing
        df = df.dropna(subset=[target])
        
        y = df[target]
        X = df.drop(columns=[target])
        
        # Determine if classification or regression
        is_classification = y.nunique() < 20 or y.dtype == 'object'
        
        # Encode target if classification (do this BEFORE split to avoid unseen labels in test set)
        le_classes = []
        if is_classification:
            from sklearn.preprocessing import LabelEncoder
            le = LabelEncoder()
            y = le.fit_transform(y)
            le_classes = le.classes_
        
        # Preprocessing: Impute missing
        numeric_cols = X.select_dtypes(include=[np.number]).columns
        cat_cols = X.select_dtypes(exclude=[np.number]).columns
        
        if not numeric_cols.empty:
            num_imputer = SimpleImputer(strategy='mean')
            X[numeric_cols] = num_imputer.fit_transform(X[numeric_cols])
            
        if not cat_cols.empty:
            cat_imputer = SimpleImputer(strategy='most_frequent')
            X[cat_cols] = cat_imputer.fit_transform(X[cat_cols])
            # One hot encode
            X = pd.get_dummies(X, columns=cat_cols, drop_first=True)
            
        # Train test split
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        metrics = {}
        roc_data = None
        extra_data = {}
        
        if is_classification:
            if request.model_type == "random_forest_clf":
                model = RandomForestClassifier(random_state=42)
            elif request.model_type == "logistic_regression":
                model = LogisticRegression(random_state=42, max_iter=1000)
            elif request.model_type == "decision_tree_clf":
                model = DecisionTreeClassifier(random_state=42)
            elif request.model_type == "gradient_boosting_clf":
                model = GradientBoostingClassifier(random_state=42)
            elif request.model_type == "svc":
                model = SVC(random_state=42, probability=True)
            else:
                model = RandomForestClassifier(random_state=42) # fallback
                
            model.fit(X_train, y_train)
            train_preds = model.predict(X_train)
            preds = model.predict(X_test)
            
            metrics["Training Accuracy"] = f"{round(accuracy_score(y_train, train_preds) * 100, 2)}%"
            metrics["Testing Accuracy"] = f"{round(accuracy_score(y_test, preds) * 100, 2)}%"
            metrics["Precision"] = f"{round(precision_score(y_test, preds, average='weighted', zero_division=0) * 100, 2)}%"
            metrics["Recall"] = f"{round(recall_score(y_test, preds, average='weighted', zero_division=0) * 100, 2)}%"
            metrics["F1 Score"] = f"{round(f1_score(y_test, preds, average='weighted', zero_division=0) * 100, 2)}%"
            
            # Confusion Matrix
            cm = confusion_matrix(y_test, preds)
            extra_data["confusion_matrix"] = {
                "z": cm.tolist(),
                "x": [str(c) for c in le_classes],
                "y": [str(c) for c in le_classes]
            }
            
            # Classification Report
            cr = classification_report(y_test, preds, output_dict=True, zero_division=0)
            
            # If classes were encoded to integers, map them back to original labels in the report
            formatted_cr = {}
            for k, v in cr.items():
                if k.isdigit() and int(k) < len(le_classes):
                    formatted_cr[str(le_classes[int(k)])] = v
                else:
                    formatted_cr[k] = v
                    
            extra_data["classification_report"] = formatted_cr
            
            # ROC for binary
            if len(le_classes) == 2:
                probs = model.predict_proba(X_test)[:, 1]
                fpr, tpr, _ = roc_curve(y_test, probs)
                roc_auc = auc(fpr, tpr)
                roc_data = {
                    "fpr": fpr.tolist(),
                    "tpr": tpr.tolist(),
                    "auc": round(roc_auc, 4)
                }
        else:
            if request.model_type == "linear_regression":
                model = LinearRegression()
            elif request.model_type == "random_forest_reg":
                model = RandomForestRegressor(random_state=42)
            elif request.model_type == "decision_tree_reg":
                model = DecisionTreeRegressor(random_state=42)
            elif request.model_type == "gradient_boosting_reg":
                model = GradientBoostingRegressor(random_state=42)
            elif request.model_type == "svr":
                model = SVR()
            else:
                model = RandomForestRegressor(random_state=42) # fallback
                
            model.fit(X_train, y_train)
            train_preds = model.predict(X_train)
            preds = model.predict(X_test)
            
            metrics["Training R-Squared"] = round(r2_score(y_train, train_preds), 4)
            metrics["Testing R-Squared"] = round(r2_score(y_test, preds), 4)
            metrics["MAE"] = round(mean_absolute_error(y_test, preds), 4)
            metrics["MSE"] = round(mean_squared_error(y_test, preds), 4)
            metrics["RMSE"] = round(np.sqrt(metrics["MSE"]), 4)

        # Log Experiment
        experiment = {
            "dataset_id": dataset_id,
            "target": target,
            "model": request.model_type,
            "task": "Classification" if is_classification else "Regression",
            "metrics": metrics,
            "timestamp": datetime.now().isoformat()
        }
        
        exp_file = STORAGE_DIR / "experiments.json"
        experiments = []
        if exp_file.exists():
            with open(exp_file, "r") as f:
                try:
                    experiments = json.load(f)
                except:
                    pass
                    
        experiments.append(experiment)
        with open(exp_file, "w") as f:
            json.dump(experiments, f, indent=2)
            
        return {
            "metrics": metrics,
            "roc_data": roc_data,
            "extra_data": extra_data,
            "task": "Classification" if is_classification else "Regression"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to train model: {str(e)}")

@router.post("/{dataset_id}/forecast")
def forecast_time_series(dataset_id: str, request: ForecastRequest):
    dataset_file = get_dataset_path(dataset_id)
    if not dataset_file:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    try:
        ext = dataset_file.suffix.lower()
        df = load_dataset_df(dataset_id, locals().get("metadata", None))
        
        # Verify columns exist
        if request.date_col not in df.columns or request.target_col not in df.columns:
            raise HTTPException(status_code=400, detail="Specified columns not found in dataset")
            
        # 1. Parse date and sort
        df[request.date_col] = pd.to_datetime(df[request.date_col], errors='coerce')
        df = df.dropna(subset=[request.date_col, request.target_col])
        df = df.sort_values(by=request.date_col)
        
        # 2. Aggregate by day (in case of multiple records per day)
        df_daily = df.groupby(df[request.date_col].dt.date)[request.target_col].mean().reset_index()
        df_daily.columns = ['ds', 'y']
        df_daily['ds'] = pd.to_datetime(df_daily['ds'])
        
        if len(df_daily) < 10:
            raise HTTPException(status_code=400, detail="Not enough historical data for reliable forecasting (minimum 10 data points).")
            
        # 3. Engineer Time Features
        df_daily['year'] = df_daily['ds'].dt.year
        df_daily['month'] = df_daily['ds'].dt.month
        df_daily['day'] = df_daily['ds'].dt.day
        df_daily['dayofweek'] = df_daily['ds'].dt.dayofweek
        df_daily['trend'] = range(1, len(df_daily) + 1)
        
        X = df_daily[['year', 'month', 'day', 'dayofweek', 'trend']]
        y = df_daily['y']
        
        # 4. Train RandomForestRegressor
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X, y)
        
        # 5. Predict Future Dates
        last_date = df_daily['ds'].max()
        future_dates = [last_date + pd.Timedelta(days=i) for i in range(1, request.horizon + 1)]
        
        future_df = pd.DataFrame({'ds': future_dates})
        future_df['year'] = future_df['ds'].dt.year
        future_df['month'] = future_df['ds'].dt.month
        future_df['day'] = future_df['ds'].dt.day
        future_df['dayofweek'] = future_df['ds'].dt.dayofweek
        future_df['trend'] = range(len(df_daily) + 1, len(df_daily) + request.horizon + 1)
        
        X_future = future_df[['year', 'month', 'day', 'dayofweek', 'trend']]
        future_preds = model.predict(X_future)
        
        # Format response
        historical_data = [{"date": row['ds'].strftime('%Y-%m-%d'), "value": float(row['y'])} for _, row in df_daily.iterrows()]
        forecast_data = [{"date": future_dates[i].strftime('%Y-%m-%d'), "value": float(future_preds[i])} for i in range(request.horizon)]
        
        return {
            "dataset_id": dataset_id,
            "horizon": request.horizon,
            "historical": historical_data,
            "forecast": forecast_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate forecast: {str(e)}")


@router.get("/{dataset_id}/export-notebook")
def export_notebook(
    dataset_id: str, 
    type: str = "full", 
    target_col: str = None, 
    model_type: str = None
):
    dataset_file = get_dataset_path(dataset_id)
    if not dataset_file:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    import json
    
    # Helper to create a notebook cell
    def create_code_cell(source):
        return {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [line + "\n" for line in source.strip().split("\n")]
        }

    def create_markdown_cell(source):
        return {
            "cell_type": "markdown",
            "metadata": {},
            "source": [line + "\n" for line in source.strip().split("\n")]
        }

    cells = []
    
    # --- HEADER ---
    cells.append(create_markdown_cell(f"# InsightForge AI Generated Notebook\n\nThis notebook contains the exact Python code used to analyze the dataset **{dataset_file.name}**."))
    
    # --- DATA LOADING ---
    cells.append(create_markdown_cell("## 1. Import Libraries & Load Data"))
    
    ext = dataset_file.suffix.lower()
    load_func = "pd.read_csv" if ext == ".csv" else "pd.read_excel"
    
    load_code = f"""
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

# Set plotting style
sns.set_theme(style="whitegrid")

# Load the dataset
# Note: You may need to change the file path if running this locally
file_path = "{dataset_file.name}"
try:
    df = {load_func}(file_path)
    print(f"Dataset loaded successfully with shape: {{df.shape}}")
except FileNotFoundError:
    print(f"Error: Please ensure '{dataset_file.name}' is in the same directory as this notebook.")
"""
    cells.append(create_code_cell(load_code))
    cells.append(create_code_cell("df.head()"))
    
    # --- EDA ---
    if type in ["eda", "full"]:
        cells.append(create_markdown_cell("## 2. Exploratory Data Analysis (EDA)"))
        
        eda_code_1 = """
# Dataset Overview
print("Dataset Info:")
df.info()

print("\\nMissing Values:")
print(df.isnull().sum()[df.isnull().sum() > 0])
"""
        cells.append(create_code_cell(eda_code_1))
        
        eda_code_2 = """
# Statistical Summary of Numerical Columns
df.describe().T
"""
        cells.append(create_code_cell(eda_code_2))
        
        eda_code_3 = """
# Correlation Heatmap
numeric_df = df.select_dtypes(include=[np.number])
if len(numeric_df.columns) > 1:
    plt.figure(figsize=(10, 8))
    sns.heatmap(numeric_df.corr(), annot=True, cmap='coolwarm', fmt=".2f", linewidths=0.5)
    plt.title("Correlation Matrix Heatmap")
    plt.tight_layout()
    plt.show()
else:
    print("Not enough numerical columns to generate a correlation heatmap.")
"""
        cells.append(create_code_cell(eda_code_3))
        
        eda_code_4 = """
# Missing Values Distribution
missing = df.isnull().sum()
missing = missing[missing > 0]
if not missing.empty:
    plt.figure(figsize=(10, 5))
    missing.sort_values(ascending=False).plot(kind='bar', color='salmon')
    plt.title("Count of Missing Values per Column")
    plt.ylabel("Count")
    plt.tight_layout()
    plt.show()
else:
    print("No missing values found in the dataset!")
"""
        cells.append(create_code_cell(eda_code_4))
        
        eda_code_5 = """
# Box Plots for Outlier Detection (First 10 numerical columns)
if not numeric_df.empty:
    cols_to_plot = numeric_df.columns[:10]
    plt.figure(figsize=(15, 8))
    sns.boxplot(data=numeric_df[cols_to_plot], orient="h")
    plt.title("Box Plots (Outlier Detection)")
    plt.tight_layout()
    plt.show()
"""
        cells.append(create_code_cell(eda_code_5))

    # --- MACHINE LEARNING ---
    if type in ["ml", "full"] and target_col and model_type:
        cells.append(create_markdown_cell(f"## 3. Machine Learning\\n\\nTraining a **{model_type}** model to predict **'{target_col}'**."))
        
        ml_prep_code = f"""
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.impute import SimpleImputer

target_col = '{target_col}'

# 1. Drop rows where target is missing
df_ml = df.dropna(subset=[target_col]).copy()

# 2. Separate Features (X) and Target (y)
X = df_ml.drop(columns=[target_col])
y = df_ml[target_col]

# 3. Handle Categorical Target Encoding
is_classification = False
if y.dtype == 'object' or y.nunique() < 15:
    is_classification = True
    le_target = LabelEncoder()
    y = le_target.fit_transform(y)
    print("Target variable encoded as categorical.")

# 4. Impute Missing Values in Features
numeric_cols = X.select_dtypes(include=[np.number]).columns
categorical_cols = X.select_dtypes(exclude=[np.number]).columns

if not numeric_cols.empty:
    num_imputer = SimpleImputer(strategy='mean')
    X[numeric_cols] = num_imputer.fit_transform(X[numeric_cols])

if not categorical_cols.empty:
    cat_imputer = SimpleImputer(strategy='most_frequent')
    X[categorical_cols] = cat_imputer.fit_transform(X[categorical_cols])

# 5. Encode Categorical Features
X = pd.get_dummies(X, columns=categorical_cols, drop_first=True)

# 6. Train/Test Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
print(f"Training set shape: {{X_train.shape}}")
print(f"Testing set shape: {{X_test.shape}}")
"""
        cells.append(create_code_cell(ml_prep_code))
        
        # Model mapping
        model_imports = {
            "random_forest_clf": "from sklearn.ensemble import RandomForestClassifier\nmodel = RandomForestClassifier(random_state=42)",
            "logistic_regression": "from sklearn.linear_model import LogisticRegression\nmodel = LogisticRegression(random_state=42, max_iter=1000)",
            "decision_tree_clf": "from sklearn.tree import DecisionTreeClassifier\nmodel = DecisionTreeClassifier(random_state=42)",
            "gradient_boosting_clf": "from sklearn.ensemble import GradientBoostingClassifier\nmodel = GradientBoostingClassifier(random_state=42)",
            "svc": "from sklearn.svm import SVC\nmodel = SVC(random_state=42, probability=True)",
            "random_forest_reg": "from sklearn.ensemble import RandomForestRegressor\nmodel = RandomForestRegressor(random_state=42)",
            "linear_regression": "from sklearn.linear_model import LinearRegression\nmodel = LinearRegression()",
            "decision_tree_reg": "from sklearn.tree import DecisionTreeRegressor\nmodel = DecisionTreeRegressor(random_state=42)",
            "gradient_boosting_reg": "from sklearn.ensemble import GradientBoostingRegressor\nmodel = GradientBoostingRegressor(random_state=42)",
            "svr": "from sklearn.svm import SVR\nmodel = SVR()"
        }
        
        model_init = model_imports.get(model_type, "from sklearn.ensemble import RandomForestClassifier\nmodel = RandomForestClassifier(random_state=42)")
        
        ml_train_code = f"""
# Initialize and Train Model
{model_init}

print(f"Training {{model.__class__.__name__}}...")
model.fit(X_train, y_train)

# Make Predictions
y_pred = model.predict(X_test)
print("Model training and prediction complete.")
"""
        cells.append(create_code_cell(ml_train_code))
        
        ml_eval_code = """
# Evaluate Model
if is_classification:
    from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, ConfusionMatrixDisplay
    
    acc = accuracy_score(y_test, y_pred)
    print(f"Accuracy Score: {acc * 100:.2f}%\\n")
    print("Classification Report:")
    print(classification_report(y_test, y_pred))
    
    # Plot Confusion Matrix
    cm = confusion_matrix(y_test, y_pred)
    disp = ConfusionMatrixDisplay(confusion_matrix=cm)
    disp.plot(cmap='Blues')
    plt.title("Confusion Matrix")
    plt.show()
else:
    from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
    
    mse = mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print(f"R-Squared (R2): {r2:.4f}")
    print(f"Root Mean Squared Error (RMSE): {rmse:.4f}")
    print(f"Mean Absolute Error (MAE): {mae:.4f}")
    
    # Plot Actual vs Predicted
    plt.figure(figsize=(8, 6))
    plt.scatter(y_test, y_pred, alpha=0.5)
    plt.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'r--', lw=2)
    plt.xlabel('Actual Values')
    plt.ylabel('Predicted Values')
    plt.title('Actual vs. Predicted')
    plt.tight_layout()
    plt.show()
"""
        cells.append(create_code_cell(ml_eval_code))
        
    notebook = {
        "cells": cells,
        "metadata": {
            "kernelspec": {
                "display_name": "Python 3",
                "language": "python",
                "name": "python3"
            },
            "language_info": {
                "codemirror_mode": {"name": "ipython", "version": 3},
                "file_extension": ".py",
                "mimetype": "text/x-python",
                "name": "python",
                "nbconvert_exporter": "python",
                "pygments_lexer": "ipython3",
                "version": "3.8.0"
            }
        },
        "nbformat": 4,
        "nbformat_minor": 4
    }
    
    from fastapi.responses import Response
    
    # Try to get the original filename from metadata
    export_filename = dataset_file.stem
    meta_path = get_metadata_path(dataset_id)
    if meta_path.exists():
        with open(meta_path, "r") as f:
            try:
                meta = json.load(f)
                if "original_filename" in meta:
                    export_filename = meta["original_filename"].rsplit('.', 1)[0]
            except Exception:
                pass
                
    return Response(
        content=json.dumps(notebook, indent=2),
        media_type="application/x-ipynb+json",
        headers={
            "Content-Disposition": f"attachment; filename=InsightForge_{type.upper()}_{export_filename}.ipynb"
        }
    )
