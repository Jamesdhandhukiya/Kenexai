from flask import Blueprint, request, jsonify
from data import MANAGERS, INTERNS, TASKS, ALERTS, LOGS
import random

def get_manager_interns():
    manager_id = request.args.get('manager_id')
    if manager_id and manager_id != 'undefined':
        return [i for i in INTERNS if str(i.get("manager_id")) == str(manager_id)]
    return INTERNS


manager_bp = Blueprint('manager', __name__)

@manager_bp.route('/manager/overview', methods=['GET'])
def manager_overview():
    my_interns = get_manager_interns()
    trend = [{"day": d, "score": random.randint(70, 95)} for d in ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]]
    deps = [{"name": "Data Eng", "interns": 12, "avgScore": 84}, {"name": "ML", "interns": 8, "avgScore": 89}, {"name": "Analytics", "interns": 5, "avgScore": 78}]
    return jsonify({
        "totalInterns": len(my_interns),
        "activeInterns": len([i for i in my_interns if i["status"] == "Active"]),
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
    return jsonify(get_manager_interns())

@manager_bp.route('/manager/tasks', methods=['GET', 'POST'])
def manager_tasks():
    my_interns_names = [i["name"] for i in get_manager_interns()]
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
    return jsonify([t for t in TASKS if t.get("assignee") in my_interns_names])

@manager_bp.route('/manager/comparison', methods=['GET'])
def manager_comparison():
    my_interns = get_manager_interns()
    data = []
    for i in my_interns[:5]:
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
    my_interns = get_manager_interns()
    top_performers = sorted(my_interns, key=lambda x: x.get("score", 0), reverse=True)[:2]
    return jsonify({
        "monthly": [{"month": m, "avgScore": random.randint(75, 90), "tasksCompleted": random.randint(20, 40)} for m in ["Jan", "Feb", "Mar"]],
        "skills": [{"skill": "Python", "avg": 82}, {"skill": "SQL", "avg": 78}, {"skill": "ML", "avg": 65}, {"skill": "Data Viz", "avg": 88}],
        "topPerformers": [
            {"id": p["id"], "name": p["name"], "department": p["department"], "score": p.get("score", 0)} for p in top_performers
        ]
    })

@manager_bp.route('/manager/alerts', methods=['GET'])
def manager_alerts():
    my_interns_names = [i["name"] for i in get_manager_interns()]
    return jsonify([a for a in ALERTS if not a.get("intern") or a.get("intern") in my_interns_names])

@manager_bp.route('/manager/predictions', methods=['GET'])
def manager_predictions():
    my_interns = get_manager_interns()
    data = []
    for i in my_interns:
        score = i.get("score", 0)
        trend = "up" if random.choice([True, False]) else "down"
        risk = "High" if score < 60 else "Medium" if score < 80 else "Low"
        data.append({
            "id": i["id"],
            "name": i["name"],
            "currentScore": score,
            "predictedScore": min(100, score + random.randint(-5, 10)),
            "trend": trend,
            "riskLevel": risk,
            "recommendation": "Mentorship session recommended." if risk == "High" else "On track."
        })
    return jsonify(data)

@manager_bp.route('/manager/chat', methods=['POST'])
def manager_chat():
    my_interns = get_manager_interns()
    my_tasks = [t for t in TASKS if t.get("assignee") in [i["name"] for i in my_interns]]
    
    msg = request.json.get("message", "").lower()
    reply = "I'm analyzing that for you. Based on the data, your team is performing 5% better than last month."
    
    # Simple keyword search through my interns
    for i in my_interns:
        if i["name"].lower().split()[0] in msg:
            reply = f"{i['name']} has a productivity score of {i.get('score', 0)}% and their status is {i.get('status', 'Active')}."
            
    if "task" in msg:
        reply = f"There are {len(my_tasks)} tasks in total, with {len([t for t in my_tasks if t['status'] == 'In Progress'])} currently in progress."
        
    return jsonify({"reply": reply})

@manager_bp.route('/manager/daily-summary', methods=['GET'])
def manager_daily():
    my_interns = get_manager_interns()
    my_interns_names = [i["name"] for i in my_interns]
    my_tasks = [t for t in TASKS if t.get("assignee") in my_interns_names]
    
    return jsonify({
        "date": "2026-03-14",
        "completedToday": len([t for t in my_tasks if t["status"] == "Completed"]),
        "newTasks": len([t for t in my_tasks if t["status"] == "Pending"]),
        "teamHoursLogged": len(my_interns) * 7,
        "overallMood": "Productive" if len(my_interns) > 0 else "Quiet",
        "highlights": [f"{my_interns[0]['name']} finished all tasks!" if my_interns else "Team setup complete."],
        "concerns": ["Please review pending tasks."],
        "upcoming": [{"task": t["title"], "assignee": t["assignee"], "deadline": t.get("deadline", "Soon")} for t in my_tasks[:3]]
    })

@manager_bp.route('/manager/export/<type>', methods=['GET'])
def manager_export(type):
    my_interns = get_manager_interns()
    my_interns_names = [i["name"] for i in my_interns]
    
    data_map = {
        "interns": my_interns, 
        "tasks": [t for t in TASKS if t.get("assignee") in my_interns_names], 
        "alerts": [a for a in ALERTS if not a.get("intern") or a.get("intern") in my_interns_names]
    }
    return jsonify({"filename": f"{type}_export.csv", "data": data_map.get(type, [])})
