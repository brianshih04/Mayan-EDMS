# 開發計畫

本文件提供給後續 coding agent 接手 Avision EDMS Portal。Portal 是 Mayan-EDMS 上方的角色式簡化前台，不取代 Mayan core。

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

- `scanner`：掃描匯入、縮圖檢查、空白頁提示、批次建立。
- `records`：文件分類、metadata 補齊、送審。
- `reviewer`：文件審核、核准、退回、註記。
- `viewer`：文件搜尋、預覽、下載。
- `admin`：使用者與角色、系統狀態、Mayan 後台入口。

## 已完成

- 建立角色式 Portal UI。
- 建立 demo credential login。
- 支援繁體中文、英文、日文、簡體中文。
- 透過 Cloudflare tunnel 對外提供 portal。
- Scanner 已接本機 watch folder API：
  - `GET /api/scanner/watch-folder`
  - `GET /api/scanner/files/:fileName`
  - `POST /api/scanner/batches`
- Scanner 可顯示實際 watch folder 檔案。
- Scanner 可顯示影像縮圖與右側大預覽。
- Scanner 可做瀏覽器端影像空白頁輔助偵測。
- Scanner 支援小 / 中 / 大縮圖大小選擇，選擇會保存到 `localStorage`。
- 建立批次 manifest 到 `E:\Mayan-EDMS-Docker\data\portal\batches`，不搬移、不刪除原始掃描檔。

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

## Mayan 整合方向

Mayan 仍是正式文件後端。Portal 下一步應該開始呼叫 Mayan API 或使用 Mayan ingestion mechanism：

1. 確認 Mayan API auth/token 方式。
2. 建立 portal backend session。
3. 將 portal user 對應 Mayan group 或 permission。
4. Scanner 批次送入 Mayan document import。
5. Records 讀取待分類文件。
6. Records 寫入 metadata。
7. Reviewer 執行 approval / reject workflow。
8. Viewer 搜尋 Mayan 文件並預覽。

## Scanner 後續規劃

目前 scanner 的縮圖與空白頁偵測只支援瀏覽器可直接讀的影像格式：

- 支援預覽與空白偵測：JPG、JPEG、PNG、BMP。
- PDF 可嵌入預覽，但尚未逐頁縮圖與逐頁空白偵測。
- TIFF 需要後端轉圖服務。

建議下一步：

- 加入 PDF 逐頁轉圖。
- 加入 TIFF 轉圖。
- 產生每頁 thumbnail cache。
- 空白頁偵測移到 backend，避免瀏覽器效能不穩。
- 提供「標記重掃」、「忽略空白」、「確認批次」。
- 建立 batch manifest 後，將檔案送入 Mayan 或 staging folder。

## 重要注意事項

- 不要修改 Mayan core，除非明確需要且已評估升級成本。
- 不要把 portal manifest 寫入 `E:\watch_folder`，避免被 Mayan 當成文件匯入。
- Scanner API 必須防止 path traversal，只能讀 watch folder 內檔案。
- Cloudflare tunnel 對外時，Vite 必須允許 `mayan-portal.avision-gb10.org` host。
- 若使用者看到舊 UI，先重啟 Vite，再確認 browser cache。

