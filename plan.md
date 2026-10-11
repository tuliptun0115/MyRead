# 專案計劃書

## 基本資訊
- 專案名稱：My_Read（智慧閱讀紀錄系統）
- 建立日期：2026-02-24
- 負責人：Tulip
- 狀態：[ ] 規劃中 / [x] 進行中 / [ ] 完成

## 專案概況
上傳書籍封面，Gemini AI 自動辨識書名，查詢書籍資訊並歸檔至 Google Sheets，以前端儀表板呈現閱讀紀錄。

- **使用者**：Tulip 個人使用
- **核心功能**：封面辨識書名、書籍資訊查詢、Google Sheets 歸檔、閱讀統計儀表板
- **目前版本**：開發中

## 目標與背景
用拍封面的方式快速記錄讀過的書，讓書單管理變得輕鬆。

## 資源評估
| 項目 | 說明 |
|---|---|
| 使用工具 | React、Vite、Google Apps Script |
| 外部 API / 服務 | Gemini API（辨識）、Google Sheets API、Google Books API（已評估不適用） |
| 部署 | 待定 |

## 實作步驟
- [x] 建立 React + Vite 前端架構
- [x] 串接 Gemini AI 封面辨識
- [x] 建立 Google Apps Script 後端（gas_backend.gs）
- [x] 串接 Google Sheets 歸檔
- [x] 完成前端儀表板 UI
- [x] 部署上線

## 當前進度備註
- **最後更新**：2026-10-11
- **使用工具**：Antigravity (Gemini 3.1 Pro)
- **做到哪裡**：完成「輸入書名檢索博客來網址與確認流程」、隱藏低頻之書籍封面拍照上傳；修復當日同日多書在列表頁與統計數據未即時計入問題（GAS 加入 SpreadsheetApp.flush()、前端 GET 加入防快取時間戳、表單存檔後樂觀更新本地 records 狀態）；正式站已建置並透過 gh-pages 發布上線，代碼已同步至 GitHub main。後端已直接透過 Apps Script API 同步雲端程式碼並更新現有 Web App 部署至 Version 82。
- **下一步**：使用者實際體驗與驗證前端正式站與後端運作。
- **注意事項**：後端已透過本地與 API 綁定現有部署 `AKfycbxLxonX8Fy46eIWZ1MKC4YSioDztY04sop-lToVjyNBJBUzWI0LD7ioHislAZbNCwpj`，切勿新建部署。

## 完成定義（Done Criteria）
- 輸入書籍名稱或網址可自動辨識並記錄，儀表板可正常瀏覽且同日多書即時更新

