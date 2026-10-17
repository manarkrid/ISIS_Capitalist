import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AudioService {
  readonly muted = signal(false);
  readonly playing = signal(false);

  private bgMusic: HTMLAudioElement | null = null;

  private readonly sounds = {
    bg:          'assets/sounds/background.mp3',
    coin:        'assets/sounds/coin.mp3',
    achievement: 'assets/sounds/achievement.mp3',
    manager:     'assets/sounds/pplause short.mp3',
    error:       'assets/sounds/error buzz.mp3',
    yay:         'assets/sounds/yay.mp3',
  };

  constructor() {
    try {
      const saved = localStorage.getItem('audioMuted');
      if (saved === 'true') this.muted.set(true);
    } catch { /* ignore */ }
  }

  /** Démarre la musique de fond au premier geste utilisateur. */
  startBgMusic(): void {
    if (this.bgMusic) return;
    const audio = new Audio(this.sounds.bg);
    audio.loop = true;
    audio.volume = 0.3;
    audio.muted = this.muted();
    this.bgMusic = audio;
    audio.play()
      .then(() => this.playing.set(true))
      .catch((err) => console.warn('Audio bloqué:', err));
  }

  /** Arrête ou reprend la musique de fond. */
  toggleMusic(): void {
    if (!this.bgMusic) { this.startBgMusic(); return; }
    if (this.playing()) {
      this.bgMusic.pause();
      this.playing.set(false);
    } else {
      this.bgMusic.play()
        .then(() => this.playing.set(true))
        .catch((err) => console.warn('Audio bloqué:', err));
    }
  }

  /** Coupe/rétablit le volume sans arrêter la musique. */
  toggleMute(): void {
    const next = !this.muted();
    this.muted.set(next);
    if (this.bgMusic) this.bgMusic.muted = next;
    try { localStorage.setItem('audioMuted', String(next)); } catch { /* ignore */ }
  }

  playCoin(): void    { this.playSfx(this.sounds.coin, 0.6); }
  playAchievement(): void { this.playSfx(this.sounds.achievement, 0.7); }
  playManager(): void { this.playSfx(this.sounds.manager, 0.5); }
  playError(): void   { this.playSfx(this.sounds.error, 0.5); }
  playYay(): void     { this.playSfx(this.sounds.yay, 0.7); }

  private playSfx(src: string, volume: number): void {
    if (this.muted()) return;
    const sfx = new Audio(src);
    sfx.volume = volume;
    sfx.play().catch(() => { /* ignore */ });
  }
}
