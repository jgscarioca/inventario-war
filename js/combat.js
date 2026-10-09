// ==========================================================================
// COMBAT ARENA SIMULATOR (TOP SCREEN PREVIEW)
// Hero with Health Bar, animated monsters (Slimes, Goblins, Orcs, Boss Ogro Titã),
// Real-time DPS scaling, Victory Effects, Gold Bounties, and Wave Progression.
// ==========================================================================

class CombatArena {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.damageLayer = document.getElementById('floating-damage-layer');
    this.waveCounterEl = document.getElementById('wave-counter');

    this.wave = 1;
    this.speedMultiplier = 1;
    this.heroAttackTimer = 0;
    this.heroAttackInterval = 850; // ms per attack
    this.enemyAttackTimer = 0;
    this.enemyAttackInterval = 1800; // ms per enemy attack
    this.lastTime = performance.now();

    // Hero state with dynamic Health Bar & Animation
    this.hero = {
      x: 95,
      y: 120,
      radius: 22,
      baseMaxHp: 500,
      maxHp: 500,
      hp: 500,
      isAttacking: false,
      attackSwingProgress: 0,
      hitFlash: 0,
      recoilX: 0,
      bobOffset: 0,
      regenTimer: 0
    };

    // Enemies in arena
    this.enemies = [];
    this.particles = [];
    this.coins = []; // Victory gold coins animation

    // Visual Merge & Victory Effect state on Canvas
    this.mergeShockwaves = [];
    this.mergeCanvasTexts = [];
    this.heroMergeGlow = 0;
    this.canvasMergeFlash = 0;
    this.screenShake = 0;

    // Victory state
    this.isVictory = false;
    this.victoryTimer = 0;
    this.lastBounty = 0;
    this.isBossWave = false;

    this.initWave();
    this.startLoop();
  }

  setSpeed(mult) {
    this.speedMultiplier = mult;
  }

  // Calculate dynamic hero Max HP based on shields/helmets in grid
  calculateHeroStats() {
    const items = window.backpackGrid?.items || [];
    let bonusHp = 0;
    let maxShield = 0;
    items.forEach(it => {
      if (it.type === 'shield') {
        bonusHp += it.power * 1.5;
        maxShield += it.power * 0.8;
      }
      if (it.type === 'helmet') {
        bonusHp += it.power * 1.0;
        maxShield += it.power * 0.4;
      }
      if (it.synergiesActive?.some(s => s.type === 'armor')) {
        maxShield += 60; // Muralha de Aço bonus shield
      }
    });

    const newMaxHp = Math.round(this.hero.baseMaxHp + bonusHp);
    const ratio = this.hero.hp / this.hero.maxHp;
    this.hero.maxHp = newMaxHp;
    this.hero.hp = Math.min(Math.round(ratio * newMaxHp), newMaxHp);
    this.hero.maxShieldHp = Math.round(maxShield);
    if (this.hero.shieldHp === undefined || this.hero.shieldHp > this.hero.maxShieldHp) {
      this.hero.shieldHp = this.hero.maxShieldHp;
    }
  }

  initWave() {
    this.enemies = [];
    this.isVictory = false;
    this.victoryTimer = 0;
    this.isBossWave = (this.wave % 3 === 0);

    this.calculateHeroStats();
    // Heal hero 40% between waves
    this.hero.hp = Math.min(this.hero.hp + Math.round(this.hero.maxHp * 0.4), this.hero.maxHp);

    const count = this.isBossWave ? 3 : (3 + Math.min(this.wave, 5));

    for (let i = 0; i < count; i++) {
      const isBoss = (this.isBossWave && i === count - 1);
      let enemyType = 'slime';

      if (isBoss) {
        enemyType = 'boss_orc';
      } else if (this.wave === 1) {
        enemyType = i % 2 === 0 ? 'slime' : 'goblin';
      } else if (this.wave === 2) {
        enemyType = i === 0 ? 'slime' : (i % 2 === 0 ? 'goblin' : 'orc');
      } else {
        const types = ['slime', 'goblin', 'orc'];
        enemyType = types[Math.floor(Math.random() * types.length)];
      }

      // Stronger HP scaling with wave level
      const baseHp = isBoss
        ? Math.round(1800 + this.wave * 450)
        : Math.round(120 + this.wave * 90 + Math.random() * 40);

      this.enemies.push({
        id: `enemy_${this.wave}_${i}`,
        type: enemyType,
        isBoss: isBoss,
        x: isBoss ? 440 : (270 + i * 52 + Math.random() * 15),
        y: isBoss ? 110 : (115 + (Math.random() - 0.5) * 24),
        maxHp: baseHp,
        hp: baseHp,
        width: isBoss ? 68 : (enemyType === 'orc' ? 36 : (enemyType === 'goblin' ? 28 : 26)),
        height: isBoss ? 76 : (enemyType === 'orc' ? 42 : (enemyType === 'goblin' ? 34 : 26)),
        bobOffset: Math.random() * Math.PI * 2,
        hitFlash: 0,
        lungeProgress: 0,
        isAttacking: false,
        attackCooldown: 1000 + Math.random() * 1000
      });
    }

    if (this.waveCounterEl) {
      if (this.isBossWave) {
        this.waveCounterEl.innerHTML = `<span style="color:#ef4444">💀 ONDA ${this.wave} - CHEFE: OGRO TITÃ ANCIÃO</span>`;
      } else {
        const locations = ['Deserto dos Ogros', 'Canyon dos Goblins', 'Pântano dos Slimes', 'Ruínas Vulcânicas'];
        const loc = locations[(this.wave - 1) % locations.length];
        this.waveCounterEl.textContent = `Onda ${this.wave} - ${loc}`;
      }
    }
  }

  startLoop() {
    const loop = (timestamp) => {
      const dt = (timestamp - this.lastTime) * this.speedMultiplier;
      this.lastTime = timestamp;

      this.update(dt);
      this.render();

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // Trigger visual merge glow, shockwaves, particles, and power-up animation on Canvas
  triggerMergeCanvasEffect(item) {
    this.heroMergeGlow = 1.0;
    this.canvasMergeFlash = 0.5;
    this.screenShake = 7;

    const auraColor = item.tier >= 4 ? '#fbbf24' : (item.tier >= 3 ? '#c084fc' : '#38bdf8');

    // Expanding shockwave from hero
    this.mergeShockwaves.push({
      x: this.hero.x,
      y: this.hero.y,
      radius: 14,
      maxRadius: 220,
      alpha: 1.0,
      color: auraColor,
      width: 5
    });

    // Second inner shockwave
    this.mergeShockwaves.push({
      x: this.hero.x,
      y: this.hero.y,
      radius: 6,
      maxRadius: 150,
      alpha: 1.0,
      color: '#ffffff',
      width: 3
    });

    // Floating Merge Text right on Canvas
    this.mergeCanvasTexts.push({
      text: `⚡ FUSÃO! +${item.power} PODER (DPS)!`,
      x: this.hero.x + 10,
      y: this.hero.y - 36,
      alpha: 1.0,
      color: auraColor
    });

    // Burst of sparkle/radiant star particles from hero
    for (let i = 0; i < 26; i++) {
      const angle = (Math.PI * 2 * i) / 26 + (Math.random() * 0.2);
      const speed = 2.5 + Math.random() * 4.5;
      this.particles.push({
        x: this.hero.x,
        y: this.hero.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2,
        color: i % 2 === 0 ? '#fde047' : auraColor,
        radius: 3 + Math.random() * 3,
        life: 1.1
      });
    }

    // Hero triggers immediate supercharged strike
    this.hero.isAttacking = true;
    this.hero.attackSwingProgress = 0;
  }

  update(dt) {
    if (dt > 100) dt = 100; // cap lag spikes

    // Hero idle breathing animation
    this.hero.bobOffset += dt * 0.005;

    // Victory celebration pause
    if (this.isVictory) {
      this.victoryTimer -= dt;
      this.updateCoinsAndParticles(dt);
      if (this.victoryTimer <= 0) {
        this.wave++;
        this.initWave();
        window.shopManager?.onNewWave(this.wave);
      }
      return;
    }

    // Hero attack cadence (scales directly with Total Power / DPS)
    this.heroAttackTimer += dt;
    if (this.heroAttackTimer >= this.heroAttackInterval) {
      this.heroAttackTimer = 0;
      this.executeHeroAttack();
    }

    // Update hero attack animation
    if (this.hero.isAttacking) {
      this.hero.attackSwingProgress += dt / 140;
      if (this.hero.attackSwingProgress >= 1) {
        this.hero.isAttacking = false;
        this.hero.attackSwingProgress = 0;
      }
    }

    // Hero hit flash and recoil recovery
    if (this.hero.hitFlash > 0) {
      this.hero.hitFlash -= dt * 0.01;
    }
    if (this.hero.recoilX !== 0) {
      this.hero.recoilX *= 0.85;
      if (Math.abs(this.hero.recoilX) < 0.2) this.hero.recoilX = 0;
    }

    // Potion passive regeneration & active combat heal
    this.hero.regenTimer += dt;
    if (this.hero.regenTimer >= 2500) {
      this.hero.regenTimer = 0;
      const items = window.backpackGrid?.items || [];
      const hasPotion = items.some(it => it.type === 'potion' || it.category === 'potion');
      if (hasPotion && this.hero.hp < this.hero.maxHp) {
        const healAmt = Math.round(this.hero.maxHp * 0.09);
        this.hero.hp = Math.min(this.hero.hp + healAmt, this.hero.maxHp);
        this.showFloatingDamage(this.hero.x, this.hero.y - 15, `+${healAmt} HP`, false, '#22c55e');
      }
    }

    // Shield passive recharge (Armors & Shields)
    this.hero.shieldCooldown = (this.hero.shieldCooldown || 0) + dt;
    if (this.hero.shieldCooldown >= 3500) {
      this.hero.shieldCooldown = 0;
      if (this.hero.maxShieldHp > 0 && this.hero.shieldHp < this.hero.maxShieldHp) {
        const recharge = Math.round(this.hero.maxShieldHp * 0.3);
        this.hero.shieldHp = Math.min(this.hero.shieldHp + recharge, this.hero.maxShieldHp);
        this.showFloatingDamage(this.hero.x, this.hero.y - 25, `+${recharge} 🛡️`, false, '#38bdf8');
      }
    }

    // Enemy attack against Hero cadence
    this.enemyAttackTimer += dt;
    if (this.enemyAttackTimer >= this.enemyAttackInterval) {
      this.enemyAttackTimer = 0;
      this.executeEnemyAttack();
    }

    // Update screen shake
    if (this.screenShake > 0) {
      this.screenShake -= dt * 0.02;
      if (this.screenShake < 0) this.screenShake = 0;
    }

    // Update hero merge glow
    if (this.heroMergeGlow > 0) {
      this.heroMergeGlow -= dt * 0.0012;
      if (this.heroMergeGlow < 0) this.heroMergeGlow = 0;
    }

    // Update canvas merge flash
    if (this.canvasMergeFlash > 0) {
      this.canvasMergeFlash -= dt * 0.0016;
      if (this.canvasMergeFlash < 0) this.canvasMergeFlash = 0;
    }

    // Update shockwaves
    for (let i = this.mergeShockwaves.length - 1; i >= 0; i--) {
      const sw = this.mergeShockwaves[i];
      sw.radius += (dt / 16) * 6;
      sw.alpha = Math.max(1 - (sw.radius / sw.maxRadius), 0);
      if (sw.radius >= sw.maxRadius || sw.alpha <= 0) {
        this.mergeShockwaves.splice(i, 1);
      }
    }

    // Update floating canvas texts
    for (let i = this.mergeCanvasTexts.length - 1; i >= 0; i--) {
      const ct = this.mergeCanvasTexts[i];
      ct.y -= (dt / 16) * 0.7;
      ct.alpha -= (dt / 16) * 0.016;
      if (ct.alpha <= 0) {
        this.mergeCanvasTexts.splice(i, 1);
      }
    }

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const en = this.enemies[i];
      en.bobOffset += dt * 0.005;
      if (en.hitFlash > 0) {
        en.hitFlash -= dt * 0.01;
      }

      // Lunge animation
      if (en.isAttacking) {
        en.lungeProgress += dt / 150;
        if (en.lungeProgress >= 1) {
          en.isAttacking = false;
          en.lungeProgress = 0;
        }
      }

      if (en.hp <= 0) {
        this.spawnDefeatParticles(en.x, en.y, en.isBoss);
        const rewardGold = en.isBoss ? 50 : 15;
        window.appState?.addGold(rewardGold);
        this.enemies.splice(i, 1);
      }
    }

    // CHECK VICTORY: Horde/Boss HP reached 0!
    if (this.enemies.length === 0 && !this.isVictory) {
      this.triggerVictory();
    }

    this.updateCoinsAndParticles(dt);
  }

  updateCoinsAndParticles(dt) {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);
      p.life -= dt * 0.002;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update victory coins
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.x += c.vx * (dt / 16);
      c.y += c.vy * (dt / 16);
      c.vy += 0.25; // gravity
      c.rot += c.vRot;
      c.life -= dt * 0.0008;
      if (c.y > this.canvas.height - 20) {
        c.y = this.canvas.height - 20;
        c.vy = -c.vy * 0.45; // bounce
      }
      if (c.life <= 0) {
        this.coins.splice(i, 1);
      }
    }
  }

  // Hero attacks front enemy based on Total Power (DPS)
  executeHeroAttack() {
    if (this.enemies.length === 0) return;

    this.hero.isAttacking = true;
    this.hero.attackSwingProgress = 0;

    const target = this.enemies[0];
    const totalPower = window.backpackGrid?.calculateTotalPower() || 100;
    const intervalSec = this.heroAttackInterval / 1000;

    const items = window.backpackGrid?.items || [];
    const hasWhetstone = items.some(it => it.type === 'whetstone' || it.synergiesActive?.some(s => s.type === 'sharp'));
    const hasFire = items.some(it => it.type === 'spellbook' || it.synergiesActive?.some(s => s.type === 'fire'));

    // Damage per hit matches DPS directly: baseDmg = DPS * interval
    const baseDmg = Math.round(totalPower * intervalSec);
    const critRate = hasWhetstone ? 0.44 : 0.22;
    const isCrit = Math.random() < critRate;
    const dmg = Math.round(baseDmg * (isCrit ? (hasWhetstone ? 2.2 : 1.9) : 1.0) * (0.92 + Math.random() * 0.16));

    target.hp -= dmg;
    target.hitFlash = 1;

    // Sound
    window.sound?.playAttackHit(isCrit);

    // Visual Slash sparks
    this.spawnSlashParticles(target.x, target.y);

    // Spellbook Fire Burn Burst
    if (hasFire) {
      const burnDmg = Math.round(dmg * 0.22);
      target.hp -= burnDmg;
      this.showFloatingDamage(target.x + 10, target.y - 20, `🔥+${burnDmg}`, false, '#f97316');
      for (let p = 0; p < 5; p++) {
        this.particles.push({
          x: target.x + (Math.random() - 0.5) * 20,
          y: target.y + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 4,
          vy: -Math.random() * 4 - 1,
          color: p % 2 === 0 ? '#f97316' : '#fde047',
          radius: 2 + Math.random() * 3,
          life: 0.6
        });
      }
    }

    // Floating damage numbers
    this.showFloatingDamage(target.x, target.y, dmg, isCrit);
  }

  // Enemy counter-attacks Hero (Absorbed by Shield first)
  executeEnemyAttack() {
    if (this.enemies.length === 0 || this.hero.hp <= 0) return;

    const attacker = this.enemies[0];
    attacker.isAttacking = true;
    attacker.lungeProgress = 0;

    const items = window.backpackGrid?.items || [];
    let defense = 0;
    items.forEach(it => {
      if (it.type === 'shield' || it.type === 'helmet') defense += it.power * 0.25;
    });

    const rawDmg = Math.round(18 + this.wave * 8 + (attacker.isBoss ? 45 : 0) + Math.random() * 10);
    let finalDmg = Math.max(Math.round(rawDmg - defense * 0.15), 6);

    // Shield barrier absorption
    if (this.hero.shieldHp > 0) {
      const absorbed = Math.min(this.hero.shieldHp, finalDmg);
      this.hero.shieldHp -= absorbed;
      finalDmg -= absorbed;
      if (absorbed > 0) {
        this.showFloatingDamage(this.hero.x, this.hero.y - 32, `🛡️ -${absorbed} Absorvido`, false, '#38bdf8');
      }
    }

    if (finalDmg > 0) {
      this.hero.hp -= finalDmg;
      this.hero.hitFlash = 1;
      this.hero.recoilX = -8;
      this.screenShake = attacker.isBoss ? 6 : 2;
      window.sound?.playHurt();
      this.showFloatingDamage(this.hero.x, this.hero.y - 20, `-${finalDmg}`, false, '#f87171');
    }

    // Emergency Revitalize if Hero falls
    if (this.hero.hp <= 0) {
      this.hero.hp = Math.round(this.hero.maxHp * 0.5);
      this.showFloatingDamage(this.hero.x, this.hero.y - 35, '✨ REVITALIZADO!', true, '#38bdf8');
      window.sound?.playTone(440, 'triangle', 0.2);
    }
  }

  // When horde or boss HP reaches 0: Victory Effect & Gold Bounty
  triggerVictory() {
    this.isVictory = true;
    this.victoryTimer = 2200; // ms display before next wave
    this.screenShake = 10;

    // Gold bounty scales with wave and boss
    const bounty = 40 + (this.wave * 25) + (this.isBossWave ? 150 : 0);
    this.lastBounty = bounty;
    window.appState?.addGold(bounty);

    // Play Victory Sound Fanfare
    window.sound?.playVictory();

    // Spawn 35 raining gold coins
    for (let i = 0; i < 35; i++) {
      this.coins.push({
        x: 180 + Math.random() * 320,
        y: 20 + Math.random() * 60,
        vx: (Math.random() - 0.5) * 6,
        vy: -Math.random() * 5 - 2,
        rot: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.3,
        radius: 6,
        life: 1.0
      });
    }

    // Sparkles
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 5;
      this.particles.push({
        x: this.canvas.width / 2,
        y: this.canvas.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: i % 2 === 0 ? '#fde047' : '#f59e0b',
        radius: 3 + Math.random() * 3,
        life: 1.3
      });
    }
  }

  spawnSlashParticles(x, y) {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: Math.random() > 0.5 ? '#f59e0b' : '#c084fc',
        radius: 2 + Math.random() * 3,
        life: 1
      });
    }
  }

  spawnDefeatParticles(x, y, isBoss) {
    for (let i = 0; i < (isBoss ? 30 : 12); i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 5;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        color: '#fde047',
        radius: 3 + Math.random() * 3,
        life: 1.2
      });
    }
  }

  showFloatingDamage(worldX, worldY, amount, isCrit, color = null) {
    if (!this.damageLayer) return;

    const canvasRect = this.canvas.getBoundingClientRect();
    const scaleX = canvasRect.width / this.canvas.width;
    const scaleY = canvasRect.height / this.canvas.height;

    const screenX = worldX * scaleX;
    const screenY = (worldY - 20) * scaleY;

    const el = document.createElement('div');
    el.className = `floating-dmg ${isCrit ? 'crit' : ''}`;
    el.textContent = isCrit ? `💥 ${amount}!` : amount;
    if (color) el.style.color = color;
    el.style.left = `${screenX}px`;
    el.style.top = `${screenY}px`;

    this.damageLayer.appendChild(el);
    setTimeout(() => el.remove(), 950);
  }

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();

    // Camera shake on merge or heavy impact
    if (this.screenShake > 0) {
      const sx = (Math.random() - 0.5) * this.screenShake;
      const sy = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(sx, sy);
    }

    // Background gradient: Sandy canyon / desert battlefield
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#c28854');
    bgGrad.addColorStop(0.55, '#d49b65');
    bgGrad.addColorStop(1, '#8c5932');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Canyon rocks & ground shadows
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.beginPath();
    ctx.ellipse(w / 2, h - 25, w * 0.48, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Render Enemies
    this.enemies.forEach(en => this.renderEnemy(ctx, en));

    // Render Hero with Backpack and Health Bar
    this.renderHero(ctx, this.hero);

    // Render Shockwaves from Merge
    this.mergeShockwaves.forEach(sw => {
      ctx.save();
      ctx.strokeStyle = sw.color;
      ctx.globalAlpha = sw.alpha;
      ctx.lineWidth = sw.width;
      ctx.shadowColor = sw.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    // Render Particles
    this.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Render Coins (Victory)
    this.coins.forEach(c => {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = '#fde047';
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, c.radius, c.radius * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    // Render Canvas Merge Ambient Bloom Flash
    if (this.canvasMergeFlash > 0) {
      ctx.save();
      ctx.globalAlpha = this.canvasMergeFlash;
      const flashGrad = ctx.createRadialGradient(this.hero.x, this.hero.y, 10, this.hero.x, this.hero.y, w * 0.75);
      flashGrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
      flashGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.25)');
      flashGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = flashGrad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // Render Floating Merge Texts on Canvas
    this.mergeCanvasTexts.forEach(ct => {
      ctx.save();
      ctx.font = 'bold 15px "Luckiest Guy", sans-serif';
      ctx.textAlign = 'center';
      ctx.globalAlpha = Math.max(ct.alpha, 0);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.strokeText(ct.text, ct.x, ct.y);
      ctx.fillStyle = ct.color;
      ctx.fillText(ct.text, ct.x, ct.y);
      ctx.restore();
    });

    // Render Grand Boss Health Bar at Top of Canvas if Boss Wave
    if (this.isBossWave && !this.isVictory) {
      const boss = this.enemies.find(e => e.isBoss);
      if (boss) {
        this.renderBossHeaderBar(ctx, boss, w);
      }
    }

    // Render Victory Banner Overlay
    if (this.isVictory) {
      this.renderVictoryOverlay(ctx, w, h);
    }

    ctx.restore();
  }

  // Grand Boss Health Bar across canvas top
  renderBossHeaderBar(ctx, boss, w) {
    const barW = Math.min(w * 0.7, 380);
    const barH = 14;
    const barX = (w - barW) / 2;
    const barY = 8;
    const hpRatio = Math.max(boss.hp / boss.maxHp, 0);

    // Background container
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.fillRect(barX, barY, barW, barH);
    ctx.strokeRect(barX, barY, barW, barH);

    // Fill gradient
    const fillGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    fillGrad.addColorStop(0, '#ef4444');
    fillGrad.addColorStop(0.5, '#dc2626');
    fillGrad.addColorStop(1, '#991b1b');
    ctx.fillStyle = fillGrad;
    ctx.fillRect(barX + 2, barY + 2, Math.max((barW - 4) * hpRatio, 0), barH - 4);

    // Boss Name & HP Text
    ctx.font = 'bold 10px "Outfit", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText(`👑 CHEFE: OGRO TITÃ ANCIÃO • ${boss.hp} / ${boss.maxHp}`, w / 2, barY + barH - 3);
    ctx.shadowBlur = 0;
  }

  // Victory Banner Overlay when wave is cleared
  renderVictoryOverlay(ctx, w, h) {
    ctx.save();
    // Backdrop glow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, w, h);

    // Radial golden burst
    const sunburst = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, 240);
    sunburst.addColorStop(0, 'rgba(253, 224, 71, 0.4)');
    sunburst.addColorStop(0.6, 'rgba(234, 88, 12, 0.25)');
    sunburst.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sunburst;
    ctx.fillRect(0, 0, w, h);

    // Main Victory Card
    const cardW = 340;
    const cardH = 80;
    const cardX = (w - cardW) / 2;
    const cardY = (h - cardH) / 2;

    ctx.fillStyle = 'rgba(24, 13, 7, 0.95)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(cardX, cardY, cardW, cardH, 14) : ctx.rect(cardX, cardY, cardW, cardH);
    ctx.fill();
    ctx.stroke();

    // Banner Text
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px "Luckiest Guy", sans-serif';
    ctx.fillStyle = '#fef08a';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 4;
    const title = this.isBossWave ? '🔥 CHEFE DESTRUÍDO! VITÓRIA! 🔥' : `🏆 ONDA ${this.wave} CONCLUÍDA! 🏆`;
    ctx.strokeText(title, w / 2, cardY + 32);
    ctx.fillText(title, w / 2, cardY + 32);

    // Bounty Text
    ctx.font = 'bold 14px "Luckiest Guy", sans-serif';
    ctx.fillStyle = '#fde047';
    ctx.fillText(`+🪙 ${this.lastBounty} OURO CONQUISTADO! • PREPARANDO PRÓXIMA ONDA...`, w / 2, cardY + 60);

    ctx.restore();
  }

  // Render Hero with Backpack, Health Bar, Cape, and Weapon
  renderHero(ctx, h) {
    ctx.save();
    const bob = Math.sin(h.bobOffset) * 2;
    ctx.translate(h.x + h.recoilX, h.y + bob);

    // 1. HERO HEALTH BAR (Above Hero)
    const barW = 48;
    const barH = 6;
    const hpRatio = Math.max(h.hp / h.maxHp, 0);

    // Bar background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-barW / 2, -36, barW, barH);
    ctx.strokeRect(-barW / 2, -36, barW, barH);

    // Health color gradient: Green -> Amber -> Red
    let hpColor = '#10b981';
    if (hpRatio < 0.3) hpColor = '#ef4444';
    else if (hpRatio < 0.6) hpColor = '#f59e0b';

    ctx.fillStyle = hpColor;
    ctx.fillRect(-barW / 2 + 1, -35, Math.max((barW - 2) * hpRatio, 0), barH - 2);

    // Shield Bar Overlay (if hero has active shield from armors)
    if (h.shieldHp > 0 && h.maxShieldHp > 0) {
      const shieldRatio = Math.min(h.shieldHp / h.maxShieldHp, 1);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.fillRect(-barW / 2 + 1, -35, Math.max((barW - 2) * shieldRatio, 0), barH - 2);
    }

    // HP & Shield Text
    ctx.font = 'bold 8px "Outfit", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    const shieldStr = (h.shieldHp > 0) ? ` (+${h.shieldHp}🛡️)` : '';
    ctx.fillText(`HP ${h.hp}/${h.maxHp}${shieldStr}`, 0, -40);

    // 2. HERO MERGE RADIANT AURA
    if (this.heroMergeGlow > 0) {
      ctx.save();
      const auraGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 52);
      auraGrad.addColorStop(0, `rgba(254, 240, 138, ${this.heroMergeGlow * 0.95})`);
      auraGrad.addColorStop(0.5, `rgba(192, 132, 252, ${this.heroMergeGlow * 0.65})`);
      auraGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 52, 0, Math.PI * 2);
      ctx.fill();

      // Rotating celestial energy rays
      const rays = 8;
      ctx.strokeStyle = `rgba(253, 224, 71, ${this.heroMergeGlow * 0.8})`;
      ctx.lineWidth = 2.5;
      const rot = performance.now() * 0.003;
      for (let r = 0; r < rays; r++) {
        const ang = rot + (r * Math.PI * 2) / rays;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * 14, Math.sin(ang) * 14);
        ctx.lineTo(Math.cos(ang) * 44, Math.sin(ang) * 44);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Hero shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 20, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Red Cape (fluttering)
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(-12, -4);
    ctx.lineTo(-24 - Math.sin(h.bobOffset) * 3, 18);
    ctx.lineTo(-6, 20);
    ctx.closePath();
    ctx.fill();

    // Backpack (Tactical leather inventory bag!)
    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    ctx.fillRect(-18, -10, 12, 22);
    ctx.strokeRect(-18, -10, 12, 22);
    // Backpack buckle
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-17, 0, 10, 4);

    // Hero Body / Armor
    ctx.fillStyle = h.hitFlash > 0 ? '#ffffff' : '#475569';
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();

    // Hero Head
    ctx.fillStyle = h.hitFlash > 0 ? '#ffffff' : '#fed7aa';
    ctx.beginPath();
    ctx.arc(2, -14, 10, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.arc(0, -17, 10, Math.PI, 0);
    ctx.fill();

    // Weapon Swing Animation
    ctx.save();
    if (h.isAttacking) {
      const swingAngle = -Math.PI / 4 + h.attackSwingProgress * (Math.PI / 1.4);
      ctx.rotate(swingAngle);

      // Weapon blade
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(36, -14);
      ctx.stroke();

      // Slashing Energy Arc
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(16, 0, 26, -0.45, 0.45);
      ctx.stroke();
    } else {
      // Idle weapon
      ctx.rotate(Math.PI / 6);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(26, -4);
      ctx.stroke();
    }
    ctx.restore();

    ctx.restore();
  }

  // Render Enemy (Slimes, Goblins, Orcs, Boss Ogro Titã)
  renderEnemy(ctx, en) {
    ctx.save();
    const bob = Math.sin(en.bobOffset) * 3;
    const lungeX = en.isAttacking ? -Math.sin(en.lungeProgress * Math.PI) * 22 : 0;
    ctx.translate(en.x + lungeX, en.y + bob);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0, en.height / 2 + 6, en.width / 2, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Flash white when hit
    if (en.hitFlash > 0) {
      ctx.fillStyle = '#ffffff';
    } else if (en.type === 'slime') {
      ctx.fillStyle = '#84cc16';
    } else if (en.type === 'goblin') {
      ctx.fillStyle = '#10b981';
    } else if (en.type === 'orc') {
      ctx.fillStyle = '#65a30d';
    } else if (en.type === 'boss_orc') {
      ctx.fillStyle = '#4d7c0f';
    }

    // 1. SLIME (Squish & Stretch animation)
    if (en.type === 'slime') {
      const squish = Math.sin(en.bobOffset * 2) * 0.15;
      ctx.save();
      ctx.scale(1 + squish, 1 - squish);
      ctx.beginPath();
      ctx.ellipse(0, 0, en.width / 2, en.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(-5, -2, 3, 0, Math.PI * 2);
      ctx.arc(5, -2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(-6, -4, 2, 2);
      ctx.fillRect(4, -4, 2, 2);
      ctx.restore();
    }
    // 2. BOSS OGRO TITÃ (Colossal Boss)
    else if (en.type === 'boss_orc') {
      ctx.save();
      // Giant Armored Body
      ctx.beginPath();
      ctx.roundRect
        ? ctx.roundRect(-en.width / 2, -en.height / 2, en.width, en.height, 12)
        : ctx.rect(-en.width / 2, -en.height / 2, en.width, en.height);
      ctx.fill();

      // Chestplate armor plate
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-en.width / 3, -en.height / 4, (en.width * 2) / 3, en.height / 2);

      // Skull Horns Crown
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(-en.width / 2, -en.height / 2);
      ctx.lineTo(-en.width / 2 - 14, -en.height / 2 - 20);
      ctx.lineTo(-en.width / 4, -en.height / 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(en.width / 2, -en.height / 2);
      ctx.lineTo(en.width / 2 + 14, -en.height / 2 - 20);
      ctx.lineTo(en.width / 4, -en.height / 2);
      ctx.fill();

      // Glowing Red Boss Eyes
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-18, -12, 8, 6);
      ctx.fillRect(10, -12, 8, 6);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-16, -10, 4, 3);
      ctx.fillRect(12, -10, 4, 3);

      // Colossal War Hammer
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-en.width / 2 - 16, -10, 8, 48);
      ctx.fillStyle = '#475569';
      ctx.fillRect(-en.width / 2 - 26, -26, 28, 20);
      ctx.restore();
    }
    // 3. GOBLIN / ORC
    else {
      ctx.beginPath();
      ctx.roundRect
        ? ctx.roundRect(-en.width / 2, -en.height / 2, en.width, en.height, 8)
        : ctx.rect(-en.width / 2, -en.height / 2, en.width, en.height);
      ctx.fill();

      // Horns / Pointy ears
      ctx.fillStyle = en.type === 'orc' ? '#fde047' : '#10b981';
      ctx.beginPath();
      ctx.moveTo(-en.width / 3, -en.height / 2);
      ctx.lineTo(-en.width / 2 - 5, -en.height / 2 - 8);
      ctx.lineTo(-en.width / 4, -en.height / 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(en.width / 3, -en.height / 2);
      ctx.lineTo(en.width / 2 + 5, -en.height / 2 - 8);
      ctx.lineTo(en.width / 4, -en.height / 2);
      ctx.fill();

      // Angry Eyes & Tusks
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-en.width / 3, -en.height / 4, 4, 4);
      ctx.fillRect(en.width / 6, -en.height / 4, 4, 4);

      // Tusks
      if (en.type === 'orc') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-en.width / 4, en.height / 6, 3, 5);
        ctx.fillRect(en.width / 5, en.height / 6, 3, 5);
      }
    }

    // Health Bar (Unless it's the boss which has the top banner bar)
    if (!en.isBoss) {
      const hpPercent = Math.max(en.hp / en.maxHp, 0);
      const barW = en.width + 10;
      const barH = 5;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(-barW / 2, -en.height / 2 - 12, barW, barH);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(-barW / 2, -en.height / 2 - 12, barW * hpPercent, barH);
    }

    ctx.restore();
  }
}
