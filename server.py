from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
import pytz



app = Flask(__name__)
CORS(app) # 这行代码允许跨域请求

# Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///journal.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    create_time = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    diaries = db.relationship('Diary', backref='user', lazy=True)


class Diary(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    date = db.Column(db.DateTime, nullable=False)
    score = db.Column(db.Integer)
    tag = db.Column(db.String(100))


# API Routes

# 1. 增加数据
@app.route('/api/diary', methods=['POST'])
def add_diary():
    try:
        data = request.get_json()
        
        # 检查用户是否存在，不存在则自动创建
        user_id = data['id']  # 这里的 id 是 user_id
        user = User.query.get(user_id)
        
        if not user:
            # 自动创建用户
            beijing_tz = pytz.timezone('Asia/Shanghai')
            create_time = datetime.now(beijing_tz)
            user = User(id=user_id, create_time=create_time)
            db.session.add(user)
            db.session.commit()
            print(f"自动创建新用户: {user_id}")
        
        # 解析日期字符串为 datetime 对象
        date_str = data['date']
        beijing_tz = pytz.timezone('Asia/Shanghai')
        date_obj = datetime.strptime(date_str, '%Y-%m-%d %H:%M:%S')
        date_obj = beijing_tz.localize(date_obj)
        
        # 检查是否提供了 diary_id，如果有则尝试更新现有日记
        diary_id = data.get('diary_id')
        if diary_id:
            diary = Diary.query.get(diary_id)
            if diary:
                # 更新现有日记
                diary.user_id = user_id
                diary.title = data['title']
                diary.content = data['content']
                diary.date = date_obj
                diary.score = data.get('score')
                diary.tag = data.get('tag')
                action = '更新'
            else:
                # diary_id 不存在，创建新的日记条目并使用指定的 id
                diary = Diary(
                    id=diary_id,
                    user_id=user_id,
                    title=data['title'],
                    content=data['content'],
                    date=date_obj,
                    score=data.get('score'),
                    tag=data.get('tag')
                )
                db.session.add(diary)
                action = '创建'
        else:
            # 没有提供 diary_id，创建新的日记条目
            diary = Diary(
                user_id=user_id,
                title=data['title'],
                content=data['content'],
                date=date_obj,
                score=data.get('score'),
                tag=data.get('tag')
            )
            db.session.add(diary)
            action = '创建'
        
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': f'日记{action}成功',
            'diary_id': diary.id,
            'user_id': user_id,
            'action': action
        }), 201
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400


# 2. 查询数据（根据 user_id 查询该用户的所有日记）
@app.route('/api/diary/<int:user_id>', methods=['GET'])
def get_user_diaries(user_id):
    try:
        # 查找用户
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({
                'status': 'error',
                'message': f'用户 {user_id} 不存在'
            }), 404
        
        # 获取该用户的所有日记
        diaries = Diary.query.filter_by(user_id=user_id).order_by(Diary.date.desc()).all()
        
        # 转换时间为北京时间字符串
        beijing_tz = pytz.timezone('Asia/Shanghai')
        
        diary_list = []
        for diary in diaries:
            date_beijing = diary.date.astimezone(beijing_tz)
            diary_list.append({
                'diary_id': diary.id,
                'title': diary.title,
                'content': diary.content,
                'date': date_beijing.strftime('%Y-%m-%d %H:%M:%S'),
                'score': diary.score,
                'tag': diary.tag
            })
        
        return jsonify({
            'status': 'success',
            'user_id': user_id,
            'total': len(diary_list),
            'data': diary_list
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# 初始化数据库和预设用户
def init_database():
    with app.app_context():
        # 创建所有表
        db.create_all()


if __name__ == '__main__':
    # 初始化数据库和预设用户
    init_database()
    
    # 运行应用
    app.run(host='0.0.0.0',debug=True, port=5000)