import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from sqlalchemy import text
from dotenv import load_dotenv

from .config import Config
from .extensions import db
from .models import User, Diary, Admin, VitalityLog, RedeemCode, AppSetting

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
    from .routes.geo import bp as geo_bp
    from .routes.vitality import bp as vitality_bp
    from .routes.settings import bp as settings_bp
    from .routes.legal import bp as legal_bp
    from .routes.iap import bp as iap_bp
    from .routes.admin import bp as admin_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(diary_bp, url_prefix="/api/diary")
    app.register_blueprint(chat_bp, url_prefix="/api/chat")
    app.register_blueprint(speech_bp, url_prefix="/api/speech")
    app.register_blueprint(geo_bp, url_prefix="/api/geo")
    app.register_blueprint(vitality_bp, url_prefix="/api/vitality")
    app.register_blueprint(settings_bp, url_prefix="/api/settings")
    app.register_blueprint(legal_bp, url_prefix="/legal")
    app.register_blueprint(iap_bp, url_prefix="/api/iap")
    app.register_blueprint(admin_bp, url_prefix="/admin")

    @app.get("/api/health")
    def health():
        return {"status": "ok", "db": app.config["DB_TYPE"]}

    @app.get("/")
    def index():
        from flask import redirect, url_for
        return redirect(url_for("admin.login"))

    with app.app_context():
        db.create_all()
        _migrate_schema_if_needed(app)
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


def _migrate_schema_if_needed(app):
    """轻量自动迁移：仅 SQLite 用，给老 DB 补字段。生产 MySQL 请用 Flask-Migrate。"""
    if app.config["DB_TYPE"] != "sqlite":
        return
    try:
        cols = {row[1] for row in db.session.execute(text("PRAGMA table_info(users)"))}
        added = []
        if "token_version" not in cols:
            db.session.execute(text(
                "ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 1"))
            added.append("users.token_version")
        if "vitality_balance" not in cols:
            db.session.execute(text(
                "ALTER TABLE users ADD COLUMN vitality_balance INTEGER NOT NULL DEFAULT 100"))
            added.append("users.vitality_balance")
        # redeem_codes.batch_id
        try:
            code_cols = {row[1] for row in db.session.execute(text("PRAGMA table_info(redeem_codes)"))}
            if code_cols and "batch_id" not in code_cols:
                db.session.execute(text(
                    "ALTER TABLE redeem_codes ADD COLUMN batch_id VARCHAR(16)"))
                added.append("redeem_codes.batch_id")
        except Exception:
            pass
        if added:
            db.session.commit()
            app.logger.info(f"SQLite schema upgraded: {', '.join(added)}")
    except Exception as e:
        db.session.rollback()
        app.logger.warning(f"schema migrate skipped: {e}")
