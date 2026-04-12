chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== 'TRANSLATE') return false;

  const { source, target, text } = message.payload;

  // auto-detect 傳空字串，Google Translate API 用 "auto"
  const sl = source === '' ? 'auto' : source;

  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx' +
    '&sl=' + sl +
    '&tl=' + target +
    '&dt=t&q=' + encodeURIComponent(text);

  fetch(url)
    .then((r) => r.json())
    .then((data) => {
      const translatedText = data[0][0][0];
      sendResponse({
        ok: true,
        data: {
          status: 'success',
          sourceLanguage: sl,
          targetLanguage: target,
          originalText: text,
          translatedText,
        },
      });
    })
    .catch((err) => sendResponse({ ok: false, error: err.message }));

  return true; // keep message channel open for async response
});
