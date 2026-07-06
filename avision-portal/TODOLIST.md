# 待辦事項

本文件是交給後續 coding agent 的實作清單。請依優先順序逐步完成，每次修改後執行 `npm run build`，並確認 `https://mayan-portal.avision-gb10.org` 可正常開啟。

> 狀態（2026-07-06）：**P0 全部完成、P1 全部完成**。P2 已完成 viewer / records / reviewer 的第一版真實 Mayan 串接，reviewer 狀態已開始同步 Mayan workflow；P3 工程整理尚未開始。詳見 CHANGELOG。

## P0：穩定目前 Scanner 流程

- [x] 確認小 / 中 / 大縮圖切換在實際 Chrome UI 會立即改變大小。
- [x] 加入目前縮圖大小的使用者提示或 tooltip。
- [x] 將 scanner thumbnail 的檔名改成 hover tooltip 或右側資訊欄，不要撐高縮圖卡。
- [x] 調整空白頁偵測 threshold，降低誤判。
- [x] 增加「疑似空白」總數統計。
- [x] 增加只看「疑似空白」的 filter。
- [x] 增加 scanner 批次的 selected files 功能，不要永遠送出全部檔案。
- [x] 增加「刪除選取」功能，讓使用者可移除不需要的 watch folder 原始掃描檔。
- [x] 增加「忽略此頁」、「標記重掃」、「確認正常」狀態。
- [x] 將 page QC 狀態寫入 batch manifest。

## P0：Cloudflare 與啟動穩定化

- [x] 建立正式啟動腳本，一次啟動 portal dev server 與 cloudflared tunnel。 (`start-system.ps1`)
- [x] 增加健康檢查腳本： (`check-system.ps1`)
  - `http://localhost:5174`
  - `https://mayan-portal.avision-gb10.org`
  - `https://mayan-portal.avision-gb10.org/api/scanner/watch-folder`
  - `https://mayan-emds.avision-gb10.org`
- [x] 確認 Windows 重開機後如何自動啟動 portal 與 cloudflared。 (`register-autostart.ps1`，需由使用者執行一次)
- [x] 將 Cloudflare tunnel 設定備份到 repo 文件，但不要提交 credentials JSON。 (`docs/cloudflare-tunnel.md`)

## P1：PDF / TIFF 縮圖與逐頁 QC

- [x] 選定後端轉圖方案。 → `mupdf` (libmupdf WASM)，PDF 與 TIFF 都能逐頁轉圖。
- [x] 建立 thumbnail cache 目錄，例如：

```text
E:\Mayan-EDMS-Docker\data\portal\thumbnails
```

- [x] `GET /api/scanner/files/:fileName/pages` 回傳頁面清單。
- [x] `GET /api/scanner/files/:fileName/pages/:page/thumbnail` 回傳頁面縮圖。
- [x] 對 PDF/TIFF 每頁做空白頁偵測。
- [x] 在 scanner UI 以「頁」為單位顯示縮圖，不只是檔案為單位。

## P1：正式匯入 Mayan

- [x] 研究目前 Mayan API 可用 authentication。 → DRF Token (`/auth/token/obtain/`)，v4。
- [x] 建立 Mayan API client。 → `server/lib/mayan.js`
- [x] 設定文件類型 document type 對應。 → Scanner 文件類型下拉選單。
- [x] 將 scanner batch 匯入 Mayan。 → `POST /api/mayan/import`
- [x] 匯入完成後回寫 batch 狀態：
  - `queued`
  - `importing`
  - `imported`
  - `failed`
- [x] 顯示 Mayan document id / link。
- [x] 失敗時保留錯誤訊息與 retry button。
- [x] 匯入 Mayan 前可選擇「匯入成功後刪除原始檔」，只刪成功匯入的檔案。

## P1：登入與角色權限

- [x] 以 backend session 取代 frontend demo password。 → `POST /api/auth/login`（token）。
- [x] 串接 Mayan user 或自建 portal user table。 → 登入打 Mayan；service token 查群組。
- [x] 依 Mayan group / portal role 顯示 UI。 → `server/lib/roleMap.js` 群組→角色。
- [x] 移除前端 hardcoded password。 → 真實登入為主；demo 改為 `VITE_DEMO_LOGIN=1` 離線備援。
- [ ] 加入 session timeout。 （未做：目前 session 存 localStorage；idle/401 自動登出待補）
- [ ] Admin 可管理 user-role mapping。 （未做：目前由 `scripts/mayan-bootstrap.mjs` 建立；UI 待補）

## P2：Records 分類人員功能

- [x] 讀取 Mayan 中待分類文件。
- [x] 顯示文件預覽。
- [x] 選擇 document type。
- [x] 編輯基本文件欄位：
  - label
  - description
- [x] 編輯正式 metadata：
  - customer
  - case id
  - document date
  - amount
  - tags
- [x] 儲存基本欄位到 Mayan。
- [x] 儲存正式 metadata 到 Mayan。
- [x] 送審到 reviewer 工作台（Mayan workflow + portal cache）。

## P2：Reviewer 審核功能

- [x] 讀取待審核文件清單。
- [x] 顯示文件與基本欄位。
- [x] 核准文件（Mayan workflow + portal cache）。
- [x] 退回修改（Mayan workflow + portal cache）。
- [x] 留下審核註記（Mayan workflow log comment + portal cache）。
- [x] Reviewer 清單只顯示 records 已送審的 pending 文件。
- [x] 與 Mayan workflow/action 對接。
- [ ] 增加 reviewer 歷史查詢與重新送審 UI。

## P2：Viewer 查詢功能

- [x] 串接 Mayan 文件清單 API，viewer 可看到真實 Mayan 文件。
- [x] 支援基本關鍵字過濾（label / description / document type / latest file name）。
- [ ] 支援 metadata filter。
- [x] Portal 內嵌文件預覽。
- [x] 下載原始檔。
- [ ] 權限不足時顯示友善訊息。

## P2：Admin 功能

- [x] Admin 可新增 Mayan 文件類型，scanner 下拉立即可用。
- [ ] 顯示 Mayan connection status。
- [ ] 顯示 Cloudflare tunnel status。
- [ ] 顯示 watch folder status。
- [ ] 顯示 portal batch queue。
- [ ] 管理 role navigation。
- [ ] 管理 scanner settings：
  - watch folder path
  - thumbnail size default
  - blank page threshold

## P3：工程整理

- [ ] 將 `src/main.jsx` 拆成多個 component。
- [ ] 將 locales 拆成 JSON。
- [ ] 將 scanner API 從 `vite.config.js` 移到正式 backend。
- [ ] 增加 ESLint / Prettier。
- [ ] 增加最基本 tests。
- [ ] 增加 error boundary。
- [ ] 增加 loading skeleton。
- [ ] 建立 `.env.example`。

## 每次交付前檢查

- [ ] `npm run build`
- [ ] `https://mayan-portal.avision-gb10.org` 回 `200`
- [ ] scanner login 可進入：

```text
username: scanner
password: avision123
```

- [ ] `GET /api/scanner/watch-folder` 回 `200`
- [ ] 若修改 Cloudflare 設定，確認 `mayan-emds` 與 `mayan-portal` 都仍可用。
