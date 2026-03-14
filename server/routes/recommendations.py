from flask import Blueprint, request, jsonify
from services.recommendation_engine import recommend_courses

recommendations_bp = Blueprint("recommendations", __name__)

@recommendations_bp.route("/recommendations", methods=["GET"])
def get_recommendations():

    email = request.args.get("email")

    if not email:
        return jsonify({"error": "Email required"}), 400

    result = recommend_courses(email)

    return jsonify({
        "email": email,
        "recommendations": result
    })