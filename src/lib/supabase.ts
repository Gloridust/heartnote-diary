import { createClient } from '@supabase/supabase-js'

// Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 创建 Supabase 客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 数据库类型定义
export interface User {
  id: number
  create_time: string
}

export interface Diary {
  id: number
  user_id: number
  title: string
  content: string
  date: string
  score?: number
  tag?: string
  created_at?: string
  updated_at?: string
}

// API 响应类型定义
export interface DiaryApiResponse {
  status: 'success' | 'error'
  message?: string
  diary_id?: number
  user_id?: number
  action?: string
}

export interface DiaryListResponse {
  status: 'success' | 'error'
  message?: string
  user_id?: number
  total?: number
  data?: Diary[]
} 