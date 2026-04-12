# Quick Translator

Edge 瀏覽器擴充程式，選取網頁文字後即時翻譯。

## 安裝

1. 開啟 Edge，網址列輸入 `edge://extensions/`
2. 右上角開啟**開發人員模式**
3. 點擊**載入未封裝項目**，選取本專案資料夾
4. 擴充程式載入完成

## 使用方式

1. 在任何網頁上用滑鼠**選取文字**
2. 選取後於文字下方出現藍色**翻譯圖示**，點擊它
3. 彈出視窗自動開始翻譯，預設目標語言為繁體中文
4. 切換來源或目標語言，自動重新翻譯
5. 譯文顯示後可點擊**複製**按鈕複製結果
6. 原文右側與譯文旁皆有**語音按鈕**，點擊即播放朗讀
7. 點擊右上角外開圖示，在 Google 翻譯網頁開啟相同內容
8. 按 `Escape` 或點擊視窗外側關閉

## 支援語言

| 代碼    | 語言     | 可作為來源 | 可作為目標 |
| ------- | -------- | :--------: | :--------: |
| `auto`  | 自動偵測 |     ✓      |            |
| `en`    | 英文     |     ✓      |     ✓      |
| `zh-TW` | 繁體中文 |     ✓      |     ✓      |
| `ja`    | 日文     |     ✓      |     ✓      |
| `ko`    | 韓文     |     ✓      |     ✓      |

## 檔案結構

```
.
├── manifest.json   # 擴充程式設定（Manifest V3）
├── background.js   # Service Worker，負責呼叫翻譯 API
├── content.js      # 注入所有網頁，處理選字與浮動 UI
├── content.css     # 浮動按鈕與彈出視窗樣式
└── README.md
```

## 翻譯 API

使用 Google Translate 非官方 API，由 `background.js`（Service Worker）發出請求以繞過 CORS 限制。

### 請求

```
GET https://translate.googleapis.com/translate_a/single
  ?client=gtx
  &sl={source}
  &tl={target}
  &dt=t
  &q={encodeURIComponent(text)}
```

| 參數 | 說明                              |
| ---- | --------------------------------- |
| `sl` | 來源語言代碼；`auto` 表示自動偵測 |
| `tl` | 目標語言代碼                      |
| `q`  | 欲翻譯的文字（URL encode）        |

### 回應

原始回應為多層巢狀陣列，譯文取自 `data[0][0][0]`：

```json
[
  [
    ["哈囉，世界！", "Hello, world!", null, null, 10],
    ...
  ],
  ...
]
```

## 自訂樣式

所有顏色以 CSS 變數定義於 `content.css` 頂部，修改變數即可調整整體配色：

```css
#qt-popup, #qt-btn {
  --accent          /* 主色（按鈕、強調） */
  --accent-hover    /* 按鈕 hover 狀態 */
  --accent-active   /* 按鈕 active 狀態 */
  --accent-light    /* 標題文字、標籤 */
  --bg-base         /* 彈出視窗主背景 */
  --bg-surface      /* 次層背景（header、select） */
  --bg-result       /* 翻譯結果底色 */
  --bg-copy         /* 複製按鈕底色 */
  --border          /* 主要邊框 */
  --border-result   /* 翻譯結果邊框 */
  --text-primary    /* 主要文字 */
  --text-muted      /* 次要文字 */
  --text-white      /* 按鈕白字 */
  --err-bg          /* 錯誤背景 */
  --err-border      /* 錯誤邊框 */
  --err-text        /* 錯誤文字 */
  --success         /* 已複製文字色 */
  --success-border  /* 已複製邊框色 */
}
```
