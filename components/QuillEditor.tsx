import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Alert, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from '../lib/upload';

interface Props {
  value: string;
  onChange: (html: string) => void;
  style?: StyleProp<ViewStyle>;
}

export default function QuillEditor({ value, onChange, style }: Props) {
  const webviewRef = useRef<WebView>(null);
  const [uploading, setUploading] = useState(false);

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
      .ql-editor img {
        width: 100%;
        height: auto;
        aspect-ratio: 4 / 3;
        object-fit: cover;
        display: block;
        margin: 8px 0;
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
      const toolbarOptions = {
        container: '#toolbar',
        handlers: {
          image: function () {
            try {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pick-image' }));
            } catch (e) {}
          }
        }
      };

      const editor = new Quill('#editor', {
        theme: 'snow',
        modules: { toolbar: toolbarOptions }
      });

      function insertImage(url) {
        try {
          const range = editor.getSelection(true);
          const index = range ? range.index : editor.getLength();
          editor.insertEmbed(index, 'image', url, 'user');
          editor.setSelection(index + 1, 0);
        } catch (e) {}
      }

      function onNativeMessage(event) {
        try {
          const data = typeof event.data === 'string' ? event.data : '';
          const msg = JSON.parse(data);
          if (msg && msg.type === 'insert-image' && msg.url) {
            insertImage(String(msg.url));
          }
        } catch (e) {}
      }

      window.addEventListener('message', onNativeMessage);
      document.addEventListener('message', onNativeMessage);

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
    </script>
  </body>
</html>`,
    [value]
  );

  const handlePickAndUploadImage = async () => {
    try {
      setUploading(true);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission required', 'Allow photo library access to add images.');
        return;
      }

      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
      });

      if (r.canceled) return;
      const uri = r.assets?.[0]?.uri;
      if (!uri) return;

      const up = await uploadImage(uri, { folder: 'agro-app/improved-articles' });

      // Send URL into the editor to be inserted at the current cursor position.
      webviewRef.current?.postMessage(
        JSON.stringify({ type: 'insert-image', url: up.url }),
      );
    } catch (e: any) {
      Alert.alert('Upload failed', String(e?.message || e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webviewRef}
        originWhitelist={["*"]}
        source={{ html }}
        onMessage={(event) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg.type === 'change') {
              onChange(msg.html || '');
              return;
            }
            if (msg.type === 'pick-image') {
              handlePickAndUploadImage();
              return;
            }
          } catch {}
        }}
        javaScriptEnabled
        domStorageEnabled
        automaticallyAdjustContentInsets={false}
        scrollEnabled
        style={{ backgroundColor: 'transparent' }}
      />

      {uploading ? (
        <View style={styles.uploadOverlay} pointerEvents="none">
          <ActivityIndicator color="#4caf50" />
        </View>
      ) : null}
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
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
