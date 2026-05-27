# ⚙️ 書香閱讀 (MyRead) 技術開發文件 (TECH_DOC)

## 1. 系統架構
- **Frontend**: React (Vite) + Vanilla CSS (Aesthetic Glassmorphism).
- **Backend**: Google Apps Script (GAS) Web App + Script Properties.
- **Database**: Google Sheets (Persistence Layer).
- **AI Engine**: **Gemini 2.5 Flash** (Primary for OCR, Summarization, and Intent Analysis).

## 2. API 協議 (V4.1 - Unified AI & Concurrency Support)
前後端統一使用 JSON 片段傳輸，基於 `POST` 的單一入口點。所有 AI 功能均具備備援輪轉與連網搜尋能力。

### A. 通訊 ACTIONS
- `OCR`: 圖片 Base64 轉文字資訊。使用 Unified AI Bridge 確保穩定度。
- `SEARCH_BOOK`: 爬取博客來基本資訊。
- `SCRAPE_URL`: 從 URL 提取書籍資訊。具備 Web Scrape + AI Search 雙重備援機制。
- `AI_SUMMARY`: 生成 100 字內精華摘要。使用 Unified AI Bridge。
- `SUBMIT`: 寫入新紀錄 (自動生成 BKxx 智慧序號，導入 `LockService` 防止衝突)。
- `UPDATE`: 修改現有紀錄 (基於 ID 匹配)。

### B. 身份驗證與用量限制
- **自定義驗證**: `validateAuthAndUsage_` 函式檢查帳號、密碼。
- **每日配額**: `Usage_Log` 記錄每位使用者每日 AI 呼叫與提交次數，超限後拒絕請求。

## 3. 資料庫 Schema (Google Sheets)
### A. `閱讀紀錄` (Core Data)
| 欄位 | 說明 | 格式範例 |
| :--- | :--- | :--- |
| id | 智慧序號 | BK01, BK02... |
| creationDate | 系統建立日 | 2026-03-17 |
| title | 書名 (含副標題) | 《情緒價值》：剖析核心 |
| author | 作者 | 鄭實 |
| category | 分類 | 心理與成長 |
| completionDate | 閱讀完成日 | 2026-03-17 |
| publisher | 出版社 | 采實文化 |
| summary | 深度摘要/心得 | 300字以上 Markdown 文字 |
| coverUrl | 高清封面 | HTTPS URL |

### B. `User_Config` (Auth)
- 欄位：`帳號`, `密碼`, `每日上限`, `身份`, `最後更新`。

### C. `Usage_Log` (Tracking)
- 欄位：`日期`, `使用者`, `計數`。

## 4. 安全性與環境規範
- `GEMINI_API_KEY`: 存於 GAS 「指令碼屬性」，支援多金鑰逗點分隔隨機分流。
- `VITE_GAS_API_URL`: 存於前端 `.env`。
- **防止注入**: 後端存取使用 Google Sheets API 原生方法進行數據讀寫，避免拼串注入。
- **錯誤處理**: 全域 Try-Catch & `muteHttpExceptions: true` 確保錯誤不導致中斷。
