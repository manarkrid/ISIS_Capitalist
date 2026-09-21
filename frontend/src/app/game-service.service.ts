import { Injectable, signal, inject } from '@angular/core';
import { GetWorldGQL, World } from './graphql/generated';

@Injectable({
  providedIn: 'root'
})
export class GameServiceService {
  private getWorldGQL = inject(GetWorldGQL);

  // Signaux réactifs pour gérer l'état du jeu
  public server = signal<string>('http://localhost:3000/');
  public user = signal<string>('');
  public world = signal<World | null>(null);

  constructor() {
    // Récupération ou génération du pseudo dans le localStorage
    const savedUser = localStorage.getItem('username') || 'Joueur' + Math.floor(Math.random() * 1000);
    this.setUser(savedUser);
  }

  public setUser(newUser: string) {
    this.user.set(newUser);
    localStorage.setItem('username', newUser);
    this.readWorld();
  }

  // Chargement du monde depuis le backend NestJS
  public readWorld() {
    this.getWorldGQL.fetch({ variables: { user: this.user() } }).subscribe({
      next: (result) => {
        if (result.data?.getWorld) {
          this.world.set(result.data.getWorld as World);
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement du monde :', error);
      }
    });
  }
}