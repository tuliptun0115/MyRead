# 📚 MyRead — 智慧閱讀紀錄系統

上傳書籍封面，AI 自動辨識書名、查詢作者與摘要，記錄到 Google Sheets 並以卡片方式呈現。

---

## 功能特色

- 📸 上傳書籍封面 → AI（Gemini）自動辨識書名
- 🔍 自動查詢 Google Books 取得作者、出版社、分類、摘要
- 📊 圓餅圖統計各分類閱讀數量
- 🗂️ 依年份、月份篩選閱讀紀錄
- 🔒 Gemini API Key 僅存在後端（Google Apps Script），不暴露於前端

---

## 架構概覽

```
瀏覽器（React Vite）
  └─ 上傳封面圖 → POST → Google Apps Script（後端）
                             └─ 呼叫 Gemini Vision API（OCR）
                             └─ 呼叫 Google Books API
                             └─ 寫入 Google Sheets
  └─ GET → Google Apps Script → 回傳 JSON 資料
```

---

## API 與模型使用說明

調用模型：
Web Speech API (TTS) 原生語音引擎
Gemini 2.5 Flash API

API KEY：Google AI Studio，免費版

預估每日使用：
免費額度，每日可使用1000次，每分鍾最多15次

---

## 安裝步驟

### 事前準備

- Node.js 18+
- Google 帳號
- Gemini API Key（至 [Google AI Studio](https://aistudio.google.com/app/apikey) 免費申請）

---

### 一、建立 Google Sheets

1. 前往 [Google Sheets](https://sheets.google.com/) 新增一個空白試算表
2. 將試算表命名為任意名稱（例如：`閱讀紀錄`）
3. 記下試算表的網址（稍後建立 GAS 時需在同一個試算表中操作）

> **注意：** 試算表第一列（標題列）會由程式自動建立，不需要手動填寫欄位名稱。

---

### 二、建立 Google Apps Script（後端）

1. 在剛才建立的 Google Sheets 中，點選上方選單 **「擴充功能」→「Apps Script」**
2. 把編輯器中的預設程式碼**全部刪除**
3. 將本專案的 `gas_backend.gs` 檔案內容**全部貼入**
4. 點右上角儲存（💾 或 Ctrl+S）

#### 設定 Gemini API Key（Script Property）

> Key 只存在 GAS，不會出現在任何前端程式碼。

1. GAS 編輯器左側 → 點 **⚙️ 專案設定**
2. 向下捲到「**指令碼屬性**」→ 點「**新增指令碼屬性**」
3. 填入：
   - **屬性**：`GEMINI_API_KEY`
   - **值**：你的 Gemini API Key
4. 點「**儲存指令碼屬性**」

#### 授權外部請求

1. 回到 GAS 編輯器，頂部函式選擇 **`testGemini`**
2. 點「**▶ 執行**」
3. 若出現「需要授權」對話框 → 點「**審查權限**」→ 選擇你的 Google 帳號 → 點「**允許**」
4. 執行完後查看「**執行紀錄**」，確認看到 `HTTP 200` 的輸出

#### 部署為 Web App

1. GAS 編輯器右上角 → **「部署」→「新增部署作業」**
2. 類型選「**網頁應用程式**」
3. 設定：
   - **說明**：（任意，例如 `MyRead v1`）
   - **以下列身分執行**：「我」
   - **誰可以存取**：「**任何人**」
4. 點「**部署**」
5. 複製產生的 **Web App URL**（格式：`https://script.google.com/macros/s/.../exec`）

---

### 三、設定前端環境

```bash
# 1. 進入專案目錄
cd MyRead

# 2. 安裝依賴套件
npm install

# 3. 複製環境變數設定檔
cp .env.example .env   # 若沒有 .env.example 直接編輯 .env
```

編輯 `.env`：

```env
VITE_GAS_API_URL="貼上剛才複製的 GAS Web App URL"
VITE_DEFAULT_COVER_URL="https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=600"
```

> ⚠️ `.env` 已加入 `.gitignore`，不會被 commit，請勿將 URL 公開。

---

### 四、啟動前端開發伺服器

```bash
npm run dev
```

開啟瀏覽器前往 `http://localhost:5173`

---

### 五、透過 GitHub Pages 免費部署網頁

1. **修改 Repo 名稱設定**：
   開啟根目錄下的 `vite.config.js`，找到 `base: '/<YOUR_REPO_NAME>/'`。
   將字串替換為你在 GitHub 上的 Repository 名稱。例如：如果你的 GitHub 儲存庫網址是 `https://github.com/myname/MyRead`，請將其改為 `base: '/MyRead/'`。

2. **初始化 Git 並推送到 GitHub**（如果尚未上傳程式碼）：
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<>/<YOUR_REPO_NAME>.git
   git push -u origin main
   ```

3. **執行部署指令**：
   ```bash
   npm run deploy
   ```
   > 這個指令會自動幫你打包專案，並推送到 GitHub 專屬的 `gh-pages` 分支。

4. **開啟 GitHub Pages 設定**：
   - 到你的 GitHub Repository 頁面。
   - 點擊上方的 **Settings** → 側邊欄找 **Pages**。
   - 在 **Build and deployment** > Source 選擇 **Deploy from a branch**。
   - 將 Branch 設定為 **`gh-pages`**，然後按 **Save**。
   - 等待幾分鐘後，GitHub 就會顯示你的公開網站網址了！

---

## 更新 GAS 程式碼後必做

每次修改並重新部署 GAS 時：

1. GAS 編輯器 → **「部署」→「管理部署作業」**
2. 點「✏️ 編輯」
3. 「**版本**」選「**新版本**」
4. 點「**部署**」

---

## 目錄結構

```
MyRead/
├── src/
│   ├── App.jsx        # 前端主程式（React）
│   └── index.css      # 樣式
├── gas_backend.gs     # Google Apps Script 後端
├── .env               # 環境變數（不 commit）
├── .gitignore
└── README.md
```

---

## 常見問題

| 問題 | 解法 |
|------|------|
| 書名顯示「未知書籍」 | 確認 GAS Script Properties 有設定 `GEMINI_API_KEY`，並已重新部署 |
| Gemini API 回傳 429 | 免費方案有每分鐘請求限制，稍等 1 分鐘後重試 |
| 作者/摘要全空白 | GAS 尚未授權：在 GAS 編輯器執行任意函式，完成授權流程 |
| 新增後顯示兩筆 | GAS 舊版本未更新，請重新部署新版本 |
| 圖片上傳後看不到預覽 | 檔案過大，系統會自動壓縮，稍等片刻 |
