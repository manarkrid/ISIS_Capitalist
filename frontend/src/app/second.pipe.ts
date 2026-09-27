import { Pipe, PipeTransform } from '@angular/core';

/** Transforme un temps en millisecondes -> hh:mm:ss.d */
@Pipe({ name: 'second', standalone: true })
export class SecondPipe implements PipeTransform {
  transform(ms: number | null | undefined): string {
    if (!ms || ms <= 0) return '00:00:00.0';
    const total = Math.floor(ms / 100);
    const d = total % 10;
    const s = Math.floor(total / 10) % 60;
    const m = Math.floor(total / 600) % 60;
    const h = Math.floor(total / 36000);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}.${d}`;
  }
}
