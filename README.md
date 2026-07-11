<div align="center">
  <img src="./frontend/public/logo2.png" alt="InsightForge AI Logo" width="120" />
</div>

<h1 align="center">InsightForge AI</h1>

<p align="center">
  <strong>No-Code Automated Machine Learning & Data Science Workspace</strong><br>
  Built using Next.js • FastAPI • TypeScript • Tailwind CSS • Scikit-Learn
</p>

<p align="center">
  <a href="#">🔗 Live Demo</a>
</p>

---

## 🚀 Overview
**InsightForge AI** is a modern, AI-powered Data Science workspace designed to democratize machine learning. It serves as my **Final Year B.Tech (CSE - Data Science)** project. 

Instead of writing hundreds of lines of Python code for data preprocessing, visualization, and model training, InsightForge AI provides a beautiful, unified dashboard. It automatically profiles your data, cleans it, trains Machine Learning models, forecasts time-series data, and even provides an interactive AI Assistant—all without a single line of code!

---

## ✨ Features

### 📊 Automated Exploratory Data Analysis (EDA)
- **Data Profiling**: Instantly view row/column counts, missing values, memory usage, and data types.
- **Visual Analytics**: Automatically generated interactive Correlation Heatmaps, Box Plots (Outlier Detection), and Descriptive Statistics tables using Plotly.
- **One-Click Data Cleaning**: Standardize column names, drop missing values, and handle extreme outliers using the Interquartile Range (IQR) method with a single click.

### 🤖 No-Code Machine Learning (AutoML)
- **Classification & Regression Support**: Automatically detects if your target variable requires Classification or Regression.
- **Multiple Algorithms**: Train using Random Forest, Logistic/Linear Regression, Decision Trees, Gradient Boosting, or Support Vector Machines (SVM).
- **Instant Metrics**: View R-Squared, MSE, MAE, Accuracy, Precision, Recall, and F1-Score instantly.
- **Advanced Visualizations**: Interactive Confusion Matrices and ROC Curves.

### 📈 Time-Series Forecasting
- **Time Feature Engineering**: Automatically extracts Year, Month, Day, Day-of-week, and Trend features from your datetime columns.
- **ML Forecasting**: Uses `RandomForestRegressor` to predict future values.
- **Interactive Projections**: Beautifully visualizes historical data alongside future projections.

### 💬 AI Data Scientist Assistant
- **Interactive Chat**: Ask questions about your dataset.
- **Automated Insights**: Identifies dataset shape, feature importance, and best modeling strategies automatically.

### 📄 Report Generation & Export
- **PDF Reports**: Print and save your entire Data Science workspace into a professional PDF report.
- **Jupyter Notebook Export**: Download a fully executable `.ipynb` Jupyter Notebook containing the exact Python code used to generate your EDA and ML Models!

---

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js** | Frontend Framework |
| **React** | UI Library |
| **TypeScript** | Type-Safe Programming Language |
| **Tailwind CSS** | Modern Styling & Animations |
| **FastAPI** | High-Performance Python Backend |
| **Pandas / NumPy**| Data Manipulation |
| **Scikit-Learn** | Machine Learning Engine |
| **Plotly.js** | Interactive Data Visualization |

---

## 🏗 Project Architecture

```text
User 
  ↓ 
Upload Dataset (CSV/Excel) 
  ↓ 
FastAPI Backend (Data Storage & Profiling)
  ↓ 
Frontend Workspace (Next.js)
  ↓ 
Automated EDA & Cleaning
  ↓ 
Machine Learning Studio / Time-Series Forecasting
  ↓ 
Model Training & Evaluation
  ↓ 
Results Dashboard & PDF/Notebook Export
```

---

## ⚙ Setup & Installation

### 1. Clone the repository
```bash
git clone https://github.com/adityakumarsingh01/InsightForge-AI.git
cd InsightForgeAI
```

### 2. Backend Setup (FastAPI)
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```
*(The backend will run on `http://localhost:8000`)*

### 3. Frontend Setup (Next.js)
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
*(The frontend will run on `http://localhost:3000`)*

---

## 🖼 Project Screenshots

### 🏠 Workspace Dashboard
*(Add your screenshot here: `![Dashboard](./screenshots/dashboard.png)`)*

### 📊 Exploratory Data Analysis
*(Add your screenshot here: `![EDA](./screenshots/eda.png)`)*

### 🤖 Machine Learning Studio
*(Add your screenshot here: `![ML Studio](./screenshots/ml.png)`)*

### 📈 Time-Series Forecasting
*(Add your screenshot here: `![Forecasting](./screenshots/forecast.png)`)*

### 💬 AI Assistant
*(Add your screenshot here: `![AI Chat](./screenshots/chat.png)`)*

---

## ⚖ Design Decisions & Trade-offs

### Decisions
- **FastAPI over Django/Flask**: Chosen for its incredible speed, asynchronous capabilities, and automatic Swagger documentation, making UI integration seamless.
- **Scikit-Learn for Forecasting**: Bypassed traditional statistical libraries like `prophet` to ensure maximum compatibility and zero complicated C++ build dependencies during deployment.
- **Local File Storage**: Datasets are temporarily stored in the backend filesystem for rapid Pandas processing rather than pushing/pulling from a SQL database.

### Trade-offs
- **In-Memory Processing**: Large datasets (1GB+) might cause memory bottlenecks since Pandas loads data directly into RAM. Big Data frameworks (like PySpark) would be needed for massive scale.
- **Frontend AI Mocking**: The AI Chat Assistant currently utilizes frontend logic to simulate LLM responses for the sake of the college project scope without requiring paid OpenAI API keys.

---

## 🚀 Future Improvements
- **Deep Learning Support**: Integrate TensorFlow/PyTorch for Neural Networks.
- **Real LLM Integration**: Connect the AI Assistant to an open-source local LLM (like Llama 3) or OpenAI.
- **Cloud Database Storage**: Migrate from local CSV files to AWS S3 or PostgreSQL storage.
- **Automated Hyperparameter Tuning**: Implement GridSearch or Optuna to automatically find the best model parameters.

---

## 📋 Assignment Requirements Covered
- [x] Overview
- [x] Setup & Installation
- [x] Architecture
- [x] Design Decisions
- [x] Trade-offs
- [x] Future Improvements
- [x] Public GitHub Repository
- [x] README Documentation

---

## 👨‍💻 Author

**Aditya Kumar Singh**  
*B.Tech (Hons.) Computer Science & Engineering (Data Science & Data Engineering)*  
Lovely Professional University  

⭐ **If you like this project, please consider giving this repository a ⭐ on GitHub!**
