import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import joblib

def train():

    df = pd.read_csv("data/processed/intern_productivity.csv")

    X = df[[
        "total_activity_hours",
        "avg_progress",
        "tasks_completed",
        "task_efficiency"
    ]]

    y = df["productivity_score"]

    model = RandomForestRegressor()

    model.fit(X,y)

    joblib.dump(model,"ml/productivity_model.pkl")