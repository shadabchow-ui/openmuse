import { ArrowUpRight, Check, ChevronRight, type LucideIcon, X } from "lucide-react-native";
import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type MascotVariant, mascotPalette } from "./theme/artwork";
import { lightTheme, type ThemeRoles } from "./theme/theme";

/** Deprecated alias of the pre-theme static palette (see theme/legacy-colors). */
export { colors } from "./theme/legacy-colors";

import { useTheme as useThemeContext } from "./theme/ThemeProvider";

export function useTheme(): ThemeRoles {
  return useThemeContext().theme;
}

export type ChipTone = "info" | "success" | "accent" | "warning" | "destructive";

/** Deprecated light snapshot for apps/mobile/App.tsx, which is outside this
 *  job’s write set and cannot be converted here. In-set screens use the
 *  hook form above; this snapshot keeps App-level screens on the exact old
 *  light styles until the App.tsx conversion + provider mount land (needs a
 *  header carve-out, recorded in docs/THEME.md). */
export const s = makeStyles(lightTheme);

export function makeStyles(theme: ThemeRoles) {
  return StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center" },
    between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    text: { color: theme.foreground, fontSize: 15, lineHeight: 23 },
    muted: { color: theme.mutedForeground, fontSize: 14, lineHeight: 21 },
    small: { color: theme.mutedForeground, fontSize: 11, lineHeight: 17 },
    label: {
      color: theme.mutedForeground,
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1.4,
      textTransform: "uppercase",
    },
    title: { color: theme.foreground, fontSize: 23, fontWeight: "600", letterSpacing: -0.7 },
    heading: { color: theme.foreground, fontSize: 16, fontWeight: "600", letterSpacing: -0.25 },
    card: {
      backgroundColor: theme.card,
      borderRadius: 23,
      borderWidth: 0,
      borderColor: theme.border,
      padding: 20,
    },
    divider: { height: 1, backgroundColor: theme.border, marginVertical: 18 },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 19,
      paddingHorizontal: 16,
      paddingVertical: 12,
      color: theme.foreground,
      fontSize: 16,
      backgroundColor: theme.card,
      minHeight: 45,
    },
    field: { gap: 7, marginBottom: 16 },
    button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: 17,
      minHeight: 42,
      paddingVertical: 10,
      borderRadius: 24,
    },
    primary: { backgroundColor: theme.primary },
    secondary: { backgroundColor: theme.secondary },
    buttonText: { fontSize: 14, fontWeight: "600" },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      alignSelf: "flex-start",
      backgroundColor: theme.background,
    },
    chipText: { fontSize: 10, fontWeight: "600", color: theme.mutedForeground },
    iconBox: {
      width: 42,
      height: 42,
      borderRadius: 13,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.info,
    },
    error: {
      padding: 16,
      borderRadius: 14,
      backgroundColor: theme.errorBackground,
      marginVertical: 10,
      gap: 4,
    },
    modalShade: {
      flex: 1,
      backgroundColor: theme.scrim,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    sheet: {
      backgroundColor: theme.background,
      borderRadius: 26,
      width: "100%",
      maxWidth: 790,
      maxHeight: "94%",
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.border,
    },
  });
}

export function Button({
  children,
  onPress,
  icon: Icon,
  primary,
  disabled,
  busy,
  small,
  danger,
  style,
}: {
  children: ReactNode;
  onPress: () => void;
  icon?: LucideIcon;
  primary?: boolean;
  disabled?: boolean;
  busy?: boolean;
  small?: boolean;
  danger?: boolean;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const color = danger ? theme.destructive : primary ? theme.primaryForeground : theme.foreground;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || busy}
      accessibilityState={{ disabled: !!(disabled || busy), busy: !!busy }}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        primary ? s.primary : s.secondary,
        small && { minHeight: 38, paddingVertical: 7, paddingHorizontal: 13 },
        (disabled || busy) && { opacity: 0.5 },
        pressed && { transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={color} size="small" />
      ) : Icon ? (
        <Icon size={15} color={color} />
      ) : null}
      <Text style={[s.buttonText, { color }]}>{children}</Text>
    </Pressable>
  );
}
export function IconButton({
  icon: Icon,
  label,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: 44,
          height: 44,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 22,
          backgroundColor: pressed ? theme.border : theme.card,
        },
      ]}
    >
      <Icon size={20} strokeWidth={1.8} color={theme.foreground} />
    </Pressable>
  );
}
export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  return <View style={[s.card, style]}>{children}</View>;
}
export function Chip({ children, tone }: { children: ReactNode; tone?: ChipTone }) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  let ink = theme.mutedForeground;
  if (tone === "success") ink = theme.scheme === "dark" ? theme.onSuccess : theme.mutedForeground;
  if (tone === "warning") ink = theme.scheme === "dark" ? theme.onWarning : theme.mutedForeground;
  if (tone === "destructive") ink = theme.destructiveForeground;
  return (
    <View style={[s.chip, tone ? { backgroundColor: theme[tone] } : null]}>
      <Text style={[s.chipText, { color: ink }]}>{children}</Text>
    </View>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={s.field}>
      <Text style={[s.small, { fontWeight: "600", color: theme.foreground }]}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.mutedForeground}
        accessibilityLabel={label}
        {...props}
        style={[
          s.input,
          props.multiline && { minHeight: 120, textAlignVertical: "top" },
          props.style,
        ]}
      />
    </View>
  );
}
export function Empty({
  icon: Icon,
  title,
  detail,
  children,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  children?: ReactNode;
}) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={{ alignItems: "center", padding: 40, gap: 13 }}>
      <View style={[s.iconBox, { width: 55, height: 55, borderRadius: 18 }]}>
        <Icon size={24} color={theme.link} />
      </View>
      <Text style={s.heading}>{title}</Text>
      <Text style={[s.muted, { textAlign: "center", maxWidth: 360 }]}>{detail}</Text>
      {children}
    </View>
  );
}
export function ErrorNotice({ error }: { error?: string }) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  return error ? (
    <View accessibilityRole="alert" style={s.error}>
      <Text style={[s.text, { color: theme.errorForeground }]}>{error}</Text>
    </View>
  ) : null;
}
export function Sheet({
  title,
  subtitle,
  children,
  onClose,
  wide,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = width < 600;
  return (
    <Modal transparent animationType={compact ? "slide" : "fade"} visible onRequestClose={onClose}>
      <View style={[s.modalShade, compact && { padding: 0, justifyContent: "flex-end" }]}>
        <View
          accessibilityViewIsModal
          style={[
            s.sheet,
            wide && { maxWidth: 1050 },
            compact && {
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              paddingBottom: Math.max(insets.bottom, 12),
              maxHeight: "94%",
            },
          ]}
        >
          {compact && (
            <View
              style={{
                alignSelf: "center",
                width: 34,
                height: 4,
                borderRadius: 3,
                backgroundColor: theme.border,
                marginTop: 10,
              }}
            />
          )}
          <View
            style={[
              s.between,
              { padding: compact ? 20 : 24, borderBottomWidth: 1, borderBottomColor: theme.border },
            ]}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.title}>{title}</Text>
              {!!subtitle && <Text style={s.muted}>{subtitle}</Text>}
            </View>
            <IconButton icon={X} label="Close details" onPress={onClose} />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: compact ? 20 : 24 }}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
export function CheckRow({
  label,
  checked,
  onPress,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onPress}
      style={[s.row, { gap: 10, paddingVertical: 9 }]}
    >
      <View
        style={{
          width: 19,
          height: 19,
          borderRadius: 5,
          borderWidth: 1,
          borderColor: checked ? theme.foreground : theme.border,
          backgroundColor: checked ? theme.foreground : theme.card,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked && <Check size={13} color={theme.card} />}
      </View>
      <Text style={[s.text, { flex: 1 }]}>{label}</Text>
    </Pressable>
  );
}
export function SectionHeading({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={[s.between, { marginBottom: 19 }]}>
      <Text style={s.heading}>{title}</Text>
      {action && onPress && (
        <Pressable accessibilityRole="button" onPress={onPress} style={[s.row, { gap: 5 }]}>
          <Text style={[s.small, { color: theme.foreground }]}>{action}</Text>
          <ArrowUpRight size={13} color={theme.mutedForeground} />
        </Pressable>
      )}
    </View>
  );
}
export function LinkRow({
  title,
  detail,
  onPress,
  icon: Icon,
  tone,
}: {
  title: string;
  detail?: string;
  onPress: () => void;
  icon: LucideIcon;
  tone?: ChipTone;
}) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        s.row,
        { paddingVertical: 13, gap: 14, borderRadius: 10 },
        pressed && { backgroundColor: theme.background },
      ]}
    >
      <View style={[s.iconBox, { backgroundColor: tone ? theme[tone] : theme.info }]}>
        <Icon size={19} color={theme.foreground} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[s.text, { fontWeight: "500" }]}>{title}</Text>
        {!!detail && <Text style={s.small}>{detail}</Text>}
      </View>
      <ChevronRight size={15} color={theme.mutedForeground} />
    </Pressable>
  );
}
/** OpenMuse's original capybara, shared by every assistant surface. */
export function Mascot({ size = 42, variant = "sky" }: { size?: number; variant?: MascotVariant }) {
  const palette = mascotPalette[variant];
  return (
    <View accessibilityLabel="OpenMuse capybara" style={{ width: size, height: size }}>
      <View
        style={{
          position: "absolute",
          top: size * 0.15,
          left: size * 0.12,
          width: size * 0.76,
          height: size * 0.76,
          borderRadius: size,
          backgroundColor: palette,
        }}
      />
      <Image
        source={require("../assets/capybara.png")}
        resizeMode="contain"
        style={{ width: size, height: size }}
        accessible={false}
      />
    </View>
  );
}
export function dateLabel(value: string, options?: Intl.DateTimeFormatOptions) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-US", options || { month: "short", day: "numeric" });
}
export function timeLabel(value: string, timeZone?: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone });
}
export { relativeDate } from "./relative-date";

export function resultSummary(value: string) {
  return /^Saved to (?:sample|local) sent mail(?: · .+)?$/.test(value)
    ? "Reply saved in your local Sent mail."
    : value;
}
