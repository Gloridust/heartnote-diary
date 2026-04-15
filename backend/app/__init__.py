import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from dotenv import load_dotenv

from .config import Config
from .extensions import db
from .models import User, Diary, Admin

jwt = JWTManager()
migrate = Migrate()


def create_app() -> Flask:
    load_dotenv()
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(Config())
    os.makedirs(app.instance_path, exist_ok=True)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
         supports_credentials=True)

    from .routes.auth import bp as auth_bp
    from .routes.diary import bp as diary_bp
    from .routes.chat import bp as chat_bp
    from .routes.speech import bp as speech_bp
    from .routes.admin import bp as admin_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(diary_bp, url_prefix="/api/diary")
    app.register_blueprint(chat_bp, url_prefix="/api/chat")
    app.register_blueprint(speech_bp, url_prefix="/api/speech")
    app.register_blueprint(admin_bp, url_prefix="/admin")

    @app.get("/api/health")
    def health():
        return {"status": "ok", "db": app.config["DB_TYPE"]}

    with app.app_context():
        db.create_all()
        _ensure_default_admin(app)

    return app


def _ensure_default_admin(app):
    from passlib.hash import bcrypt
    username = os.getenv("ADMIN_USERNAME", "admin")
    password = os.getenv("ADMIN_PASSWORD", "admin123")
    if not Admin.query.filter_by(username=username).first():
        admin = Admin(username=username, password_hash=bcrypt.hash(password))
        db.session.add(admin)
        db.session.commit()
        app.logger.info(f"Created default admin account: {username}")
