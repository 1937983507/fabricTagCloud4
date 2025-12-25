/**
 * 统计服务
 * 用于记录页面访问和标签云生成次数
 */

// 导入 axios
import axios from 'axios';

// 统计 API 端点
// 开发环境：使用环境变量或 localhost
// 生产环境：使用相对路径（通过 Nginx 代理）
const STATS_API_BASE_URL = import.meta.env.VITE_STATS_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:3001' : '');

/**
 * 记录页面访问
 * 每次页面刷新都会记录一次访问
 * @returns {Promise<void>}
 */
export async function recordPageVisit() {
  try {
    await axios.post(`${STATS_API_BASE_URL}/stats-api/visit`, {
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
    });
  } catch (error) {
    console.warn('记录页面访问失败:', error);
    throw error; // 抛出错误以便调用者知道失败
  }
}

/**
 * 记录词云生成
 * 每次生成词云都会记录一次
 * @param {string} subsystem - 子系统类型: 'tagcloud' | 'treemap' | 'voronoi'
 * @returns {Promise<void>}
 */
export async function recordTagCloudGeneration(subsystem = 'tagcloud') {
  try {
    await axios.post(`${STATS_API_BASE_URL}/stats-api/generate`, {
      subsystem: subsystem,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
    });
  } catch (error) {
    console.warn('记录词云生成失败:', error);
  }
}

/**
 * 获取统计数据
 * @returns {Promise<{totalVisits: number, tagcloud: number, treemap: number, voronoi: number}>}
 */
export async function getStatistics() {
  try {
    const response = await axios.get(`${STATS_API_BASE_URL}/stats-api/stats`);
    if (response.data.success) {
      return {
        totalVisits: response.data.data.totalVisits || 0,
        tagcloud: response.data.data.tagcloud || 0,
        treemap: response.data.data.treemap || 0,
        voronoi: response.data.data.voronoi || 0,
      };
    }
    return {
      totalVisits: 0,
      tagcloud: 0,
      treemap: 0,
      voronoi: 0,
    };
  } catch (error) {
    console.warn('获取统计数据失败:', error);
    return {
      totalVisits: 0,
      tagcloud: 0,
      treemap: 0,
      voronoi: 0,
    };
  }
}

