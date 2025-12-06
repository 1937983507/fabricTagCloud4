import { pinyin } from 'pinyin-pro';

/**
 * 将中文城市名转换为拼音
 * @param {string} cityName - 中文城市名
 * @returns {string} - 拼音（首字母大写，空格分隔）
 */
export const cityNameToPinyin = (cityName = '') => {
  if (!cityName) return '';
  
  try {
    // 使用 pinyin-pro 转换为拼音，不带声调
    // pinyin-pro 默认返回格式为 "bei jing"（空格分隔，小写）
    const pinyinStr = pinyin(cityName, { 
      toneType: 'none' // 不带声调
    });
    
    // 将拼音转换为首字母大写的格式（每个词的首字母大写）
    // 例如: "bei jing" -> "Bei Jing"
    return pinyinStr
      .split(' ')
      .map(word => {
        if (!word) return '';
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  } catch (error) {
    console.warn('[cityNameToPinyin] 转换失败:', cityName, error);
    return cityName; // 转换失败时返回原城市名
  }
};

