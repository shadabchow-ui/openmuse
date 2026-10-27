import { useCallback, useMemo, useState } from "react";
import { Linking, Text, type TextStyle } from "react-native";
import Markdown, { type MarkdownStyles, type RenderRules } from "react-native-markdown-renderer";
import { assistantMarkdown, isSafeAssistantUrl } from "./assistant-markdown";
import type { ThemeRoles } from "./theme/theme";
import { ErrorNotice, useTheme } from "./ui";

function makeTextStyle(theme: ThemeRoles) {
  return { color: theme.foreground, fontSize: 16, lineHeight: 24 };
}

function makeStyle(theme: ThemeRoles): Partial<MarkdownStyles> {
  return {
    text: makeTextStyle(theme),
    paragraph: { marginTop: 0, marginBottom: 6 },
    list: { marginBottom: 6 },
    headingContainer: { marginTop: 8, marginBottom: 4 },
    heading1: { fontSize: 21, lineHeight: 27 },
    heading2: { fontSize: 19, lineHeight: 25 },
    heading3: { fontSize: 17, lineHeight: 23 },
    link: { color: theme.link, textDecorationLine: "underline" },
    codeInline: { backgroundColor: theme.muted, color: theme.foreground },
    codeBlock: { backgroundColor: theme.muted, color: theme.foreground },
  };
}

const renderCodeBlock: RenderRules["fence"] = (node, _children, _parent, styles) => (
  <Text key={node.key} selectable style={styles.codeBlock as TextStyle}>
    {node.content.replace(/\n$/, "")}
  </Text>
);

function makeRules(theme: ThemeRoles): RenderRules {
  return {
    textgroup: (node, children) => (
      <Text key={node.key} selectable style={makeTextStyle(theme)}>
        {children}
      </Text>
    ),
    image: (node) => (
      <Text key={node.key} selectable style={{ color: theme.mutedForeground }}>
        {node.attributes.alt ? `[Image: ${node.attributes.alt}]` : "[Image]"}
      </Text>
    ),
    code_block: renderCodeBlock,
    fence: renderCodeBlock,
  };
}

export function AssistantResponse({ content }: { content: string }) {
  const theme = useTheme();
  const style = useMemo(() => makeStyle(theme), [theme]);
  const rules = useMemo(() => makeRules(theme), [theme]);
  const [linkError, setLinkError] = useState("");
  const onLinkPress = useCallback((url: string) => {
    if (!isSafeAssistantUrl(url)) return false;
    setLinkError("");
    void Linking.openURL(url).catch((error) =>
      setLinkError(error instanceof Error ? error.message : String(error)),
    );
    return false;
  }, []);
  return (
    <>
      <Markdown
        markdownit={assistantMarkdown}
        style={style}
        rules={rules}
        onLinkPress={onLinkPress}
      >
        {content}
      </Markdown>
      <ErrorNotice error={linkError} />
    </>
  );
}
