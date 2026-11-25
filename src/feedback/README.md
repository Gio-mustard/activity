# Capa `feedback`

Respuesta sensorial a lo que pasa en el juego: confeti al acertar, una
sacudida al fallar y, mas adelante, sonido y vibracion.

## Por que es una capa y no un par de funciones sueltas

Las pantallas piden un **momento del juego**, no un efecto:

```tsx
const { play } = useFeedback();
play('correct');
```

El pulsador no sabe si un acierto suena, vibra o tira confeti. Gracias a eso
se puede agregar el sonido sin volver a abrir `BuzzerScreen`, y se puede
apagar un canal entero sin tocar una sola vista.

## Piezas

| Archivo | Que hace |
| --- | --- |
| `events.ts` | Catalogo cerrado de momentos y el contrato `FeedbackChannel`. |
| `visual.ts` | **Implementado.** Confeti en canvas y sacudida de pantalla. |
| `sound.ts` | **Preparado, mudo.** Falta poner los archivos y apuntarlos. |
| `haptics.ts` | **Preparado, quieto.** Falta definir los patrones de vibracion. |
| `FeedbackProvider.tsx` | Monta los canales y expone `useFeedback()`. |

## Relacion con las otras capas

- **views** es quien la usa: envuelve la app en `FeedbackProvider` y llama a
  `play()` desde los componentes.
- **realtime** no la toca. El estado llega por el socket y es la vista la que
  decide que eso merece un festejo; el servidor no manda efectos.
- **controllers** tampoco. Lo unico que aporta el servidor es el dato
  `team.lastOutcome`, que dice si la ronda se gano o se perdio, porque con
  penalizacion en cero el delta no alcanza para distinguirlo.

## Agregar un canal

Implementar `FeedbackChannel` y sumarlo en `FeedbackProvider`. Mientras
`ready` sea `false`, el provider lo salta: se puede dejar a medias sin
estorbar.

## Dos cosas aprendidas que conviene no reaprender

- Safari en iOS no soporta `navigator.vibrate`. En iPhone el canal haptico no
  hara nada; el visual es el unico que llega a todos.
- Los navegadores no dejan sonar audio hasta que el usuario toca la pagina.
  El primer toque del alumno es el momento de desbloquearlo.
