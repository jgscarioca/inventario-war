// ==========================================================================
// ITEM DATA & MERGE DEFINITIONS
// Evolution chains: Identical item + same level => level + 1, larger size,
// higher attributes, altered icon & color rarity!
// ==========================================================================

const ITEM_TYPES = {
  axe: {
    category: 'weapon',
    categoryName: 'Machado',
    tiers: [
      {
        level: 1,
        name: 'Machado Rústico',
        width: 1,
        height: 1,
        power: 120,
        tier: 1,
        desc: 'Um machado de lenhador comum, feito de madeira rústica e pedra.',
        iconSvg: (w, h) => `
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="16" y1="52" x2="48" y2="20" stroke="#8d6e63" stroke-width="8" stroke-linecap="round"/>
            <path d="M42 16 C52 14, 56 22, 54 28 C48 30, 44 26, 42 22 Z" fill="#b0bec5" stroke="#37474f" stroke-width="2.5"/>
            <path d="M38 24 C34 26, 32 32, 34 36 C38 34, 40 30, 40 26 Z" fill="#90a4ae" stroke="#37474f" stroke-width="2"/>
            <circle cx="43" cy="22" r="2.5" fill="#455a64"/>
          </svg>
        `
      },
      {
        level: 2,
        name: 'Machado de Guerra',
        width: 1,
        height: 2,
        power: 360,
        tier: 2,
        desc: 'Lâmina dupla de aço polido forjada com empunhadura longa de combate.',
        iconSvg: (w, h) => `
          <svg viewBox="0 0 64 128" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="32" y1="116" x2="32" y2="20" stroke="#5d4037" stroke-width="9" stroke-linecap="round"/>
            <line x1="32" y1="116" x2="32" y2="20" stroke="#8d6e63" stroke-width="5" stroke-linecap="round"/>
            <!-- Left Blade -->
            <path d="M32 30 C12 24, 6 42, 10 56 C22 52, 28 42, 32 38 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="3"/>
            <!-- Right Blade -->
            <path d="M32 30 C52 24, 58 42, 54 56 C42 52, 36 42, 32 38 Z" fill="#0284c7" stroke="#0369a1" stroke-width="3"/>
            <!-- Head cap -->
            <rect x="26" y="24" width="12" height="18" rx="3" fill="#e0f2fe" stroke="#0284c7" stroke-width="2.5"/>
            <circle cx="32" cy="33" r="3" fill="#38bdf8"/>
            <!-- Handle grip wraps -->
            <line x1="28" y1="75" x2="36" y2="78" stroke="#0284c7" stroke-width="3"/>
            <line x1="28" y1="85" x2="36" y2="88" stroke="#0284c7" stroke-width="3"/>
            <line x1="28" y1="95" x2="36" y2="98" stroke="#0284c7" stroke-width="3"/>
          </svg>
        `
      },
      {
        level: 3,
        name: 'Machado Berserker Púrpura',
        width: 2,
        height: 2,
        power: 1000,
        tier: 3,
        desc: 'Energizado com cristais arcanos e runas sombrias. O lendário machado da capa!',
        iconSvg: (w, h) => `
          <svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="purpleAxe" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#f0abfc"/>
                <stop offset="50%" stop-color="#c084fc"/>
                <stop offset="100%" stop-color="#7e22ce"/>
              </linearGradient>
              <filter id="glowPurple" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur"/>
                <feComposite in="SourceGraphic" in2="blur" operator="over"/>
              </filter>
            </defs>
            <!-- Heavy Shaft -->
            <line x1="28" y1="108" x2="88" y2="30" stroke="#3b0764" stroke-width="12" stroke-linecap="round"/>
            <line x1="28" y1="108" x2="88" y2="30" stroke="#a855f7" stroke-width="6" stroke-linecap="round"/>
            <!-- Giant Left Arc Blade -->
            <path d="M78 38 C60 10, 24 16, 20 40 C34 50, 56 46, 72 44 Z" fill="url(#purpleAxe)" stroke="#581c87" stroke-width="4" filter="url(#glowPurple)"/>
            <!-- Giant Right Spiked Blade -->
            <path d="M84 28 C112 12, 122 36, 114 62 C96 52, 92 40, 84 38 Z" fill="url(#purpleAxe)" stroke="#581c87" stroke-width="4" filter="url(#glowPurple)"/>
            <!-- Arcane Core Gem -->
            <polygon points="84,18 94,32 84,46 74,32" fill="#38bdf8" stroke="#f0abfc" stroke-width="3"/>
            <circle cx="84" cy="32" r="3.5" fill="#ffffff"/>
            <!-- Energy runes -->
            <path d="M38 30 Q46 32 54 36" stroke="#fdf4ff" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M102 38 Q96 46 92 52" stroke="#fdf4ff" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        `
      },
      {
        level: 4,
        name: 'Devastador Titânico Dourado',
        width: 2,
        height: 3,
        power: 2800,
        tier: 4,
        desc: 'Forjado no coração de um vulcão sagrado. Corta armaduras inteiras como manteiga.',
        iconSvg: (w, h) => `
          <svg viewBox="0 0 128 192" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="goldAxe" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#fef08a"/>
                <stop offset="40%" stop-color="#f59e0b"/>
                <stop offset="100%" stop-color="#b45309"/>
              </linearGradient>
            </defs>
            <line x1="64" y1="180" x2="64" y2="30" stroke="#78350f" stroke-width="14" stroke-linecap="round"/>
            <line x1="64" y1="180" x2="64" y2="30" stroke="#fde047" stroke-width="6" stroke-linecap="round"/>
            <!-- Colossal Crescent Blade -->
            <path d="M64 40 C14 20, 4 70, 16 110 C46 95, 58 70, 64 56 Z" fill="url(#goldAxe)" stroke="#78350f" stroke-width="5"/>
            <path d="M64 40 C114 20, 124 70, 112 110 C82 95, 70 70, 64 56 Z" fill="url(#goldAxe)" stroke="#78350f" stroke-width="5"/>
            <!-- Golden Spikes & Ruby Eyes -->
            <circle cx="64" cy="46" r="12" fill="#ef4444" stroke="#fef08a" stroke-width="4"/>
            <polygon points="64,12 70,28 58,28" fill="#fde047"/>
          </svg>
        `
      },
      {
        level: 5,
        name: 'Machado Celestial Cósmico',
        width: 3,
        height: 3,
        power: 7500,
        tier: 5,
        desc: 'Arma divina lendária. Pulsa com a energia do próprio cosmos!',
        iconSvg: (w, h) => `
          <svg viewBox="0 0 192 192" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="cosmicGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#fb7185"/>
                <stop offset="50%" stop-color="#e11d48"/>
                <stop offset="100%" stop-color="#4c0519"/>
              </radialGradient>
            </defs>
            <circle cx="96" cy="96" r="75" fill="none" stroke="#f43f5e" stroke-width="3" stroke-dasharray="8 6"/>
            <line x1="36" y1="166" x2="156" y2="26" stroke="#881337" stroke-width="16" stroke-linecap="round"/>
            <line x1="36" y1="166" x2="156" y2="26" stroke="#fda4af" stroke-width="8" stroke-linecap="round"/>
            <!-- Massive Mythic Wings -->
            <path d="M140 40 C190 20, 195 90, 160 130 C130 100, 130 65, 140 40 Z" fill="url(#cosmicGlow)" stroke="#ffe4e6" stroke-width="4"/>
            <path d="M125 25 C75 10, 40 60, 60 110 C85 85, 110 50, 125 25 Z" fill="url(#cosmicGlow)" stroke="#ffe4e6" stroke-width="4"/>
            <polygon points="146,36 156,52 142,60 136,46" fill="#fde047"/>
          </svg>
        `
      }
    ]
  },

  sword: {
    category: 'weapon',
    categoryName: 'Espada',
    tiers: [
      {
        level: 1,
        name: 'Adaga Curta',
        width: 1,
        height: 1,
        power: 100,
        tier: 1,
        desc: 'Lâmina leve de ferro para ataques rápidos.',
        iconSvg: (w, h) => `
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="18" y1="46" x2="46" y2="18" stroke="#94a3b8" stroke-width="6" stroke-linecap="round"/>
            <line x1="14" y1="50" x2="22" y2="42" stroke="#475569" stroke-width="8"/>
            <line x1="20" y1="44" x2="48" y2="16" stroke="#f8fafc" stroke-width="2"/>
          </svg>
        `
      },
      {
        level: 2,
        name: 'Espada Longa de Guarda',
        width: 1,
        height: 2,
        power: 300,
        tier: 2,
        desc: 'Lâmina forjada equilibrada para perfuração sólida.',
        iconSvg: (w, h) => `
          <svg viewBox="0 0 64 128" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Blade -->
            <polygon points="32,15 40,90 24,90" fill="#38bdf8" stroke="#0284c7" stroke-width="2.5"/>
            <line x1="32" y1="16" x2="32" y2="90" stroke="#f0f9ff" stroke-width="2"/>
            <!-- Guard -->
            <rect x="14" y="90" width="36" height="8" rx="3" fill="#0369a1" stroke="#38bdf8" stroke-width="2"/>
            <!-- Hilt & Pommel -->
            <line x1="32" y1="98" x2="32" y2="118" stroke="#5d4037" stroke-width="7" stroke-linecap="round"/>
            <circle cx="32" cy="120" r="5" fill="#38bdf8" stroke="#0284c7" stroke-width="2"/>
          </svg>
        `
      },
      {
        level: 3,
        name: 'Lâmina Rúnica Violeta',
        width: 1,
        height: 3,
        power: 850,
        tier: 3,
        desc: 'Canaliza trovões arcanos em cada golpe cortante.',
        iconSvg: (w, h) => `
          <svg viewBox="0 0 64 192" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Blade -->
            <polygon points="32,12 44,140 20,140" fill="#c084fc" stroke="#581c87" stroke-width="3"/>
            <line x1="32" y1="14" x2="32" y2="140" stroke="#f5d0fe" stroke-width="3"/>
            <!-- Runes -->
            <path d="M32 35 L28 42 L36 46 L32 55" stroke="#ffffff" stroke-width="2"/>
            <path d="M32 75 L36 82 L28 86 L32 95" stroke="#ffffff" stroke-width="2"/>
            <!-- Winged Guard -->
            <path d="M10 142 C20 135 44 135 54 142 L48 152 L16 152 Z" fill="#7e22ce" stroke="#f5d0fe" stroke-width="2.5"/>
            <!-- Hilt -->
            <rect x="28" y="152" width="8" height="26" rx="2" fill="#3b0764"/>
            <circle cx="32" cy="182" r="6" fill="#a855f7" stroke="#ffffff" stroke-width="2"/>
          </svg>
        `
      },
      {
        level: 4,
        name: 'Montante do Dragão Solar',
        width: 2,
        height: 3,
        power: 2400,
        tier: 4,
        desc: 'Espada de duas mãos banhada em ouro vulcânico.',
        iconSvg: (w, h) => `
          <svg viewBox="0 0 128 192" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="64,15 84,135 44,135" fill="#f59e0b" stroke="#78350f" stroke-width="4"/>
            <line x1="64" y1="16" x2="64" y2="135" stroke="#fef08a" stroke-width="4"/>
            <!-- Guard -->
            <path d="M18 135 C40 120 88 120 110 135 L98 150 L30 150 Z" fill="#b45309" stroke="#fde047" stroke-width="3"/>
            <line x1="64" y1="150" x2="64" y2="180" stroke="#451a03" stroke-width="12" stroke-linecap="round"/>
            <circle cx="64" cy="182" r="8" fill="#f59e0b" stroke="#fef08a" stroke-width="3"/>
          </svg>
        `
      }
    ]
  },

  bow: {
    category: 'weapon',
    categoryName: 'Arco',
    tiers: [
      {
        level: 1,
        name: 'Arco de Caça',
        width: 1,
        height: 2,
        power: 90,
        tier: 1,
        desc: 'Arco leve curvado para disparos rápidos à distância.',
        iconSvg: (w, h) => `
          <svg viewBox="0 0 64 128" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 18 C50 45 50 83 20 110" stroke="#8d6e63" stroke-width="7" stroke-linecap="round"/>
            <line x1="20" y1="18" x2="20" y2="110" stroke="#e2e8f0" stroke-width="2"/>
            <line x1="10" y1="64" x2="45" y2="64" stroke="#475569" stroke-width="3"/>
            <polygon points="45,64 38,60 38,68" fill="#94a3b8"/>
          </svg>
        `
      },
      {
        level: 2,
        name: 'Arco Composto Glacial',
        width: 1,
        height: 3,
        power: 270,
        tier: 2,
        desc: 'Mecanismo de roldanas azuis que dispara flechas congelantes.',
        iconSvg: (w, h) => `
          <svg viewBox="0 0 64 192" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 20 C54 60 54 132 18 172" stroke="#0284c7" stroke-width="8" stroke-linecap="round"/>
            <line x1="18" y1="20" x2="18" y2="172" stroke="#38bdf8" stroke-width="2.5"/>
            <circle cx="18" cy="20" r="5" fill="#e0f2fe"/>
            <circle cx="18" cy="172" r="5" fill="#e0f2fe"/>
            <!-- Arrow -->
            <line x1="8" y1="96" x2="52" y2="96" stroke="#0369a1" stroke-width="4"/>
            <polygon points="54,96 44,90 44,102" fill="#38bdf8"/>
          </svg>
        `
      },
      {
        level: 3,
        name: 'Arco Esmeralda Dourado',
        width: 2,
        height: 3,
        power: 780,
        tier: 3,
        desc: 'Relíquia da realeza mostrada no inventário da capa!',
        iconSvg: (w, h) => `
          <svg viewBox="0 0 128 192" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M36 24 C100 64 100 128 36 168" stroke="#eab308" stroke-width="12" stroke-linecap="round"/>
            <path d="M36 24 C100 64 100 128 36 168" stroke="#10b981" stroke-width="6" stroke-linecap="round"/>
            <line x1="36" y1="24" x2="36" y2="168" stroke="#fef08a" stroke-width="3"/>
            <!-- Ornaments -->
            <circle cx="36" cy="24" r="8" fill="#ef4444" stroke="#fef08a" stroke-width="2"/>
            <circle cx="36" cy="168" r="8" fill="#ef4444" stroke="#fef08a" stroke-width="2"/>
            <!-- Golden Arrow -->
            <line x1="20" y1="96" x2="100" y2="96" stroke="#f59e0b" stroke-width="5"/>
            <polygon points="106,96 90,88 90,104" fill="#fde047" stroke="#b45309" stroke-width="2"/>
          </svg>
        `
      }
    ]
  },

  shield: {
    category: 'armor',
    categoryName: 'Escudo',
    tiers: [
      {
        level: 1,
        name: 'Broquel de Madeira',
        width: 1,
        height: 1,
        power: 80,
        tier: 1,
        desc: 'Escudo pequeno e circular reforçado com pregos de ferro.',
        iconSvg: (w, h) => `
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="24" fill="#8d6e63" stroke="#4e342e" stroke-width="4"/>
            <circle cx="32" cy="32" r="14" fill="#b0bec5" stroke="#37474f" stroke-width="3"/>
            <circle cx="32" cy="32" r="4" fill="#eceff1"/>
          </svg>
        `
      },
      {
        level: 2,
        name: 'Escudo de Aço Guardião',
        width: 2,
        height: 1,
        power: 240,
        tier: 2,
        desc: 'Escudo largo horizontal para bloquear ataques frontais maciços.',
        iconSvg: (w, h) => `
          <svg viewBox="0 0 128 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="14" y="12" width="100" height="40" rx="8" fill="#0284c7" stroke="#38bdf8" stroke-width="4"/>
            <polygon points="64,18 78,32 64,46 50,32" fill="#e0f2fe" stroke="#0369a1" stroke-width="2"/>
          </svg>
        `
      },
      {
        level: 3,
        name: 'Baluarte Rúnico Protetor',
        width: 2,
        height: 2,
        power: 700,
        tier: 3,
        desc: 'Escudo pesado que emite um escudo de força protetor.',
        iconSvg: (w, h) => `
          <svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M24 24 L104 24 L94 92 L64 116 L34 92 Z" fill="#7e22ce" stroke="#c084fc" stroke-width="6"/>
            <path d="M36 34 L92 34 L84 86 L64 104 L44 86 Z" fill="#3b0764"/>
            <circle cx="64" cy="62" r="16" fill="#38bdf8" stroke="#f5d0fe" stroke-width="4"/>
          </svg>
        `
      }
    ]
  },

  potion: {
    category: 'support',
    categoryName: 'Poção',
    buffPercent: 30, // Buffs adjacent weapons with +30% power
    tiers: [
      {
        level: 1,
        name: 'Frasco Menor de Vida',
        width: 1,
        height: 1,
        power: 70,
        buffPercent: 30,
        tier: 1,
        desc: 'Suporte Alquímico: concede +30% de dano/DPS às armas adjacentes e regenera a vida do herói.',
        iconSvg: (w, h) => `
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M26 14 L38 14 L38 22 L46 36 C48 44 44 52 32 52 C20 52 16 44 18 36 L26 22 Z" fill="#ef4444" stroke="#991b1b" stroke-width="3"/>
            <rect x="28" y="8" width="8" height="6" rx="2" fill="#d97706"/>
            <circle cx="28" cy="42" r="2.5" fill="#fca5a5"/>
          </svg>
        `
      },
      {
        level: 2,
        name: 'Elixir Bicolor da Força',
        width: 1,
        height: 2,
        power: 210,
        buffPercent: 55,
        tier: 2,
        desc: 'Suporte Alquímico Avançado: concede +55% de dano/DPS a todas as armas vizinhas.',
        iconSvg: (w, h) => `
          <svg viewBox="0 0 64 128" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="26" y="10" width="12" height="12" rx="3" fill="#b45309" stroke="#78350f" stroke-width="2"/>
            <path d="M24 22 L40 22 L42 40 L50 70 C52 95 48 114 32 114 C16 114 12 95 14 70 L22 40 Z" fill="#22c55e" stroke="#166534" stroke-width="3.5"/>
            <!-- Top layer yellow/orange -->
            <path d="M22 40 L42 40 L46 64 L18 64 Z" fill="#eab308"/>
            <ellipse cx="32" cy="64" rx="14" ry="4" fill="#fde047"/>
            <circle cx="32" cy="85" r="4" fill="#86efac"/>
          </svg>
        `
      },
      {
        level: 3,
        name: 'Elixir Sagrado Triplo',
        width: 1,
        height: 2,
        power: 600,
        buffPercent: 90,
        tier: 3,
        desc: 'Suporte Mítico: infunde as armas vizinhas com +90% de poder/DPS destruidor!',
        iconSvg: (w, h) => `
          <svg viewBox="0 0 64 128" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="24" y="8" width="16" height="14" rx="4" fill="#a855f7" stroke="#ffffff" stroke-width="2"/>
            <path d="M22 22 L42 22 L44 38 L54 75 C56 100 50 118 32 118 C14 118 8 100 10 75 L20 38 Z" fill="#9333ea" stroke="#3b0764" stroke-width="3.5"/>
            <path d="M19 40 L45 40 L49 68 L15 68 Z" fill="#38bdf8"/>
            <path d="M15 68 L49 68 L53 92 L11 92 Z" fill="#ec4899"/>
            <circle cx="32" cy="104" r="5" fill="#fdf4ff"/>
          </svg>
        `
      }
    ]
  },

  whetstone: {
    category: 'support',
    categoryName: 'Pedra de Amolar',
    buffPercent: 40, // Buffs adjacent weapons with +40% power
    tiers: [
      {
        level: 1,
        name: 'Pedra de Amolar Rústica',
        width: 1,
        height: 1,
        power: 45,
        buffPercent: 40,
        tier: 1,
        desc: 'Suporte de Forja: afia qualquer arma adjacente no grid, concedendo +40% de Poder e DPS!',
        iconSvg: (w, h) => `
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Whetstone Block -->
            <polygon points="12,42 24,18 52,18 40,42" fill="#64748b" stroke="#334155" stroke-width="2.5"/>
            <polygon points="40,42 52,18 56,22 44,46" fill="#475569" stroke="#334155" stroke-width="2"/>
            <polygon points="12,42 40,42 44,46 16,46" fill="#334155"/>
            <!-- Sharpening Sparkles -->
            <circle cx="28" cy="22" r="2" fill="#fde047"/>
            <circle cx="38" cy="26" r="1.5" fill="#f59e0b"/>
            <circle cx="20" cy="30" r="1.5" fill="#fde047"/>
            <path d="M30 14 L32 10 L34 14 L38 16 L34 18 L32 22 L30 18 L26 16 Z" fill="#fef08a"/>
          </svg>
        `
      },
      {
        level: 2,
        name: 'Pedra Diamantina Polida',
        width: 1,
        height: 1,
        power: 140,
        buffPercent: 70,
        tier: 2,
        desc: 'Suporte Diamante: confere fio navalha perfeito, adicionando +70% de Poder às armas vizinhas.',
        iconSvg: (w, h) => `
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="14,40 26,16 50,16 38,40" fill="#38bdf8" stroke="#0284c7" stroke-width="2.5"/>
            <polygon points="38,40 50,16 54,20 42,44" fill="#0284c7" stroke="#0369a1" stroke-width="2"/>
            <line x1="22" y1="24" x2="42" y2="24" stroke="#ffffff" stroke-width="2"/>
            <circle cx="44" cy="20" r="2.5" fill="#e0f2fe"/>
            <!-- Radiant Sparks -->
            <polygon points="32,8 34,14 40,16 34,18 32,24 30,18 24,16 30,14" fill="#38bdf8"/>
          </svg>
        `
      },
      {
        level: 3,
        name: 'Runa Afiadora de Lava',
        width: 1,
        height: 2,
        power: 420,
        buffPercent: 110,
        tier: 3,
        desc: 'Suporte Rúnico: incendeia lâminas vizinhas concedendo +110% de Poder e dano massivo!',
        iconSvg: (w, h) => `
          <svg viewBox="0 0 64 128" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="18" y="20" width="28" height="88" rx="6" fill="#7e22ce" stroke="#c084fc" stroke-width="3"/>
            <line x1="32" y1="28" x2="32" y2="100" stroke="#f5d0fe" stroke-width="3" stroke-dasharray="6 4"/>
            <!-- Flame Runes -->
            <circle cx="32" cy="45" r="5" fill="#f59e0b"/>
            <circle cx="32" cy="75" r="5" fill="#f59e0b"/>
            <path d="M26 30 Q32 22 38 30" stroke="#fde047" stroke-width="2"/>
            <path d="M26 90 Q32 82 38 90" stroke="#fde047" stroke-width="2"/>
          </svg>
        `
      }
    ]
  },

  helmet: {
    category: 'armor',
    categoryName: 'Elmo',
    tiers: [
      {
        level: 1,
        name: 'Chapéu de Couro',
        width: 1,
        height: 1,
        power: 60,
        tier: 1,
        desc: 'Proteção leve para a cabeça.',
        iconSvg: (w, h) => `
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 44 C14 26 22 18 32 18 C42 18 50 26 50 44 Z" fill="#475569" stroke="#1e293b" stroke-width="3"/>
            <rect x="10" y="42" width="44" height="6" rx="3" fill="#64748b"/>
          </svg>
        `
      },
      {
        level: 2,
        name: 'Elmo de Aço Cruzado',
        width: 1,
        height: 1,
        power: 190,
        tier: 2,
        desc: 'Elmo militar com visor em cruz.',
        iconSvg: (w, h) => `
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 48 L16 26 C16 18 24 14 32 14 C40 14 48 18 48 26 L48 48 Z" fill="#0284c7" stroke="#38bdf8" stroke-width="3"/>
            <line x1="32" y1="20" x2="32" y2="44" stroke="#e0f2fe" stroke-width="3"/>
            <line x1="22" y1="30" x2="42" y2="30" stroke="#e0f2fe" stroke-width="3"/>
          </svg>
        `
      },
      {
        level: 3,
        name: 'Coroa Cósmica Mística',
        width: 2,
        height: 1,
        power: 540,
        tier: 3,
        desc: 'Diadema que amplia o poder mágico de todos os outros itens.',
        iconSvg: (w, h) => `
          <svg viewBox="0 0 128 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="20,48 20,24 38,36 64,16 90,36 108,24 108,48" fill="#7e22ce" stroke="#c084fc" stroke-width="3"/>
            <circle cx="64" cy="38" r="7" fill="#fde047" stroke="#ffffff" stroke-width="2"/>
            <circle cx="34" cy="40" r="5" fill="#38bdf8"/>
            <circle cx="94" cy="40" r="5" fill="#38bdf8"/>
          </svg>
        `
      }
    ]
  }
};

// Helper to spawn a new item instance
let itemInstanceCounter = 1;

function createItem(typeKey, level = 1) {
  const typeDef = ITEM_TYPES[typeKey];
  if (!typeDef) return null;
  const tierDef = typeDef.tiers.find(t => t.level === level) || typeDef.tiers[0];

  return {
    id: `item_${Date.now()}_${itemInstanceCounter++}`,
    type: typeKey,
    category: typeDef.category || 'weapon',
    buffPercent: tierDef.buffPercent || typeDef.buffPercent || 0,
    level: tierDef.level,
    name: tierDef.name,
    categoryName: typeDef.categoryName,
    width: tierDef.width,
    height: tierDef.height,
    originalWidth: tierDef.width,
    originalHeight: tierDef.height,
    power: tierDef.power,
    tier: tierDef.tier,
    desc: tierDef.desc,
    svgString: tierDef.iconSvg(tierDef.width, tierDef.height),
    // Adjacency Synergy State
    adjacencyBonusPower: 0,
    buffedBy: [],
    buffingItems: [],
    // Grid coordinate (null if in stash or held)
    row: null,
    col: null
  };
}

// Helper to get next tier definition if merged
function getNextTier(typeKey, currentLevel) {
  const typeDef = ITEM_TYPES[typeKey];
  if (!typeDef) return null;
  return typeDef.tiers.find(t => t.level === currentLevel + 1) || null;
}
