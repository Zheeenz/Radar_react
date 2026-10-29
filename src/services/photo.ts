import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export async function choosePhoto() {
  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error('Permite el acceso a fotos para adjuntar una etiqueta.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.65, allowsEditing: false, selectionLimit: 1 });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset.base64) throw new Error('No pudimos leer esta foto. Prueba con otra imagen.');
  const bytes = asset.base64.length * 3 / 4;
  if (bytes > 2 * 1024 * 1024) throw new Error('La foto supera 2 MB. Selecciona una versión más pequeña.');
  const mime = asset.base64.startsWith('/9j/') ? 'image/jpeg' : asset.base64.startsWith('iVBOR') ? 'image/png' : asset.base64.startsWith('UklGR') ? 'image/webp' : null;
  if (!mime) throw new Error('Usa una foto JPEG, PNG o WebP.');
  return `data:${mime};base64,${asset.base64}`;
}
