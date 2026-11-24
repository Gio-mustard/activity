'use client';

/**
 * Marcador en vivo. Lo comparten la consola del docente y la pantalla de
 * proyeccion, con dos densidades distintas.
 */
import type { TeamView } from '@/lib/types';
import { AvatarIcon, Icon } from '@/lib/icons';
import { teamColor } from '@/lib/teams';
import { formatReaction, placeLabel, rankTeams } from '@/controllers/rules';
import { cx } from './ui';

export function sortedTeams(teams: TeamView[]) {
  return rankTeams(
    teams.map((team) => ({
      id: team.id,
      score: team.score,
      correctCount: 0,
      bestReactionMs: team.answerMs,
      view: team,
    })),
  );
}

export function ScoreboardRow({
  team,
  place,
  leader,
  highlight,
}: {
  team: TeamView;
  place: number;
  leader: boolean;
  highlight?: boolean;
}) {
  const color = teamColor(team.colorKey);
  const max = Math.max(team.score, 1);
  return (
    <li
      className={cx(
        'rounded-md border-[1.5px] p-3 transition-colors',
        highlight ? 'border-secondary bg-secondary-container/30' : 'border-outline-variant bg-surface-lowest',
      )}
    >
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-label-sm text-on-surface-variant">{placeLabel(place)}</span>
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded"
          style={{ backgroundColor: color.hex, color: color.on }}
        >
          <AvatarIcon iconKey={team.iconKey} className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 truncate text-label-lg">{team.name}</span>
        <span className="tabular shrink-0 font-mono text-headline-sm">{team.score}</span>
        {team.lastDelta ? (
          <span
            className={cx(
              'anim-flash-in tabular shrink-0 rounded-full px-2 py-0.5 text-label-sm',
              team.lastDelta > 0
                ? 'bg-secondary-container text-on-secondary-fixed'
                : 'bg-error-container text-on-error-container',
            )}
          >
            {team.lastDelta > 0 ? `+${team.lastDelta}` : team.lastDelta}
          </span>
        ) : null}
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-highest">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(0, (team.score / max) * 100)}%`, backgroundColor: color.hex }}
        />
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-label-sm text-on-surface-variant">
        <span className="flex items-center gap-1">
          <Icon name="users" className="h-3.5 w-3.5" />
          {team.members.filter((m) => m.connected).length}/{team.members.length}
        </span>
        {team.streak > 1 ? <span className="text-tertiary-container">{team.streak} de racha</span> : null}
        {team.locked ? (
          <span className="flex items-center gap-1 text-error">
            <Icon name="lock" className="h-3.5 w-3.5" />
            bloqueado
          </span>
        ) : null}
        {team.hasAnswered ? <span className="text-secondary">respondio</span> : null}
        {team.answerMs !== null ? <span>{formatReaction(team.answerMs)}</span> : null}
        {leader ? <span className="ml-auto font-bold text-secondary">Lider</span> : null}
      </div>
    </li>
  );
}

export function Scoreboard({ teams, title = 'Puntajes en vivo' }: { teams: TeamView[]; title?: string }) {
  const ranked = sortedTeams(teams);
  return (
    <div>
      <h2 className="mb-space-sm flex items-center gap-2 text-headline-sm">
        <Icon name="trophy" className="h-5 w-5 text-primary" />
        {title}
      </h2>
      <ul className="space-y-2">
        {ranked.map(({ place, team }) => (
          <ScoreboardRow
            key={team.id}
            team={team.view}
            place={place}
            leader={place === 1 && team.view.score > 0}
            highlight={place === 1 && team.view.score > 0}
          />
        ))}
      </ul>
    </div>
  );
}
