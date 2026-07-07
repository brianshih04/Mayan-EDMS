# 使用者指南

本文件說明 Avision EDMS Portal 的登入方式、預設測試帳號、各角色可使用的功能，以及與 Mayan-EDMS 的關係。

## 系統入口

Portal 正式網址：

```text
https://mayan-portal.avision-gb10.org
```

本機開發網址：

```text
http://localhost:5174
```

Mayan 後台網址：

```text
https://mayan-emds.avision-gb10.org
```

一般使用者建議使用 Portal。只有系統管理員或進階維護人員需要進入 Mayan 後台。

## 預設測試帳號

目前 Portal 預設使用 Mayan 帳號密碼登入，登入後會依 Mayan group 對應到不同 Portal 角色。

以下四個測試帳號目前已用 API 驗證可登入：

| 帳號 | 預設密碼 | Portal 角色 | 主要用途 |
| --- | --- | --- | --- |
| `scanner` | `Avision-Portal-2026!` | 掃描人員 | 掃描匯入、批次檢查、刪除不需要的掃描檔、匯入 Mayan |
| `records` | `Avision-Portal-2026!` | 分類人員 | 文件分類、文件類型調整、metadata 編輯、送審 |
| `reviewer` | `Avision-Portal-2026!` | 審核主管 | 查看待審核文件、核准、退回、填寫審核註記 |
| `viewer` | `Avision-Portal-2026!` | 查閱使用者 | 搜尋、預覽、下載文件 |

Admin 帳號由 Mayan 管理。超級使用者或 `Admin` 群組使用者登入後會進入 Portal 的 admin role。

> 注意：`avision123` 只適用於前端離線 demo 模式，也就是 `VITE_DEMO_LOGIN=1` 時使用。正式 Mayan 登入不是這組密碼。

## 角色功能

## 建議角色簡化方向

下一階段 Portal 會以 `Operator` 作為主要工作台，合併目前 `scanner` 與 `records` 的日常操作。Operator 應一次完成：

- 掃描匯入。
- 縮圖與空白頁檢查。
- 刪除錯誤或不需要的掃描檔。
- 選擇文件類型。
- 匯入 Mayan。
- OCR 執行狀態確認。
- OCR 文字檢查與必要校正。
- Metadata 補齊。
- 送交 reviewer 審核。

OCR 屬於資料品質與歸檔前處理，應由 operator 在送審前先完成；reviewer 審核時也可以校正 OCR 文字，或在 OCR 問題較大時退回 operator 補正。Viewer 只負責查閱，不負責修改。

### Scanner：掃描人員

適用於掃描站或負責把掃描檔匯入系統的人員。

主要功能：

- 讀取 watch folder：`E:\watch_folder`
- 顯示掃描檔縮圖。
- 支援 PDF / TIFF 逐頁縮圖與逐頁品質檢查。
- 標示疑似空白頁。
- 切換小 / 中 / 大縮圖。
- 勾選要匯入的檔案。
- 刪除不需要的掃描原始檔。
- 選擇 Mayan 文件類型。
- 匯入 Mayan。
- 可選擇「匯入成功後刪除原始檔」。

建議流程：

1. 掃描器或掃描軟體輸出 PDF / TIFF / JPG / PNG 到 `E:\watch_folder`。
2. 使用 `scanner` 登入 Portal。
3. 檢查縮圖與疑似空白頁標記。
4. 勾選要匯入的檔案。
5. 選擇文件類型。
6. 按「匯入 Mayan」。

### Records：分類人員

適用於負責整理文件資料、補 metadata、送審的人員。

主要功能：

- 查看 Mayan 中的文件清單。
- 預覽文件頁面。
- 修改文件 label。
- 修改文件 description。
- 選擇或變更 document type。
- 編輯 Avision metadata：
  - Customer
  - Case ID
  - Document date
  - Amount
  - Tags
- 檢查 OCR 結果。
- 必要時校正 OCR 文字。
- 儲存分類資料到 Mayan。
- 將文件送到 reviewer 工作台。

建議流程：

1. 使用 `records` 登入 Portal。
2. 開啟「文件分類」或「資料欄位」。
3. 選擇文件。
4. 確認文件類型。
5. 檢查 OCR 狀態與文字內容。
6. 必要時校正 OCR。
7. 補齊 metadata。
8. 儲存。
9. 按「送審」。

### Reviewer：審核主管

適用於需要核准或退回文件的人員。

主要功能：

- 只顯示待審核文件。
- 預覽文件內容。
- 查看文件基本資料與 metadata。
- 查看 OCR 文字。
- 校正 OCR 文字。
- 填寫審核註記。
- 核准文件。
- 退回文件。
- 審核狀態同步寫入 Mayan workflow。

建議流程：

1. 使用 `reviewer` 登入 Portal。
2. 開啟「審核清單」。
3. 選擇待審核文件。
4. 檢查文件、metadata 與 OCR 文字。
5. 必要時校正 OCR。
6. 填寫審核註記。
7. 選擇「核准」或「退回」。

### Viewer：查閱使用者

適用於只需要查詢、預覽、下載文件的人員。

主要功能：

- 搜尋 Mayan 文件。
- 依關鍵字搜尋 label、description、document type、檔名。
- 依文件類型篩選。
- 依 Avision metadata 篩選。
- 預覽文件頁面。
- 下載原始檔。
- 開啟 Mayan 原生文件頁面。

建議流程：

1. 使用 `viewer` 登入 Portal。
2. 開啟「文件搜尋」。
3. 輸入關鍵字，或使用 metadata filter。
4. 點選文件預覽。
5. 視需要下載原始檔。

### Admin：系統管理員

適用於負責 Portal、Mayan 文件類型、使用者角色與系統狀態的人員。

主要功能：

- 新增 Mayan 使用者。
- 指定 Portal role。
- 自動加入對應 Mayan group。
- 新增 Mayan 文件類型。
- 查看 Mayan connection status。
- 查看 Cloudflare tunnel status。
- 查看 watch folder status。
- 查看 portal batch queue。
- 管理 Portal scanner settings：
  - 預設縮圖大小。
  - 空白偵測靈敏度。

Admin 登入方式：

- 使用 Mayan superuser。
- 或使用 Mayan `Admin` group 內的使用者。

本專案早期設定過 Mayan 初始 admin 密碼為：

```text
Brian0054$
```

若此密碼無法登入，請以目前 Mayan 實際 admin 密碼為準，或從 Mayan / Docker 環境重設 admin 密碼。

## 語言切換

登入頁與工作台右上角可切換語言。

目前支援：

- 繁體中文。
- English。
- 日本語。
- 简体中文。

語言設定會儲存在瀏覽器中，下次開啟會沿用。

## 注意事項

- 真實登入走 Mayan API，不是前端假帳號。
- `scanner`、`records`、`reviewer`、`viewer` 預設密碼目前是 `Avision-Portal-2026!`。
- `avision123` 只保留給離線 demo 模式。
- Mayan 後台帳號與密碼由 Mayan 管理。
- 如果 Portal 登入成功但看不到文件，請確認 Mayan 權限、service token、或 Portal role mapping。
- 如果 Mayan 後台出現 CSRF 錯誤，請確認 Mayan 的 `CSRF_TRUSTED_ORIGINS` 是否包含正式網域。
