# Change Log — My_Read (智慧閱讀紀錄系統)

## 更新紀錄

### [V4.5] - 2026-10-22 (最新版本)
#### 🚀 登入即時驗證防呆機制與全生命週期憑證失效導回
- **登入當下向後端即時驗證帳密**：
  - 前端登入表單在送出當下，即時向後端發送 `VERIFY_AUTH` 動作比對 Google Sheets 的 `User_Config`。
  - 帳密為空時即時阻擋；驗證中按鈕顯示「驗證中...」並鎖定；帳密不符時立即停在登入卡片並顯示紅字錯誤訊息（`.login-error-msg`），絕不放行。
- **開盤靜默校驗**：
  - 網頁初始化時，若 `localStorage` 存有先前憑證，背景自動向後端發送靜默驗證。若帳密已在後台被修改，自動清除快取並導回登入頁，提示「登入憑證已失效，請重新登入」。
- **全域操作失效攔截**：
  - 封裝 `forceLogout`；當任何操作（網址解析、提交存檔、編輯更新）收到後端回應「帳號或密碼錯誤」或「請先登入」時，立即清空本地憑證並無縫導回登入畫面，確保「只要登入進頁面的就保證可用」。
- **GAS 後端升級至 Version 89**：
  - `gas_backend.gs` 的 `doPost` 新增 `VERIFY_AUTH` 動作路由；經由 `validateAuthAndUsage_` 檢驗通過後直接回傳成功，且**不計入每日 AI 使用額度**。
  - 後端已完成雲端同步並發布至 **Version 89**，覆蓋既有 Web App 部署 `AKfycbxLxonX8Fy46eIWZ1MKC4YSioDztY04sop-lToVjyNBJBUzWI0LD7ioHislAZbNCwpj`。

### [V4.4] - 2026-10-11
#### 🚀 閱讀紀錄分頁、詳情導覽、去 AI 味心得重塑與全站視覺優化
- **閱讀紀錄列表分頁**：每頁固定 20 筆，支援上一頁/下一頁與頁碼跳轉，網址支援 Hash 路由同步（`#/list?page=X`）。
- **單則書籍詳情導覽**：新增「上一筆／下一筆」按鈕，網址同步顯示 `#/detail?id=BKxx`，支援上一頁/下一頁返回。
- **詳情頁封面圖片變形修復**：修正 `object-fit: contain` 與頂部對齊，杜絕高度被拉長。
- **數據中心版面優化**：年度閱讀趨勢圖置頂、字級統一為 1.4rem，修復年份匹配邏輯。
- **AI 心得去味重塑（全量 66 筆同步）**：
  - 徹底剔除「心靈的洗滌」、「被溫暖擁抱」等文青罐頭詞，文章嚴格排除「我」字。
  - 統一規範三段式排版：第一段「」生活金句、第二段生活細節觀察、第三段自然留白體悟。
  - 前端 CSS 支援 `white-space: pre-wrap` 保留換行空行。
  - 後端 GAS 更新並部署至 Version 88，試算表歷史 66 筆書籍已 100% 批次重塑完成。
- **全站視覺與文案細節調整**：
  - 移除全站 UI Emoji。
  - 文案「AI 摘要精華」與「AI 心得」全面改為「讀後心得」，刪除輸入框預設 placeholder。
  - ID Tag 文數字改為常規字重（`font-weight: 400`，不加粗）。
  - 首頁最新 5 本書籍列表隱藏 ID Tag。
- **正式發布**：已全數 build 並發布至 GitHub Pages（`gh-pages`），代碼已推送至 GitHub `main` 分支。

---

### [V4.3] - 2026-10-11
#### 🚀 新增書名搜尋博客來與確認流程、隱藏封面拍照並修復同日多書統計問題
- **同日多書在列表頁與統計數據未即時計入**：
  - **後端成因**：`gas_backend.gs` 的 `handleRecordSubmission_` 在 `sheet.appendRow(...)` 後未執行 `SpreadsheetApp.flush()`，導致隨後前端即刻發出的 GET 請求命中尚未提交的緩衝區，回傳舊資料集。修復：在 `appendRow` 及 `updateRecord` 後加入 `SpreadsheetApp.flush()`。
  - **瀏覽器快取**：前端 `fetchRecords()` 增加動態時間戳參數 `?_t=${Date.now()}` 及 `{ cache: 'no-store' }`，杜絕短時間內瀏覽器快取命中舊資料。
  - **樂觀更新**：前端 `handleSubmit` 存檔成功後，立即將新紀錄加入本地 `records` state 並依完讀日重新排序，列表頁與統計數字秒級呈現第二本書。
- **隱藏書籍封面拍照上傳**：用戶日常幾乎不使用拍照 OCR 功能，隱藏該區塊以節省畫面空間並去除視覺雜訊。
- **書名搜尋博客來網址與確認流程**：
  - 前端新增書名輸入搜尋框，點擊「🔍 尋找博客來」後呼叫後端 `SEARCH_BOOK`。
  - 後端 `searchBookUrl_` 優先透過 Firecrawl 搜尋 `site:books.com.tw/products`，備援走 Gemini Search Grounding，回傳精確的商品頁連結與書籍資訊。
  - 搜尋成功後跳出「🎯 搜尋結果確認卡片」，提供新分頁預覽連結供用戶確認；確認後點擊「✅ 確認是這本，解析資料」即可一鍵解析填入書籍所有欄位與 AI 精華摘要。
  - 保留可折疊展開的「🔗 或者直接貼上書籍介紹網址」，方便手動輸入現成連結。
- **正式站部署驗證**：已透過 `npm run deploy` 建置並發布至 GitHub Pages 正式站（commit `5fe1a32`），curl 實測返回 HTTP 200 與最新打包資源（`index-S7ZxTH1t.js`）。
- **GAS 雲端後端同步**：已透過 Google Apps Script API 直接將 `gas_backend.gs` 更新至 Script ID `19uRZoJjJTvXAfoPxxCVdpumqGFwJOPhr70fj71dQyMKJqBUTShN9JpTS`，建立版本 **Version 82**，並將現有正式部署 `AKfycbxLxonX8Fy46eIWZ1MKC4YSioDztY04sop-lToVjyNBJBUzWI0LD7ioHislAZbNCwpj` 指向新版本。實測 GET 與 live API 調用均正常回傳！本地亦已建立 `.clasp.json`（已加入 `.gitignore`）供日後持續無縫同步。

---

### [V4.2] - 2026-08-25
#### 🐛 修復博客來網址解析錯誤與相關體驗問題
- **網址解析根因**：`handleUrlScrape_` 原本把博客來商品網址的商品 ID 直接當作博客來「搜尋頁」的關鍵字查詢，但搜尋頁不支援用商品 ID 比對，導致命中完全不相關的書籍。改為導入 **Firecrawl**（`firecrawlScrape_`，需在 GAS Script Properties 設定 `FIRECRAWL_API_KEY`）直接抓取商品頁乾淨內容，再交給 Gemini 抽取結構化資料。
- **OCR 自動查詢隱藏 bug**：拍照辨識後自動以書名查詢書籍資訊時，原邏輯會對純文字書名呼叫 `UrlFetchApp.fetch()`（非合法網址）直接丟例外，導致該路徑必定失敗。改為先判斷輸入是否為網址，非網址則直接走 Gemini 連網搜尋。
- **AI 心得欄位空白**：強化 Phase 3 抽取 prompt，明確要求 summary 欄位不可留空。
- **正式站前端 5 個月未更新**：gh-pages 最後部署停在 2026-03-21（db06fb0），已重新 build 並用 `npm run deploy` 同步到目前 `main` 版本。
- **手機版預覽卡片排版**：`.mini-preview-card` 在手機寬度媒體查詢裡缺少 `display: flex`，導致書名/作者資訊被 `overflow:hidden` 裁切消失（外觀像「破圖」）。修正為正確的 flex 排版，封面採 90×120、`object-fit: cover` 呈現。
- **預覽卡片空狀態優化**：改為僅在有實際解析結果（`formData.title` 非空）時才顯示預覽卡片，避免剛進頁面或辨識中看到破圖與「辨識中...」的怪異畫面。
- **殘留除錯輔助**：`gas_backend.gs` 的 `SCRAPE_URL`／`SUBMIT` 回應中留有 `debugPhase` / `debugId` / `debugReceivedDate` / `debugFinalDate` 等除錯欄位與對應 `Logger.log`，前端目前未顯示這些欄位，不影響功能，之後可視情況清理。

---

### [V4.1] - 2026-03-21
#### 🚀 核心重構與穩定性強化 (Phase 1)
- **統一 AI 橋接器 (Unified AI Bridge)**：整併 OCR、摘要與解析功能為單一 API 核心，並內建 Google Search Grounding 連網搜尋備援。
- **併發寫入鎖定 (Concurrency Lock)**：在資料寫入端導入 `LockService`，徹底杜絕高併發下的序號重複與資料覆寫風險。
- **協議標準化**：統一全站 API 通訊格式為 `{ success: true, ... }`，大幅提升代碼健壯性。

### [V4.0] - 2026-03-21
#### 🚀 功能強化與深度診斷
- **網址解析優化**: 導入 HTML 清洗機制，自動剔除 `<script>`、`<style>` 與導覽標籤，將關鍵內容濃縮至 15,000 字元內。
- **強韌 JSON 解析**: 後端導入 `parseAiJson_` 輔助函式，支援解析帶有 Markdown 標記或非標準格式的 AI 回傳結果。
- **Prompt 結構化**: 重新設計網址解析 Prompt，明確要求 AI 回傳嚴格 JSON 格式，顯著提升解析成功率。

### [V3.2] - 2026-03-20
#### 🚀 新增功能
- **網址解析 (URL Scrape)**: 支援貼入書籍介紹網址，自動抓取標題、作者與封圖。
- **年度趨勢圖**: 統計區塊新增 SVG 年度長條圖，追蹤歷年閱讀進度。
- **AI 摘要濃縮**: 將 AI 導讀由 300+ 字長文優化為 100 字內精華，提升概覽效率。

#### 🔧 優化與修復
- **Prompt 工程**: 優化摘要 Prompt 避免截斷並強化精準度。
- **UI 佈局**: 調整首頁表單，整合「封面上傳」與「網址輸入」二選一邏輯。

---

### [V3.1] - 2026-03-20

### [V3.0] - 2026-03-17
#### 🚀 新增功能
- **全欄位編輯**: 書籍詳情頁支援即時修改所有資訊。
- **智慧序號 (BKxx)**: 修正 GAS 邏輯，自動生成支援補零的專業序號格式。
- **高清封面更新**: 支援在編輯模式中隨時更換封圖網址。

#### 🔧 優化與修復
- **引擎升級**: 全面對接 **Gemini 2.5 Flash** 模型。
- **視覺放大**: 全站字級提升 (放大 2 級)，確保行動裝置閱讀舒適。

---

### [V2.0] - 2026-03-16
#### 🚀 新增功能
- **AI 深度摘要**: 整合 Google Apps Script 呼叫 Gemini 進行 200 字以上摘要。
- **玻璃擬態 UI**: 初版 React 前端介面部署。
- **博客來爬蟲**: 自動抓取網路書源與簡介。

---

### [V1.0] - 2026-02-24
#### 🚀 初始版本
- 建立基礎 React 專案結構，採用 Vite。
- 完成 Google Sheets 作為持久層資料庫的連接。
- 基礎 Login 與記錄展示功能。
