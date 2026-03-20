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
 * OCR 辨識：Gemini 2.5-flash
 */
function callGeminiOcr_(base64Data, mimeType) {
  const GEMINI_API_KEY = getGeminiKey_();
  if (!GEMINI_API_KEY) return { success: false, message: 'API key not set' };
  const model = 'gemini-2.5-flash'; 
  const apiVersion = 'v1beta';
  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  
  const prompt = `這是一張書籍封面圖片。請精準提取書名 (title)、作者 (author)、出版社 (publisher)、分類 (category)。請僅回傳原始 JSON 格式，不要包含 Markdown 標記：{"title": "...", "author": "...", "publisher": "...", "category": "..."}`;

  try {
    const payload = {
      contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64Data } }] }],
      generationConfig: { temperature: 0.1, response_mime_type: "application/json" }
    };
    const res = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true });
    if (res.getResponseCode() === 200) {
      const jsonRes = JSON.parse(res.getContentText());
      let content = jsonRes.candidates[0].content.parts[0].text;
      return { success: true, ...JSON.parse(content) };
    }
    return { success: false, message: `API Error: ${res.getResponseCode()}` };
  } catch (e) { return { success: false, message: e.toString() }; }
}

/**
 * 生成 AI 濃縮摘要：限制在 100 字內
 */
function callGeminiSummary_(content) {
  const GEMINI_API_KEY = getGeminiKey_();
  if (!GEMINI_API_KEY) return { summary: '' };
  const model = 'gemini-2.5-flash'; 
  const apiVersion = 'v1beta';
  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  
  const prompt = `你是一位專業的書籍分析師。根據以下書籍資訊：
${content}
請寫一段「精華摘要」，包含核心重點，嚴格限制在 100 字以內 (繁體中文)。
要求：必須是一個完整的段落，不可在句子中途斷開，確保內容完整。
只輸出內容，不要標題或贅字。`;

  try {
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 500 }
      }),
      muteHttpExceptions: true
    });
    if (res.getResponseCode() === 200) {
      let text = JSON.parse(res.getContentText())?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      text = text.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
      return { summary: text || '' };
    }
  } catch(e) { Logger.log("Summary Err: " + e) }
  return { summary: '' };
}

/**
 * 網址解析：從網頁內容提取書籍資訊 (Gemini 驅動)
 */
function handleUrlScrape_(bookUrl) {
  const GEMINI_API_KEY = getGeminiKey_();
  if (!GEMINI_API_KEY) return { success: false, message: 'API key not set' };

  try {
    // 增加 User-Agent 避免被擋，並加入更詳細的錯誤判斷
    const options = {
      muteHttpExceptions: true,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
      }
    };
    
    let response = UrlFetchApp.fetch(bookUrl, options);
    let code = response.getResponseCode();
    
    // 備援機制：如果產品頁 403 被擋，嘗試透過「搜尋產品 ID」繞過
    if (code === 403 && bookUrl.includes('books.com.tw')) {
      const idMatch = bookUrl.match(/\/products\/(\d+)/);
      if (idMatch) {
         const searchUrl = `https://search.books.com.tw/search/query/key/${idMatch[1]}/cat/all`;
         response = UrlFetchApp.fetch(searchUrl, options);
         code = response.getResponseCode();
      }
    }

    if (code !== 200) return { success: false, message: `無法存取該網址 (HTTP ${code})。請確認網址是否正確，或該站點阻擋了爬蟲。` };
    
    const htmlSnippet = response.getContentText().substring(0, 50000); 
    
    const model = 'gemini-2.5-flash';
    const apiVersion = 'v1beta';
    const api_url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = `這是一個書籍介紹網頁的 HTML 內容。請從中提取：書名 (title)、作者 (author)、出版社 (publisher)、分類 (category)、封圖連結 (coverUrl)、原始簡介 (rawDescription)。
請僅回傳 JSON 格式，不要包含 Markdown 標解：
{"title": "...", "author": "...", "publisher": "...", "category": "...", "coverUrl": "...", "rawDescription": "..."}

HTML 內容如下：
${htmlSnippet}`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, response_mime_type: "application/json" }
    };

    const res = UrlFetchApp.fetch(api_url, { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true });
    if (res.getResponseCode() === 200) {
      const result = JSON.parse(JSON.parse(res.getContentText()).candidates[0].content.parts[0].text);
      return { success: true, ...result };
    }
    return { success: false, message: 'AI 解析失敗' };
  } catch (e) {
    return { success: false, message: e.toString() };
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

  if (action === 'OCR') return ContentService.createTextOutput(JSON.stringify(callGeminiOcr_(payload.base64, payload.mimeType))).setMimeType(ContentService.MimeType.JSON);
  if (action === 'SCRAPE_URL') return ContentService.createTextOutput(JSON.stringify(handleUrlScrape_(payload.url))).setMimeType(ContentService.MimeType.JSON);
  if (action === 'AI_SUMMARY') return ContentService.createTextOutput(JSON.stringify(callGeminiSummary_(payload.text))).setMimeType(ContentService.MimeType.JSON);
  if (action === 'SEARCH_BOOK') return ContentService.createTextOutput(JSON.stringify({ success: true, data: scrapeBooksComTw_(payload.title) })).setMimeType(ContentService.MimeType.JSON);
  if (action === 'SUBMIT') return handleRecordSubmission_(payload);
  if (action === 'UPDATE') return handleUpdateRecord_(payload);

  return ContentService.createTextOutput(JSON.stringify({ success: false })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * 提交紀錄：修復 BKxx 序號邏輯
 */
function handleRecordSubmission_(data) {
  try {
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
  } catch (e) { return ContentService.createTextOutput(JSON.stringify({ success: false, message: e.toString() })).setMimeType(ContentService.MimeType.JSON); }
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
