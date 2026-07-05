from flask import Flask, jsonify
from flask_cors import CORS
import logging
from logging.handlers import RotatingFileHandler
from werkzeug.exceptions import HTTPException

from config import Config
from agents.registry import discover_agents, AGENT_REGISTRY
from routes.health import health_bp
from routes.upload import upload_bp
from routes.agents import agents_bp
from routes.extract import extract_bp
from routes.analyze import analyze_bp


def create_app():
    # Initialize Flask Application
    app = Flask(__name__)
    app.config.from_object(Config)

    # -------------------------------------------------------
    # CORS CONFIGURATION
    # -------------------------------------------------------
    # Development & Testing:
    # Allows requests from localhost and Vercel.
    # Change this later to only your production domain if desired.
    CORS(
        app,
        resources={r"/api/*": {"origins": "*"}},
        supports_credentials=True,
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"]
    )

    # -------------------------------------------------------
    # Logging
    # -------------------------------------------------------
    setup_logging(app)

    logger = logging.getLogger(__name__)
    logger.info("Initializing ProjectReviewer AI Backend Services...")

    # -------------------------------------------------------
    # Initialize Database
    # -------------------------------------------------------
    from database import init_db
    init_db()

    # -------------------------------------------------------
    # Discover Agents
    # -------------------------------------------------------
    discover_agents()
    logger.info(
        f"Successfully registered agents: {list(AGENT_REGISTRY.keys())}"
    )

    # -------------------------------------------------------
    # Register Blueprints
    # -------------------------------------------------------
    app.register_blueprint(health_bp)
    app.register_blueprint(upload_bp)
    app.register_blueprint(agents_bp)
    app.register_blueprint(extract_bp)
    app.register_blueprint(analyze_bp)

    # -------------------------------------------------------
    # Error Handlers
    # -------------------------------------------------------
    register_error_handlers(app)

    return app


def setup_logging(app):
    log_dir = app.config.get("LOGS_FOLDER")
    log_dir.mkdir(parents=True, exist_ok=True)

    log_file = log_dir / "app.log"

    formatter = logging.Formatter(
        "[%(asctime)s] %(levelname)s in %(module)s (%(threadName)s): %(message)s"
    )

    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=5 * 1024 * 1024,
        backupCount=3,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(logging.INFO)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    console_handler.setLevel(logging.INFO)

    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    if not root_logger.handlers:
        root_logger.addHandler(file_handler)
        root_logger.addHandler(console_handler)


def register_error_handlers(app):

    @app.errorhandler(Exception)
    def handle_exception(e):

        if isinstance(e, HTTPException):
            code = e.code
            description = e.description
        else:
            code = 500
            description = "Internal Server Error"

        logging.getLogger(__name__).error(
            f"Global exception handler caught error: {e}",
            exc_info=True,
        )

        return jsonify({
            "success": False,
            "error": description
        }), code

    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({
            "success": False,
            "error": "Bad Request"
        }), 400

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({
            "success": False,
            "error": "Resource Not Found"
        }), 404

    @app.errorhandler(413)
    def request_entity_too_large(e):
        return jsonify({
            "success": False,
            "error": "Payload Too Large. Maximum allowed size is 100MB."
        }), 413

    @app.errorhandler(500)
    def internal_server_error(e):
        return jsonify({
            "success": False,
            "error": "Internal Server Error"
        }), 500


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)