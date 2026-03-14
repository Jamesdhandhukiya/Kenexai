from flask import Blueprint, request, jsonify
from data import INTERNS, TASKS, LOGS
from datetime import datetime
import random

intern_bp = Blueprint('intern', __name__)

@intern_bp.route('/intern/tasks/<id>', methods=['GET'])
def intern_tasks(id):
    # Match by email or local ID
    intern = next((i for i in INTERNS if str(i["id"]) == str(id)), None)
    name = intern["name"] if intern else "Alex Johnson"
    return jsonify([t for t in TASKS if t["assignee"] == name])

@intern_bp.route('/intern/tasks/<task_id>/progress', methods=['PUT'])
def update_task_progress(task_id):
    prog = request.json.get("progress", 0)
    task = next((t for t in TASKS if str(t["id"]) == str(task_id)), None)
    if task:
        task["progress"] = prog
        if prog == 100: task["status"] = "Completed"
        elif prog > 0: task["status"] = "In Progress"
        return jsonify(task)
    return jsonify({"error": "Task not found"}), 404

@intern_bp.route('/intern/activity/<id>', methods=['GET'])
def intern_activity_get(id):
    return jsonify([l for l in LOGS if str(l.get("intern_id")) == str(id)])

@intern_bp.route('/intern/activity', methods=['POST'])
def intern_activity_post():
    data = request.json
    new_log = {
        "id": len(LOGS) + 1,
        "intern_id": data.get("intern_id"),
        "hours": data.get("hours"),
        "task_worked": data.get("task_worked"),
        "description": data.get("description"),
        "blockers": data.get("blockers"),
        "date": datetime.now().strftime("%Y-%m-%d %H:%M")
    }
    LOGS.append(new_log)
    return jsonify(new_log)

@intern_bp.route('/intern/productivity/<id>', methods=['GET'])
def intern_productivity(id):
    return jsonify({
        "overall": 87,
        "rank": 4,
        "totalInterns": len(INTERNS),
        "totalTasks": 8,
        "completedTasks": 5,
        "inProgressTasks": 2,
        "avgProgress": 65,
        "onTimeRate": 92,
        "qualityScore": 88,
        "consistency": 85,
        "weekly": [{"day": d, "score": random.randint(80, 95)} for d in ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]]
    })

@intern_bp.route('/intern/growth/<id>', methods=['GET'])
def intern_growth(id):
    return jsonify({
        "totalHoursLearned": 124,
        "coursesCompleted": 6,
        "certificationsEarned": 2,
        "currentSkills": {"Python": 85, "SQL": 92, "Machine Learning": 74, "Data Viz": 68},
        "growthChart": [{"week": f"W{i}", "Python": 60+i*5, "SQL": 70+i*4, "ML": 40+i*6} for i in range(1, 6)],
        "milestones": [
            {"title": "Advanced SQL Cert", "status": "completed", "date": "2026-03-01"},
            {"title": "PySpark Masterclass", "status": "in-progress", "progress": 65},
            {"title": "MLOps Fundamentals", "status": "upcoming", "date": "2026-04-01"}
        ]
    })

@intern_bp.route('/intern/recommendations/<id>', methods=['GET'])
def intern_recs(id):
    return jsonify({
        "weeklyGoal": "Improve SQL query performance by 20% using window functions.",
        "skillRecommendations": [
            {"skill": "Machine Learning", "currentLevel": 74, "targetLevel": 85, "priority": "High", "suggestion": "Take the 'Scalable ML with Spark' course."},
            {"skill": "Data Visualization", "currentLevel": 68, "targetLevel": 80, "priority": "Medium", "suggestion": "Try building a Tableau dashboard for the sales dataset."}
        ],
        "taskRecommendations": [
            {"title": "Optimize ETL Pipeline", "impact": "High", "reason": "Will improve data processing speed for the whole team."},
            {"title": "Unit Test Coverage", "impact": "Medium", "reason": "Ensure stability of the new API integration."}
        ],
        "courseRecommendations": [
            {"name": "Complete Python for Data Science", "provider": "Coursera", "duration": "12h", "relevance": 95},
            {"name": "Advanced PostgreSQL", "provider": "Udemy", "duration": "8h", "relevance": 88}
        ],
        "strengths": [
            {"skill": "Python Coding", "score": 92},
            {"skill": "Team Collaboration", "score": 88}
        ]
    })
