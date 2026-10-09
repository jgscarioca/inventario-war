# ⚔️ Inventário War (Backpack Merge & Brawl)

Um jogo de estratégia, gerenciamento de inventário e fusão de itens inspirado em jogos como *Backpack Brawl* e *Backpack Hero*. Monte sua mochila tática no grid 12x12, combine armas idênticas para subir de nível e enfrente hordas de monstros e chefes em tempo real!

---

## 🎮 Como Jogar Online (GitHub Pages)

Você pode jogar diretamente no seu navegador através do GitHub Pages:
👉 **[Jogar Inventário War](https://jgscarioca.github.io/inventario-war/)** *(após ativar nas configurações do repositório)*

---

## 🌟 Funcionalidades Principais

- **Mochila Tática Grid 12x12**:
  - Comece com uma área 6x6 e expanda suas células desbloqueando com moedas de ouro ou ative o modo total 12x12.
  - Rotação de equipamentos (tecla `R` ou botão Girar).
  - Drag & Drop fluído com indicador de células válidas/inválidas.

- **Sistema de Fusão (Merge)**:
  - Arraste um item sobre outro idêntico do mesmo nível para forjar um equipamento de raridade superior!
  - 5 Tiers de Raridade: Comum, Raro, Épico, Lendário e Mítico com efeitos visuais e auras pulsantes.
  - Bônus de sinergia por adjacência entre itens e armas de suporte.

- **Economia e Baú de Suprimentos**:
  - **Baú Pago (50 🪙)**: Abra novos equipamentos por moedas de ouro.
  - **Saldo Animado**: Feedback visual em tempo real com partículas flutuantes e animações de pulso ao ganhar ou gastar ouro.
  - **Indicador do Baú**: Exibição do nível atual do baú e custo do próximo drop.

- **Batalha em Tempo Real**:
  - Arena de combate com herói, hordas de monstros e chefes.
  - Cálculo de DPS (Dano Por Segundo) em tempo real atualizado a cada fusão ou reposicionamento na mochila.
  - Velocidade ajustável (1x / 2x).

- **Efeitos Sonoros**:
  - Sintetizador de áudio Web Audio API integrado com zero-delay (sons de fusão, moedas, acertos críticos, abertura de baú e fanfarra de vitória).

---

## 🚀 Como Executar Localmente

Como o projeto é construído em HTML5, CSS3 e JavaScript puro:

1. Clone o repositório:
   ```bash
   git clone https://github.com/jgscarioca/inventario-war.git
   ```
2. Abra o arquivo `index.html` diretamente em qualquer navegador moderno.

---

## 🛠️ Tecnologias

- **HTML5** & **Canvas API** (Renderização do combate)
- **Vanilla CSS** (Design responsivo, glassmorphism e animações)
- **Vanilla JavaScript** (Lógica de inventário, fusão e simulação de DPS)
- **Web Audio API** (Efeitos sonoros sintetizados)
