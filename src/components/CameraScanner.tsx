import { useRef, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Linking, View } from 'react-native';
import { Button, Copy, Icon, Note } from './ui';
import { colors } from '../theme';

export function CameraScanner({ onScan, onClose }: { onScan: (code: string) => void; onClose: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraError, setCameraError] = useState('');
  const scanned = useRef(false);
  if (cameraError) return <><Note warning>{cameraError}</Note><Button secondary onPress={onClose}>Ingresar código manualmente</Button></>;
  if (!permission?.granted) return <View style={{ gap: 17, alignItems: 'center', padding: 20 }}><Icon name="camera" size={40} color={colors.green} /><Copy style={{ textAlign: 'center' }}>Usa la cámara para leer el código de barras de un producto. También puedes escribir el código en el verificador.</Copy>{permission?.canAskAgain !== false ? <Button icon="camera" onPress={async () => { try { await requestPermission(); } catch { setCameraError('No pudimos abrir la cámara en este dispositivo.'); } }}>Permitir cámara</Button> : <><Note warning>El permiso está desactivado. Actívalo en los ajustes del dispositivo o usa el ingreso manual.</Note><Button secondary onPress={async () => { try { await Linking.openSettings(); } catch { setCameraError('Abre los ajustes de permisos de tu dispositivo o navegador.'); } }}>Abrir ajustes</Button></>}</View>;
  return <View style={{ gap: 14 }}><View style={{ height: 330, borderRadius: 14, overflow: 'hidden' }}><CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'] }} onMountError={() => setCameraError('La cámara no está disponible. Puedes escribir el código manualmente.')} onBarcodeScanned={({ data }) => { if (!scanned.current && /^\d{8,14}$/.test(data)) { scanned.current = true; onScan(data); } }} /><View pointerEvents="none" style={{ position: 'absolute', top: '30%', left: '12%', right: '12%', height: 120, borderWidth: 2, borderColor: colors.lime, borderRadius: 12 }} /></View><Copy small muted>Coloca el código de barras dentro del recuadro. Solo se consultan productos del catálogo.</Copy><Button secondary onPress={onClose}>Usar código manual</Button></View>;
}
