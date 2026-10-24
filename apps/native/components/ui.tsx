import "@/unistyles";
import { ActivityIndicator, Pressable, Text, TextInput, type TextInputProps, View, type ViewStyle } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

type ButtonVariant = "primary" | "outline" | "ghost" | "destructive";

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
  small,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  small?: boolean;
}) {
  const { theme } = useUnistyles();
  const textColor =
    variant === "primary"
      ? theme.colors.primaryForeground
      : variant === "destructive"
        ? theme.colors.destructiveForeground
        : theme.colors.foreground;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        small && styles.small,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <Text style={[styles.buttonText, small && styles.smallText, { color: textColor }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label?: string }) {
  const { theme } = useUnistyles();
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={theme.colors.mutedForeground}
        {...props}
        style={[styles.input, props.multiline && styles.multiline, props.style]}
      />
    </View>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Muted({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return <Text style={[styles.muted, mono && styles.mono]}>{children}</Text>;
}

export function Tag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>#{label}</Text>
    </View>
  );
}

export function Empty({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}
    </View>
  );
}

export function Loading() {
  const { theme } = useUnistyles();
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={theme.colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  button: {
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  outline: { backgroundColor: "transparent", borderColor: theme.colors.border },
  ghost: { backgroundColor: "transparent", borderColor: "transparent" },
  destructive: { backgroundColor: theme.colors.destructive, borderColor: theme.colors.destructive },
  small: { paddingVertical: 6, paddingHorizontal: theme.spacing.sm },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  buttonText: { fontWeight: "600", fontSize: theme.fontSize.base },
  smallText: { fontSize: theme.fontSize.sm },
  field: { gap: 6 },
  label: {
    fontSize: theme.fontSize.xs,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: theme.colors.mutedForeground,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.input,
    backgroundColor: theme.colors.card,
    color: theme.colors.foreground,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: theme.fontSize.base,
  },
  multiline: { minHeight: 140, textAlignVertical: "top", fontFamily: theme.fonts.serif, lineHeight: 22 },
  card: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  title: { fontFamily: theme.fonts.serif, fontSize: theme.fontSize["3xl"], color: theme.colors.foreground },
  muted: { color: theme.colors.mutedForeground, fontSize: theme.fontSize.sm },
  mono: { fontFamily: theme.fonts.mono, fontSize: theme.fontSize.xs },
  tag: { backgroundColor: theme.colors.secondary, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { fontFamily: theme.fonts.mono, fontSize: theme.fontSize.xs, color: theme.colors.secondaryForeground },
  empty: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    alignItems: "center",
    gap: 4,
  },
  emptyTitle: { fontFamily: theme.fonts.serif, fontSize: theme.fontSize.lg, color: theme.colors.foreground },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", padding: theme.spacing.xl },
}));
