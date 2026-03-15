# O Eco de Aethelgard

Protótipo do motor de reconhecimento gestual para um jogo de aventura sonora para cegos, desenvolvido em React Native.

O jogador desenha glifos alfanuméricos na tela (Número 0, Número 1, Número 7, Letra V, Letra L, Letra T) e recebe feedback por áudio (TTS) e vibração (haptics). Nenhuma informação depende da tela — tudo é comunicado por som e toque.

---

## O que esperar ao abrir o app agora

Este protótipo implementa o **motor de reconhecimento de gestos** — a fundação técnica sobre a qual o jogo será construído. Ele ainda não contém cenas, narração, paisagens sonoras ou a história de Elara Voss. O que existe até o momento é o componente que prova que a mecânica central funciona.

Ao abrir o app no celular, você vai encontrar:

- **Uma tela escura quase totalmente preta.** Isso é intencional — o jogo foi projetado para cegos, então a tela não comunica nada. Há apenas um texto quase invisível ("Desenhe uma forma com o dedo") que serve de referência visual para desenvolvedores.
- **Ao tocar e arrastar o dedo pela tela,** o celular vibra levemente a cada punhado de pontos capturados, confirmando pelo tato que o traço está sendo registrado.
- **Ao levantar o dedo,** o motor analisa o traço e três coisas acontecem simultaneamente:
  1. O celular **vibra** com um padrão de sucesso (se reconheceu) ou de aviso (se não reconheceu).
  2. Uma **voz sintetizada** em português fala o resultado: *"Identificado: Número 0"*, *"Identificado: Letra V"*, ou *"Gesto não reconhecido"*.
  3. Em modo de desenvolvimento, um **painel de debug** aparece na parte inferior da tela mostrando a forma detectada, o percentual de confiança, a circularidade do traço, o número de vértices encontrados e se o traço foi considerado fechado. No canto superior direito, um **histórico** lista as últimas formas reconhecidas.

Os 6 glifos que o motor reconhece atualmente são: **Número 0**, **Número 1**, **Número 7**, **Letra V**, **Letra L** e **Letra T**. Eles funcionam como runas de entrada definidas no design do jogo completo (`PLANEJAMENTO.md`), onde cada uma terá um significado narrativo (ativar mecanismos, ecolocalizar, abrir passagens, etc.).

**O que ainda não está implementado:** sistema de cenas, narração com voz IA, áudio binaural/HRTF, paisagens sonoras ambientais, padrões de haptics avançados (heartbeat, ritual_rhythm), state machine do jogo e o fluxo narrativo da Vertical Slice. Esses componentes serão construídos sobre este motor.

---

## Fluxo rápido por sistema operacional

- **Windows:** foque no fluxo **Android** (passos de Android + `npx react-native run-android`).
- **macOS:** você pode seguir **Android** e/ou **iOS** (incluindo `pod install` e `npx react-native run-ios`).
- **Watchman:** recomendado no macOS; no Windows, normalmente não é necessário.

---

## Pré-requisitos

Antes de começar, verifique que você tem as ferramentas abaixo instaladas. Abra o terminal e rode cada comando para confirmar.

### Obrigatório para qualquer plataforma

| Ferramenta | Versão mínima | Como verificar | Como instalar |
|---|---|---|---|
| **Node.js** | 18+ | `node --version` | https://nodejs.org (LTS) |
| **npm** | 9+ | `npm --version` | Vem com o Node.js |
| **Git** | qualquer | `git --version` | https://git-scm.com/downloads |

> **Watchman:** recomendado no **macOS** para melhorar a detecção de mudanças de arquivos no React Native (`brew install watchman`). No **Windows**, normalmente não é necessário.

### Para testar no iOS (macOS obrigatório)

| Ferramenta | Versão mínima | Como verificar | Como instalar |
|---|---|---|---|
| **Xcode** | 15+ | `xcodebuild -version` | Mac App Store |
| **Command Line Tools** | — | `xcode-select -p` | `xcode-select --install` |
| **CocoaPods** | 1.14+ | `pod --version` | `sudo gem install cocoapods` |
| **Simulador iOS** | — | Abra Xcode → Settings → Platforms | Dentro do Xcode, baixe o runtime desejado |

### Para testar no Android

| Ferramenta | Versão mínima | Como verificar | Como instalar |
|---|---|---|---|
| **JDK** | 17 | `java -version` | Android Studio (JDK embutido) ou https://adoptium.net/temurin/releases/?version=17 |
| **Android Studio** | Hedgehog+ | Abra o app | https://developer.android.com/studio |
| **Android SDK** | API 34+ | Android Studio → Settings → SDK Manager | Dentro do Android Studio |
| **Emulador ou dispositivo** | — | `adb devices` | Android Studio → Device Manager → Create Device |

> **Dica:** Se quiser testar apenas em **uma** plataforma, instale apenas os pré-requisitos dela. Não é necessário ter iOS e Android ao mesmo tempo.

---

## Passo a passo completo

### Passo 1 — Clonar ou abrir este repositório

Se o projeto já está na sua máquina, abra o terminal na pasta dele:

```bash
cd /caminho/para/o-eco-de-aethelgard
```

Verifique que os arquivos de código-fonte existem:

```bash
ls App.js src/utils/shapeRecognizer.js src/components/GestureCanvas.js
```

Você deve ver os três arquivos listados sem erro.

---

### Passo 2 — Criar o projeto React Native

O repositório contém apenas o código-fonte do protótipo. Você precisa gerar a estrutura completa do React Native (pastas `ios/`, `android/`, `node_modules/`, etc.) usando o CLI oficial.

Crie o projeto em uma pasta temporária:

```bash
npx @react-native-community/cli init EcoDeAethelgard --skip-git-init
```

> Se o CLI perguntar qual template usar, aceite o padrão (react-native-template).

Aguarde o processo terminar. Ele vai criar a pasta `EcoDeAethelgard/` com toda a estrutura.

---

### Passo 3 — Copiar os arquivos do protótipo para o projeto

Substitua o `App.js` gerado pelo nosso e copie a pasta `src/`:

```bash
# Substituir o App.js gerado pelo nosso
cp App.js EcoDeAethelgard/App.js

# Copiar a pasta src/ com o motor e o componente
cp -r src/ EcoDeAethelgard/src/

# Copiar os documentos de referência (opcional)
cp PLANEJAMENTO.md EcoDeAethelgard/
cp SETUP.md EcoDeAethelgard/
cp README.md EcoDeAethelgard/
```

Entre na pasta do projeto criado. **Todos os comandos a partir daqui devem ser executados de dentro dela:**

```bash
cd EcoDeAethelgard
```

---

### Passo 4 — Instalar as dependências do protótipo

```bash
npm install react-native-gesture-handler react-native-tts react-native-haptic-feedback
```

Verifique que foram instaladas:

```bash
ls node_modules/react-native-gesture-handler node_modules/react-native-tts node_modules/react-native-haptic-feedback
```

Os três diretórios devem existir.

---

### Passo 5 — Configurar o Gesture Handler no entry point

O `react-native-gesture-handler` exige que sua importação seja a **primeira linha** do arquivo de entrada. Abra o `index.js` na raiz do projeto e substitua o conteúdo por:

```javascript
import 'react-native-gesture-handler'; // DEVE ser a primeira linha
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
```

> Se estiver usando um editor como VS Code, abra o arquivo com `code index.js`.
> Se preferir o terminal: `nano index.js` ou `vim index.js`.

---

### Passo 6A — Configuração iOS (somente macOS)

> Se você está no **Windows**, pule para o **Passo 6B (Android)**.

#### 6A.1 Instalar os pods nativos

```bash
cd ios && pod install && cd ..
```

Se o `pod install` falhar com erro de versão do Ruby ou CocoaPods:

```bash
# Atualizar CocoaPods
sudo gem install cocoapods

# Tentar novamente
cd ios && pod install && cd ..
```

#### 6A.2 Rodar no simulador iOS

```bash
npx react-native run-ios
```

O Metro Bundler vai abrir em uma janela do terminal e o simulador do iPhone vai iniciar automaticamente.

> **Primeira execução:** a build leva mais tempo (compilação nativa). As seguintes são mais rápidas.

#### 6A.3 Rodar em um iPhone físico

1. Abra o arquivo `ios/EcoDeAethelgard.xcworkspace` no Xcode (use o `.xcworkspace`, **não** o `.xcodeproj`)
2. Conecte o iPhone via cabo USB
3. No Xcode, selecione seu iPhone como destino no dropdown de dispositivos (topo da janela)
4. Menu Xcode → **Signing & Capabilities**: selecione seu Apple ID como Team (uma conta gratuita funciona)
5. Clique no botão Play (ou `Cmd + R`)
6. Na primeira vez, o iPhone vai pedir que você confie no desenvolvedor: **Ajustes → Geral → Gerenciamento de Dispositivo → confiar**

> **Haptics e TTS funcionam melhor em dispositivo físico.** O simulador não tem motor de vibração e o TTS pode ter comportamento diferente.

---

### Passo 6B — Configuração Android

#### 6B.1 Configurar a variável JAVA_HOME (se ainda não fez)

No **macOS/Linux**, adicione ao seu `~/.zshrc` (ou `~/.bashrc`):

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
```

Depois recarregue:

```bash
source ~/.zshrc
```

No **Windows**, configure `JAVA_HOME` nas Variáveis de Ambiente do sistema apontando para o JDK 17 (ou para o JDK embutido do Android Studio).

#### 6B.2 Configurar a variável ANDROID_HOME

No **macOS/Linux**, adicione ao seu `~/.zshrc`:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

Depois recarregue:

```bash
source ~/.zshrc
```

No **Windows**, configure `ANDROID_HOME` para `%LOCALAPPDATA%\Android\Sdk` e adicione `platform-tools` ao `Path`.

#### 6B.3 Criar um emulador (se não tiver)

1. Abra o **Android Studio**
2. Vá em **Device Manager** (ícone de telefone na barra lateral direita)
3. Clique em **Create Device**
4. Escolha um modelo (recomendado: **Pixel 7**)
5. Selecione uma imagem do sistema (recomendado: **API 34**, clique em Download se necessário)
6. Finalize a criação e clique no botão **Play** para iniciar o emulador

#### 6B.4 Rodar no emulador Android

Com o emulador rodando (verifique com `adb devices`):

```bash
npx react-native run-android
```

#### 6B.5 Rodar em um dispositivo Android físico

1. No celular, ative as **Opções do Desenvolvedor**: Configurações → Sobre o telefone → toque 7 vezes em "Número da versão"
2. Dentro de Opções do Desenvolvedor, ative **Depuração USB**
3. Conecte o celular via cabo USB
4. Autorize a conexão quando o popup aparecer no celular
5. Verifique que aparece: `adb devices` deve listar o dispositivo
6. Rode:

```bash
npx react-native run-android
```

---

### Passo 7 — Verificar que está funcionando

Quando o app abrir, você deve ver:

1. **Tela preta** com o texto sutil "Desenhe uma forma com o dedo" (texto quase transparente — lembre-se, o jogo é para cegos, a tela é propositalmente escura)
2. **Desenhe o número 0** com o dedo na tela
3. Você deve receber:
   - **Pontos verdes** aparecendo no traço do seu dedo (modo debug ativo em dev)
   - **Vibração leve** a cada ~12 pontos durante o traço
  - Ao soltar o dedo: **vibração de sucesso** + voz falando **"Identificado: Número 0"**
   - **Painel na parte inferior** mostrando: forma reconhecida, confiança %, circularidade, etc.
   - **Painel no canto superior direito** com o histórico das últimas formas

### Glifos para testar

| Glifo | Como desenhar | O que esperar ouvir |
|---|---|---|
| Número 0 | Traço circular, terminar perto de onde começou | "Identificado: Número 0" |
| Número 1 | Traço reto de cima para baixo (ou inverso) | "Identificado: Número 1" |
| Número 7 | Barra superior + diagonal descendente | "Identificado: Número 7" |
| Letra V | 2 traços diagonais formando um V aberto | "Identificado: Letra V" |
| Letra L | Traço em ângulo reto aberto | "Identificado: Letra L" |
| Letra T | Barra superior com haste no centro | "Identificado: Letra T" |

> Se ouvir "Gesto não reconhecido", tente desenhar a forma com mais definição (traço mais lento e deliberado). O painel de debug mostra as métricas — use-as para entender por que o reconhecimento falhou.

---

## Testando sem ver a tela (teste de acessibilidade)

Para simular a experiência do público-alvo:

1. Coloque **fones de ouvido**
2. **Feche os olhos** (ou vire o celular de cabeça para baixo)
3. Desenhe os glifos apenas pelo tato
4. Ouça o feedback de voz e sinta as vibrações
5. Anote se conseguiu entender o que o app comunicou sem precisar olhar

Este é o teste mais importante para validar o conceito do jogo.

---

## Troubleshooting

### "Command not found: npx"

Node.js não está instalado ou não está no PATH.

```bash
# Instale o Node.js LTS em qualquer plataforma
# https://nodejs.org
```

### "error: Could not find iPhone simulator"

Nenhum simulador iOS está instalado.

```bash
# Abra o Xcode → Settings → Platforms → instale um iOS Simulator Runtime
# Depois tente novamente
npx react-native run-ios
```

Ou especifique um simulador:

```bash
npx react-native run-ios --simulator="iPhone 15"
```

### "BUILD FAILED" no iOS (signing)

O projeto precisa de um Team de assinatura.

1. Abra `ios/EcoDeAethelgard.xcworkspace` no Xcode
2. Selecione o target **EcoDeAethelgard** na barra lateral
3. Aba **Signing & Capabilities**
4. Marque **Automatically manage signing**
5. Selecione seu Apple ID como Team

### Pod install falha com "CDN: trunk URL couldn't be downloaded"

Problema de rede com o repositório de specs do CocoaPods.

```bash
cd ios
pod repo update
pod install
cd ..
```

### "Unable to load script" / Metro não conecta (Android)

O Metro Bundler não está alcançando o dispositivo/emulador.

```bash
# Para emulador — redirecionar a porta
adb reverse tcp:8081 tcp:8081

# Reiniciar o Metro
npx react-native start --reset-cache
```

### TTS não fala nada

- **Simulador iOS:** O TTS funciona mas pode ser silencioso. Verifique o volume do simulador (Hardware → Audio).
- **Emulador Android:** Precisa ter um engine TTS instalado. A maioria das imagens com Google Play Services já tem.
- **Dispositivo físico:** Verifique que o idioma Português está disponível em Configurações → Acessibilidade → Texto para fala.

### Haptics não vibram

- Haptics **não funcionam no simulador iOS** nem no **emulador Android**. Esse feedback só pode ser testado em **dispositivo físico**.
- No Android, verifique que a vibração não está desativada nas configurações do aparelho.

### "Invariant Violation: requireNativeComponent: 'RNGestureHandlerRootView' was not found"

O `react-native-gesture-handler` não foi linkado corretamente.

```bash
# iOS
cd ios && pod install && cd ..

# Android — rebuild
npx react-native run-android
```

Verifique também que a **primeira linha** do `index.js` é:

```javascript
import 'react-native-gesture-handler';
```

### O reconhecimento está errando muitas formas

Os limiares podem ser ajustados no arquivo `src/utils/shapeRecognizer.js`, objeto `DEFAULT_CONFIG`. Consulte o arquivo `SETUP.md` para a tabela completa de parâmetros.

---

## Estrutura dos arquivos

```
o-eco-de-aethelgard/
├── App.js                          # Entry point — renderiza GestureCanvas + histórico
├── src/
│   ├── components/
│   │   └── GestureCanvas.js        # Captura de gestos + TTS + Haptics
│   └── utils/
│       └── shapeRecognizer.js      # Motor matemático de reconhecimento de formas
├── PLANEJAMENTO.md                 # Roteiro técnico completo da Vertical Slice
├── SETUP.md                       # Referência de configuração e calibração
└── README.md                       # Este arquivo
```

## Próximos passos

Este protótipo valida o **motor de reconhecimento de gestos**. Para evoluir para a Vertical Slice completa descrita no `PLANEJAMENTO.md`, os próximos componentes a implementar são:

1. **Sistema de áudio binaural** — espacialização 3D de sons (HRTF)
2. **State machine de cenas** — fluxo Cena 0 a 7 com XState ou Zustand
3. **Padrões de haptics avançados** — heartbeat, ritual_rhythm, wave_sweep
4. **Narração por voz IA** — gravação ou síntese das falas da narradora
5. **Paisagens sonoras** — ambientes de caverna, câmara, campo aberto

