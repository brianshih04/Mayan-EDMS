# Avision EDMS Portal

Avision EDMS Portal 是建立在 Mayan-EDMS 之上的簡化前台。Mayan-EDMS 繼續負責文件儲存、OCR、權限、搜尋與流程管理；本前台負責把日常使用者會看到的畫面簡化成角色導向的工作台。

## 目標

- 讓不同角色只看到自己需要的 UI/UX。
- 降低 Mayan 原生後台的設定複雜度。
- 保留 Mayan 作為穩定的文件管理後端。
- 支援多國語言，第一版包含繁體中文、英文、日文、簡體中文。

## 目前角色

- `scanner`：掃描匯入、批次檢查。
- `records`：文件分類、metadata 編輯。
- `reviewer`：審核清單、決策工作。
- `viewer`：文件搜尋、檢視、下載入口。
- `admin`：使用者與角色、系統狀態、Mayan 後台入口。

## 啟動方式

```powershell
npm install
npm run dev
```

本機網址：

```text
http://localhost:5174
```

Mayan 後端網址：

```text
https://mayan-emds.avision-gb10.org
```

Cloudflare portal 網址：

```text
https://mayan-portal.avision-gb10.org
```

## Scanner 真實功能

目前 scanner 角色已接本機 watch folder 與 Mayan 匯入：

- `GET /api/scanner/watch-folder`：讀取 `E:\watch_folder` 中可匯入的 PDF、TIFF 與影像檔。
- `GET /api/scanner/files/:fileName/pages`：PDF/TIFF 逐頁轉圖與空白頁偵測。
- `DELETE /api/scanner/files/:fileName`：刪除不需要的 watch folder 原始檔。
- `POST /api/scanner/batches`：依選取檔案建立本機匯入批次 manifest。
- `POST /api/mayan/import`：將成功確認的檔案匯入 Mayan，並可選擇匯入成功後刪除原始檔。

預設 watch folder 是 `E:\watch_folder`。如需改路徑，可在啟動 Vite 前設定：

```powershell
$env:AVISION_WATCH_FOLDER = 'D:\your_watch_folder'
npm run dev
```

批次 manifest 預設寫入 `E:\Mayan-EDMS-Docker\data\portal\batches`，不會寫回 watch folder。可用 `AVISION_PORTAL_STATE_DIR` 改變狀態目錄。

## Admin 簡化管理

Admin 角色可在 Portal 直接新增 Mayan 文件類型。新增成功後，scanner 的「文件類型」下拉會立即讀到新類型。後端會重新驗證登入 token，只有 admin role 可以呼叫新增 API。

## 相關文件

- [CHANGELOG.md](./CHANGELOG.md)：版本紀錄。
- [DEVELOPMENT.md](./DEVELOPMENT.md)：開發與架構說明。
- [USERGUIDE.md](./USERGUIDE.md)：使用者操作指南。
