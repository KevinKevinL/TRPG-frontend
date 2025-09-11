// db.js - 使用 PostgreSQL (pg) 连接池
import { Pool } from 'pg';

// 使用环境变量中的 DATABASE_URL
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn('警告: 未设置环境变量 DATABASE_URL，PostgreSQL 连接将失败。');
}

// 在生产环境常见的托管 PG 需要 SSL；本地一般不需要
const sslOption = process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false;

const pool = new Pool({ connectionString, ssl: sslOption });

// =============================================================
// API 路由处理器 - 统一执行 SQL（占位符使用 $1...$n）
// =============================================================

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const { query, params } = req.body;
    console.log('服务器收到查询:', query);
    console.log('服务器收到参数:', params);

    try {
      const result = await pool.query(query, params);
      // 对于 SELECT，rows 为结果数组；对于非 SELECT，返回 rows（通常为空）以保持前端兼容
      console.log('查询执行成功, 行数:', result.rowCount);
      res.status(200).json({ results: result.rows });
    } catch (dbError) {
      console.error('SQL执行错误:', {
        message: dbError.message,
        sql: query,
        values: params
      });
      res.status(500).json({
        error: dbError.message,
        sqlError: {
          sql: query,
          params: params
        }
      });
    }
  } catch (error) {
    console.error('服务器错误:', error);
    res.status(500).json({
      error: '服务器错误',
      details: error.message,
      stack: error.stack
    });
  }
}
