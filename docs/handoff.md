# handoff.md

> 自動交接規則：收工可自動更新 `plan.md`、本檔與 `docs/log.md`，只寫入已知事實；Git、同步、工作權或外部狀態未知時填「未確認」。Git、測試、部署、秘密檔、憑證與外部服務仍須使用者當次授權。

## 1. 交接控制

`ready_for_handoff / 已釋放`；2026-08-25（Asia/Taipei）；Claude Code；修復博客來網址解析錯誤與相關前後端問題。

## 2. 進度與可用檢查點

React／Vite 前端、Gemini 封面辨識、Google Apps Script 後端與 Google Sheets 歸檔已完成；本次修復博客來網址解析（改用 Firecrawl）、OCR 自動查詢隱藏例外、AI 心得摘要空白、手機版預覽卡片排版裁切、正式站前端 5 個月未部署等問題，詳見 `docs/log.md` V4.2。前端儀表板 UI 仍待完成。

## 3. Git 與同步狀態

已確認：本次變更已分兩個 commit（docs 與 fix）推送至 `origin/main`，working tree 乾淨；正式站（gh-pages）已用 `npm run deploy` 同步到最新版本。

## 4. 接手端下一步

先讀 `plan.md` 與本檔；下一步為完成前端儀表板 UI，並視情況清理 `gas_backend.gs` 殘留的除錯欄位（debugPhase/debugId/debugReceivedDate/debugFinalDate 與對應 Logger.log，不影響功能）。需 Gemini、Google Sheets、GAS、Git 或部署時回報。

## 5. 風險、阻塞與注意事項

Google Books API 不適用中文書，改用 Gemini Search Grounding；博客來網址解析現依賴 Firecrawl，GAS Script Properties 需設定 `FIRECRAWL_API_KEY` 才能正常運作；GAS 後端每次修改後務必用「管理部署作業→編輯現有部署→新版本」部署，不可新建部署（會變更 `/exec` 網址，導致前端 `.env` 對不上）。

## 6. 接手確認

- [ ] 已讀取 `plan.md` 與本檔。
