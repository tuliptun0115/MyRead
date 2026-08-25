# System Guide — My_Read 全域開發與部署規章

本專案為結合 React 前端、GAS 後端及 Google Gemini 智慧型服務的圖書管理與閱讀記錄系統。所有對本專案進行後續維護、開發或重構的 AI Agent 及開發人員，必須嚴格遵守以下規章。

---

## 1. 啟動與授權規範 (Agent Execution Protocol)
- **大腦授權確認**：每次啟動新 Session 或進行重要開發任務前，Agent 必須讀取本文件與全域規章，回報 `MD Get！`，且**嚴禁在未收到使用者明確同意或指示前，進行任何程式碼變更、檔案建立或指令執行**。
- **編碼防呆**：所有核心 Markdown 文件一律使用 `UTF-8 with BOM`；修改後需以預設 PowerShell 讀取確認無亂碼。
- **專案三件套限制**：
  - 本專案根目錄必須且僅能保留專案標準三件套文件：
    1. [plan.md](file:///c:/Users/8475/Desktop/AI Project/My_Read/plan.md) (實作計劃書)
    2. [PRD.md](file:///c:/Users/8475/Desktop/AI Project/My_Read/PRD.md) (產品需求文件)
    3. [TECH_DOC.md](file:///c:/Users/8475/Desktop/AI Project/My_Read/TECH_DOC.md) (技術規格文件)
  - 專案相關的配置檔與程式目錄 (如 `package.json`, `vite.config.js`, `src/`, `public/` 等) 除外。其餘所有非核心開發文件、說明、測試腳本等一律歸檔至 `docs/assets/` 內。

---

## 2. 模型命名與 API 使用規範
- **精確官方名稱**：在代碼、Prompt 設計、注釋或文檔中，禁止使用簡稱（如「Gemini」、「Flash」），必須精確使用官方官方完整名稱（如 `Google Gemini`、`Google Gemini 2.5 Flash`）。
- **淘汰停用模型警告**：
  - **Google Gemini 1.5 Flash** 與 **Gemini 1.5 Pro** 已於 2026 年正式關閉，請求會回傳 **404 錯誤**。
  - 後續開發與重構中，必須嚴格採用 **`gemini-2.5-flash`** 或更高等級的推薦模型，嚴禁在程式碼中寫入任何 1.5 系列的呼叫代碼。

---

## 3. 金鑰與環境變數安全防禦
- **前端變數防護**：前端所有與後端 GAS 溝通的網址 `VITE_GAS_API_URL` 必須存於本地 `.env` 檔案中，並加入 `.gitignore` 排除，嚴禁寫死在 JavaScript 程式碼中或 commit 至 Git。
- **後端金鑰安全**：後端 GAS 所需的 `GEMINI_API_KEY` 必須透過 Google Apps Script 的「指令碼屬性 (Script Properties)」進行存取，嚴禁將 API 金鑰以明文方式直接寫在 `.gs` 程式碼內。
- **寫入併發鎖定**：資料庫寫入操作必須搭配 `LockService` 鎖定機制，防止併發操作下的序號覆蓋或資料損毀。
