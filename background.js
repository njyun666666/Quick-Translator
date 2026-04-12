chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'TRANSLATE') {
    const { source, target, text } = message.payload;
    const sl = source === 'auto' || source === '' ? 'auto' : source;

    const url =
      'https://translate.googleapis.com/translate_a/single?client=gtx' +
      '&sl=' + sl +
      '&tl=' + target +
      '&dt=t&q=' + encodeURIComponent(text);

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        const translatedText = data[0][0][0];
        const detectedLang = sl === 'auto' ? (data[2] || sl) : sl;
        sendResponse({
          ok: true,
          data: {
            status: 'success',
            sourceLanguage: detectedLang,
            targetLanguage: target,
            originalText: text,
            translatedText,
          },
        });
      })
      .catch((err) => sendResponse({ ok: false, error: err.message }));

    return true;
  }

  if (message.type === 'SPEAK') {
    const { target, text } = message.payload;

    const url =
      'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob' +
      '&tl=' + target +
      '&q=' + encodeURIComponent(text);

    fetch(url)
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        const dataUrl = 'data:audio/mpeg;base64,' + btoa(binary);
        sendResponse({ ok: true, dataUrl });
      })
      .catch((err) => sendResponse({ ok: false, error: err.message }));

    return true;
  }

  return false;
});
