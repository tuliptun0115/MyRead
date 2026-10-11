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
- **做到哪裡**：
  1. 完成閱讀紀錄列表每 20 筆分頁與網址 Hash 路由（`#/list?page=X`）。
  2. 書籍單則詳情頁支援「上一筆／下一筆」導覽與網址 Hash 路由（`#/detail?id=BKxx`）。
  3. 詳情頁封面圖片比例修復（`object-fit: contain`），杜絕拉長變形。
  4. 數據中心版面優化：年度閱讀趨勢圖置頂、字級統一為 1.4rem，修復年份正規表達式匹配。
  5. AI 心得去味重塑與全量更新：重寫 Prompt 為「生活札記隨筆感」，嚴格排除「我」字，第一段獨立為「」生活金句，生活感三段式排版（`white-space: pre-wrap`）。後端已部署至 Version 88，全量 66 筆書籍心得已 100% 批次重塑完成。
  6. 全站 UI 文案與視覺優化：全站移除 Emoji，文案改為「讀後心得」、刪除 placeholder；ID Tag 數字不加粗（`font-weight: 400`）；首頁最新 5 本書籍隱藏 ID Tag。
  7. GitHub main 分支與 GitHub Pages 正式站已全數建置並發布完成。
- **下一步**：後續維護或依需要新增其他自訂標籤或分類。
- **注意事項**：GAS 後端部署維持既有 ID `AKfycbxLxonX8Fy46eIWZ1MKC4YSioDztY04sop-lToVjyNBJBUzWI0LD7ioHislAZbNCwpj`，切勿新建部署。

## 完成定義（Done Criteria）
- 前端儀表板、分頁、詳情導覽、去 AI 味心得與視覺呈現皆已符合規格並上線運行。

