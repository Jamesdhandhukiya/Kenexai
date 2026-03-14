from flask import Blueprint, request, jsonify
from data import MANAGERS, INTERNS, TASKS, ALERTS, LOGS
import random

manager_bp = Blueprint('manager', __name__)

@manager_bp.route('/manager/overview', methods=['GET'])
def manager_overview():
    trend = [{"day": d, "score": random.randint(70, 95)} for d in ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]]
    deps = [{"name": "Data Eng", "interns": 12, "avgScore": 84}, {"name": "ML", "interns": 8, "avgScore": 89}, {"name": "Analytics", "interns": 5, "avgScore": 78}]
    return jsonify({
        "totalInterns": len(INTERNS),
        "activeInterns": len([i for i in INTERNS if i["status"] == "Active"]),
        "avgScore": 84,
        "completionRate": 72,
        "totalTasks": len(TASKS),
        "completedTasks": len([t for t in TASKS if t["status"] == "Completed"]),
        "inProgressTasks": len([t for t in TASKS if t["status"] == "In Progress"]),
        "pendingTasks": len([t for t in TASKS if t["status"] == "Pending"]),
        "unreadAlerts": len([a for a in ALERTS if not a["read"]]),
        "perfTrend": trend,
        "departments": deps
    })

@manager_bp.route('/manager/interns', methods=['GET'])
def manager_interns():
    return jsonify(INTERNS)

@manager_bp.route('/manager/tasks', methods=['GET', 'POST'])
def manager_tasks():
    if request.method == 'POST':
        data = request.json
        new_task = {
            "id": len(TASKS) + 1,
            "title": data.get("title"),
            "assignee": data.get("assignee"),
            "status": "Pending",
            "priority": data.get("priority", "Medium"),
            "progress": 0,
            "deadline": data.get("deadline")
        }
        TASKS.append(new_task)
        return jsonify(new_task)
    return jsonify(TASKS)

@manager_bp.route('/manager/comparison', methods=['GET'])
def manager_comparison():
    data = []
    for i in INTERNS[:5]:
        data.append({
            "id": i["id"],
            "name": i["name"],
            "department": i["department"],
            "overallScore": i["score"],
            "tasksCompleted": random.randint(5, 15),
            "streak": random.randint(2, 10),
            "skills": {
                "Python": random.randint(60, 100),
                "SQL": random.randint(60, 100),
                "ML": random.randint(40, 90),
                "Cloud": random.randint(30, 80),
                "Comm": random.randint(70, 100)
            }
        })
    return jsonify(data)

@manager_bp.route('/manager/analytics', methods=['GET'])
def manager_analytics():
    return jsonify({
        "monthly": [{"month": m, "avgScore": random.randint(75, 90), "tasksCompleted": random.randint(20, 40)} for m in ["Jan", "Feb", "Mar"]],
        "skills": [{"skill": "Python", "avg": 82}, {"skill": "SQL", "avg": 78}, {"skill": "ML", "avg": 65}, {"skill": "Data Viz", "avg": 88}],
        "topPerformers": [
            {"id": 1, "name": "Raj Patel", "department": "ML", "score": 95},
            {"id": 2, "name": "Priya Sharma", "department": "Data Eng", "score": 92}
        ]
    })

@manager_bp.route('/manager/alerts', methods=['GET'])
def manager_alerts():
    return jsonify(ALERTS)

@manager_bp.route('/manager/predictions', methods=['GET'])
def manager_predictions():
    return jsonify([
        {"id": 1, "name": "Emily Davis", "currentScore": 68, "predictedScore": 75, "trend": "up", "riskLevel": "Medium", "recommendation": "Focus on SQL optimization tasks."},
        {"id": 2, "name": "Marcus Lee", "currentScore": 74, "predictedScore": 70, "trend": "down", "riskLevel": "High", "recommendation": "Mentorship session for project management."}
    ])

@manager_bp.route('/manager/chat', methods=['POST'])
def manager_chat():
    msg = request.json.get("message", "").lower()
    reply = "I'm analyzing that for you. Based on the data, your team is performing 5% better than last month."
    if "emily" in msg: reply = "Emily Davis has 2 pending tasks. Her productivity score is 68%."
    elif "task" in msg: reply = f"There are {len(TASKS)} tasks in total, with {len([t for t in TASKS if t['status'] == 'In Progress'])} currently in progress."
    return jsonify({"reply": reply})

@manager_bp.route('/manager/daily-summary', methods=['GET'])
def manager_daily():
    return jsonify({
        "date": "2026-03-14",
        "completedToday": 3,
        "newTasks": 2,
        "teamHoursLogged": 42,
        "overallMood": "Productive",
        "highlights": ["Raj Patel completed the ETL pipeline migration.", "Team completed 90% of sprint goals."],
        "concerns": ["2 interns have not logged daily activity.", "Deadline for Project X is approaching."],
        "upcoming": [{"task": "ML Model v3", "assignee": "Priya Sharma", "deadline": "2026-03-16"}]
    })

@manager_bp.route('/manager/export/<type>', methods=['GET'])
def manager_export(type):
    data_map = {"interns": INTERNS, "tasks": TASKS, "alerts": ALERTS}
    return jsonify({"filename": f"{type}_export.csv", "data": data_map.get(type, [])})
