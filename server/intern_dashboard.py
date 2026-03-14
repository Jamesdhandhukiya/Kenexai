from flask import Blueprint, request, jsonify
from data import INTERNS, TASKS, LOGS, sb_admin
from datetime import datetime
import random
import json
import os

intern_bp = Blueprint('intern', __name__)

COMPLETIONS_PATH = os.path.join(os.path.dirname(__file__), 'data', 'course_completions.json')

def _load_completions():
    try:
        if os.path.exists(COMPLETIONS_PATH):
            with open(COMPLETIONS_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception:
        pass
    return {}

def _save_completions(data):
    try:
        os.makedirs(os.path.dirname(COMPLETIONS_PATH), exist_ok=True)
        with open(COMPLETIONS_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"[KenexAI] Failed to save course completions: {e}")

def _get_email_from_id(profile_id):
    profile_res = sb_admin.table("profiles").select("email, manager_id").eq("id", profile_id).execute()
    if not profile_res.data:
        return None, None
    row = profile_res.data[0]
    return (row.get("email"), row.get("manager_id"))

@intern_bp.route('/intern/tasks/<id>', methods=['GET'])
def intern_tasks(id):
    # Fetch profile to get email
    profile_res = sb_admin.table("profiles").select("email").eq("id", id).execute()
    if not profile_res.data:
        return jsonify([])
    
    email = profile_res.data[0]["email"]
    tasks_res = sb_admin.table("silver_tasks").select("*").eq("email", email).execute()
    
    mapped_tasks = []
    for row in tasks_res.data:
        hw = row.get("hours_actual") or 0
        he = row.get("hours_estimated") or 1
        he = he if he > 0 else 1
        progress = int((hw / he) * 100) if row.get("task_status") != "Completed" else 100
        
        mapped_tasks.append({
            "id": row.get("task_id"),
            "title": row.get("task_name"),
            "status": row.get("task_status", "Pending"),
            "priority": row.get("priority", "Medium"),
            "progress": min(100, max(0, progress)),
            "deadline": row.get("deadline", "")
        })
    return jsonify(mapped_tasks)

@intern_bp.route('/intern/tasks/<task_id>/progress', methods=['PUT'])
def update_task_progress(task_id):
    data = request.json
    prog = data.get("progress", 0)
    status = data.get("status")
    
    # Fetch task to get hours_estimated
    task_res = sb_admin.table("silver_tasks").select("*").eq("task_id", task_id).execute()
    if not task_res.data:
        return jsonify({"error": "Task not found"}), 404
        
    row = task_res.data[0]
    he = row.get("hours_estimated") or 10
    
    update_data = {}
    
    if status:
        update_data["task_status"] = status
        # Update hours based on status if needed
        if status in ["Completed", "Approved"]:
            update_data["hours_actual"] = he
        elif status == "Pending":
            update_data["hours_actual"] = 0
            
    if prog == 100 and "task_status" not in update_data:
        update_data["task_status"] = "Completed"
        update_data["hours_actual"] = he
    elif prog > 0 and "hours_actual" not in update_data:
        update_data["hours_actual"] = int(he * (prog / 100))
        if "task_status" not in update_data:
            update_data["task_status"] = "In Progress"
            
    up_res = sb_admin.table("silver_tasks").update(update_data).eq("task_id", task_id).execute()
    if up_res.data:
        updated_row = up_res.data[0]
        hw = updated_row.get("hours_actual") or 0
        current_status = updated_row.get("task_status", "Pending")
        # Final progress calc
        progress = int((hw / he) * 100) if current_status not in ["Completed", "Approved"] else 100
        
        return jsonify({
            "id": updated_row.get("task_id"),
            "title": updated_row.get("task_name"),
            "status": current_status,
            "priority": updated_row.get("priority", "Medium"),
            "progress": min(100, max(0, progress)),
            "deadline": updated_row.get("deadline", "")
        })
    return jsonify({"error": "Failed to update"}), 500

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

@intern_bp.route('/intern/course-completions', methods=['GET'])
def get_course_completions():
    email = (request.args.get('email') or '').strip().lower()
    if not email:
        return jsonify({"completed": [], "testResults": []})
    data = _load_completions()
    user = data.get(email, {"completed": [], "tests": []})
    return jsonify({
        "completed": user.get("completed", []),
        "testResults": user.get("tests", [])
    })

@intern_bp.route('/intern/course-completions', methods=['POST'])
def post_course_completion():
    body = request.get_json(force=True) or {}
    email = (body.get('email') or '').strip().lower()
    course = (body.get('course') or '').strip()
    if not email or not course:
        return jsonify({"error": "email and course required"}), 400
    data = _load_completions()
    if email not in data:
        data[email] = {"completed": [], "tests": []}
    if course not in data[email]["completed"]:
        data[email]["completed"].append(course)
    _save_completions(data)
    return jsonify({"completed": data[email]["completed"], "testResults": data[email].get("tests", [])})

@intern_bp.route('/intern/test-result', methods=['POST'])
def post_test_result():
    body = request.get_json(force=True) or {}
    email = (body.get('email') or '').strip().lower()
    course = (body.get('course') or '').strip()
    score = int(body.get('score', 0))
    hours_spent = int(body.get('hours_spent', 0)) or max(1, min(50, score // 5))
    if not email or not course:
        return jsonify({"error": "email and course required"}), 400
    data = _load_completions()
    if email not in data:
        data[email] = {"completed": [], "tests": []}
    data[email]["tests"].append({
        "course": course,
        "score": score,
        "hours_spent": hours_spent,
        "completed_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    })
    if course not in data[email]["completed"]:
        data[email]["completed"].append(course)
    _save_completions(data)
    return jsonify({"ok": True})

@intern_bp.route('/intern/growth/<id>', methods=['GET'])
def intern_growth(id):
    email, manager_id = _get_email_from_id(id)
    if not email:
        return jsonify({"error": "Profile not found"}), 404
    data = _load_completions()
    user_data = data.get(email, {"completed": [], "tests": []})
    tests = user_data.get("tests", [])
    completed = user_data.get("completed", [])

    # One certification per course: keep only the first completion (first time they passed/completed)
    seen_courses = set()
    certifications = []
    total_hours = 0
    for t in tests:
        course_name = (t.get("course") or "").strip()
        if not course_name or course_name in seen_courses:
            continue
        seen_courses.add(course_name)
        certifications.append({
            "course": course_name,
            "hours_spent": t.get("hours_spent", 0),
            "skill_level": _score_to_skill_level(t.get("score", 0)),
            "score": t.get("score", 0),
            "completed_at": t.get("completed_at", "")
        })
        total_hours += t.get("hours_spent", 0)

    current_skills = {}
    for t in tests:
        name = t.get("course", "").split()[-1] if t.get("course") else "Skill"
        if "SQL" in (t.get("course") or ""):
            current_skills["SQL"] = t.get("score", 0)
        elif "Python" in (t.get("course") or ""):
            current_skills["Python"] = t.get("score", 0)
        elif "ML" in (t.get("course") or "") or "Machine" in (t.get("course") or ""):
            current_skills["Machine Learning"] = t.get("score", 0)
        else:
            current_skills[name or "Other"] = t.get("score", 0)
    if not current_skills:
        current_skills = {"Python": 0, "SQL": 0, "Machine Learning": 0}

    # Growth chart: one point per course (first attempt only) so no duplicate course entries
    growth_chart = []
    chart_seen = set()
    for t in tests:
        course_name = (t.get("course") or "").strip()
        if course_name and course_name not in chart_seen:
            chart_seen.add(course_name)
            growth_chart.append({
                "week": f"W{len(growth_chart) + 1}",
                "Score": t.get("score", 0),
                "course": course_name
            })
        if len(growth_chart) >= 10:
            break
    if not growth_chart:
        growth_chart = [{"week": f"W{i}", "Score": 60 + i * 5} for i in range(1, 6)]

    same_mentor_emails = []
    if manager_id:
        same_mentor = sb_admin.table("profiles").select("email").eq("manager_id", manager_id).eq("role", "intern").execute()
        same_mentor_emails = [r["email"].lower().strip() for r in (same_mentor.data or [])]
    all_scores = []
    for em in same_mentor_emails:
        ud = data.get(em, {"tests": []})
        total = sum(t.get("score", 0) for t in ud.get("tests", []))
        all_scores.append((em, total))
    all_scores.sort(key=lambda x: -x[1])
    rank = 0
    cohort_size = len(same_mentor_emails)
    # Only show rank when cohort has at least 2 and not everyone is tied (same level)
    if cohort_size >= 2:
        scores_only = [s for _, s in all_scores]
        if len(set(scores_only)) > 1:  # at least two different totals
            for i, (em, _) in enumerate(all_scores, 1):
                if em == email.lower().strip():
                    rank = i
                    break

    milestones = []
    for c in certifications:
        milestones.append({
            "title": c["course"] + " (Cert)",
            "status": "completed",
            "date": (c.get("completed_at") or "")[:10],
            "score": c.get("score"),
            "skill_level": c.get("skill_level")
        })
    # Ranking is shown only once in the UI via mentorRank/mentorCohortSize; do not add to milestones

    return jsonify({
        "totalHoursLearned": total_hours,
        "coursesCompleted": len(completed),
        "certificationsEarned": len(certifications),
        "certifications": certifications,
        "currentSkills": current_skills,
        "growthChart": growth_chart,
        "milestones": milestones,
        "mentorRank": rank,
        "mentorCohortSize": cohort_size
    })

def _score_to_skill_level(score):
    if score >= 90:
        return "Expert"
    if score >= 75:
        return "Advanced"
    if score >= 60:
        return "Intermediate"
    if score >= 40:
        return "Beginner"
    return "Starter"

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
