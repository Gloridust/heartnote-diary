import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

interface DiaryApiRequest {
  id: number;           // 用户ID
  diary_id?: number;    // 日记ID (可选，更新时使用)
  title: string;        // 日记标题
  content: string;      // 日记内容
  date: string;         // 日期时间 (YYYY-MM-DD HH:MM:SS)
  score?: number;       // 心情评分 (1-10)
  tag?: string;         // 标签
  location?: {          // 位置信息
    latitude: number;
    longitude: number;
    formatted_address: string;
    city: string;
    district: string;
    street: string;
  };
  weather?: {           // 天气信息
    temperature: number;
    description: string;
    icon: string;
    humidity: number;
    wind_speed: number;
    feels_like: number;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  try {
    if (method === 'POST') {
      // 保存/更新日记
      return await handleSaveDiary(req, res);
    } else if (method === 'GET') {
      // 获取用户日记
      return await handleGetUserDiaries(req, res);
    } else if (method === 'DELETE') {
      // 删除日记
      return await handleDeleteDiary(req, res);
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      return res.status(405).json({ 
        status: 'error', 
        message: `Method ${method} Not Allowed` 
      });
    }
  } catch (error) {
    console.error('Diary API error:', error);
    return res.status(500).json({
      status: 'error',
      message: '服务器内部错误'
    });
  }
}

// 处理保存日记请求
async function handleSaveDiary(req: NextApiRequest, res: NextApiResponse) {
  const diaryData: DiaryApiRequest = req.body;

  console.log('📝 保存日记请求:', diaryData);

  try {
    const { id: userId, diary_id, title, content, date, score, tag, location, weather } = diaryData;

    // 1. 检查用户是否存在，不存在则自动创建
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingUser) {
      console.log(`👤 自动创建新用户: ${userId}`);
      const { error: userError } = await supabase
        .from('users')
        .insert([{ id: userId, create_time: new Date().toISOString() }]);

      if (userError) {
        console.error('❌ 创建用户失败:', userError);
        throw userError;
      }
    }

    let result;
    let action;

    if (diary_id) {
      // 更新现有日记
      const { data, error } = await supabase
        .from('diaries')
        .update({
          user_id: userId,
          title,
          content,
          date,
          score,
          tag,
          location,
          weather,
          updated_at: new Date().toISOString()
        })
        .eq('id', diary_id)
        .select()
        .single();

      if (error) {
        console.error('❌ 更新日记失败:', error);
        throw error;
      }

      result = data;
      action = '更新';
    } else {
      // 创建新日记
      const { data, error } = await supabase
        .from('diaries')
        .insert([{
          user_id: userId,
          title,
          content,
          date,
          score,
          tag,
          location,
          weather
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ 创建日记失败:', error);
        throw error;
      }

      result = data;
      action = '创建';
    }

    console.log('✅ 日记保存成功:', result);

    return res.status(201).json({
      status: 'success',
      message: `日记${action}成功`,
      diary_id: result.id,
      user_id: userId,
      action
    });

  } catch (error) {
    console.error('❌ 保存日记失败:', error);
    
    return res.status(500).json({
      status: 'error',
      message: '保存日记失败'
    });
  }
}

// 处理获取用户日记请求
async function handleGetUserDiaries(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({
      status: 'error',
      message: '用户ID参数缺失'
    });
  }

  console.log('📖 获取用户日记请求:', userId);

  try {
    // 检查用户是否存在
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('id', parseInt(userId))
      .single();

    if (!user) {
      return res.status(200).json({
        status: 'error',
        message: `用户 ${userId} 不存在`,
        user_id: parseInt(userId),
        total: 0,
        data: []
      });
    }

    // 获取用户的所有日记，按日期倒序排列
    const { data: diaries, error } = await supabase
      .from('diaries')
      .select('*')
      .eq('user_id', parseInt(userId))
      .order('date', { ascending: false });

    if (error) {
      console.error('❌ 获取日记失败:', error);
      throw error;
    }

    // 格式化数据以匹配原来的API格式
    const formattedDiaries = diaries?.map(diary => ({
      diary_id: diary.id,
      title: diary.title,
      content: diary.content,
      date: diary.date,
      score: diary.score,
      tag: diary.tag,
      location: diary.location,
      weather: diary.weather
    })) || [];

    console.log('✅ 获取日记成功:', formattedDiaries);

    return res.status(200).json({
      status: 'success',
      user_id: parseInt(userId),
      total: formattedDiaries.length,
      data: formattedDiaries
    });

  } catch (error) {
    console.error('❌ 获取日记失败:', error);
    
    return res.status(500).json({
      status: 'error',
      message: '获取日记失败'
    });
  }
}

// 处理删除日记请求
async function handleDeleteDiary(req: NextApiRequest, res: NextApiResponse) {
  const { diary_id, user_id } = req.query;

  console.log('🗑️ 删除日记请求:', { diary_id, user_id });

  // 验证参数
  if (!diary_id || !user_id) {
    return res.status(400).json({
      status: 'error',
      message: '缺少必要参数：diary_id 和 user_id'
    });
  }

  try {
    // 首先验证日记是否属于该用户
    const { data: existingDiary, error: fetchError } = await supabase
      .from('diaries')
      .select('id, user_id')
      .eq('id', diary_id)
      .eq('user_id', user_id)
      .single();

    if (fetchError || !existingDiary) {
      console.error('❌ 日记不存在或不属于该用户:', fetchError);
      return res.status(404).json({
        status: 'error',
        message: '日记不存在或无权限删除'
      });
    }

    // 执行删除
    const { error: deleteError } = await supabase
      .from('diaries')
      .delete()
      .eq('id', diary_id)
      .eq('user_id', user_id);

    if (deleteError) {
      console.error('❌ 删除日记失败:', deleteError);
      throw deleteError;
    }

    console.log('✅ 日记删除成功:', diary_id);

    return res.status(200).json({
      status: 'success',
      message: '日记删除成功',
      diary_id: parseInt(diary_id as string)
    });

  } catch (error) {
    console.error('❌ 删除日记失败:', error);
    
    return res.status(500).json({
      status: 'error',
      message: '删除日记失败'
    });
  }
} 