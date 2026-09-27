import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'bigvalue', standalone: true })
export class BigvaluePipe implements PipeTransform {
  transform(valeur: number | null | undefined): string {
    if (valeur === null || valeur === undefined) return '0';
    if (valeur < 1000) return valeur.toFixed(2);
    if (valeur < 1_000_000) return valeur.toFixed(0);
    // notation scientifique -> 10^n en HTML
    let res = valeur.toPrecision(4);
    res = res.replace(/e\+(.*)/, ' ×10<sup>$1</sup>');
    return res;
  }
}
