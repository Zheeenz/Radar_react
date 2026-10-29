import { useState, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors, fonts } from '../theme';
import type { Analysis } from '../types';

export type IconName = ComponentProps<typeof Feather>['name'];
export function Icon({ name, size = 20, color = colors.ink }: { name: IconName; size?: number; color?: string }) { return <Feather name={name} size={size} color={color} accessible={false} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />; }
export function Copy({ children, muted = false, small = false, style }: { children: ReactNode; muted?: boolean; small?: boolean; style?: ComponentProps<typeof Text>['style'] }) { return <Text style={[styles.copy, muted && { color: colors.muted }, small && styles.small, style]}>{children}</Text>; }
export function Heading({ children, level = 2, style }: { children: ReactNode; level?: 1 | 2 | 3; style?: ComponentProps<typeof Text>['style'] }) { return <Text accessibilityRole="header" aria-level={level} style={[styles.heading, level === 1 && styles.title, level === 3 && styles.headingSmall, style]}>{children}</Text>; }
export function Button({ children, onPress, icon, secondary = false, danger = false, compact = false, disabled = false, style, label }: { children?: ReactNode; onPress: () => void | Promise<void>; icon?: IconName; secondary?: boolean; danger?: boolean; compact?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>; label?: string }) {
  const [pending, setPending] = useState(false);
  const foreground = danger ? colors.red : secondary ? colors.ink : colors.white;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: disabled || pending }} disabled={disabled || pending} onPress={async () => { setPending(true); try { await onPress(); } finally { setPending(false); } }} style={({ pressed }) => [styles.button, secondary && styles.secondary, danger && styles.danger, compact && styles.compact, (disabled || pending) && { opacity: 0.55 }, pressed && { opacity: 0.78 }, style]}>{pending ? <ActivityIndicator size="small" color={foreground} /> : icon ? <Icon name={icon} size={17} color={foreground} /> : null}<Text style={[styles.buttonText, { color: foreground }]}>{children}</Text></Pressable>;
}
export function IconButton({ icon, onPress, label, active = false, style }: { icon: IconName; onPress: () => void | Promise<void>; label: string; active?: boolean; style?: StyleProp<ViewStyle> }) { return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: active }} onPress={onPress} style={({ pressed }) => [styles.iconButton, active && { backgroundColor: colors.light }, pressed && { opacity: 0.65 }, style]}><Icon name={icon} color={active ? colors.green : colors.ink} /></Pressable>; }
export function Panel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) { return <View style={[styles.panel, style]}>{children}</View>; }
export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) { return <View style={[styles.row, style]}>{children}</View>; }
export function Field({ label, value, onChange, placeholder, multiline = false, keyboardType = 'default', maxLength = 5000, secure = false }: { label?: string; value: string; onChange: (value: string) => void; placeholder?: string; multiline?: boolean; keyboardType?: ComponentProps<typeof TextInput>['keyboardType']; maxLength?: number; secure?: boolean }) {
  return <View style={{ gap: 8 }}>
    {label && <Copy style={{ fontFamily: fonts.bold }}>{label}</Copy>}
    <TextInput accessibilityLabel={label || placeholder} style={[styles.field, multiline && { minHeight: 120, paddingTop: 13, textAlignVertical: 'top' }]} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.muted} multiline={multiline} keyboardType={keyboardType} maxLength={maxLength} secureTextEntry={secure} autoCapitalize={keyboardType === 'numeric' ? 'none' : 'sentences'} />
  </View>;
}
export function Chip({ children, icon, selected = false, onPress }: { children: ReactNode; icon?: IconName; selected?: boolean; onPress: () => void }) { return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.chip, selected && { backgroundColor: colors.forest, borderColor: colors.forest }]}>{icon && <Icon name={icon} size={16} color={selected ? colors.white : colors.ink} />}<Text style={[styles.chipText, selected && { color: colors.white }]}>{children}</Text></Pressable>; }
export function Check({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) { return <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked }} aria-checked={checked} onPress={onPress} style={styles.checkRow}><View style={[styles.checkbox, checked && { backgroundColor: colors.green, borderColor: colors.green }]}>{checked && <Icon name="check" size={14} color="white" />}</View><Copy>{label}</Copy></Pressable>; }
export function Badge({ children, tone = 'green' }: { children: ReactNode; tone?: 'green' | 'amber' | 'red' | 'neutral' }) {
  const variants = { green: [colors.green, '#e8f4e8'], amber: [colors.amber, colors.amberLight], red: [colors.red, colors.redLight], neutral: [colors.muted, colors.background] };
  const [color, backgroundColor] = variants[tone];
  return <View style={[styles.badge, { backgroundColor }]}><Icon name={tone === 'green' ? 'shield' : 'info'} size={13} color={color} /><Text style={[styles.badgeText, { color }]}>{children}</Text></View>;
}
export function Note({ children, warning = false }: { children: ReactNode; warning?: boolean }) { return <View style={[styles.note, warning && { backgroundColor: colors.amberLight }]}><Icon name="info" size={18} color={warning ? colors.amber : colors.green} /><Copy small muted style={{ flex: 1 }}>{children}</Copy></View>; }
export function Intro({ title, description, kicker }: { title: string; description: string; kicker: string }) { return <View style={{ gap: 10, marginBottom: 26 }}><Row><Icon name="feather" size={15} color={colors.green} /><Text style={styles.eyebrow}>{kicker}</Text></Row><Heading level={1}>{title}</Heading><Copy muted style={{ maxWidth: 760 }}>{description}</Copy></View>; }
export function Empty({ title, text, children }: { title: string; text: string; children?: ReactNode }) { return <View style={styles.empty}><Icon name="compass" size={38} color="#91a67a" /><Heading level={3}>{title}</Heading><Copy muted style={{ textAlign: 'center', maxWidth: 420 }}>{text}</Copy>{children}</View>; }
export function AnalysisResult({ analysis }: { analysis: Analysis }) { return <View style={[styles.analysis, analysis.status === 'review' && { backgroundColor: colors.amberLight }, analysis.status === 'non-vegan' && { backgroundColor: colors.redLight }]}><Row><Icon name={analysis.status === 'vegan' ? 'shield' : 'alert-circle'} color={analysis.status === 'vegan' ? colors.green : colors.amber} /><Heading level={3}>{analysis.label}</Heading></Row>{analysis.reasons.map((reason, index) => <Copy key={index}>• {reason}</Copy>)}<Copy small muted>{analysis.disclaimer || 'Orientación por reglas de texto; confirma la etiqueta completa con el fabricante.'}</Copy></View>; }
export function SurfaceModal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const { width, height } = useWindowDimensions();
  return <Modal transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent><View style={styles.backdrop}><Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Cerrar ventana" onPress={onClose} /><View accessibilityViewIsModal style={[styles.modal, { width: Math.min(width - 28, wide ? 800 : 640), maxHeight: height - 70 }]}><Row style={styles.modalHeader}><Heading style={{ flex: 1 }}>{title}</Heading><IconButton icon="x" label="Cerrar" onPress={onClose} /></Row><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalBody}>{children}</ScrollView></View></View></Modal>;
}

export const styles = StyleSheet.create({
  copy: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, color: colors.ink }, small: { fontSize: 13, lineHeight: 20 },
  heading: { fontFamily: fonts.heading, fontSize: 21, lineHeight: 29, color: colors.ink, letterSpacing: -0.5 },
  title: { fontFamily: fonts.display, fontSize: 32, lineHeight: 41, letterSpacing: -1 }, headingSmall: { fontSize: 17, lineHeight: 25 },
  button: { backgroundColor: colors.forest, paddingHorizontal: 17, paddingVertical: 12, borderRadius: 10, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.forest },
  secondary: { backgroundColor: colors.white, borderColor: colors.line }, danger: { backgroundColor: '#fff7f3', borderColor: '#efd7cd' },
  compact: { minHeight: 36, paddingHorizontal: 12, paddingVertical: 8 }, buttonText: { fontFamily: fonts.bold, fontSize: 14 },
  iconButton: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  panel: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 24, gap: 17, minWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  field: { fontFamily: fonts.regular, fontSize: 15, color: colors.ink, borderWidth: 1, borderColor: colors.line, backgroundColor: 'white', borderRadius: 10, paddingHorizontal: 13, paddingVertical: 11, minHeight: 46 },
  chip: { borderRadius: 10, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 42 },
  chipText: { fontFamily: fonts.medium, color: colors.ink, fontSize: 14 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 40 }, checkbox: { width: 21, height: 21, borderRadius: 5, borderWidth: 1.5, borderColor: '#bdcbb6', alignItems: 'center', justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 6 }, badgeText: { fontFamily: fonts.medium, fontSize: 12 },
  note: { flexDirection: 'row', gap: 10, backgroundColor: '#f0f5e9', padding: 15, borderRadius: 11, alignItems: 'flex-start' },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.4, color: colors.green },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#cbd9c2', padding: 32, borderRadius: 17, alignItems: 'center', justifyContent: 'center', gap: 14, minHeight: 230, backgroundColor: 'white' },
  analysis: { padding: 20, gap: 12, borderRadius: 13, backgroundColor: '#ecf5e7' },
  backdrop: { flex: 1, backgroundColor: '#0e2d25aa', alignItems: 'center', justifyContent: 'center' },
  modal: { backgroundColor: 'white', borderRadius: 20, overflow: 'hidden' }, modalHeader: { borderBottomWidth: 1, borderBottomColor: colors.line, padding: 20 }, modalBody: { padding: 23, gap: 18 },
});
