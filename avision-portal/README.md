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

下一階段產品角色會收斂為 `operator` / `reviewer` / `viewer` / `admin`。其中 `operator` 會合併目前 scanner + records 的日常流程，包含掃描匯入、品質檢查、OCR 結果檢查 / 校正、metadata 補齊與送審；`reviewer` 審核時也可以複核與校正 OCR。

## 預設測試帳號

正式 Portal 登入會呼叫 Mayan API。以下測試帳號目前可用：

| 帳號 | 預設密碼 | 角色 |
| --- | --- | --- |
| `scanner` | `Avision-Portal-2026!` | 掃描人員 |
| `records` | `Avision-Portal-2026!` | 分類人員 |
| `reviewer` | `Avision-Portal-2026!` | 審核主管 |
| `viewer` | `Avision-Portal-2026!` | 查閱使用者 |

`avision123` 只保留給 `VITE_DEMO_LOGIN=1` 的離線 demo 模式，不是正式 Mayan 登入密碼。

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

Admin 角色可在 Portal 直接新增 Mayan 文件類型、建立使用者並指定角色、查看 Mayan / Cloudflare / watch folder 狀態、查看 batch queue，並調整 Portal scanner settings。後端會重新驗證登入 token，只有 admin role 可以呼叫管理 API。

## Records / Reviewer / Viewer 真實功能

- Records 可讀取 Mayan 文件、預覽頁面、更新 label / description / document type / metadata，並送審。
- OCR 應在 operator / records 流程完成：匯入後確認 OCR 狀態、檢查辨識文字、必要時校正，再送審。
- Reviewer 只顯示 pending 文件，可複核 / 校正 OCR、核准或退回；審核狀態同步寫入 Mayan workflow。
- Viewer 可搜尋、依 document type / metadata filter 篩選、預覽與下載文件。

## 相關文件

- [CHANGELOG.md](./CHANGELOG.md)：版本紀錄。
- [DEVELOPMENT.md](./DEVELOPMENT.md)：開發與架構說明。
- [USERGUIDE.md](./USERGUIDE.md)：使用者操作指南。
