# V3.2 版本更新計畫：智慧輸入強化與年度統計圖表

本更新旨在提升書籍存檔的靈活性與統計維度。使用者將可透過「上傳封面」或「輸入書籍網址」二選一方式快速入庫，AI 摘要將更精簡且基於網路抓取資料，並新增年度圖表以展示閱讀歷程。

## 擬定變更

---

### [Component] 後端驅動 (Google Apps Script)
主要負責網址解析、資料提取與 AI 摘要邏輯調整。

#### [MODIFY] [gas_backend.gs](file:///c:/Users/8475/Desktop/AI%20Project/MyRead/gas_backend.gs)
- **新增 Action: `SCRAPE_URL`**：
    - 接受用戶提供的 `url`。
    - 使用 `UrlFetchApp` 抓取內容。
    - 結合 Gemini 解析該網頁內容，自動提取「書名、作者、出版社、分類、封面網址、原始簡介」。
- **優化 `callGeminiSummary_`**：
    - Input 調整：優先接受 `scrapedContent`。
    - Prompt 調整：明確要求「濃縮成精華內容，嚴格限制在 100 字以內 (繁體中文)」。
    - 移除原先 300 字以上的長文導讀邏輯。

---

### [Component] 前端介面 (React)
主要負責 UI 切換、資料串聯與圖表繪製。

#### [MODIFY] [App.jsx](file:///c:/Users/8475/Desktop/AI%20Project/MyRead/src/App.jsx)
- **UI 更新**：
    - 在 `upload-section` 下方或併排處新增 `書籍介紹網址` 輸入框。
    - 實作「二選一」邏輯：當 URL 輸入時，觸發 `SCRAPE_URL` 流程；當圖片上傳時，走原本的 `OCR` 流程。
- **邏輯更新**：
    - 修改 `handleImageUpload`：OCR 成功後，抓到的網路資料將傳給「濃縮摘要」函式。
    - 新增 `handleUrlInquiry`：解析網址後，自動填入各個 Form 欄位。
- **統計數據處理**：
    - 計算各年度的閱讀數量（基於 `completionDate`）。

#### [NEW] [YearlyChart.jsx](file:///c:/Users/8475/Desktop/AI%20Project/MyRead/src/components/YearlyChart.jsx)
- 仿照 `PieChart.jsx` 實作一個簡約的 SVG 長條圖 (Bar Chart)，展示近幾年的閱讀趨勢。

#### [MODIFY] [apiService.js](file:///c:/Users/8475/Desktop/AI%20Project/MyRead/src/services/apiService.js)
- 新增 `scrapeUrl(url, auth)` 方法。

---

### [Component] 專案資產 (Docs)
#### [MODIFY] [PRD.md](file:///c:/Users/8475/Desktop/AI%20Project/MyRead/docs/PRD.md) / [TECH_DOC.md](file:///c:/Users/8475/Desktop/AI%20Project/MyRead/docs/TECH_DOC.md)
- 更新功能描述與 API action 規格。

## 驗證計畫

### 自動化/腳本測試
- 無（本專案為 GAS Web App，主要透過模擬請求驗證）。
- 可透過 `mock_server.cjs` 或自定義腳本模擬發送 `SCRAPE_URL` 請求，驗證 Gemini 回傳格式。

### 手動驗證流程
1. **網址解析測試**：
    - 輸入一個博客來書籍網址，確認是否能正確自動填入「書名、作者、出版社、100 字內摘要、封面圖」。
2. **圖片 OCR 測試**：
    - 上傳封面圖，確認 OCR 辨識後，自動抓取的摘要是否也已縮短至 100 字內。
3. **統計圖表驗證**：
    - 在 `home` 頁面點擊「詳細統計」，確認除了圓餅圖外，是否正確出現年度長條圖，且數據與現有紀錄相符。
