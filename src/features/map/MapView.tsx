import { memo, useImperativeHandle, useRef, useState, type Ref } from "react";
import { StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { html } from "./maphtml";
import { parseEvent, type MapCommand, type MapEvent } from "./mapBridge";

export type MapHandle = { send: (...commands: MapCommand[]) => void; reload: () => void };
const source = { html };
const origins = ["*"];

export default memo(function MapView({ ref, onEvent }: { ref: Ref<MapHandle>; onEvent: (event: MapEvent) => void }) {
  const webView = useRef<WebView<Record<never, never>>>(null);
  const [instance, setInstance] = useState(0);
  useImperativeHandle(ref, () => ({
    send: (...commands) => {
      const payload = JSON.stringify(JSON.stringify(commands));
      webView.current?.injectJavaScript(`window.mapmine?.receive(JSON.parse(${payload})); true;`);
    },
    reload: () => setInstance(value => value + 1),
  }), []);

  return (
    <WebView<Record<never, never>>
      key={instance}
      ref={webView}
      originWhitelist={origins}
      source={source}
      onShouldStartLoadWithRequest={event => event.url === "about:blank" || event.url.startsWith("data:text/html")}
      onMessage={event => {
        const value = parseEvent(event.nativeEvent.data);
        if (value) onEvent(value);
      }}
      onError={() => onEvent({ type: "error" })}
      onRenderProcessGone={() => onEvent({ type: "error" })}
      onContentProcessDidTerminate={() => onEvent({ type: "error" })}
      javaScriptEnabled
      scrollEnabled={false}
      allowFileAccess={false}
      javaScriptCanOpenWindowsAutomatically={false}
      setSupportMultipleWindows={false}
      style={styles.map}
    />
  );
});

const styles = StyleSheet.create({ map: { flex: 1, backgroundColor: "#101010" } });

