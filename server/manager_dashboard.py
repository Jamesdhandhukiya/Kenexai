from flask import Blueprint, request, jsonify
from data import MANAGERS, INTERNS, TASKS, ALERTS, LOGS, sb_admin
import random
import uuid
import datetime
import re
from collections import defaultdict

def get_manager_interns():
    manager_id = request.args.get('manager_id')
    if not manager_id or manager_id == 'undefined':
        return []
    return [i for i in INTERNS if str(i.get("manager_id")) == str(manager_id)]

manager_bp = Blueprint('manager', __name__)

# ─── HELPER: Fetch all silver_tasks for manager's interns ───
def _fetch_silver_tasks(my_interns):
    emails = [i["email"] for i in my_interns]
    if not emails:
        return []
    return sb_admin.table("silver_tasks").select("*").in_("email", emails).execute().data or []

# ─── HELPER: Compute intern performance score from task data ───
def _compute_intern_score(tasks):
    """
    Score formula (out of 100):
      - completion_rate (30%): % of tasks completed
      - avg_task_score (25%): average task_score from silver table
      - quality_avg (20%): average quality_rating × 20 (scale 1-5 → 0-100)
      - on_time_rate (15%): % of tasks completed on time (delay_days == 0)
      - progress_factor (10%): average progress across all tasks
    """
    if not tasks:
        return {"overall": 0, "completion_rate": 0, "avg_task_score": 0, "quality_avg": 0, "on_time_rate": 0, "progress_factor": 0}
    
    total = len(tasks)
    completed = [t for t in tasks if t.get("task_status") == "Completed"]
    completion_rate = (len(completed) / total * 100) if total > 0 else 0
    
    scores = [t.get("task_score", 0) or 0 for t in tasks]
    avg_task_score = sum(scores) / len(scores) if scores else 0
    
    ratings = [t.get("quality_rating", 0) or 0 for t in tasks]
    quality_avg = (sum(ratings) / len(ratings) * 20) if ratings else 0  # scale 5→100
    
    on_time = [t for t in completed if (t.get("delay_days", 0) or 0) == 0]
    on_time_rate = (len(on_time) / len(completed) * 100) if completed else 0
    
    progresses = [t.get("progress_percentage", 0) or 0 for t in tasks]
    progress_factor = sum(progresses) / len(progresses) if progresses else 0
    
    overall = (
        completion_rate * 0.30 +
        avg_task_score * 0.25 +
        quality_avg * 0.20 +
        on_time_rate * 0.15 +
        progress_factor * 0.10
    )
    
    return {
        "overall": round(min(100, overall)),
        "completion_rate": round(completion_rate, 1),
        "avg_task_score": round(avg_task_score, 1),
        "quality_avg": round(quality_avg, 1),
        "on_time_rate": round(on_time_rate, 1),
        "progress_factor": round(progress_factor, 1)
    }


@manager_bp.route('/manager/overview', methods=['GET'])
def manager_overview():
    my_interns = get_manager_interns()
    my_interns_emails = [i["email"] for i in my_interns]
    
    # Fetch tasks from Supabase silver_tasks
    my_tasks = sb_admin.table("silver_tasks").select("*").in_("email", my_interns_emails).execute().data if my_interns_emails else []
    
    total_tasks = len(my_tasks)
    completed = len([t for t in my_tasks if t.get("task_status") == "Completed"])
    in_progress = len([t for t in my_tasks if t.get("task_status") == "In Progress"])
    pending = len([t for t in my_tasks if t.get("task_status") in ["Pending", "Not Started"]])
    blocked = len([t for t in my_tasks if t.get("task_status") == "Blocked"])
    
    # Compute real average score from tasks
    all_scores = [t.get("task_score", 0) or 0 for t in my_tasks]
    avg_score = round(sum(all_scores) / len(all_scores)) if all_scores else 0

    my_intern_names = [i["name"] for i in my_interns]
    unread_alerts = len([a for a in ALERTS if (not a.get("intern") or a.get("intern") in my_intern_names) and not a.get("read")])

    
    # Quality breakdown
    quality_ratings = [t.get("quality_rating", 0) or 0 for t in my_tasks]
    avg_quality = round(sum(quality_ratings) / len(quality_ratings), 2) if quality_ratings else 0
    
    # On-time delivery rate
    completed_tasks = [t for t in my_tasks if t.get("task_status") == "Completed"]
    on_time_tasks = [t for t in completed_tasks if (t.get("delay_days", 0) or 0) == 0]
    on_time_rate = round(len(on_time_tasks) / len(completed_tasks) * 100) if completed_tasks else 0

    # ─── TOP PERFORMERS (computed from tasks) ───
    tasks_by_email = defaultdict(list)
    for t in my_tasks:
        tasks_by_email[t.get("email", "")].append(t)
    
    intern_scores = []
    for intern in my_interns:
        itasks = tasks_by_email.get(intern["email"], [])
        sc = _compute_intern_score(itasks)
        intern_scores.append({
            "id": intern["id"], "name": intern["name"],
            "department": intern.get("department", ""),
            "avatar": intern.get("avatar", ""),
            "score": sc["overall"],
            "completionRate": sc["completion_rate"],
            "qualityAvg": sc["quality_avg"],
            "onTimeRate": sc["on_time_rate"],
            "tasksCompleted": len([t for t in itasks if t.get("task_status") == "Completed"]),
            "totalTasks": len(itasks)
        })
    intern_scores.sort(key=lambda x: x["score"], reverse=True)
    top_performers = intern_scores[:3]
    
    # ─── AT-RISK INTERNS (score < 50 or high delays) ───
    at_risk = [i for i in intern_scores if i["score"] < 50 or i["completionRate"] < 30]
    at_risk.sort(key=lambda x: x["score"])
    
    # ─── PRIORITY BREAKDOWN ───
    priority_counts = defaultdict(int)
    for t in my_tasks:
        p = t.get("priority", "Medium")
        priority_counts[p] = priority_counts.get(p, 0) + 1
    priority_data = [{"name": k, "value": v} for k, v in priority_counts.items()]
    
    
    # ─── RECENTLY COMPLETED TASKS ───
    recent = sorted(completed_tasks, key=lambda t: t.get("completion_date") or t.get("deadline") or "", reverse=True)[:5]
    recent_completed = []
    intern_name_map = {i["email"]: i["name"] for i in my_interns}
    for t in recent:
        recent_completed.append({
            "taskName": t.get("task_name", ""),
            "intern": intern_name_map.get(t.get("email"), "Unknown"),
            "score": t.get("task_score", 0) or 0,
            "quality": t.get("quality_rating", 0) or 0,
            "techStack": t.get("tech_stack", ""),
            "delay": t.get("delay_days", 0) or 0
        })
    
    # ─── WORTH IT / HIGH POTENTIAL INTERNS ───
    worth_it = [i for i in intern_scores if i not in top_performers and i["score"] >= 65]
    worth_it.sort(key=lambda x: x["score"], reverse=True)
    
    # ─── INTERNS BY TECH STACK (from silver_course_progress) ───
    res_courses = sb_admin.table("silver_course_progress").select("email, category").in_("email", my_interns_emails).execute() if my_interns_emails else None
    interns_by_tech = defaultdict(list)
    if res_courses and res_courses.data:
        for row in res_courses.data:
            cat = row.get("category")
            em = row.get("email")
            if cat and em and em not in interns_by_tech[cat]:
                interns_by_tech[cat].append(em)
                
    intern_map = next(({i["id"]: i for i in intern_scores} for _ in [1]), {})
    # Need to match email to the score dict
    email_to_score_dict = {}
    for intern_info, score_dict in zip(my_interns, intern_scores):
         email_to_score_dict[intern_info["email"]] = score_dict

    tech_stack_data = []
    for cat, emails in interns_by_tech.items():
        cat_interns = [email_to_score_dict[e] for e in emails if e in email_to_score_dict]
        if cat_interns:
            cat_interns.sort(key=lambda x: x["score"], reverse=True)
            tech_stack_data.append({
                "category": cat,
                "interns": cat_interns
            })
    tech_stack_data.sort(key=lambda x: len(x["interns"]), reverse=True)
    
    # ─── AVG DELAY ───
    all_delays = [t.get("delay_days", 0) or 0 for t in my_tasks]
    avg_delay = round(sum(all_delays) / len(all_delays), 1) if all_delays else 0

    return jsonify({
        "totalInterns": len(my_interns),
        "activeInterns": len([i for i in my_interns if i["status"] == "Active"]),
        "avgScore": avg_score,
        "avgQuality": avg_quality,
        "onTimeRate": on_time_rate,
        "avgDelay": avg_delay,
        "completionRate": int((completed / total_tasks * 100)) if total_tasks > 0 else 0,
        "totalTasks": total_tasks,
        "completedTasks": completed,
        "inProgressTasks": in_progress,
        "pendingTasks": pending,
        "blockedTasks": blocked,
        "unreadAlerts": unread_alerts,
        "topPerformers": top_performers,
        "atRiskInterns": at_risk[:3],
        "worthItInterns": worth_it[:3],
        "priorityBreakdown": priority_data,
        "recentCompleted": recent_completed,
        "techStackInterns": tech_stack_data,
    })

@manager_bp.route('/manager/interns', methods=['GET'])
def manager_interns():
    return jsonify(get_manager_interns())


# ─── ENHANCED: Intern Insights with dynamic scores from DB ───
@manager_bp.route('/manager/intern-insights', methods=['GET'])
def manager_intern_insights():
    """
    Full intern analytics: computed scores, task breakdowns, tech stacks, 
    with support for sorting and filtering.
    """
    my_interns = get_manager_interns()
    all_tasks = _fetch_silver_tasks(my_interns)
    
    # Group tasks by intern email
    tasks_by_email = defaultdict(list)
    for t in all_tasks:
        tasks_by_email[t.get("email", "")].append(t)
    
    # Query params for filtering/sorting
    sort_by = request.args.get('sort_by', 'overall')  # overall, completion_rate, avg_task_score, quality
    sort_dir = request.args.get('sort_dir', 'desc')
    filter_dept = request.args.get('department', '')
    filter_status = request.args.get('status', '')
    filter_tech = request.args.get('tech_stack', '')
    min_score = request.args.get('min_score', '')
    max_score = request.args.get('max_score', '')
    
    intern_data = []
    for intern in my_interns:
        # Apply filters
        if filter_dept and intern.get("department", "") != filter_dept:
            continue
        if filter_status and intern.get("status", "") != filter_status:
            continue
        
        tasks = tasks_by_email.get(intern["email"], [])
        
        # Filter by tech stack
        if filter_tech:
            tasks = [t for t in tasks if t.get("tech_stack", "") == filter_tech]
        
        score_data = _compute_intern_score(tasks)
        
        # Apply score range filters
        if min_score:
            try:
                if score_data["overall"] < int(min_score):
                    continue
            except:
                pass
        if max_score:
            try:
                if score_data["overall"] > int(max_score):
                    continue
            except:
                pass
        
        # Task status breakdown
        total = len(tasks)
        completed = len([t for t in tasks if t.get("task_status") == "Completed"])
        in_prog = len([t for t in tasks if t.get("task_status") == "In Progress"])
        blocked_count = len([t for t in tasks if t.get("task_status") == "Blocked"])
        not_started = len([t for t in tasks if t.get("task_status") in ["Not Started", "Pending"]])
        
        # Tech stack breakdown
        tech_counts = defaultdict(int)
        for t in tasks:
            ts = t.get("tech_stack", "Other")
            if ts:
                tech_counts[ts] += 1
        
        # Task category breakdown
        cat_counts = defaultdict(int)
        for t in tasks:
            cat = t.get("task_category", "Other")
            if cat:
                cat_counts[cat] += 1
        
        # Complexity breakdown
        complexity_counts = defaultdict(int)
        for t in tasks:
            cx = t.get("complexity", "Medium")
            if cx:
                complexity_counts[cx] += 1
        
        # Priority breakdown
        priority_counts = defaultdict(int)
        for t in tasks:
            pri = t.get("priority", "Medium")
            if pri:
                priority_counts[pri] += 1

        # Average delay
        delays = [t.get("delay_days", 0) or 0 for t in tasks]
        avg_delay = round(sum(delays) / len(delays), 1) if delays else 0
        
        # Estimated vs actual hours
        est_hours = sum(t.get("hours_estimated", 0) or 0 for t in tasks)
        act_hours = sum(t.get("hours_actual", 0) or 0 for t in tasks)
        
        intern_data.append({
            "id": intern["id"],
            "name": intern["name"],
            "email": intern["email"],
            "department": intern.get("department", ""),
            "status": intern.get("status", "Active"),
            "avatar": intern.get("avatar", ""),
            "joined": intern.get("joined", ""),
            "scores": score_data,
            "taskBreakdown": {
                "total": total,
                "completed": completed,
                "inProgress": in_prog,
                "blocked": blocked_count,
                "notStarted": not_started
            },
            "techStack": [{"name": k, "count": v} for k, v in sorted(tech_counts.items(), key=lambda x: x[1], reverse=True)],
            "categories": [{"name": k, "count": v} for k, v in sorted(cat_counts.items(), key=lambda x: x[1], reverse=True)],
            "complexity": dict(complexity_counts),
            "priority": dict(priority_counts),
            "avgDelay": avg_delay,
            "estimatedHours": est_hours,
            "actualHours": act_hours
        })
    
    # Sort
    sort_key_map = {
        "overall": lambda x: x["scores"]["overall"],
        "name": lambda x: x["name"].lower(),
        "completion_rate": lambda x: x["scores"]["completion_rate"],
        "avg_task_score": lambda x: x["scores"]["avg_task_score"],
        "quality": lambda x: x["scores"]["quality_avg"],
        "on_time": lambda x: x["scores"]["on_time_rate"],
        "tasks": lambda x: x["taskBreakdown"]["total"],
        "delay": lambda x: x["avgDelay"]
    }
    
    key_fn = sort_key_map.get(sort_by, sort_key_map["overall"])
    intern_data.sort(key=key_fn, reverse=(sort_dir == "desc"))
    
    # Aggregated stats
    all_tech = defaultdict(int)
    all_categories = defaultdict(int)
    all_priorities = defaultdict(int)
    all_complexities = defaultdict(int)
    for t in all_tasks:
        ts = t.get("tech_stack", "Other")
        if ts:
            all_tech[ts] += 1
        cat = t.get("task_category", "Other")
        if cat:
            all_categories[cat] += 1
        pri = t.get("priority", "Medium")
        if pri:
            all_priorities[pri] += 1
        cx = t.get("complexity", "Medium")
        if cx:
            all_complexities[cx] += 1
    
    # Available filter options
    departments = list(set(i.get("department", "") for i in my_interns))
    tech_stacks = list(all_tech.keys())
    
    return jsonify({
        "interns": intern_data,
        "aggregated": {
            "totalTasks": len(all_tasks),
            "totalInterns": len(intern_data),
            "avgOverallScore": round(sum(d["scores"]["overall"] for d in intern_data) / len(intern_data)) if intern_data else 0,
            "techStack": [{"name": k, "count": v} for k, v in sorted(all_tech.items(), key=lambda x: x[1], reverse=True)],
            "categories": [{"name": k, "count": v} for k, v in sorted(all_categories.items(), key=lambda x: x[1], reverse=True)],
            "priorities": dict(all_priorities),
            "complexities": dict(all_complexities),
        },
        "filterOptions": {
            "departments": sorted(departments),
            "techStacks": sorted(tech_stacks),
            "statuses": ["Active", "Warning", "Inactive"]
        }
    })


# ─── ENHANCED: Best Performers ───
@manager_bp.route('/manager/best-performers', methods=['GET'])
def manager_best_performers():
    my_interns = get_manager_interns()
    all_tasks = _fetch_silver_tasks(my_interns)
    
    tasks_by_email = defaultdict(list)
    for t in all_tasks:
        tasks_by_email[t.get("email", "")].append(t)
    
    performers = []
    for intern in my_interns:
        tasks = tasks_by_email.get(intern["email"], [])
        score_data = _compute_intern_score(tasks)
        completed = len([t for t in tasks if t.get("task_status") == "Completed"])
        
        # Best feedback
        feedbacks = [t.get("feedback", "") for t in tasks if t.get("feedback")]
        excellent_count = len([f for f in feedbacks if f in ["Excellent work", "Good progress", "Well documented", "Code quality good"]])
        
        performers.append({
            "id": intern["id"],
            "name": intern["name"],
            "email": intern["email"],
            "department": intern.get("department", ""),
            "avatar": intern.get("avatar", ""),
            "scores": score_data,
            "tasksCompleted": completed,
            "totalTasks": len(tasks),
            "excellentFeedbacks": excellent_count,
            "avgDelay": round(sum(t.get("delay_days", 0) or 0 for t in tasks) / len(tasks), 1) if tasks else 0,
        })
    
    # Sort by overall score
    performers.sort(key=lambda x: x["scores"]["overall"], reverse=True)
    
    return jsonify(performers)


# ─── ENHANCED: Tech Stack Analytics ───
@manager_bp.route('/manager/tech-analytics', methods=['GET'])
def manager_tech_analytics():
    my_interns = get_manager_interns()
    all_tasks = _fetch_silver_tasks(my_interns)
    
    # Tech stack aggregation
    tech_data = defaultdict(lambda: {"tasks": 0, "completed": 0, "scores": [], "quality": [], "delays": [], "interns": set()})
    for t in all_tasks:
        ts = t.get("tech_stack", "Other")
        tech_data[ts]["tasks"] += 1
        if t.get("task_status") == "Completed":
            tech_data[ts]["completed"] += 1
        tech_data[ts]["scores"].append(t.get("task_score", 0) or 0)
        tech_data[ts]["quality"].append(t.get("quality_rating", 0) or 0)
        tech_data[ts]["delays"].append(t.get("delay_days", 0) or 0)
        # Map intern name from email
        intern = next((i for i in my_interns if i["email"] == t.get("email")), None)
        if intern:
            tech_data[ts]["interns"].add(intern["name"])
    
    result = []
    for tech, data in sorted(tech_data.items(), key=lambda x: x[1]["tasks"], reverse=True):
        avg_score = round(sum(data["scores"]) / len(data["scores"])) if data["scores"] else 0
        avg_quality = round(sum(data["quality"]) / len(data["quality"]), 2) if data["quality"] else 0
        avg_delay = round(sum(data["delays"]) / len(data["delays"]), 1) if data["delays"] else 0
        completion = round(data["completed"] / data["tasks"] * 100) if data["tasks"] > 0 else 0
        
        result.append({
            "name": tech,
            "totalTasks": data["tasks"],
            "completed": data["completed"],
            "completionRate": completion,
            "avgScore": avg_score,
            "avgQuality": avg_quality,
            "avgDelay": avg_delay,
            "internCount": len(data["interns"]),
            "interns": list(data["interns"])
        })
    
    # Category breakdown
    cat_data = defaultdict(lambda: {"tasks": 0, "completed": 0, "scores": []})
    for t in all_tasks:
        cat = t.get("task_category", "Other")
        cat_data[cat]["tasks"] += 1
        if t.get("task_status") == "Completed":
            cat_data[cat]["completed"] += 1
        cat_data[cat]["scores"].append(t.get("task_score", 0) or 0)
    
    categories = []
    for cat, data in sorted(cat_data.items(), key=lambda x: x[1]["tasks"], reverse=True):
        categories.append({
            "name": cat,
            "totalTasks": data["tasks"],
            "completed": data["completed"],
            "avgScore": round(sum(data["scores"]) / len(data["scores"])) if data["scores"] else 0
        })
    
    # Complexity breakdown
    cx_data = defaultdict(lambda: {"tasks": 0, "completed": 0, "scores": []})
    for t in all_tasks:
        cx = t.get("complexity", "Medium")
        cx_data[cx]["tasks"] += 1
        if t.get("task_status") == "Completed":
            cx_data[cx]["completed"] += 1
        cx_data[cx]["scores"].append(t.get("task_score", 0) or 0)
    
    complexities = []
    for cx, data in cx_data.items():
        complexities.append({
            "name": cx,
            "totalTasks": data["tasks"],
            "completed": data["completed"],
            "avgScore": round(sum(data["scores"]) / len(data["scores"])) if data["scores"] else 0
        })
    
    return jsonify({
        "techStacks": result,
        "categories": categories,
        "complexities": complexities
    })


@manager_bp.route('/manager/tasks', methods=['GET', 'POST'])
def manager_tasks():
    my_interns = get_manager_interns()
    my_interns_map = {i["email"]: i["name"] for i in my_interns}
    my_interns_emails = list(my_interns_map.keys())
    
    if request.method == 'POST':
        data = request.json
        assignee_name = data.get("assignee")
        assignee_email = next((e for e, n in my_interns_map.items() if n == assignee_name), "")
        
        new_row = {
            "task_id": "T" + str(uuid.uuid4())[:8],
            "email": assignee_email,
            "task_name": data.get("title", ""),
            "priority": data.get("priority", "Medium"),
            "assigned_date": datetime.datetime.now().strftime("%Y-%m-%d"),
            "deadline": data.get("deadline", ""),
            "hours_estimated": 10,
            "hours_actual": 0,
            "task_status": "Pending",
            "task_flag": "Assigned"
        }
        sb_admin.table("silver_tasks").insert(new_row).execute()
        
        new_task = {
            "id": new_row["task_id"],
            "title": new_row["task_name"],
            "assignee": assignee_name,
            "status": new_row["task_status"],
            "priority": new_row["priority"],
            "progress": 0,
            "deadline": new_row["deadline"]
        }
        return jsonify(new_task)
        
    # GET method
    tasks_res = sb_admin.table("silver_tasks").select("*").in_("email", my_interns_emails).execute().data if my_interns_emails else []
    
    mapped_tasks = []
    for row in tasks_res:
        hw = row.get("hours_actual") or 0
        he = row.get("hours_estimated") or 1
        he = he if he > 0 else 1
        progress = row.get("progress_percentage") or (int((hw / he) * 100) if row.get("task_status") != "Completed" else 100)
        
        mapped_tasks.append({
            "id": row.get("task_id"),
            "title": row.get("task_name"),
            "assignee": my_interns_map.get(row.get("email"), ""),
            "status": row.get("task_status", "Pending"),
            "priority": row.get("priority", "Medium"),
            "progress": min(100, max(0, progress)),
            "deadline": row.get("deadline", ""),
            "techStack": row.get("tech_stack", ""),
            "taskScore": row.get("task_score", 0),
            "qualityRating": row.get("quality_rating", 0),
            "complexity": row.get("complexity", ""),
            "category": row.get("task_category", ""),
            "delayDays": row.get("delay_days", 0),
            "feedback": row.get("feedback", "")
        })
        
    return jsonify(mapped_tasks)

@manager_bp.route('/manager/comparison', methods=['GET'])
def manager_comparison():
    my_interns = get_manager_interns()
    all_tasks = _fetch_silver_tasks(my_interns)
    
    tasks_by_email = defaultdict(list)
    for t in all_tasks:
        tasks_by_email[t.get("email", "")].append(t)
    
    data = []
    for i in my_interns:
        tasks = tasks_by_email.get(i["email"], [])
        score_data = _compute_intern_score(tasks)
        completed = len([t for t in tasks if t.get("task_status") == "Completed"])
        
        # Tech skills from actual task data
        tech_scores = defaultdict(list)
        for t in tasks:
            ts = t.get("tech_stack", "Other")
            if ts:
                tech_scores[ts].append(t.get("task_score", 0) or 0)
        
        skills = {}
        for ts, scores in tech_scores.items():
            skills[ts] = round(sum(scores) / len(scores)) if scores else 0
        
        # Ensure at least 3 skills for Radar
        if not skills:
            skills = {"Core": score_data["overall"], "Quality": score_data["quality_avg"], "Speed": score_data["on_time_rate"]}
            
        # Efficiency 
        est_hours = sum(t.get("hours_estimated", 0) or 0 for t in tasks)
        act_hours = sum(t.get("hours_actual", 0) or 0 for t in tasks)
        avg_delay = round(sum(t.get("delay_days", 0) or 0 for t in tasks) / len(tasks), 1) if tasks else 0
        
        # Persona Logic
        q = score_data["quality_avg"]
        s = score_data["on_time_rate"]
        c = score_data["completion_rate"]
        persona = "Balanced Performer"
        if q >= 80 and s >= 80:
            persona = "Star Accelerator"
        elif q >= 80 and s < 60:
            persona = "Meticulous & Slow"
        elif q < 60 and s >= 80:
            persona = "Speedy but Sloppy"
        elif c > 85 and score_data["overall"] >= 75:
            persona = "Reliable Executor"
        elif c < 40 and tasks:
            persona = "Needs Support"
        elif not tasks:
            persona = "Unassigned"
            
        data.append({
            "id": i["id"],
            "name": i["name"],
            "department": i["department"],
            "avatar": i.get("avatar", ""),
            "overallScore": score_data["overall"],
            "scores": score_data,
            "tasksCompleted": completed,
            "totalTasks": len(tasks),
            "efficiency": {
                "estHours": est_hours,
                "actHours": act_hours,
                "avgDelay": avg_delay,
                "onTimeRate": s
            },
            "persona": persona,
            "streak": completed,  # Use completed as a proxy
            "skills": skills,
            "techStack": list(tech_scores.keys())
        })
    
    return jsonify(data)

@manager_bp.route('/manager/analytics', methods=['GET'])
def manager_analytics():
    my_interns = get_manager_interns()
    all_tasks = _fetch_silver_tasks(my_interns)
    
    tasks_by_email = defaultdict(list)
    for t in all_tasks:
        tasks_by_email[t.get("email", "")].append(t)
    
    # Monthly performance from task dates
    month_data = defaultdict(lambda: {"scores": [], "completed": 0, "total": 0})
    for t in all_tasks:
        d = t.get("assigned_date", "")
        if d:
            try:
                dt = datetime.datetime.strptime(d, "%Y-%m-%d") if "-" in str(d) else datetime.datetime.strptime(d, "%d-%m-%Y")
                month_key = dt.strftime("%b")
                month_data[month_key]["scores"].append(t.get("task_score", 0) or 0)
                month_data[month_key]["total"] += 1
                if t.get("task_status") == "Completed":
                    month_data[month_key]["completed"] += 1
            except:
                pass
    
    monthly = []
    for m in ["Jan", "Feb", "Mar", "Apr", "May"]:
        md = month_data.get(m, {"scores": [], "completed": 0, "total": 0})
        avg = round(sum(md["scores"]) / len(md["scores"])) if md["scores"] else 0
        monthly.append({"month": m, "avgScore": avg, "tasksCompleted": md["completed"], "totalTasks": md["total"]})
    
    # Skills from tech stack
    tech_scores = defaultdict(list)
    for t in all_tasks:
        ts = t.get("tech_stack", "Other")
        if ts:
            tech_scores[ts].append(t.get("task_score", 0) or 0)
    
    skills = []
    for ts, scores in sorted(tech_scores.items(), key=lambda x: sum(x[1]) / len(x[1]) if x[1] else 0, reverse=True):
        skills.append({"skill": ts, "avg": round(sum(scores) / len(scores)) if scores else 0, "tasks": len(scores)})
    
    # Top performers by computed score
    performers_data = []
    for i in my_interns:
        tasks = tasks_by_email.get(i["email"], [])
        score_data = _compute_intern_score(tasks)
        performers_data.append({
            "id": i.get("id"),
            "name": i.get("name"),
            "department": i.get("department"),
            "score": score_data["overall"],
            "scores": score_data,
            "tasksCompleted": len([t for t in tasks if t.get("task_status") == "Completed"]),
            "totalTasks": len(tasks)
        })
    
    performers_data.sort(key=lambda x: x["score"], reverse=True)
    
    return jsonify({
        "monthly": monthly,
        "skills": skills,
        "topPerformers": performers_data[:5]
    })

@manager_bp.route('/manager/alerts', methods=['GET'])
def manager_alerts():
    my_interns_names = [i["name"] for i in get_manager_interns()]
    return jsonify([a for a in ALERTS if not a.get("intern") or a.get("intern") in my_interns_names])

@manager_bp.route('/manager/predictions', methods=['GET'])
def manager_predictions():
    my_interns = get_manager_interns()
    all_tasks = _fetch_silver_tasks(my_interns)
    
    tasks_by_email = defaultdict(list)
    for t in all_tasks:
        tasks_by_email[t.get("email", "")].append(t)
    
    data = []
    for i in my_interns:
        tasks = tasks_by_email.get(i["email"], [])
        score_data = _compute_intern_score(tasks)
        score = score_data["overall"]
        
        # Predict based on trends
        completed_tasks = [t for t in tasks if t.get("task_status") == "Completed"]
        recent_scores = sorted(
            [(t.get("assigned_date", ""), t.get("task_score", 0) or 0) for t in completed_tasks],
            key=lambda x: x[0], reverse=True
        )[:5]
        
        if len(recent_scores) >= 2:
            recent_avg = sum(s[1] for s in recent_scores[:3]) / min(3, len(recent_scores))
            older_avg = sum(s[1] for s in recent_scores[3:]) / max(1, len(recent_scores[3:]))
            trend = "up" if recent_avg >= older_avg else "down"
            predicted = min(100, round(score + (recent_avg - older_avg) * 0.3))
        else:
            trend = "up" if score >= 50 else "down"
            predicted = min(100, score + random.randint(-3, 8))
        
        risk = "High" if score < 40 else "Medium" if score < 65 else "Low"
        
        data.append({
            "id": i["id"],
            "name": i["name"],
            "department": i.get("department", ""),
            "currentScore": score,
            "predictedScore": predicted,
            "trend": trend,
            "riskLevel": risk,
            "scores": score_data,
            "recommendation": "Urgent mentorship needed." if risk == "High" else "Schedule check-in." if risk == "Medium" else "On track, keep it up!"
        })
    
    return jsonify(data)

@manager_bp.route('/manager/chat', methods=['POST'])
def manager_chat():
    my_interns = get_manager_interns()
    msg = request.json.get("message", "").lower()
    reply = "I'm analyzing that for you. Based on the data, your team is performing well overall."
    
    for i in my_interns:
        if i["name"].lower().split()[0] in msg:
            reply = f"{i['name']} has a productivity score of {i.get('score', 0)}% and their status is {i.get('status', 'Active')}."
            break
            
    if "task" in msg:
        reply = "I have fetched your intern tasks successfully."
        
    return jsonify({"reply": reply})

@manager_bp.route('/manager/daily-summary', methods=['GET'])
def manager_daily():
    my_interns = get_manager_interns()
    all_tasks = _fetch_silver_tasks(my_interns)
    
    # Real data summary
    completed_tasks = [t for t in all_tasks if t.get("task_status") == "Completed"]
    in_progress = [t for t in all_tasks if t.get("task_status") == "In Progress"]
    blocked = [t for t in all_tasks if t.get("task_status") == "Blocked"]
    
    total_hours = sum(t.get("hours_estimated", 0) or 0 for t in all_tasks)
    
    highlights = []
    if completed_tasks:
        top_score_task = max(completed_tasks, key=lambda t: t.get("task_score", 0) or 0)
        intern = next((i for i in my_interns if i["email"] == top_score_task.get("email")), {})
        highlights.append(f"🌟 Highest score: {intern.get('name', 'Unknown')} scored {top_score_task.get('task_score', 0)} on '{top_score_task.get('task_name', '')}'")
    
    if in_progress:
        highlights.append(f"📊 {len(in_progress)} tasks currently in progress across the team")
    
    if len(my_interns) > 0:
        highlights.append(f"👥 {len(my_interns)} interns actively being managed")

    concerns = []
    if blocked:
        concerns.append(f"⚠️ {len(blocked)} tasks are currently blocked and need attention")
    
    delayed = [t for t in all_tasks if (t.get("delay_days", 0) or 0) > 0]
    if delayed:
        concerns.append(f"⏰ {len(delayed)} tasks have delays (avg {round(sum(t.get('delay_days', 0) or 0 for t in delayed) / len(delayed), 1)} days)")
    
    if not concerns:
        concerns.append("✅ No critical concerns at this time")

    # Upcoming deadlines
    upcoming = []
    for t in all_tasks:
        if t.get("task_status") not in ["Completed"] and t.get("deadline"):
            intern = next((i for i in my_interns if i["email"] == t.get("email")), {})
            upcoming.append({
                "task": t.get("task_name", ""),
                "assignee": intern.get("name", "Unknown"),
                "deadline": t.get("deadline", ""),
                "status": t.get("task_status", "Pending"),
                "priority": t.get("priority", "Medium")
            })
    upcoming.sort(key=lambda x: x["deadline"])

    return jsonify({
        "date": datetime.datetime.now().strftime("%Y-%m-%d"),
        "completedToday": len(completed_tasks),
        "inProgress": len(in_progress),
        "blocked": len(blocked),
        "newTasks": len([t for t in all_tasks if t.get("task_status") in ["Not Started", "Pending"]]),
        "teamHoursLogged": total_hours,
        "overallMood": "Productive" if len(completed_tasks) > len(blocked) else "Needs Attention",
        "highlights": highlights,
        "concerns": concerns,
        "upcoming": upcoming[:10]
    })

@manager_bp.route('/manager/export/<type>', methods=['GET'])
def manager_export(type):
    my_interns = get_manager_interns()
    my_interns_names = [i["name"] for i in my_interns]
    
    if type == "tasks":
        all_tasks = _fetch_silver_tasks(my_interns)
        data = all_tasks
    elif type == "interns":
        data = my_interns
    else:
        data = [a for a in ALERTS if not a.get("intern") or a.get("intern") in my_interns_names]
    
    return jsonify({"filename": f"{type}_export.csv", "data": data})

@manager_bp.route('/manager/chatbot', methods=['POST'])
def manager_chatbot():
    try:
        data = request.json
        query = (data.get("query") or "").lower()
        
        my_interns = get_manager_interns()
        if not my_interns:
            return jsonify({"reply": "I couldn't find any interns assigned to you."})
            
        intern_emails = [i["email"] for i in my_interns]
        
        # Helper to find email matching user string
        def _match_email(user_str):
            for i in my_interns:
                if user_str in i["name"].lower() or user_str in i["email"].lower():
                    return i["email"]
            return None

        # 1. Top performing interns
        if "top-performing" in query or "top performing" in query or "best interns" in query:
            res = sb_admin.table("silver_course_progress").select("name,score").in_("email", intern_emails).order("score", desc=True).limit(5).execute()
            if not res.data:
                return jsonify({"reply": "I couldn't find any performance data for your interns right now."})
            
            reply = "Here are your top-performing interns based on their overall scores:\n\n"
            for idx, row in enumerate(res.data):
                reply += f"{idx+1}. **{row.get('name', 'Unknown')}**: {row.get('score', 0)}%\n"
            return jsonify({"reply": reply})
            
        # 2. Most completed courses
        if "completed courses" in query or "most completed" in query:
            res = sb_admin.table("silver_course_progress").select("name,completed_courses").in_("email", intern_emails).order("completed_courses", desc=True).limit(5).execute()
            if not res.data:
                return jsonify({"reply": "No course progress found for your interns."})
            
            reply = "Here are the interns with the most completed courses:\n\n"
            for idx, row in enumerate(res.data):
                reply += f"{idx+1}. **{row.get('name', 'Unknown')}**: {row.get('completed_courses', 0)} courses\n"
            return jsonify({"reply": reply})
            
        # 3. Pending tasks for [user]
        m = re.search(r'pending tasks for ([\w\s@.]+)', query)
        if m:
            user_raw = m.group(1).strip()
            email = _match_email(user_raw)
            if not email:
                return jsonify({"reply": f"Sorry, I couldn't find any intern matching '{user_raw}' under your management."})
                
            res = sb_admin.table("silver_tasks").select("task_name,task_status").eq("email", email).in_("task_status", ["Not Started", "In Progress", "Pending"]).execute()
            
            if not res.data:
                return jsonify({"reply": f"No pending tasks found for {user_raw}."})
                
            reply = f"Pending tasks for **{user_raw}**:\n\n"
            for row in res.data:
                reply += f"- {row.get('task_name')} ({row.get('task_status')})\n"
            return jsonify({"reply": reply})
            
        # 4. Daily activity hours for [user]
        m = re.search(r'daily activity hours for ([\w\s@.]+)', query)
        if m:
            user_raw = m.group(1).strip()
            email = _match_email(user_raw)
            if not email:
                return jsonify({"reply": f"Sorry, I couldn't find any intern matching '{user_raw}' under your management."})
                
            res = sb_admin.table("silver_daily_activity").select("date,hours_logged,activity_type").eq("email", email).order("date", desc=True).limit(5).execute()
            if not res.data:
                return jsonify({"reply": f"No daily activity logs found for {user_raw}."})
                
            reply = f"Recent daily activity hours for **{user_raw}**:\n\n"
            for row in res.data:
                reply += f"- **{row.get('date')}**: {row.get('hours_logged')} hours ({row.get('activity_type')})\n"
            return jsonify({"reply": reply})

        # Fallback error mapping specifically asked for
        raise ValueError("Invalid natural language query format or AI generation failure.")
        
    except Exception as e:
        print(f"Chatbot Error: {str(e)}")
        safe_response = "I encountered an error understanding or running your query. Try asking things like:\n- 'Top-performing interns'\n- 'Interns with most completed courses'\n- 'Pending tasks for [name]'\n- 'Daily activity hours for [name]'"
        return jsonify({"reply": safe_response}), 200
