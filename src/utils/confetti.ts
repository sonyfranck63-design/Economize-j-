import confetti from 'canvas-confetti';
import { hapticNotificationSuccess } from './haptics';

/**
 * Dispara uma celebração visual com fogos de artifício e confetes multicoloridos.
 * Especialmente projetado para o momento em que o cliente escolhe uma proposta comercial.
 */
export const triggerCelebrationFireworks = () => {
  try {
    // Feedback tátil nativo
    hapticNotificationSuccess();

    // 1. Canhão esquerdo subindo
    confetti({
      particleCount: 70,
      angle: 60,
      spread: 65,
      origin: { x: 0.15, y: 0.8 },
      colors: ['#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#8B5CF6'],
      ticks: 250,
      gravity: 1.1,
      scalar: 1.1,
    });

    // 2. Canhão direito subindo
    confetti({
      particleCount: 70,
      angle: 120,
      spread: 65,
      origin: { x: 0.85, y: 0.8 },
      colors: ['#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#8B5CF6'],
      ticks: 250,
      gravity: 1.1,
      scalar: 1.1,
    });

    // 3. Explosão central tipo fogos de artifício estelar (delay 250ms)
    setTimeout(() => {
      confetti({
        particleCount: 90,
        spread: 100,
        origin: { x: 0.5, y: 0.55 },
        colors: ['#059669', '#FBBF24', '#60A5FA', '#34D399', '#F43F5E'],
        ticks: 300,
        shapes: ['circle', 'square'],
      });
    }, 250);

    // 4. Chuva dourada e verde suave caindo do topo (delay 450ms)
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 90,
        spread: 120,
        origin: { x: 0.5, y: 0.2 },
        colors: ['#10B981', '#F59E0B', '#E11D48'],
        gravity: 0.8,
        ticks: 280,
      });
    }, 450);
  } catch (err) {
    console.warn('Erro ao disparar confetes:', err);
  }
};
