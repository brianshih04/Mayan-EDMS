# 開發計畫

本文件提供給後續 coding agent 接手 Avision EDMS Portal。Portal 是 Mayan-EDMS 上方的角色式簡化前台，不取代 Mayan core。

> **進度（2026-07-07）**：P0 / P1 / P2 主要項目已完成 — scanner 選取/QC/空白偵測、PDF/TIFF 逐頁轉圖（mupdf WASM）、Mayan 匯入（service token）、Mayan 登入與角色對應、records metadata 編輯、reviewer workflow 審核、viewer 搜尋/預覽/下載、Admin 使用者/文件類型/系統狀態/設定。P3 已補 ESLint、smoke test、`.env.example`，並完成 locales / role config 拆檔。詳見 CHANGELOG / TODOLIST。

## 目前狀態

- 專案位置：`E:\Projects\Mayan-EDMS\avision-portal`
- 前端：React + Vite + lucide-react
- 本機入口：`http://localhost:5174`
- Cloudflare 入口：`https://mayan-portal.avision-gb10.org`
- Mayan 入口：`https://mayan-emds.avision-gb10.org`
- Mayan Docker 工作目錄：`E:\Mayan-EDMS-Docker`
- Watch folder：`E:\watch_folder`
- Portal state：`E:\Mayan-EDMS-Docker\data\portal`

## 產品方向

目標是讓一般使用者不需要進入 Mayan 複雜後台，而是依照角色進入簡化工作台：

- `scanner`：掃描匯入、縮圖檢查、空白頁提示、批次建立、匯入 Mayan、刪除不需要的掃描檔。
- `records`：文件分類、metadata 補齊、送審。
- `reviewer`：文件審核、核准、退回、註記。
- `viewer`：文件搜尋、預覽、下載。
- `admin`：文件類型、使用者與角色、系統狀態、Mayan 後台入口。

## 已完成

- 建立角色式 Portal UI。
- 串接 Mayan 帳號密碼登入，依 Mayan group 對應 portal role。
- 支援繁體中文、英文、日文、簡體中文。
- 透過 Cloudflare tunnel 對外提供 portal。
- Scanner 已接本機 watch folder API：
  - `GET /api/scanner/watch-folder`
  - `GET /api/scanner/files/:fileName`
  - `DELETE /api/scanner/files/:fileName`
  - `GET /api/scanner/files/:fileName/pages`
  - `GET /api/scanner/files/:fileName/pages/:page/thumbnail`
  - `POST /api/scanner/batches`
- Scanner 可匯入 Mayan，並可選擇匯入成功後刪除原始檔。
- Scanner 可顯示實際 watch folder 檔案。
- Scanner 可顯示影像縮圖與右側大預覽。
- Scanner 可做瀏覽器端影像空白頁輔助偵測。
- Scanner 支援小 / 中 / 大縮圖大小選擇，選擇會保存到 `localStorage`。
- 建立批次 manifest 到 `E:\Mayan-EDMS-Docker\data\portal\batches`。
- Admin 可在 portal 新增 Mayan 文件類型，後端限制 admin role。
- Records 可讀取 Mayan 文件並更新 label / description / document type / Avision metadata。
- Reviewer 可透過 Mayan workflow 送審、核准、退回並留下註記。
- Viewer 可依關鍵字、document type、metadata 搜尋，並預覽 / 下載文件。
- Admin 可建立使用者、指定角色、查看系統狀態與 batch queue、調整 scanner settings。
- 已新增 `npm run lint`、`npm run test:smoke`、`.env.example`。

## Cloudflare 掛載方式

目前使用同一條 Cloudflare named tunnel：`mayan-emds`

Tunnel ID：

```text
30d74dba-9789-4cf3-805e-50e4573d6374
```

設定檔：

```text
E:\Mayan-EDMS-Docker\cloudflared-mayan-emds.yml
```

目前設定：

```yaml
tunnel: 30d74dba-9789-4cf3-805e-50e4573d6374
credentials-file: C:\Users\Brian\.cloudflared\30d74dba-9789-4cf3-805e-50e4573d6374.json

ingress:
  - hostname: mayan-emds.avision-gb10.org
    service: http://localhost:8080
  - hostname: mayan-portal.avision-gb10.org
    service: http://localhost:5174
  - service: http_status:404
```

建立 DNS route 的指令：

```powershell
cloudflared tunnel route dns mayan-emds mayan-portal.avision-gb10.org
```

啟動 tunnel：

```powershell
cloudflared tunnel --config E:\Mayan-EDMS-Docker\cloudflared-mayan-emds.yml --logfile E:\Mayan-EDMS-Docker\cloudflared-mayan-emds.log run
```

若修改 tunnel 設定檔，需要重啟 cloudflared process。

## Portal 啟動方式

```powershell
cd E:\Projects\Mayan-EDMS\avision-portal
npm install
npm run dev
```

或：

```powershell
cd E:\Projects\Mayan-EDMS\avision-portal
.\start-portal.ps1
```

Vite 設定在 `vite.config.js`，目前包含：

- Cloudflare hostname allowlist：`mayan-portal.avision-gb10.org`
- Scanner local API middleware
- Watch folder path：`AVISION_WATCH_FOLDER` 或預設 `E:\watch_folder`
- Portal state path：`AVISION_PORTAL_STATE_DIR` 或預設 `E:\Mayan-EDMS-Docker\data\portal`

## 架構規劃

短期仍可維持 Vite middleware 作為 local bridge，讓 scanner PC 能直接讀本機資料夾。中期建議拆成正式 backend service：

```text
scanner software -> E:\watch_folder -> portal backend -> Mayan API/import -> role UI
```

建議後續結構：

- `src/`：React UI。
- `server/`：Express/Fastify 或 Mayan integration service。
- `server/scanner`：watch folder、thumbnail、blank page detection、batch。
- `server/mayan`：Mayan auth、document import、metadata、workflow。
- `server/auth`：session、role mapping。

## Mayan 整合狀態

Mayan 仍是正式文件後端。Portal 目前已呼叫 Mayan API 完成以下流程：

1. Mayan API auth/token。
2. Portal backend session 與 role mapping。
3. Portal user 對應 Mayan group。
4. Scanner 批次送入 Mayan document import。
5. Records 讀取文件、更新分類與 metadata。
6. Reviewer 執行 approval / reject workflow。
7. Viewer 搜尋 Mayan 文件並預覽 / 下載。
8. Admin 建立文件類型、建立使用者、查詢系統狀態。

## Scanner 後續規劃

目前 scanner 的縮圖與空白頁偵測支援：

- JPG、JPEG、PNG、BMP：瀏覽器直接預覽並輔助偵測。
- PDF、TIFF：server 端透過 `mupdf` 逐頁轉 PNG、產生縮圖並做逐頁空白頁偵測。

建議下一步：

- 將 `src/main.jsx` 進一步拆成 React components / hooks。
- 將 `src/locales.js` 進一步拆成 JSON 或導入 i18n。
- 增加 Playwright E2E 測試。
- 評估改成正式 backend service，取代 Vite middleware 作為長期部署模式。

## 重要注意事項

- 不要修改 Mayan core，除非明確需要且已評估升級成本。
- 不要把 portal manifest 寫入 `E:\watch_folder`，避免被 Mayan 當成文件匯入。
- Scanner API 必須防止 path traversal，只能讀 watch folder 內檔案。
- Cloudflare tunnel 對外時，Vite 必須允許 `mayan-portal.avision-gb10.org` host。
- 若使用者看到舊 UI，先重啟 Vite，再確認 browser cache。
