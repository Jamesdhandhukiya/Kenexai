#!/usr/bin/env python
# coding: utf-8

# In[28]:


import pandas as pd
import os

# Load dataset
script_dir = os.path.dirname(__file__)
data_path = os.path.join(script_dir, "../data/intern_courses.csv")
df = pd.read_csv(data_path)

# Define course links
course_links = {
    "Basic SQL": "https://kenexai.com/courses/Basic-SQL",
    "Advanced SQL": "https://kenexai.com/courses/Advanced-SQL",
    "Python Basics": "https://kenexai.com/courses/Python-Basics",
    "Advanced Python": "https://kenexai.com/courses/Advanced-Python",
    "NumPy & Pandas": "https://kenexai.com/courses/NumPy-&-Pandas",
    "Machine Learning Fundamentals": "https://kenexai.com/courses/Machine-Learning-Fundamentals",
    "Deep Learning Intro": "https://kenexai.com/courses/Deep-Learning-Intro",
    "Cloud Fundamentals": "https://kenexai.com/courses/Cloud-Fundamentals",
    "Docker Essentials": "https://kenexai.com/courses/Docker-Essentials",
    "Power BI Analytics": "https://kenexai.com/courses/Power-BI-Analytics"
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

# Example usage
user_email = "manish@kenexai.com"
recs = recommend_courses(user_email)

print(f"Recommendations for {user_email}:")
for r in recs:
    print(f"- {r['course']}: {r['link']}")


# In[29]:


recommend_courses("neha@kenexai.com")


# In[30]:


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

# Build a simple embedding model
model = Sequential([
    Embedding(input_dim=n_emails, output_dim=4, input_length=1),
    Flatten(),
    Dense(16, activation='relu'),
    Dense(n_courses, activation='softmax')
])

model.compile(loss='categorical_crossentropy', optimizer='adam', metrics=['accuracy'])
model.fit(X, y_cat, epochs=5, batch_size=16)

# Save model
model.save("/content/course_recommender.h5")


# In[43]:


course_links = {
    "Basic SQL": "https://kenexai.com/courses/Basic-SQL",
    "Advanced SQL": "https://kenexai.com/courses/Advanced-SQL",
    "Python Basics": "https://kenexai.com/courses/Python-Basics",
    "Advanced Python": "https://kenexai.com/courses/Advanced-Python",
    "NumPy & Pandas": "https://kenexai.com/courses/NumPy-&-Pandas",
    "Machine Learning Fundamentals": "https://kenexai.com/courses/Machine-Learning-Fundamentals",
    "Deep Learning Intro": "https://kenexai.com/courses/Deep-Learning-Intro",
    "Cloud Fundamentals": "https://kenexai.com/courses/Cloud-Fundamentals",
    "Docker Essentials": "https://kenexai.com/courses/Docker-Essentials",
    "Power BI Analytics": "https://kenexai.com/courses/Power-BI-Analytics"
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

# -------------------------
# 7️⃣ Test
# -------------------------
print("Recommendations for Manish:", recommend_courses("manish@kenexai.com"))
print("Recommendations for new user:", recommend_courses("riya@kenexai.com"))


# In[45]:


recommend_courses("ayush@kenexai.com")





# In[ ]:




