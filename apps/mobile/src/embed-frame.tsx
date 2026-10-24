import { createElement, useEffect, useRef, useState } from "react";
import { acceptEmbedMessage, frameProps } from "./embed-messages";

/**
 * The framed view and its message listener. This file imports nothing from react-native, so a test can render it
 * to markup and check the iframe attributes the browser would actually receive.
 */
export function EmbedFrame({ path, title, nonce }: { path: string; title: string; nonce: string }) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const [height, setHeight] = useState(480);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const message = acceptEmbedMessage(
        {
          expectedNonce: nonce,
          sourceIsFrame: event.source !== null && event.source === frame.current?.contentWindow,
          origin: event.origin,
          pageOrigin: window.location.origin,
        },
        event.data,
      );
      if (message?.type === "resize") setHeight(message.height);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [nonce]);

  return createElement(
    "div",
    { style: { width: "100%", height } },
    createElement("iframe", { ref: frame, ...frameProps(path, title, nonce) }),
  );
}
