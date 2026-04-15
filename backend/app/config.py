import os
from datetime import timedelta


class Config:
    def __init__(self):
        self.DEBUG = os.getenv("FLASK_ENV", "development") != "production"
        self.SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")

        self.DB_TYPE = os.getenv("DB_TYPE", "sqlite").lower()
        if self.DB_TYPE == "mysql":
            user = os.getenv("MYSQL_USER", "memoirai")
            pwd = os.getenv("MYSQL_PASSWORD", "")
            host = os.getenv("MYSQL_HOST", "127.0.0.1")
            port = os.getenv("MYSQL_PORT", "3306")
            db = os.getenv("MYSQL_DB", "memoirai")
            self.SQLALCHEMY_DATABASE_URI = (
                f"mysql+pymysql://{user}:{pwd}@{host}:{port}/{db}?charset=utf8mb4"
            )
        else:
            sqlite_path = os.getenv("SQLITE_PATH", "instance/memoirai.db")
            if not os.path.isabs(sqlite_path):
                sqlite_path = os.path.abspath(sqlite_path)
            self.SQLALCHEMY_DATABASE_URI = f"sqlite:///{sqlite_path}"

        self.SQLALCHEMY_TRACK_MODIFICATIONS = False
        self.SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}

        self.JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", self.SECRET_KEY)
        self.JWT_ACCESS_TOKEN_EXPIRES = timedelta(
            hours=int(os.getenv("JWT_ACCESS_TOKEN_HOURS", "720"))
        )

        self.CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")

        self.ARK_API_KEY = os.getenv("ARK_API_KEY", "")
        self.DOUBAO_MODEL = os.getenv("DOUBAO_MODEL", "doubao-1-5-pro-32k-250115")
        self.BYTEDANCE_APP_KEY = os.getenv("BYTEDANCE_APP_KEY", "")
        self.BYTEDANCE_ACCESS_TOKEN = os.getenv("BYTEDANCE_ACCESS_TOKEN", "")
