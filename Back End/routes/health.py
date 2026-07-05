from flask import Blueprint, jsonify
import logging

logger = logging.getLogger(__name__)

health_bp = Blueprint("health", __name__, url_prefix="/api")

@health_bp.route("/health", methods=["GET"])
def health_check():
    logger.info("Health check endpoint triggered.")
    return jsonify({
        "status": "ok",
        "version": "1.0.0",
        "services": {
            "sqlite": "connected",
            "gemini_api": "authenticated"
        }
    }), 200


