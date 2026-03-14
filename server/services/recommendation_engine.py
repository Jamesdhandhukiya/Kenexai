#!/usr/bin/env python
# coding: utf-8

# In[28]:


import pandas as pd
import os
import tensorflow as tf
from tensorflow.keras.models import load_model

# Load dataset
script_dir = os.path.dirname(__file__)
data_path = os.path.join(script_dir, "../data/intern_courses.csv")
df = pd.read_csv(data_path)

# Define course links
course_links = {
    "Basic SQL": "https://www.coursera.org/learn/learn-sql-basics-data-science",
    "Advanced SQL": "https://www.coursera.org/learn/sql-querying-advanced-lo094030",
    "Python Basics": "https://www.coursera.org/learn/python-basics",
    "Advanced Python": "https://www.coursera.org/learn/python-for-applied-data-science-ai",
    "NumPy & Pandas": "https://www.coursera.org/learn/python-for-applied-data-science-ai",
    "Machine Learning Fundamentals": "https://www.coursera.org/learn/machine-learning-fundamentals-dartmouth",
    "Deep Learning Intro": "https://www.coursera.org/learn/neural-networks-deep-learning",
    "Cloud Fundamentals": "https://www.coursera.org/learn/gcp-fundamentals",
    "Docker Essentials": "https://www.coursera.org/learn/ibm-containers-docker-kubernetes-openshift",
    "Power BI Analytics": "https://www.coursera.org/learn/data-analysis-and-visualization-with-power-bi"
}

# Rule-based mapping of category → recommended courses
category_recommendations = {
    "Data": ["Basic SQL", "Advanced SQL", "NumPy & Pandas", "Power BI Analytics"],
    "Programming": ["Python Basics", "Advanced Python", "NumPy & Pandas"],
    "AI": ["Machine Learning Fundamentals", "Deep Learning Intro", "Python Basics"],
    "Cloud": ["Cloud Fundamentals", "Docker Essentials"],
    "DevOps": ["Docker Essentials", "Cloud Fundamentals"],
    "Analytics": ["Power BI Analytics", "NumPy & Pandas"]
}

def recommend_courses(email):
    # Find all categories for the user
    user_categories = df[df['email'] == email]['category'].unique()

    # Collect recommendations based on categories
    recommendations = []
    for cat in user_categories:
        for course in category_recommendations.get(cat, []):
            recommendations.append({"course": course, "link": course_links.get(course, "#")})

    # Remove duplicates
    unique_recs = [dict(t) for t in {tuple(d.items()) for d in recommendations}]

    return unique_recs if unique_recs else [{"course": "No recommendations found", "link": "#"}]


recommend_courses("shruti@kenexai.com")


# In[31]:


recommend_courses("riya@kenexai.com")


# In[42]:


import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import Embedding, Flatten, Dense
from tensorflow.keras.utils import to_categorical

# Load dataset
script_dir = os.path.dirname(__file__)
data_path = os.path.join(script_dir, "../data/intern_courses.csv")
df = pd.read_csv(data_path)
df = df[['email', 'course_name']]

# Encode emails and courses
email_encoder = LabelEncoder()
course_encoder = LabelEncoder()
df['email_id'] = email_encoder.fit_transform(df['email'])
df['course_id'] = course_encoder.fit_transform(df['course_name'])

n_emails = df['email_id'].nunique()
n_courses = df['course_id'].nunique()

X = df['email_id'].values
y = df['course_id'].values
y_cat = to_categorical(y, num_classes=n_courses)

import os
import logging
logging.getLogger('tensorflow').setLevel(logging.ERROR)
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

# ... existing code ...

# Build or load model
model_path = os.path.join(script_dir, "../models/course_recommender.h5")
try:
    model = tf.keras.models.load_model(model_path)
except Exception as e:
    print(f"Loading model failed: {e}. Retraining...")
    # Build a simple embedding model
    model = Sequential([
        Embedding(input_dim=n_emails, output_dim=4),
        Flatten(),
        Dense(16, activation='relu'),
        Dense(n_courses, activation='softmax')
    ])

    model.compile(loss='categorical_crossentropy', optimizer='adam', metrics=['accuracy'])
    model.fit(X, y_cat, epochs=5, batch_size=16, verbose=0)  # Suppress training output

    # Save model
    model.save(model_path)


# In[43]:


course_links = {
    "Basic SQL": "https://www.coursera.org/learn/learn-sql-basics-data-science",
    "Advanced SQL": "https://www.coursera.org/learn/sql-querying-advanced-lo094030",
    "Python Basics": "https://www.coursera.org/learn/python-basics",
    "Advanced Python": "https://www.coursera.org/learn/python-for-applied-data-science-ai",
    "NumPy & Pandas": "https://www.coursera.org/learn/python-for-applied-data-science-ai",
    "Machine Learning Fundamentals": "https://www.coursera.org/learn/machine-learning-fundamentals-dartmouth",
    "Deep Learning Intro": "https://www.coursera.org/learn/neural-networks-deep-learning",
    "Cloud Fundamentals": "https://www.coursera.org/learn/gcp-fundamentals",
    "Docker Essentials": "https://www.coursera.org/learn/ibm-containers-docker-kubernetes-openshift",
    "Power BI Analytics": "https://www.coursera.org/learn/data-analysis-and-visualization-with-power-bi"
}

fallback_courses = ["Basic SQL", "NumPy & Pandas", "Power BI Analytics", "Python Basics"]


# In[44]:


def recommend_courses(email, top_n=5):
    if email in df['email'].values:
        email_id = email_encoder.transform([email])
        pred = model.predict(np.array(email_id))
        top_indices = pred[0].argsort()[-top_n:][::-1]
        courses = course_encoder.inverse_transform(top_indices)
        return [{"course": c, "link": course_links[c]} for c in courses]
    else:
        # Rule-based fallback for unknown emails
        return [{"course": c, "link": course_links[c]} for c in fallback_courses[:top_n]]





# In[ ]:




