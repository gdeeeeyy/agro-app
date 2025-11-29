import React, { useMemo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface Props {
  value: string;
  onChange: (html: string) => void;
}

export default function QuillEditor({ value, onChange }: Props) {
  const webviewRef = useRef<WebView>(null);

  const html = useMemo(
    () => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <link href="https://cdn.quilljs.com/1.3.7/quill.snow.css" rel="stylesheet" />
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #f5f5f5;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      #toolbar {
        border-bottom: 1px solid #e0e0e0;
      }
      #editor {
        height: calc(100vh - 42px);
        padding: 8px 12px;
        background-color: #ffffff;
      }
      .ql-container.ql-snow {
        border: none;
        font-size: 16px;
      }
      .ql-editor {
        min-height: 100%;
      }
    </style>
  </head>
  <body>
    <div id="toolbar">
      <select class="ql-header">
        <option selected></option>
        <option value="1"></option>
        <option value="2"></option>
      </select>
      <button class="ql-bold"></button>
      <button class="ql-italic"></button>
      <button class="ql-underline"></button>
      <button class="ql-list" value="ordered"></button>
      <button class="ql-list" value="bullet"></button>
      <button class="ql-image"></button>
    </div>
    <div id="editor"></div>

    <script src="https://cdn.quilljs.com/1.3.7/quill.min.js"></script>
    <script>
      const editor = new Quill('#editor', {
        theme: 'snow',
        modules: { toolbar: '#toolbar' }
      });

      const initialHtml = ${JSON.stringify(value || '')};
      if (initialHtml) {
        const tmp = document.createElement('div');
        tmp.innerHTML = initialHtml;
        editor.setContents(editor.clipboard.convert(tmp.innerHTML));
      }

      editor.on('text-change', function() {
        const html = editor.root.innerHTML;
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'change', html }));
      });

      document.addEventListener('message', function(event) {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'setHtml') {
            const tmp = document.createElement('div');
            tmp.innerHTML = msg.html || '';
            editor.setContents(editor.clipboard.convert(tmp.innerHTML));
          }
        } catch (e) {}
      });
    </script>
  </body>
</html>`,
    [value]
  );

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        originWhitelist={["*"]}
        source={{ html }}
        onMessage={(event) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg.type === 'change') {
              onChange(msg.html || '');
            }
          } catch {}
        }}
        javaScriptEnabled
        domStorageEnabled
        automaticallyAdjustContentInsets={false}
        scrollEnabled
        style={{ backgroundColor: 'transparent' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 260,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
});