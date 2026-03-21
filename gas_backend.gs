// ============================================================
// MyRead - Google Apps Script 後端 (智慧序號 & 深度摘要終極版)
// 修復：序號 #NUM! 錯誤、摘要中斷問題、環境相容性
// ============================================================

const SHEET_NAME = '閱讀紀錄';
const CONFIG_SHEET = 'User_Config';
const LOG_SHEET = 'Usage_Log';

function getGeminiKey_() {
  const keysStr = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY') || '';
  if (!keysStr) return '';
  const keys = keysStr.split(',').map(k => k.trim()).filter(Boolean);
  if (keys.length === 0) return '';
  const randomIndex = Math.floor(Math.random() * keys.length);
  return keys[randomIndex];
}

function initSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. 閱讀紀錄表
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['序號', '資料建立日', '書名', '作者', '書籍分類', '閱讀完成日', '出版社', 'AI摘要精華重點', '封面圖片']);
  }
  
  // 2. 用戶配置表
  let configSheet = ss.getSheetByName(CONFIG_SHEET);
  if (!configSheet) {
    configSheet = ss.insertSheet(CONFIG_SHEET);
    configSheet.appendRow(['帳號', '密碼', '每日上限', '身份', '最後更新']);
    configSheet.appendRow(['tuliptun', '0000', 10, 'admin', new Date()]); // 預設帳號
  }

  // 3. 使用日誌表
  let logSheet = ss.getSheetByName(LOG_SHEET);
  if (!logSheet) {
    logSheet = ss.insertSheet(LOG_SHEET);
    logSheet.appendRow(['日期', '使用者', '計數']);
  }

  return sheet;
}

/**
 * 🔒 身份驗證與用量檢查
 */
function validateAuthAndUsage_(auth, action) {
  if (!auth || !auth.username) return { success: false, message: '請先登入' };
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(CONFIG_SHEET);
  const logSheet = ss.getSheetByName(LOG_SHEET);
  
  // 1. 驗證帳密
  const configData = configSheet.getDataRange().getValues();
  let userRow = -1;
  let userLimit = 0;
  for (let i = 1; i < configData.length; i++) {
    if (configData[i][0] == auth.username && configData[i][1] == auth.password) {
      userRow = i + 1;
      userLimit = configData[i][2] || 10;
      break;
    }
  }
  if (userRow === -1) return { success: false, message: '帳號或密碼錯誤' };

  // 2. 檢查每日額度 (僅針對 AI 與 提交動作)
  if (['OCR', 'AI_SUMMARY', 'SUBMIT'].includes(action)) {
    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const logData = logSheet.getDataRange().getValues();
    let currentUsage = 0;
    let logRow = -1;

    for (let i = 1; i < logData.length; i++) {
      let logDate = logData[i][0];
      if (logDate instanceof Date) logDate = Utilities.formatDate(logDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      if (logDate == today && logData[i][1] == auth.username) {
        currentUsage = logData[i][2];
        logRow = i + 1;
        break;
      }
    }

    if (currentUsage >= userLimit) return { success: false, message: `今日使用額度已達上限 (${userLimit})` };

    // 3. 增加用量紀錄
    if (logRow !== -1) {
      logSheet.getRange(logRow, 3).setValue(currentUsage + 1);
    } else {
      logSheet.appendRow([today, auth.username, 1]);
    }
    // 更新用戶表的最後更新時間
    configSheet.getRange(userRow, 5).setValue(new Date());
  }

  return { success: true };
}

/**
 * 🚀 統一 AI 橋接器 (Unified AI Bridge)
 * 整合 OCR、廣播、網址解析與搜尋功能，支援單一金鑰與備援。
 */
function callGemini_(prompt, base64 = null, mimeType = null, useSearch = false) {
  const GEMINI_API_KEY = getGeminiKey_();
  if (!GEMINI_API_KEY) return { success: false, message: 'API key 未設定' };
  
  // 根據診斷結果，您的帳號可用且最佳的模型為 gemini-2.5-flash
  const versions = ['v1beta', 'v1'];
  const models = ['gemini-2.5-flash'];
  let lastError = '';

  for (let version of versions) {
    for (let model of models) {
      try {
        const api_url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
        const parts = base64 ? [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64 } }] : [{ text: prompt }];
        
        const payload = { 
          contents: [{ parts: parts }], 
          generationConfig: { temperature: 0.2 } 
        };

        // 僅在 v1beta 時加入連網搜尋工具
        if (useSearch && version === 'v1beta') {
          payload.tools = [{ google_search_retrieval: {} }];
        }

        const res = UrlFetchApp.fetch(api_url, { 
          method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true 
        });

        const resCode = res.getResponseCode();
        if (resCode === 200) {
          const json = JSON.parse(res.getContentText());
          const text = json.candidates[0].content.parts[0].text;
          return { success: true, text: text };
        }
        lastError = `Ver ${version} Model ${model} (${resCode})`;
      } catch (e) {
        lastError = e.toString();
      }
    }
  }
  return { success: false, message: 'AI 解析失敗: ' + lastError };
}

/**
 * 終極備援：Google Books API (無需金鑰)
 */
function fetchGoogleBooks_(query) {
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1`;
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (res.getResponseCode() === 200) {
      const data = JSON.parse(res.getContentText());
      if (data.items && data.items.length > 0) {
        const info = data.items[0].volumeInfo;
        return {
          success: true,
          title: info.title || '',
          author: (info.authors || []).join(', '),
          publisher: info.publisher || '',
          category: (info.categories || []).join(', '),
          coverUrl: (info.imageLinks ? info.imageLinks.thumbnail : '').replace('http:', 'https:'),
          rawDescription: info.description || ''
        };
      }
    }
  } catch (e) {}
  return { success: false };
}

/**
 * 🧹 HTML 清洗：移除 Script, Style, Nav 等無用標籤，節省 Token 並減少干擾
 */
function cleanHtml_(html) {
  if (!html) return "";
  // 移除 Scripts, Styles, Comments
  let clean = html
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, "")
    .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
  
  // 移除常見的導覽、頁尾標籤
  clean = clean
    .replace(/<nav\b[^>]*>([\s\S]*?)<\/nav>/gi, "")
    .replace(/<footer\b[^>]*>([\s\S]*?)<\/footer>/gi, "");

  // 移除重複空格與換行
  clean = clean.replace(/\s+/g, " ").trim();
  
  return clean.substring(0, 15000); 
}

/**
 * 🧠 穩健的 AI JSON 解析器：處理 Markdown 或不完整的 JSON
 */
function parseAiJson_(text) {
  if (!text) return null;
  try {
    // 1. 嘗試直接解析
    return JSON.parse(text);
  } catch (e) {
    // 2. 嘗試從 Markdown 區塊中提取
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e2) {}
    }
    
    // 3. 嘗試暴力提取第一個 { 和最後一個 }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      try {
        return JSON.parse(text.substring(firstBrace, lastBrace + 1));
      } catch (e3) {}
    }
  }
  return null;
}

function handleUrlScrape_(bookUrl) {
  try {
    // 💡 博客來 403 終極破解法：主站商品頁會擋 GAS，但「搜尋頁」不會！
    // 我們直接把產品 ID 拿去 books 搜尋頁撈取，該頁面有齊全的書名、作者與簡介
    let targetUrl = bookUrl;
    const booksTwMatch = bookUrl.match(/books\.com\.tw\/products\/([A-Za-z0-9]+)/);
    if (booksTwMatch) {
      targetUrl = `https://search.books.com.tw/search/query/key/${booksTwMatch[1]}/cat/all`;
    }

    const options = {
      muteHttpExceptions: true,
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    };
    
    let response = UrlFetchApp.fetch(targetUrl, options);
    let htmlContent = "";
    
    if (response.getResponseCode() === 200) {
      htmlContent = cleanHtml_(response.getContentText());
    }

    let aiRes;
    
    // 如果成功抓到網頁內容，先嘗試爬蟲解析
    if (htmlContent && htmlContent.length > 100) {
      const prompt = `你是一位專業的書籍資料提取員。請從下方的網頁 HTML 內容中精確提取書籍資訊。
必須回傳標準的 JSON 格式，包含以下欄位（若資料缺失請給空字串）：
- title: 書名 (含副標題)
- author: 作者
- publisher: 出版社
- category: 最貼切的分類 
- coverUrl: 封面圖片連結 
- summary: 根據書籍內容，寫一段 100 字以內的精華摘要

HTML 內容如下：
${htmlContent}`;
      aiRes = callGemini_(prompt);
    }

    // --- 核心轉向：若沒抓到網頁(403) 或 AI 爬蟲解析失敗，啟動「強大連網搜尋備援」 ---
    if (!aiRes || !aiRes.success || !aiRes.text || aiRes.text.length < 20) {
      const searchPrompt = `請連網搜尋這本書的詳細資訊。網址：${bookUrl}
必須回傳標準的 JSON 格式，不要有任何其他對話文字：
{
  "title": "書名 (含副標題)",
  "author": "作者",
  "publisher": "出版社",
  "category": "分類",
  "coverUrl": "封面網址",
  "summary": "根據搜尋到的內容，寫一段 100 字以內的精華摘要"
}`;
      aiRes = callGemini_(searchPrompt, null, null, true); // useSearch = true
    }

    if (!aiRes.success) {
      // 最後的最後，嘗試對 URL 本身做 Google Books 關鍵字搜尋 (避免 AI 也掛了)
      const gBooksSearch = fetchGoogleBooks_(bookUrl);
      if (gBooksSearch.success) return gBooksSearch;
      return { success: false, message: `解析失敗: ${aiRes.message || '無法獲取資料'}` };
    }

    const data = parseAiJson_(aiRes.text);
    if (!data) return { success: false, message: 'AI 回傳格式異常，原文如下:\n' + aiRes.text.substring(0, 200) };

    return {
      success: true,
      title: data.title || '未知書名',
      author: data.author || '',
      publisher: data.publisher || '',
      category: data.category || '',
      coverUrl: data.coverUrl || '',
      summary: data.summary || ''
    };
  } catch (e) {
    return { success: false, message: '解析異常: ' + e.message };
  }
}

// ------------------------------------------------------------
// API 入口
// ------------------------------------------------------------

function doPost(e) {
  let request;
  try { request = JSON.parse(e.postData.contents); } catch (err) { return ContentService.createTextOutput(JSON.stringify({ success: false })).setMimeType(ContentService.MimeType.JSON); }
  const { action, payload, auth } = request;

  // 全域檢查：除搜尋外，所有動作需驗證
  if (action !== 'SEARCH_BOOK') {
    const check = validateAuthAndUsage_(auth, action);
    if (!check.success) return ContentService.createTextOutput(JSON.stringify(check)).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'OCR') {
    const prompt = `這是一張書籍封面。請提取書名 (title)、作者 (author)、出版社 (publisher)、分類 (category)。回傳純 JSON 格式。`;
    const aiRes = callGemini_(prompt, payload.base64, payload.mimeType);
    if (aiRes.success) {
      const data = parseAiJson_(aiRes.text);
      return ContentService.createTextOutput(JSON.stringify({ success: true, ...data })).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify(aiRes)).setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === 'SCRAPE_URL') return ContentService.createTextOutput(JSON.stringify(handleUrlScrape_(payload.url))).setMimeType(ContentService.MimeType.JSON);
  
  if (action === 'AI_SUMMARY') {
    const prompt = `根據以下資訊：\n${payload.text}\n寫一段 100 字內精華摘要。`;
    const aiRes = callGemini_(prompt);
    return ContentService.createTextOutput(JSON.stringify({ success: aiRes.success, summary: aiRes.text || '' })).setMimeType(ContentService.MimeType.JSON);
  }
  if (action === 'SEARCH_BOOK') return ContentService.createTextOutput(JSON.stringify({ success: true, data: scrapeBooksComTw_(payload.title) })).setMimeType(ContentService.MimeType.JSON);
  if (action === 'SUBMIT') return handleRecordSubmission_(payload);
  if (action === 'UPDATE') return handleUpdateRecord_(payload);

  return ContentService.createTextOutput(JSON.stringify({ success: false })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * 提交紀錄：修復 BKxx 序號邏輯
 */
function handleRecordSubmission_(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // 等待最多 10 秒
    const sheet = initSheet();
    const lastRow = sheet.getLastRow();
    
    // --- 智慧序號生成 (支援 BK01 格式) ---
    let nextId = "BK01";
    if (lastRow > 1) {
      const lastIdVal = String(sheet.getRange(lastRow, 1).getValue());
      const match = lastIdVal.match(/([a-zA-Z]+)(\d+)/);
      if (match) {
        const prefix = match[1];
        const num = parseInt(match[2]) + 1;
        nextId = prefix + (num < 10 ? '0' + num : num); // 自動補零
      } else {
        const lastNum = parseInt(lastIdVal.replace(/[^0-9]/g, "")) || 0;
        nextId = "BK" + (lastNum + 1 < 10 ? '0' + (lastNum + 1) : (lastNum + 1));
      }
    }

    const finalTitle = data.subtitle ? `${data.title}：${data.subtitle}` : data.title;
    const completionDate = data.completionDate || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

    sheet.appendRow([
      nextId,
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
      finalTitle,
      data.author || '',
      data.category || '',
      String(completionDate),
      data.publisher || '',
      data.summary || '',
      data.coverUrl || '' 
    ]);

    return ContentService.createTextOutput(JSON.stringify({ success: true, message: '儲存成功' })).setMimeType(ContentService.MimeType.JSON);
  } catch (e) { 
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: e.toString() })).setMimeType(ContentService.MimeType.JSON); 
  } finally {
    lock.releaseLock();
  }
}

/**
 * 更新紀錄：根據 ID 找到對應行並更新
 */
function handleUpdateRecord_(data) {
  try {
    const sheet = initSheet();
    const lRow = sheet.getLastRow();
    if (lRow <= 1) return ContentService.createTextOutput(JSON.stringify({ success: false, message: '找不到資料' })).setMimeType(ContentService.MimeType.JSON);
    
    const ids = sheet.getRange(2, 1, lRow - 1, 1).getValues();
    let rowIndex = -1;
    for (let i = 0; i < ids.length; i++) {
        if (String(ids[i][0]) === String(data.id)) {
            rowIndex = i + 2;
            break;
        }
    }

    if (rowIndex === -1) return ContentService.createTextOutput(JSON.stringify({ success: false, message: '找不到該筆紀錄' })).setMimeType(ContentService.MimeType.JSON);

    // 取得資料行：ID, 建立日, 書名, 作者, 分類, 完成日, 出版社, 摘要, 封面
    sheet.getRange(rowIndex, 3).setValue(data.title);
    sheet.getRange(rowIndex, 4).setValue(data.author || '');
    sheet.getRange(rowIndex, 5).setValue(data.category || '');
    sheet.getRange(rowIndex, 6).setValue(data.completionDate || '');
    sheet.getRange(rowIndex, 7).setValue(data.publisher || '');
    sheet.getRange(rowIndex, 8).setValue(data.summary || '');
    sheet.getRange(rowIndex, 9).setValue(data.coverUrl || '');

    return ContentService.createTextOutput(JSON.stringify({ success: true, message: '更新成功' })).setMimeType(ContentService.MimeType.JSON);
  } catch (e) { return ContentService.createTextOutput(JSON.stringify({ success: false, message: e.toString() })).setMimeType(ContentService.MimeType.JSON); }
}

function doGet(e) {
  try {
    const sheet = initSheet();
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] })).setMimeType(ContentService.MimeType.JSON);

    const records = [];
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 3 || !row[2]) continue;

        let creatDate = row[1];
        if (creatDate instanceof Date) creatDate = Utilities.formatDate(creatDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        let compDate = row[5];
        if (compDate instanceof Date) compDate = Utilities.formatDate(compDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');

        records.push({
            id: row[0],
            creationDate: creatDate,
            title: row[2],
            author: row[3] || '',
            category: row[4] || '',
            completionDate: compDate,
            publisher: row[6] || '',
            summary: row[7] || '',
            coverUrl: row[8] || ''
        });
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: records })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) { return ContentService.createTextOutput(JSON.stringify({ success: false, message: error.toString() })).setMimeType(ContentService.MimeType.JSON); }
}

function scrapeBooksComTw_(query) {
  if (!query) return { coverUrl: '', summary: '' };
  try {
    const searchUrl = `https://search.books.com.tw/search/query/key/${encodeURIComponent(query)}/cat/all`;
    const response = UrlFetchApp.fetch(searchUrl, { muteHttpExceptions: true });
    const html = response.getContentText();
    const bookUrlMatch = html.match(/href="([^"]*books\.com\.tw\/products\/[^"]*)"/);
    if (!bookUrlMatch) return { coverUrl: '', summary: '' };
    
    const bookUrl = bookUrlMatch[1].startsWith('//') ? 'https:' + bookUrlMatch[1] : bookUrlMatch[1];
    const bookRes = UrlFetchApp.fetch(bookUrl, { muteHttpExceptions: true });
    const bookHtml = bookRes.getContentText();
    const coverMatch = bookHtml.match(/https?:\/\/[^"]+getimage\.php\?i=[^&"]+/i);
    const summaryMatch = bookHtml.match(/<div class="content">([\s\S]*?)<\/div>/i);
    
    return {
      coverUrl: coverMatch ? coverMatch[0] : '',
      summary: summaryMatch ? summaryMatch[1].replace(/<[^>]+>/g, '').trim().substring(0, 300) : ''
    };
  } catch (e) { return { coverUrl: '', summary: '' }; }
}
