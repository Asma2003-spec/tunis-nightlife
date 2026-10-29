/** Date d'événement affichée dans le fuseau de Tunis, quel que soit le fuseau du serveur. */
export function EventDate({ iso }: { iso: string }) {
  const text = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Tunis',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
  return <time dateTime={iso}>{text}</time>;
}
