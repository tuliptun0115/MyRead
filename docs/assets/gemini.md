# Gemini API 版本與使用備忘錄 (2026-04-04)

此文件用於記錄專案開發中關於 Gemini API 的重要決策與模型狀態，避免重複錯誤。

## 🚫 模型狀態更新

### Gemini 1.5 Flash (已停用)
- **狀態**：截至 2026 年 4 月，**Gemini 1.5 系列已正式停用 (Deprecated/Shut down)**。
- **後果**：若在 API 請求中使用 `gemini-1.5-flash` 或 `gemini-1.5-pro`，系統會回傳 **404 錯誤**。
- **替代方案**：目前專案採用 **`gemini-2.5-flash`** 或 **Gemini 3.x 系列**。

---

## 🔍 資料來源限制

### Google Books API
- **評價**：**不建議作為主要書訊來源。**
- **理由**：即便免費，但在中文書（繁體、新書、博客來特刊）的搜尋成效極差，經常找不到資料或僅有片段資訊。
- **現行做法**：使用 **Gemini 連網搜尋 (Search Grounding)** 搭配自製爬蟲作為核心方案。

---

## 💰 費用優化決策

1. **連網搜尋 (Search Grounding)**：是目前精準獲取「博客來」書訊的唯一高質量途徑，但屬於付費項目。
2. **優化手段**：
   - 實作 **Google Sheets 快取層** (已決議)。
   - 限制 HTML 傳輸長度 (Token Trimming)。
   - 實作分級查詢 (Tiered Search)，先爬蟲再 AI，最後才連網。
