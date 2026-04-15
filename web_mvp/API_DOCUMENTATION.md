# Heartnote Diary API 文档

## 服务器配置

- **基础URL**: `http://localhost:5000`
- **端口**: 5000
- **数据库**: SQLite (journal.db)

## 数据模型

### User 用户表
```python
{
    "id": Integer,          # 用户ID (主键)
    "create_time": DateTime # 创建时间 (自动设置)
}
```

### Diary 日记表
```python
{
    "id": Integer,          # 日记ID (主键，自动生成或手动指定)
    "user_id": Integer,     # 用户ID (外键)
    "title": String,        # 日记标题 (必填)
    "content": Text,        # 日记内容 (必填)
    "date": DateTime,       # 日记日期 (必填)
    "score": Integer,       # 评分 (可选)
    "tag": String          # 标签 (可选)
}
```

## API 接口

### 1. 添加/更新日记

**请求**
- **方法**: `POST`
- **URL**: `/api/diary`
- **Content-Type**: `application/json`

**请求体参数**:
```json
{
    "id": 1,                           // 用户ID (必填)
    "diary_id": 123,                   // 日记ID (可选，如果提供则更新现有日记)
    "title": "今天的心情",              // 日记标题 (必填)
    "content": "今天天气很好...",        // 日记内容 (必填)
    "date": "2024-01-15 14:30:00",     // 日期时间 (必填，格式: YYYY-MM-DD HH:MM:SS)
    "score": 8,                        // 心情评分 (可选，1-10)
    "tag": "开心"                      // 标签 (可选)
}
```

**响应示例**:

**成功响应 (201 Created)**:
```json
{
    "status": "success",
    "message": "日记创建成功",           // 或 "日记更新成功"
    "diary_id": 123,
    "user_id": 1,
    "action": "创建"                   // 或 "更新"
}
```

**错误响应 (400 Bad Request)**:
```json
{
    "status": "error",
    "message": "错误详细信息"
}
```

### 2. 获取用户所有日记

**请求**
- **方法**: `GET`
- **URL**: `/api/diary/{user_id}`

**路径参数**:
- `user_id`: 用户ID (整数)

**响应示例**:

**成功响应 (200 OK)**:
```json
{
    "status": "success",
    "user_id": 1,
    "total": 2,
    "data": [
        {
            "diary_id": 2,
            "title": "第二篇日记",
            "content": "今天又是美好的一天...",
            "date": "2024-01-16 15:00:00",
            "score": 9,
            "tag": "愉快"
        },
        {
            "diary_id": 1,
            "title": "我的第一篇日记",
            "content": "今天开始写日记...",
            "date": "2024-01-15 14:30:00",
            "score": 8,
            "tag": "开心"
        }
    ]
}
```

**用户不存在 (404 Not Found)**:
```json
{
    "status": "error",
    "message": "用户 999 不存在"
}
```

## 行为说明

### 用户自动创建
- 当调用 `/api/diary` 接口时，如果指定的 `user_id` 不存在，系统会自动创建该用户
- 新用户的 `create_time` 会设置为当前北京时间

### 日记创建/更新逻辑
1. **不提供 `diary_id`**: 创建新日记，系统自动分配ID
2. **提供 `diary_id` 且该ID存在**: 更新现有日记，覆盖所有字段
3. **提供 `diary_id` 但该ID不存在**: 创建新日记并使用指定的ID

## 使用示例

### 示例 1: 创建新用户和日记
```bash
curl -X POST http://localhost:5000/api/diary \
  -H "Content-Type: application/json" \
  -d '{
    "id": 100,
    "title": "我的第一篇日记",
    "content": "今天开始记录我的生活点滴...",
    "date": "2024-01-20 10:00:00",
    "score": 7,
    "tag": "新开始"
  }'
```

### 示例 2: 更新现有日记
```bash
curl -X POST http://localhost:5000/api/diary \
  -H "Content-Type: application/json" \
  -d '{
    "id": 100,
    "diary_id": 1,
    "title": "我的第一篇日记（修改版）",
    "content": "今天开始记录我的生活点滴...更新了内容",
    "date": "2024-01-20 10:30:00",
    "score": 8,
    "tag": "更新"
  }'
```

### 示例 3: 查询用户所有日记
```bash
curl -X GET http://localhost:5000/api/diary/100
```

### 示例 4: 使用指定的日记ID创建日记
```bash
curl -X POST http://localhost:5000/api/diary \
  -H "Content-Type: application/json" \
  -d '{
    "id": 100,
    "diary_id": 999,
    "title": "指定ID的日记",
    "content": "这篇日记使用了指定的ID...",
    "date": "2024-01-20 16:00:00",
    "score": 6,
    "tag": "测试"
  }'
```

## 启动服务器

```bash
python server.py
```

服务器将在 `http://localhost:5000` 启动，并自动创建数据库和必要的表结构。

## 注意事项

1. **时区处理**: 所有时间都以北京时间 (Asia/Shanghai) 为准
2. **日期格式**: 必须使用 `YYYY-MM-DD HH:MM:SS` 格式
3. **用户自动创建**: 系统会自动创建不存在的用户，无需预先注册
4. **日记覆盖**: 当提供 `diary_id` 时，会完全覆盖现有日记的所有字段
5. **数据持久化**: 数据存储在 SQLite 数据库文件 `journal.db` 中 