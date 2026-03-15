# Setup — O Eco de Aethelgard

## Fluxo rápido por sistema operacional

- **Windows:** foque no fluxo **Android** (passos de Android + `npx react-native run-android`).
- **macOS:** você pode seguir **Android** e/ou **iOS** (incluindo `pod install` e `npx react-native run-ios`).
- **Watchman:** recomendado no macOS; no Windows, normalmente não é necessário.

## Pré-requisitos rápidos

- `Node.js` 18+
- `npm` 9+
- `Git`

## 1. Criar o projeto React Native

```bash
npx @react-native-community/cli init EcoDeAethelgard
cd EcoDeAethelgard
```

Depois, copie os arquivos deste repositório para dentro do projeto criado:
- `App.js` → raiz do projeto (substitui o gerado)
- `src/` → raiz do projeto

## 2. Instalar dependências

```bash
npm install react-native-gesture-handler react-native-tts react-native-haptic-feedback
```

## 3. iOS — Instalar pods

> Este passo é apenas para **macOS/iOS**. Se você está no **Windows**, pule para os passos de Android.

```bash
cd ios && pod install && cd ..
```

## 4. Configurar o Gesture Handler

No arquivo `index.js` (raiz do projeto), a importação do gesture handler **deve ser a primeira linha**:

```javascript
import 'react-native-gesture-handler';  // ← PRIMEIRA LINHA
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
```

## 5. Configurar o Babel (se necessário)

Se usar Reanimated no futuro, adicione ao `babel.config.js`:

```javascript
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: ['react-native-reanimated/plugin'], // deve ser o último plugin
};
```

## 6. Permissões Android (react-native-tts)

No `android/app/src/main/AndroidManifest.xml`, verifique que existe:

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

O TTS usa o engine de síntese de voz do sistema — não requer permissão adicional.

## 7. Executar

> No **Windows**, use apenas os comandos de **Android** (`run-android`).

```bash
# iOS
npx react-native run-ios

# Android
npx react-native run-android
```

## 8. Modo Debug

O `App.js` ativa automaticamente o modo debug em desenvolvimento (`__DEV__`).
Neste modo, você verá:

- Os pontos capturados do gesto (dots verdes na tela)
- Painel com resultado, confiança, nº de vértices, circularidade
- Histórico das últimas 5 runas reconhecidas

Para desativar manualmente, altere `DEBUG_MODE` em `App.js`:

```javascript
const DEBUG_MODE = false;
```

## Estrutura dos arquivos

```
├── App.js                          # Entry point — renderiza GestureCanvas
├── src/
│   ├── components/
│   │   └── GestureCanvas.js        # Componente de captura de gestos + feedback
│   └── utils/
│       └── shapeRecognizer.js      # Motor matemático de reconhecimento
├── PLANEJAMENTO.md                 # Roteiro técnico da Vertical Slice
└── SETUP.md                        # Este arquivo
```

## Ajustar reconhecimento

Os limiares do reconhecedor estão em `src/utils/shapeRecognizer.js` no objeto `DEFAULT_CONFIG`. Os principais para calibrar:

| Parâmetro | Padrão | Efeito |
|---|---|---|
| `circularityThreshold` | 0.70 | ↓ aceita círculos mais imperfeitos |
| `cornerAngleThreshold` | 40° | ↓ detecta vértices menos pronunciados |
| `closureThreshold` | 0.20 | ↑ aceita formas menos "fechadas" |
| `lineMaxDeviation` | 0.20 | ↑ aceita linhas menos retas |
| `squareAspectRatioMin/Max` | 0.75–1.25 | parâmetro legado (não usado no modo atual de 4 runas) |

Também é possível passar overrides em runtime via prop `recognizerConfig` do `GestureCanvas`:

```jsx
<GestureCanvas
  recognizerConfig={{ circularityThreshold: 0.60 }}
  onShapeRecognized={handleShape}
/>
```