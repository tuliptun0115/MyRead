/**
 * MyRead API Service
 * 負責所有與 GAS 後端的通訊，封裝錯誤處理與 JSON 協議。
 */

const GAS_URL = import.meta.env.VITE_GAS_API_URL;

const apiService = {
  /**
   * 通用請求發送器
   */
  async request(action, payload = {}, auth = null) {
    if (!GAS_URL) {
      console.error('GAS_URL is not defined in .env');
      return { success: false, message: '系統環境設定錯誤' };
    }

    try {
      const response = await fetch(GAS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({ action, payload, auth }),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API [${action}] Error:`, error);
      return { success: false, message: '連線異常，請稍後再試' };
    }
  },

  /**
   * 獲取所有閱讀紀錄 (GET)
   */
  async fetchRecords() {
    try {
      const response = await fetch(GAS_URL);
      const res = await response.json();
      return res.success ? (res.data || []) : [];
    } catch (error) {
      console.error('Fetch Records Error:', error);
      return [];
    }
  },

  /**
   * 圖片 OCR 辨識
   */
  async performOCR(base64Data, auth, mimeType = 'image/jpeg') {
    return this.request('OCR', { base64: base64Data, mimeType }, auth);
  },

  /**
   * 搜尋書籍詳細資訊 (爬蟲)
   */
  async searchBook(title) {
    return this.request('SEARCH_BOOK', { title }); // 搜尋目前不需 auth
  },

  /**
   * 產出 AI 摘要
   */
  async generateSummary(bookContent, auth) {
    return this.request('AI_SUMMARY', { text: bookContent }, auth);
  },

  /**
   * 提交新紀錄
   */
  async submitRecord(formData, auth) {
    return this.request('SUBMIT', formData, auth);
  },

  /**
   * 更新現有紀錄
   */
  async updateRecord(formData, auth) {
    return this.request('UPDATE', formData, auth);
  }
};

export default apiService;
