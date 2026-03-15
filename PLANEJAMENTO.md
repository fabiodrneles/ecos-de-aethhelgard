# O Eco de Aethelgard — Roteiro Técnico da Vertical Slice

> **Documento de Game Design — Vertical Slice (Demo para Investidores)**
> **Gênero:** Mistério / Aventura Sonora para Cegos
> **Plataforma:** Mobile (React Native)
> **Mecânica Central:** Desenho gestual de formas geométricas
> **Feedback:** 100% áudio binaural + haptics
> **Tom:** Misterioso, imersivo, profissional

---

## 1. Visão Geral

### 1.1 Premissa Narrativa

O jogador é **Elara Voss**, uma arqueóloga que perdeu a visão em um acidente de escavação há dois anos. Após receber uma carta anônima com coordenadas de uma tumba não catalogada em **Aethelgard** (Islândia), ela descobre que este lugar responde ao toque — cada forma desenhada no ar ressoa de volta como som. A tumba não foi feita para ser vista. Foi feita para ser **ouvida**.

### 1.2 Conceito da Vertical Slice

A demo cobre **uma sessão completa de ~8-12 minutos** dividida em **7 cenas** que demonstram:

- Onboarding acessível sem dependência visual
- Mecânica de reconhecimento de gestos (6 glifos rúnicos)
- Áudio binaural 3D como sistema de navegação
- Haptics como canal de feedback complementar
- Arco narrativo com início, tensão e clímax
- Viabilidade técnica em React Native

### 1.3 Glifos Rúnicos — Tabela de Referência

| Glifo            | Gesto                                    | Significado no Jogo                                                 | Tolerância de Reconhecimento   |
| ---------------- | ---------------------------------------- | ------------------------------------------------------------------- | ------------------------------- |
| Número 0        | Traço circular (qualquer direção)     | **Ativação / Despertar** — acende mecanismos antigos       | ~70% de circularidade           |
| Letra V         | 2 traços diagonais formando um V aberto | **Ecolocalização** — revela o ambiente sonoro ao redor     | padrão em V detectado          |
| Número 1        | Traço reto vertical                     | **Invocar / Canalizar** — ativa colunas e focos de energia  | Linha vertical dominante         |
| Número 7        | Barra superior + diagonal               | **Direcionar / Cortar** — aponta rotas e abre travas         | padrão angular de 7 detectado   |
| Letra L         | Ângulo reto aberto                      | **Destravar / Revelar** — libera inscrições e passagens      | padrão em L com canto forte     |
| Letra T         | Barra superior + haste central          | **Selar / Harmonizar** — fecha ciclos e estabiliza mecanismos | fase 2 (multi-traço)           |

---

## 2. Especificação Técnica de Áudio

### 2.1 Áudio Binaural — Canais

| Canal                            | Uso                                                             |
| -------------------------------- | --------------------------------------------------------------- |
| **Centro**                 | Narração da voz IA (Elara interna ou Guia da Tumba)           |
| **Esquerda/Direita**       | Paisagem sonora posicional — indica direção de elementos     |
| **360° HRTF**             | Ecolocalização — sons que "mapeiam" o ambiente em 3D         |
| **Sub-bass (haptic sync)** | Frequências baixas sincronizadas com vibração do dispositivo |

### 2.2 Padrões de Haptics

| Nome do Padrão   | Descrição                                             | Uso                                        |
| ----------------- | ------------------------------------------------------- | ------------------------------------------ |
| `pulse_confirm` | 1 vibração curta e firme (100ms)                      | Forma reconhecida com sucesso              |
| `double_tap`    | 2 vibrações rápidas (50ms + 50ms)                    | Transição de cena                        |
| `warning_buzz`  | 3 vibrações crescentes (50ms, 100ms, 150ms)           | Forma incorreta / perigo                   |
| `heartbeat`     | Pulsação rítmica contínua (thump-thump...pausa)     | Tensão narrativa, proximidade de entidade |
| `wave_sweep`    | Vibração que cresce e decresce suavemente (500ms)     | Ecolocalização retornando                |
| `ritual_rhythm` | Padrão complexo sincronizado com BPM da cena           | Portal rítmico (clímax)                  |
| `stone_shift`   | Vibração pesada e arrastada (300ms, intensidade alta) | Mecanismos de pedra se movendo             |

---

## 3. Roteiro Cena a Cena

---

### CENA 0 — Tela de Título e Onboarding de Acessibilidade

**Duração estimada:** ~1 minuto

| Aspecto                             | Detalhe                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Narração (Voz IA)**       | *"Bem-vindo a O Eco de Aethelgard."* (pausa 1s) *"Este jogo foi feito para ser ouvido e sentido. Você não precisa ver nada. Toque em qualquer lugar da tela para começar."* (pausa) Ao tocar: *"Perfeito. Use fones de ouvido para a experiência completa. O som vai guiá-lo. A vibração do seu aparelho vai confirmá-lo. Toque novamente para entrar na tumba."* |
| **Paisagem Sonora**           | Silêncio absoluto inicial → ao primeiro toque, um tom grave ressonante (tipo sino tibetano) que se expande em reverb longo. Vento distante entra suavemente ao fundo.                                                                                                                                                                                                         |
| **Ação do Jogador**         | Toque simples (tap) na tela — 2 vezes.                                                                                                                                                                                                                                                                                                                                         |
| **Feedback de Áudio/Haptic** | 1o toque:`pulse_confirm` + som de ressonância metálica. 2o toque: `double_tap` + som de porta de pedra começando a abrir.                                                                                                                                                                                                                                                |
| **Condição de Vitória**    | Segundo toque registrado → fade para Cena 1.                                                                                                                                                                                                                                                                                                                                   |

**Notas de implementação:**

- Detectar se VoiceOver/TalkBack está ativo; se sim, adaptar instruções para não conflitar
- O tap não exige posição específica — toda a tela é área ativa
- Verificar conexão de fones via `AudioSession` e sugerir uso se não detectados

---

### CENA 1 — A Descida (Introdução Narrativa)

**Duração estimada:** ~1.5 minutos

| Aspecto                             | Detalhe                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Narração (Voz IA)**       | *"Seus pés encontram degraus de pedra. O ar muda — fica pesado, úmido, antigo. Você é Elara Voss. Há dois anos, o mundo ficou escuro para você. Mas aqui... aqui o escuro fala de volta."* (pausa 2s) *"Você desce. Cada passo ecoa mais fundo. O chão se nivela. Você chegou a uma câmara. Há algo no centro — você sente o ar vibrar ao redor de um objeto. Estenda a mão. Desenhe o número 0 na tela, devagar, como se estivesse contornando o que está à sua frente."* |
| **Paisagem Sonora**           | Passos em pedra molhada (com reverb crescente a cada passo, simulando descida). Gotejar d'água esporádico (espacializado: gotas à esquerda, eco à direita). Ressonância sub-grave contínua que cresce sutilmente ("o pulso da tumba"). Ao nivelar: o reverb muda para câmara ampla. Som tonal suave vindo do centro (pan 0°).                                                                                                                                                            |
| **Ação do Jogador**         | Desenhar o **Número 0** na tela.                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Feedback de Áudio/Haptic** | **Acerto:** `pulse_confirm` + som de ativação (como cristal ressoando em frequência crescente). A ressonância sub-grave responde — o "pulso da tumba" sincroniza com o gesto. **Traço parcial:** vibração suave contínua enquanto desenha, indicando "está no caminho". **Erro (forma não reconhecida):** `warning_buzz` + som de pedra raspando (curto). Narração: *"Não foi isso. Sinta o ar. Feche o traço como um zero."*              |
| **Condição de Vitória**    | Número 0 reconhecido com ≥70% de circularidade → som de ativação + transição para Cena 2.                                                                                                                                                                                                                                                                                                                                                                                                  |

**Notas de implementação:**

- Feedback tátil contínuo durante o traço (vibração proporcional à "qualidade" do gesto)
- Máximo de 5 tentativas antes de oferecer: *"Posso guiar seu dedo? Deslize e eu aviso quando virar."*
- Guardar dados de tentativa para analytics (tempo, número de tentativas, acurácia)

---

### CENA 2 — Tutorial da Letra V (Ecolocalização)

**Duração estimada:** ~2 minutos

| Aspecto                             | Detalhe                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Narração (Voz IA)**       | *"O objeto que você tocou... é uma pedra orbital. Ela gira lentamente agora, emitindo um som. Mas a câmara é grande. Você não sabe o que há ao redor."* (pausa 1.5s) *"Existe um gesto que os antigos usavam para 'ver' com som. A letra V. Um impulso aberto, dois braços e um foco. Desenhe a letra V na tela. Ela vai enviar sua voz para as paredes... e o que voltar vai dizer o que está ao redor."*                                                                                                                                                                                                                                        |
| **Paisagem Sonora**           | Pedra orbital: som tonal rotativo (pan automatizado 360° lento). Câmara silenciosa com reverb longo. Microdetalhes: rangido distante de correntes, respiração da personagem.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Ação do Jogador**         | Desenhar uma **Letra V** na tela.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Feedback de Áudio/Haptic** | **Acerto:** `wave_sweep` (haptic). Áudio: um pulso sonoro é emitido do centro e viaja em 3 direções (esquerda, direita, frente) usando HRTF binaural. Cada eco retorna com informação: — *Esquerda:* eco curto e duro → "parede próxima" — *Direita:* eco longo e suave → "espaço aberto, corredor" — *Frente:* eco com ressonância metálica → "algo metálico, uma porta?" Narração pós-eco: *"Você ouviu? À direita, um corredor. À frente, algo de metal. À esquerda, parede sólida. A tumba está respondendo."* **Erro:** `warning_buzz`. *"Faça um V bem definido. Dois traços diagonais, aberto no topo."* |
| **Condição de Vitória**    | Letra V reconhecida (padrão em V detectado) → ecolocalização executada → transição para Cena 3.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

**Notas de implementação:**

- A ecolocalização é o diferencial do jogo — investir em qualidade do áudio HRTF
- Cada direção deve ter assinatura sonora distinta (frequência, decay, timbre)
- Variação sutil a cada uso (não repetir exatamente o mesmo som para evitar fadiga)

---

### CENA 3 — O Corredor das Inscrições

**Duração estimada:** ~2 minutos

| Aspecto                             | Detalhe                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Narração (Voz IA)**       | *"Você segue para a direita. O corredor é estreito — as paredes quase tocam seus ombros. Seus dedos deslizam pela pedra... há sulcos. Inscrições. Mas estas não foram feitas para olhos."* (pausa) *"Uma voz antiga sussurra das paredes, mas está presa. Desenhe a letra L — como quem vira uma chave de pedra. Liberte a voz."*                                                                                 |
| **Paisagem Sonora**           | Corredor estreito: reverb curto e apertado. Passos ecoam rapidamente. Sussurros incompreensíveis (vozes sobrepostas, filtro passa-baixa). Vento passando por frestas (espacializado acima). Ao desenhar a linha: os sussurros ganham clareza gradualmente.                                                                                                                                                                                |
| **Ação do Jogador**         | Desenhar uma **Letra L** na tela.                                                                                                                                                                                                                                                                                                                                                                                            |
| **Feedback de Áudio/Haptic** | **Acerto:** `stone_shift` (haptic). Som de pedra deslizando/abrindo. Os sussurros se tornam uma voz clara: *"(Voz Antiga, grave, com reverb) Aquele que desenha no escuro... será guiado pelo eco. A porta à frente exige três glifos em sequência. Erre... e a tumba esquece seu nome."* **Erro:** `warning_buzz`. *"Faça um L claro: um traço e uma dobra."* |
| **Condição de Vitória**    | Letra L reconhecida → inscrição liberada → voz antiga entrega a dica para a Cena 4.                                                                                                                                                                                                                                                                                                                                           |

**Notas de implementação:**

- A voz antiga deve ter processamento distinto da narradora (mais grave, reverb de caverna, leve distorção)
- Os sussurros pré-abertura devem ser inquietantes mas não assustadores (tom misterioso, não horror)
- Inscrição é o primeiro "lore drop" — estabelece as regras do mundo

---

### CENA 4 — A Porta dos Três Selos (Puzzle Central)

**Duração estimada:** ~2.5 minutos

| Aspecto                             | Detalhe                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Narração (Voz IA)**       | *"O corredor termina. Diante de você, uma porta que não é feita de madeira ou ferro. É feita de som. Você sente três depressões na superfície — três glifos vazios esperando serem preenchidos."* (pausa) *"A voz disse: três glifos em sequência. Ouça a porta. Ela vai dizer o que precisa."* A porta emite 3 tons em sequência: 1. Tom circular (onda senoidal suave, contínua) 2. Tom vertical (onda quadrada, impulso ascendente) 3. Tom angular estabilizado (duas frequências em harmonia estável) Narração: *"Você ouviu? Zero... um... e sete. Dê à porta o que ela pede. Primeiro: o zero."*                                                                                                                           |
| **Paisagem Sonora**           | Câmara intermediária: reverb médio. A porta emite um zumbido constante (drone em Dó menor). As três depressões emitem seus tons individualmente quando o jogador "passa o dedo" sobre elas (dividindo a tela em 3 zonas horizontais: topo, meio, base).`heartbeat` haptic começa sutil — indicando tensão.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Ação do Jogador**         | Desenhar os 3 glifos **na ordem correta**: 1. **Número 0** (tom redondo) 2. **Número 1** (impulso ascendente) 3. **Número 7** (harmonia angular)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Feedback de Áudio/Haptic** | **Acerto (cada forma):** `pulse_confirm` + o tom correspondente da porta resoa e "encaixa" (som de selo se fechando, como pedra em encaixe perfeito). A depressão correspondente para de emitir seu tom individual. `heartbeat` desacelera a cada acerto (tensão diminuindo). **Sequência completa:** `stone_shift` prolongado. Som massivo de porta ressoando, mecanismos girando, ar sendo liberado. *"A porta reconhece você. O selo está aberto."* **Erro de forma:** `warning_buzz` + tom dissonante curto. *"Não. Ouça novamente."* (A porta repete o tom da forma esperada). **Erro de ordem:** `warning_buzz` × 2. *"A sequência importa. Ouça desde o início."* (Os 3 tons são repetidos na ordem correta). |
| **Condição de Vitória**    | 3 formas corretas na ordem correta → porta abre → transição para Cena 5.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

**Notas de implementação:**

- Cada glifo tem um "tom assinatura" consistente em todo o jogo (aprendizado por associação)
- A tela dividida em 3 zonas (topo/meio/base) permite exploração tátil — cada zona emite preview do tom ao ser tocada (sem desenhar)
- Máximo 3 tentativas de sequência completa antes de assistência: *"Eu vou sussurrar a ordem. Primeiro... zero."*
- Registrar tempo de resolução do puzzle para calibrar dificuldade futura

---

### CENA 5 — A Câmara do Eco (Clímax)

**Duração estimada:** ~2.5 minutos

| Aspecto                             | Detalhe                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Narração (Voz IA)**       | *"O ar muda. Este espaço é vasto — seu eco demora a voltar. Você está na Câmara do Eco. No centro, o chão pulsa. Não é seu coração. É algo mais antigo."* (pausa 2s) *"Um portal. Adormecido há milênios. Ele não abre com chave. Abre com ritmo. Você sente a pulsação? (haptic: `heartbeat` sincronizado) Ela tem um padrão. Sinta... e repita."* O portal emite um padrão rítmico: **BUM - bum - BUM - BUM - bum** (pausa) *"Mas antes de despertar o portal... você precisa ver esta câmara. Desenhe a letra V. Deixe o eco mostrar o que há aqui."*                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Paisagem Sonora**           | Câmara colossal: reverb de 6-8 segundos de cauda. Ressonâncias sub-graves profundas. O portal: pulsação rítmica constante (kick drum processado + sub-bass). Detalhes sonoros posicionados em 360°: correntes à esquerda, água escorrendo à direita, vento vindo de cima, e algo respirando atrás (espacializado em 180°).`heartbeat` haptic sincronizado com a pulsação do portal.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Ação do Jogador**         | **Fase A:** Desenhar uma **Letra V** (ecolocalização da câmara). **Fase B:** Desenhar o **padrão rítmico** do portal usando glifos: — BUM = **Número 1** (impulso forte, descendente) — bum = **Número 0** (ativação suave) Sequência: **1 - 0 - 1 - 1 - 0**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Feedback de Áudio/Haptic** | **Fase A — Letra V (Ecolocalização):** `wave_sweep`. O eco retorna revelando a câmara: — *Frente:* Portal pulsante (frequência dominante) — *Esquerda:* Abismo (eco que não retorna — silêncio) — *Direita:* Parede com mecanismo (eco metálico rápido) — *Atrás:* Algo vivo? (eco distorcido, irregular — entidade?) Narração: *"O portal está à frente. Mas... há algo atrás de você. Não se vire. Foque no ritmo."* **Fase B — Sequência Rítmica:** Cada forma correta no tempo certo: `ritual_rhythm` (haptic sync) + tom do portal respondendo (a frequência sobe a cada acerto). A pulsação do portal acelera — `heartbeat` haptic acelera junto. **Erro de ritmo/forma:** Tom grave de rejeição. A "coisa atrás" se move mais perto (áudio binaural: som irregular atrás se aproxima). `warning_buzz`. *"O ritmo se perdeu. Sinta a pulsação. Tente novamente."* **Sequência completa (5/5):** Silêncio abrupto — 2 segundos. Depois: EXPLOSÃO sonora controlada — o portal abre com onda de som que viaja do centro para 360° (sweep binaural completo). `ritual_rhythm` prolongado (haptic forte e satisfatório). O som estabiliza em um acorde maior ressonante (resolução harmônica). |
| **Condição de Vitória**    | Letra V + sequência rítmica 1-0-1-1-0 completa → portal ativado → transição para Cena 6.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

**Notas de implementação:**

- A sequência rítmica deve ter **janela de tempo** (±300ms do beat) — não exigir precisão de músico
- O `heartbeat` haptic é o metrônomo tátil — jogador pode se guiar por ele
- A entidade atrás é sugerida apenas por áudio — nunca revelada (gancho para o jogo completo)
- A abertura do portal é o **money shot** da demo — investir em design de som cinematográfico
- BPM sugerido: 90 (acessível, não muito rápido)

---

### CENA 6 — O Outro Lado (Encerramento e Gancho)

**Duração estimada:** ~1.5 minutos

| Aspecto                             | Detalhe                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Narração (Voz IA)**       | *"Você atravessa. O ar não é mais de caverna. É... aberto. Vento em seu rosto. Grama sob seus pés. Pássaros — mas não pássaros que você conhece. Cantos que formam padrões geométricos no ar."* (pausa 3s) *"Você não está mais na tumba. Você não está mais na Islândia. Aethelgard não era uma tumba."* (pausa 2s) *"Era uma porta."* (silêncio longo — 4 segundos — apenas o ambiente) *"E agora... algo do outro lado notou que ela foi aberta."* (som distante: o padrão rítmico do portal, invertido, vindo de longe) *"O Eco de Aethelgard... apenas começou."* |
| **Paisagem Sonora**           | Transição abrupta: de reverb de caverna para campo aberto. Vento suave e constante. Grama. Pássaros alienígenas (cantos melódicos com padrões geométricos audíveis — intervalos em "V" para "letra V", glissandos circulares para "círculo"). Ao final: o padrão rítmico do portal, invertido e distante (como se algo estivesse repetindo a sequência do jogador de volta). Um tom grave cresce lentamente sob tudo.                                                                                                                                                                   |
| **Ação do Jogador**         | Nenhuma. Cena puramente narrativa (mãos livres).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Feedback de Áudio/Haptic** | `double_tap` ao atravessar o portal. Durante a cena: haptics sutis sincronizados com os cantos dos pássaros (vibração leve a cada padrão geométrico sonoro). No momento de *"algo do outro lado notou"*: `heartbeat` retorna — lento, pesado, diferente do anterior (frequência mais baixa). Final: fade out gradual de tudo exceto o heartbeat. Último haptic: uma única vibração longa que diminui até zero.                                                                                                                                                                           |
| **Condição de Vitória**    | Automática (timer) → transição para tela final.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

**Notas de implementação:**

- Esta cena é 100% narrativa — o jogador descansa e absorve
- Os "pássaros geométricos" plantam a semente do worldbuilding expandido
- O padrão rítmico invertido é o gancho narrativo: algo aprendeu a sequência do jogador
- O heartbeat final deve ser perturbador mas não assustador — inquietação, não medo

---

### CENA 7 — Tela Final (Call to Action)

**Duração estimada:** ~30 segundos

| Aspecto                             | Detalhe                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Narração (Voz IA)**       | *"Obrigado por jogar a demonstração de O Eco de Aethelgard."* (pausa) *"Este jogo está em desenvolvimento. Cada glifo que você desenhou nos ajuda a construir um mundo onde ver não é necessário para explorar."* (pausa) *"Toque na tela para saber mais. Ou desenhe um zero... para ouvir de novo."* |
| **Paisagem Sonora**           | Ambiente calmo — versão suave e resolvida do tema sonoro da tumba. Sem tensão. Tom de esperança/conclusão.                                                                                                                                                                                                         |
| **Ação do Jogador**         | Tap → link/info do projeto. Número 0 → replay da demo.                                                                                                                                                                                                                                                                |
| **Feedback de Áudio/Haptic** | `pulse_confirm` para tap. Para o zero: o som de ativação da Cena 1 retorna (callback emocional).                                                                                                                                                                                                                |
| **Condição de Vitória**    | N/A — tela final.                                                                                                                                                                                                                                                                                                      |

---

## 4. Mapa de Fluxo da Demo

```
[Cena 0: Título/Onboarding]
        │ tap × 2
        ▼
[Cena 1: A Descida]
  │ Número 0 ✓
        ▼
[Cena 2: Ecolocalização]
        │ Letra V ✓
        ▼
[Cena 3: Corredor das Inscrições]
  │ Letra L ✓
        ▼
[Cena 4: Porta dos Três Selos]
  │ Número 0 → Número 1 → Número 7 ✓
        ▼
[Cena 5: Câmara do Eco — CLÍMAX]
  │ Letra V ✓ → Sequência Rítmica (1-0-1-1-0) ✓
        ▼
[Cena 6: O Outro Lado]
        │ (automático)
        ▼
[Cena 7: Tela Final / CTA]
```

---

## 5. Inventário de Assets de Áudio

### 5.1 Vozes

| ID                | Descrição                      | Duração Est. | Notas                                                                                       |
| ----------------- | -------------------------------- | -------------- | ------------------------------------------------------------------------------------------- |
| `VO_NARRATOR_*` | Todas as falas da narradora IA   | ~6 min total   | Tom: calmo, preciso, levemente íntimo. Sem emoção excessiva.                             |
| `VO_ANCIENT_01` | Fala da Voz Antiga (inscrição) | ~15s           | Tom: grave, reverberado, atemporal. Processamento: pitch -3st, reverb caverna, leve chorus. |

### 5.2 Efeitos Sonoros (SFX)

| ID                        | Descrição                                  | Binaural                     |
| ------------------------- | -------------------------------------------- | ---------------------------- |
| `SFX_STEP_STONE_*`      | Passos em pedra (6-8 variações)            | Sim — stereo posicional     |
| `SFX_WATER_DRIP_*`      | Gotejar de água (4-5 variações)           | Sim — esquerda predominante |
| `SFX_ACTIVATION_CIRCLE` | Ativação por círculo (cristal ressonante) | Mono → expansão stereo     |
| `SFX_ECHO_PULSE`        | Pulso de ecolocalização (saída)           | Mono centro                  |
| `SFX_ECHO_RETURN_*`     | Retornos de eco por direção (6+)           | Sim — HRTF 360°            |
| `SFX_STONE_SLIDE`       | Pedra deslizando/abrindo                     | Sim — frontal               |
| `SFX_SEAL_LOCK`         | Selo encaixando na porta                     | Mono com sub-bass            |
| `SFX_PORTAL_PULSE`      | Pulsação do portal (loop)                  | Mono centro + sub            |
| `SFX_PORTAL_OPEN`       | Abertura do portal (cinematográfico)        | Sim — sweep 360°           |
| `SFX_DISSONANCE`        | Tom de erro/rejeição                       | Mono                         |
| `SFX_BIRDS_GEO_*`       | Pássaros geométricos (4-5 variações)     | Sim — posicional            |
| `SFX_ENTITY_BREATH`     | Respiração da entidade atrás              | Sim — 180° traseiro        |

### 5.3 Ambientes (Loops)

| ID                      | Descrição                                | Duração  |
| ----------------------- | ------------------------------------------ | ---------- |
| `AMB_TOMB_DESCENT`    | Descida: reverb crescente, úmido          | 2 min loop |
| `AMB_CHAMBER_SMALL`   | Câmara pequena: reverb curto              | 2 min loop |
| `AMB_CORRIDOR_NARROW` | Corredor: reverb apertado, vento em fresta | 2 min loop |
| `AMB_CHAMBER_VAST`    | Câmara do Eco: reverb 6-8s, drones        | 3 min loop |
| `AMB_OPEN_FIELD`      | Campo aberto: vento, grama, céu           | 2 min loop |

### 5.4 Música/Drone

| ID                    | Descrição                               |
| --------------------- | ----------------------------------------- |
| `MUS_DRONE_CMINOR`  | Drone base em Dó menor (porta)           |
| `MUS_RESOLVE_MAJOR` | Acorde maior de resolução (portal abre) |
| `MUS_TITLE_THEME`   | Tema do título (sino tibetano + reverb)  |
| `MUS_CREDITS_SOFT`  | Versão calma do tema para tela final     |

---

## 6. Requisitos Técnicos (React Native)

### 6.1 Bibliotecas Essenciais

| Necessidade              | Biblioteca Sugerida                                                         | Finalidade                           |
| ------------------------ | --------------------------------------------------------------------------- | ------------------------------------ |
| Reconhecimento de gestos | `react-native-gesture-handler` + lógica custom                           | Detecção das 6 formas geométricas |
| Áudio                   | `expo-av` ou `react-native-track-player`                                | Playback de áudio                   |
| Áudio binaural/HRTF     | `react-native-oboe` (Android) / `AVAudioEngine` (iOS) via native module | Espacialização 3D de som           |
| Haptics                  | `expo-haptics` ou `react-native-haptic-feedback`                        | Padrões vibratórios                |
| Acessibilidade           | APIs nativas (`AccessibilityInfo`)                                        | Integração VoiceOver/TalkBack      |
| State Machine            | `xstate` ou `zustand`                                                   | Gerenciamento de cenas e estados     |
| Animações de áudio    | `react-native-reanimated`                                                 | Sincronização timing áudio/haptic |

### 6.2 Algoritmo de Reconhecimento de Glifos

```
Entrada: array de pontos {x, y, timestamp}

1. Suavizar traço (moving average, window=5)
2. Normalizar para bounding box unitário
3. Classificar:
   a. Se pontos < 10 → rejeitar (traço muito curto)
   b. Calcular ângulos entre segmentos consecutivos
   c. Detectar vértices (mudança de ângulo > 30°)
  d. Se traço vertical dominante → NÚMERO 1
  e. Se traço fechado + alta circularidade* → NÚMERO 0
  f. Se padrão em V aberto → LETRA V
  g. Se padrão em L aberto (canto forte) → LETRA L
  h. Se barra superior + diagonal → NÚMERO 7
  i. (Fase 2) Se barra superior + haste central em multi-traço → LETRA T
  j. Caso contrário → GLIFO NÃO RECONHECIDO

* Circularidade = 4π × área / perímetro²
  (1.0 = círculo perfeito, aceitar ≥ 0.70)
```

### 6.3 Arquitetura de Cenas (State Machine)

```
states: {
  title:       { on: { TAP: 'onboarding' } },
  onboarding:  { on: { TAP: 'scene1_descent' } },

  scene1_descent: {
    on: {
      SHAPE_NUMBER_0: 'scene2_echolocation',
      SHAPE_WRONG:    { actions: 'playError', target: 'scene1_descent' }
    }
  },

  scene2_echolocation: {
    on: {
      SHAPE_LETTER_V: 'scene3_corridor',
      SHAPE_WRONG:    { actions: 'playError', target: 'scene2_echolocation' }
    }
  },

  scene3_corridor: {
    on: {
      SHAPE_LETTER_L: 'scene4_door',
      SHAPE_WRONG:    { actions: 'playError', target: 'scene3_corridor' }
    }
  },

  scene4_door: {
    initial: 'seal1',
    states: {
      seal1: { on: { SHAPE_NUMBER_0: 'seal2', SHAPE_WRONG: { actions: 'resetSequence' } } },
      seal2: { on: { SHAPE_NUMBER_1: 'seal3', SHAPE_WRONG: { actions: 'resetSequence' } } },
      seal3: { on: { SHAPE_NUMBER_7: 'complete', SHAPE_WRONG: { actions: 'resetSequence' } } },
      complete: { type: 'final' }
    },
    onDone: 'scene5_climax'
  },

  scene5_climax: {
    initial: 'echolocation',
    states: {
      echolocation: { on: { SHAPE_LETTER_V: 'rhythm' } },
      rhythm: {
        initial: 'beat1',
        states: {
          beat1: { on: { SHAPE_NUMBER_1: 'beat2' } },
          beat2: { on: { SHAPE_NUMBER_0: 'beat3' } },
          beat3: { on: { SHAPE_NUMBER_1: 'beat4' } },
          beat4: { on: { SHAPE_NUMBER_1: 'beat5' } },
          beat5: { on: { SHAPE_NUMBER_0: 'complete' } },
          complete: { type: 'final' }
        }
      }
    },
    onDone: 'scene6_otherside'
  },

  scene6_otherside: {
    after: { 45000: 'scene7_credits' }
  },

  scene7_credits: { type: 'final' }
}
```

---

## 7. Métricas para Investidores

### 7.1 KPIs da Demo

| Métrica               | O que mede                                | Meta                 |
| ---------------------- | ----------------------------------------- | -------------------- |
| Taxa de conclusão     | % de jogadores que chegam à Cena 6       | > 80%                |
| Tentativas por forma   | Média de tentativas até acerto por cena | < 3                  |
| Tempo total de sessão | Duração da experiência completa        | 8-12 min             |
| Replay rate            | % que desenham o círculo na tela final   | > 30%                |
| Erro mais comum        | Qual forma tem maior taxa de falha        | Para calibração    |
| Drop-off por cena      | Em qual cena os jogadores abandonam       | Identificar gargalos |

### 7.2 Dados para Pitch

- **Mercado:** 2.2 bilhões de pessoas com deficiência visual no mundo (OMS, 2023)
- **Diferencial:** Primeiro jogo mobile de aventura narrativa projetado nativamente para cegos com mecânica gestual
- **Escalabilidade:** O sistema de formas pode expandir para dezenas de puzzles sem mudança de engine
- **Acessibilidade reversa:** Jogadores videntes também podem jogar de olhos fechados — apelo universal

---

## 8. Cronograma Sugerido de Produção

| Fase                                  | Entregas                                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Fase 1 — Fundação**        | Engine de reconhecimento de formas, sistema de áudio binaural, framework de haptics, state machine de cenas |
| **Fase 2 — Conteúdo**         | Gravação de vozes, produção de SFX e ambientes, integração áudio + haptic por cena                    |
| **Fase 3 — Integração**      | Fluxo completo Cena 0-7, testes de timing, polish de transições                                            |
| **Fase 4 — Acessibilidade QA** | Testes com usuários cegos reais, calibração de reconhecimento, ajuste de dificuldade                      |
| **Fase 5 — Demo Final**        | Build de apresentação, coleta de métricas, preparação de pitch                                          |

---

## 9. Considerações de Acessibilidade

### 9.1 Princípios Inegociáveis

1. **Zero dependência visual** — Nenhuma informação existe apenas na tela
2. **Redundância de canais** — Toda informação crítica é transmitida por áudio E haptic
3. **Assistência progressiva** — Após N falhas, o jogo ajuda mais (nunca pune)
4. **Compatibilidade com leitores de tela** — VoiceOver/TalkBack não devem conflitar com o jogo
5. **Customização** — Volume de narração, SFX e haptics independentes

### 9.2 Testes Obrigatórios

| Teste                                  | Critério de Aprovação                                  |
| -------------------------------------- | --------------------------------------------------------- |
| Olhos fechados (vidente)               | Completar demo sem abrir os olhos                         |
| Usuário cego (sem assistência)       | Completar demo sozinho                                    |
| Usuário cego (com VoiceOver/TalkBack) | Sem conflito entre leitor de tela e áudio do jogo        |
| Fones de ouvido vs. alto-falante       | Experiência degradada mas funcional sem fones            |
| Dispositivos variados                  | Haptics funcionais em iOS e Android (min. 3 modelos cada) |

---

*Documento gerado como roteiro técnico para a Vertical Slice de "O Eco de Aethelgard".*
*Versão: 1.0*
*Data: 2026-03-14*

