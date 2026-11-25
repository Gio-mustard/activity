'use client';

/**
 * CANAL VISUAL — este si esta implementado.
 *
 * Es el unico feedback que llega a todos los telefonos: el sonido se pierde
 * en un salon con treinta aparatos y la vibracion no existe en iPhone.
 *
 * - acierto: confeti, dibujado a mano en un canvas. Sin dependencias, que es
 *   la linea del proyecto, y asi pesa unas lineas en vez de un paquete.
 * - fallo: una sacudida corta de la pantalla. Nada de rojo a pantalla
 *   completa: el alumno ya sabe que fallo, no hay que regañarlo.
 *
 * Con "reducir movimiento" activado no se dibuja ni se sacude nada. Quien
 * pide menos animacion lo pide por algo, y el marcador y el +N de la pantalla
 * siguen contando lo mismo sin moverse.
 */
import type { FeedbackChannel, FeedbackEvent, FeedbackOptions } from './events';

/** Colores de los equipos, para que el confeti sea de la casa. */
const COLORES = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#ec4899'];

const PIEZAS = 110;
const GRAVEDAD = 0.32;
const ROCE = 0.992;
const CLASE_SACUDIDA = 'feedback-shake';

interface Pieza {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ancho: number;
  alto: number;
  giro: number;
  vGiro: number;
  color: string;
  vida: number;
}

function prefiereQuieto(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function nuevaPieza(ancho: number, alto: number): Pieza {
  // Salen desde los dos tercios inferiores hacia arriba, como un cañon doble.
  const desdeIzquierda = Math.random() < 0.5;
  const x = desdeIzquierda ? ancho * 0.15 : ancho * 0.85;
  const empuje = 9 + Math.random() * 7;
  const angulo = (desdeIzquierda ? -60 : -120) + (Math.random() * 40 - 20);
  const rad = (angulo * Math.PI) / 180;
  return {
    x,
    y: alto * 0.72,
    vx: Math.cos(rad) * empuje,
    vy: Math.sin(rad) * empuje,
    ancho: 6 + Math.random() * 6,
    alto: 9 + Math.random() * 7,
    giro: Math.random() * Math.PI,
    vGiro: (Math.random() - 0.5) * 0.3,
    color: COLORES[Math.floor(Math.random() * COLORES.length)],
    vida: 1,
  };
}

export function createVisualChannel(): FeedbackChannel {
  let lienzo: HTMLCanvasElement | null = null;
  let cuadro: number | null = null;
  let sacudida: number | null = null;

  function obtenerLienzo(): HTMLCanvasElement {
    if (lienzo) return lienzo;
    const el = document.createElement('canvas');
    el.setAttribute('aria-hidden', 'true');
    // Por encima de todo y sin estorbar: el alumno tiene que poder seguir pulsando.
    el.style.cssText =
      'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:60;';
    document.body.appendChild(el);
    lienzo = el;
    return el;
  }

  function confeti() {
    const el = obtenerLienzo();
    const ctx = el.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ancho = window.innerWidth;
    const alto = window.innerHeight;
    el.width = Math.floor(ancho * dpr);
    el.height = Math.floor(alto * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const piezas = Array.from({ length: PIEZAS }, () => nuevaPieza(ancho, alto));
    if (cuadro !== null) cancelAnimationFrame(cuadro);

    const paso = () => {
      ctx.clearRect(0, 0, ancho, alto);
      let vivas = 0;

      for (const p of piezas) {
        p.vy += GRAVEDAD;
        p.vx *= ROCE;
        p.x += p.vx;
        p.y += p.vy;
        p.giro += p.vGiro;
        if (p.y > alto * 0.55) p.vida -= 0.012;
        if (p.vida <= 0 || p.y > alto + 40) continue;
        vivas++;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.vida);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.giro);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.ancho / 2, -p.alto / 2, p.ancho, p.alto);
        ctx.restore();
      }

      if (vivas > 0) {
        cuadro = requestAnimationFrame(paso);
        return;
      }
      ctx.clearRect(0, 0, ancho, alto);
      cuadro = null;
    };

    cuadro = requestAnimationFrame(paso);
  }

  function sacudir(target?: HTMLElement | null) {
    const el = target ?? document.body;
    el.classList.remove(CLASE_SACUDIDA);
    // Reinicia la animacion aunque ya estuviera puesta: leer offsetWidth la fuerza.
    void el.offsetWidth;
    el.classList.add(CLASE_SACUDIDA);
    if (sacudida !== null) window.clearTimeout(sacudida);
    sacudida = window.setTimeout(() => el.classList.remove(CLASE_SACUDIDA), 600);
  }

  return {
    name: 'visual',
    ready: true,
    play(event: FeedbackEvent, options?: FeedbackOptions) {
      if (prefiereQuieto()) return;
      if (event === 'correct') confeti();
      if (event === 'incorrect') sacudir(options?.target);
    },
    dispose() {
      if (cuadro !== null) cancelAnimationFrame(cuadro);
      if (sacudida !== null) window.clearTimeout(sacudida);
      lienzo?.remove();
      lienzo = null;
    },
  };
}
