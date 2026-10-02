import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'bigvalue', standalone: true })
export class BigvaluePipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value == null || !Number.isFinite(value)) return '0';
    if (Math.abs(value) < 1000) return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (Math.abs(value) < 1_000_000) return value.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
    return value.toExponential(3).replace('.', ',').replace(/e\+?(.*)/, ' ×10<sup>$1</sup>');
  }
}
