// ============================================================
// MyRead - Google Apps Script 後端
// 負責：接收前端請求、OCR (via Gemini)、讀寫 Google Sheets
//
// ⚠️ 安全設定：Gemini API Key 請勿寫在程式碼中！
//    請至 GAS 編輯器 → 專案設定 → 指令碼屬性 → 新增屬性：
//    屬性名稱：GEMINI_API_KEY
//    值：你的 Gemini API Key
// ============================================================

const SHEET_NAME = '閱讀紀錄';

function getGeminiKey_() {
  return PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY') || '';
}

// ============================================================
// 📌 診斷函式：在 GAS 編輯器選此函式並點「執行」
//    查看「執行紀錄」就能看到哪個 Gemini 模型可以使用
// ============================================================
function testGemini() {
  const GEMINI_API_KEY = getGeminiKey_();
  if (!GEMINI_API_KEY) {
    Logger.log('❌ 尚未設定 GEMINI_API_KEY，請至「指令碼屬性」設定');
    return;
  }
  // 每個模型對應正確 API 版本
  const modelEndpoints = [
    { model: 'gemini-2.0-flash',      apiVersion: 'v1beta' },
    { model: 'gemini-2.0-flash-lite', apiVersion: 'v1beta' },
    { model: 'gemini-1.5-flash',      apiVersion: 'v1' },
    { model: 'gemini-1.5-pro',        apiVersion: 'v1' },
  ];
  modelEndpoints.forEach(({ model, apiVersion }) => {
    try {
      const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const res = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ contents: [{ parts: [{ text: 'Say hello' }] }] }),
        muteHttpExceptions: true
      });
      Logger.log(`${apiVersion}/${model}: HTTP ${res.getResponseCode()} → ${res.getContentText().substring(0, 120)}`);
    } catch(e) {
      Logger.log(`${model}: ERROR → ${e.toString()}`);
    }
  });
}

function initSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      '序號', '資料建立日', '書名', '作者', '書籍分類', '閱讀完成日', '出版社', 'AI摘要精華重點', '封面圖片'
    ]);
  }
  return sheet;
}

// ============================================================
// OCR 核心：呼叫 Gemini Vision 辨識封面書名
// 依序嘗試多個模型，任一成功立即回傳
// ============================================================
function callGeminiOcr_(base64Data, mimeType) {
  const GEMINI_API_KEY = getGeminiKey_();
  if (!GEMINI_API_KEY) {
    Logger.log('OCR: GEMINI_API_KEY 未設定');
    return { title: '', error: 'API key not set' };
  }

  // 每個模型對應正確的 API 版本
  // gemini-2.0 → v1beta；gemini-1.5 → v1（1.5 在 v1beta 回 404）
  const modelEndpoints = [
    { model: 'gemini-2.0-flash',      apiVersion: 'v1beta' },
    { model: 'gemini-2.0-flash-lite', apiVersion: 'v1beta' },
    { model: 'gemini-1.5-flash',      apiVersion: 'v1' },
    { model: 'gemini-1.5-flash-8b',   apiVersion: 'v1' },
    { model: 'gemini-1.5-pro',        apiVersion: 'v1' }
  ];

  const prompt = '這是一張書籍封面圖片。請仔細辨識封面上最醒目的書名文字（可能是繁體中文、簡體中文或英文）。' +
                 '只回答書名本身，不要引號、不要解釋、不要標點符號、不要其他任何文字。' +
                 '若封面完全看不清楚或確認不是書籍，請只回答「未知書籍」。';

  let lastError = '';
  for (const { model, apiVersion } of modelEndpoints) {
    try {
      const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const res = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64Data } }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 100 }
        }),
        muteHttpExceptions: true
      });

      const code = res.getResponseCode();
      const body = res.getContentText();
      Logger.log(`OCR ${apiVersion}/${model}: HTTP ${code}`);

      if (code === 200) {
        const json = JSON.parse(body);
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return { title: text, error: '' };
      } else if (code === 429) {
        // 429 quota 超限 → 跳過這個模型，繼續試下一個
        lastError = `${model}: HTTP 429 quota exceeded`;
        Logger.log(`OCR QUOTA → ${model}`);
      } else {
        lastError = `${model}: HTTP ${code} - ${body.substring(0, 150)}`;
        Logger.log(`OCR ERROR → ${lastError}`);
      }
    } catch(e) {
      lastError = `${model}: Exception - ${e.toString()}`;
      Logger.log(`OCR EXCEPTION → ${lastError}`);
    }
  }
  return { title: '', error: lastError };
}

// ============================================================
// doPost：處理兩種請求
//   1. ACTION:OCR+++ 開頭 → 僅做 OCR 並回傳書名 JSON
//   2. 一般提交        → 儲存至 Google Sheets
// ============================================================
function doPost(e) {
  const rawContent = e.postData.contents;

  // ── OCR 路由 ──────────────────────────────────────────────
  if (rawContent && rawContent.startsWith('ACTION:OCR+++')) {
    const payloadStr = rawContent.substring('ACTION:OCR+++'.length);
    // format: <mimeType>|||<base64>
    const sepIdx = payloadStr.indexOf('|||');
    const mimeType = sepIdx !== -1 ? payloadStr.substring(0, sepIdx) : 'image/jpeg';
    const base64Data = sepIdx !== -1 ? payloadStr.substring(sepIdx + 3) : payloadStr;

    const ocrResult = callGeminiOcr_(base64Data, mimeType);
    return ContentService
      .createTextOutput(JSON.stringify({ title: ocrResult.title || '', error: ocrResult.error || '' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ── 一般提交路由 ──────────────────────────────────────────
  try {
    const sheet = initSheet();
    let data;

    // 優先嘗試 JSON 格式（最安全，不受 base64 特殊字元影響）
    try {
      const parsed = JSON.parse(rawContent);
      data = {
        title: parsed.t || '',
        coverUrl: parsed.c || '',
        completionDate: parsed.d || ''
      };
    } catch (_) {
      // Fallback：舊版本的 \n 或 +++ 格式
      if (rawContent && rawContent.includes('\n')) {
        const parts = rawContent.split('\n');
        data = {
          title: parts[0] ? parts[0].trim() : '',
          coverUrl: parts[1] || '',
          completionDate: parts[2] ? parts[2].trim() : ''
        };
      } else {
        data = e.parameter;
      }
    }

    if (!data || Object.keys(data).length === 0) {
      throw new Error('No valid delimited data received');
    }

    const creationDate = new Date();
    const formattedCreationDate = Utilities.formatDate(creationDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');

    let finalTitle = data.title || '';
    const coverUrl = data.coverUrl || '';
    const completionDate = data.completionDate || formattedCreationDate;

    // ── 防止 no-cors 302 redirect 重送造成重複寫入 ─────────────
    // GAS web app 的第一次 POST 會被 Google 302 redirect，fetch 預設會重送
    // 用 CacheService 對相同 title+date 組合做 10 秒去重
    const dedupeKey = `submit_${finalTitle}_${completionDate}`.substring(0, 250);
    const cache = CacheService.getScriptCache();
    if (cache.get(dedupeKey)) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'duplicate', message: '重複提交已忽略' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    cache.put(dedupeKey, '1', 10); // 10 秒內相同內容忽略

    let author = '';
    let category = '';
    let publisher = '';
    let summary = '';

    // 後端 OCR fallback：如果書名是空的且有圖片，在儲存時再辨識一次
    if (!finalTitle && coverUrl && coverUrl.startsWith('data:image')) {
      const mimeMatch = coverUrl.match(/^data:(image\/[a-zA-Z]*);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const base64Data = coverUrl.split(',')[1];
      const ocrResult = callGeminiOcr_(base64Data, mimeType);
      if (ocrResult.error) Logger.log(`後端 OCR fallback 錯誤: ${ocrResult.error}`);
      finalTitle = ocrResult.title || '';
    }

    const safeTitle = String(finalTitle || '未知書籍');

    // Google Books API 檢索真實資料
    if (safeTitle !== '未知書籍') {
      try {
        const queryUrl = `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(safeTitle)}&maxResults=1`;
        const res = UrlFetchApp.fetch(queryUrl, { muteHttpExceptions: true });
        if (res.getResponseCode() === 200) {
          const json = JSON.parse(res.getContentText());
          if (json.items && json.items.length > 0) {
            const volInfo = json.items[0].volumeInfo;
            author = volInfo.authors ? volInfo.authors.join(', ') : '';
            category = volInfo.categories ? volInfo.categories[0] : '';
            publisher = volInfo.publisher || '';
            summary = volInfo.description || '';
          }
        }
      } catch (bookErr) {
        // API 檢索失敗，維持欄位空白
      }
    }

    // 安全產生序號
    const lastRow = sheet.getLastRow();
    let id = 1;
    if (lastRow > 1) {
      try {
        id = Number(sheet.getRange(lastRow, 1).getValue()) + 1;
      } catch (err) {
        id = lastRow;
      }
    }

    // 日期欄前置 \t 讓 Sheets 不要自動解析成 Date object（顯示純字串）
    sheet.appendRow([
      id,
      formattedCreationDate,
      safeTitle,
      author,
      category,
      String(completionDate),   // 強制字串，防止 Sheets 轉成 UTC timestamp
      publisher,
      summary,
      coverUrl
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success', message: '紀錄已優雅地儲存' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const sheet = initSheet();
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'success', data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const records = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0 || !row[0]) continue;

      let creatDate = row[1] || '';
      if (creatDate && creatDate instanceof Date) {
        creatDate = Utilities.formatDate(creatDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
      let compDate = row[5] || '';
      if (compDate && compDate instanceof Date) {
        compDate = Utilities.formatDate(compDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
      let covVal = row[8] || '';
      // 防止超大 base64 字串讓瀏覽器崩潰
      if (covVal && covVal.length > 500000) {
        covVal = '';
      }

      records.push({
        id: row[0],
        creationDate: creatDate,
        title: row[2] || '無書名',
        author: row[3] || '無作者',
        category: row[4] || '未分類',
        completionDate: compDate,
        publisher: row[6] || '',
        summary: row[7] || '暫無摘要...',
        coverUrl: covVal
      });
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success', data: records }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// CORS preflight support
function doOptions(e) {
  return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT);
}
