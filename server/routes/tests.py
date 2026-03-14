from flask import Blueprint, request, jsonify
from services.test_questions import get_questions, grade_responses

tests_bp = Blueprint("tests", __name__)

@tests_bp.route("/tests", methods=["GET"])
def get_test_questions():
    course = request.args.get("course")
    if not course:
        return jsonify({"error": "Course is required"}), 400
    course_link = request.args.get("link") or None

    questions = get_questions(course, max_questions=30, course_link=course_link)

    # Do not send correct answers to the client
    safe_questions = []
    for q in questions:
        q_copy = {k: v for k, v in q.items() if k not in ("correct_index", "expected_keywords")}
        safe_questions.append(q_copy)

    return jsonify({"course": course, "questions": safe_questions})


@tests_bp.route("/tests/grade", methods=["POST"])
def grade_test():
    data = request.get_json(force=True) or {}
    course = data.get("course")
    answers = data.get("answers", [])
    course_link = data.get("link") or None

    if not course:
        return jsonify({"error": "Course is required"}), 400

    result = grade_responses(course, answers, course_link=course_link)
    return jsonify(result)
