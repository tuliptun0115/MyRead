# ⚙️ 書香閱讀 (MyRead) 技術開發文件 (TECH_DOC)

## 1. 系統架構
- **Frontend**: React (Vite) + Vanilla CSS (Aesthetic Glassmorphism).
- **Backend**: Google Apps Script (GAS) Web App + Script Properties.
- **Database**: Google Sheets (Persistence Layer).
- **AI Engine**: **Gemini 2.5 Flash** (Primary for OCR, Summarization, and Intent Analysis).

## 2. API 協議 (V3.0 - Full CRUD Support)
前後端統一使用 JSON 片段傳輸，基於 `POST` 的單一入口點。

### A. 通訊 ACTIONS
- `OCR`: 圖片 Base64 轉文字資訊。
- `SEARCH_BOOK`: 爬取博客來基本資訊。
- `AI_SUMMARY`: 生成 300+ 字深度導讀。
- `SUBMIT`: 寫入新紀錄 (自動生成 BKxx 序號)。
- `UPDATE`: 修改現有紀錄 (基於 ID 匹配)。

### B. 數據結構
```json
{
  "action": "...",
  "payload": {
    "id": "BKxx", // 僅 UPDATE 時必要
    "title": "...",
    "completionDate": "YYYY-MM-DD",
    "summary": "...",
    "coverUrl": "..."
  }
}
```

## 3. 資料庫 Schema (Google Sheets)
| 欄位 | 說明 | 格式範例 |
| :--- | :--- | :--- |
| id | 智慧序號 | BK01, BK02... |
| creationDate | 系統建立日 | 2026-03-17 |
| title | 書名 (含副標題) | 《情緒價值》：剖析核心 |
| author | 作者 | 鄭實 |
| category | 自動/手動分類 | 心理與成長 |
| completionDate | 閱讀完成日 | 2026-03-17 |
| publisher | 出版社 | 采實文化 |
| summary | 深度摘要/心得 | 300字以上 Markdown 文字 |
| coverUrl | 高清封面 | Base64 或 HTTPS URL |

## 4. 安全性與環境
- `GEMINI_API_KEY`: 存於 GAS 「指令碼屬性」，嚴禁外流。
- `VITE_GAS_API_URL`: 存於前端 `.env`。
- **防止注入**: 後端使用 `setValue` 非拼串。
