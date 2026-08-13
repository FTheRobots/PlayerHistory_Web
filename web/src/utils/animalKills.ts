/** Specific animal kill events emitted by PlayerHistory mod */
export const ANIMAL_KILL_EVENTS = [
  'BearKill',
  'WolfKill',
  'BoarKill',
  'DeerKill',
  'SheepKill',
  'GoatKill',
  'FoxKill',
  'HareKill',
  'HenKill',
  'CowKill',
  'AnimalKill',
] as const;

export type AnimalKillEvent = (typeof ANIMAL_KILL_EVENTS)[number];

export const ANIMAL_KILL_LABELS: Record<AnimalKillEvent, string> = {
  BearKill: 'Bears',
  WolfKill: 'Wolves',
  BoarKill: 'Boars',
  DeerKill: 'Deer',
  SheepKill: 'Sheep',
  GoatKill: 'Goats',
  FoxKill: 'Foxes',
  HareKill: 'Hares',
  HenKill: 'Hens',
  CowKill: 'Cows',
  AnimalKill: 'Other animals',
};

export function isAnimalKillEvent(event: string): event is AnimalKillEvent {
  return (ANIMAL_KILL_EVENTS as readonly string[]).includes(event);
}

export function inferAnimalKillEvent(event: string, metadata?: Record<string, string>): string {
  if (event !== 'AnimalKill' || !metadata?.animalType) return event;

  const typeName = metadata.animalType;
  if (typeName.includes('Ursus') || typeName.includes('Bear')) return 'BearKill';
  if (typeName.includes('CanisLupus') || typeName.includes('Wolf')) return 'WolfKill';
  if (typeName.includes('SusScrofa') || typeName.includes('Boar')) return 'BoarKill';
  if (
    typeName.includes('Cervus') ||
    typeName.includes('Capreolus') ||
    typeName.includes('Rangifer') ||
    typeName.includes('Deer') ||
    typeName.includes('Stag')
  ) {
    return 'DeerKill';
  }
  if (typeName.includes('Ovis') || typeName.includes('Sheep')) return 'SheepKill';
  if (typeName.includes('Capra') || typeName.includes('Goat')) return 'GoatKill';
  if (typeName.includes('Vulpes') || typeName.includes('Fox')) return 'FoxKill';
  if (typeName.includes('Lepus') || typeName.includes('Hare')) return 'HareKill';
  if (typeName.includes('Gallus') || typeName.includes('Hen')) return 'HenKill';
  if (typeName.includes('Bos') || typeName.includes('Cow')) return 'CowKill';

  return event;
}

export function formatAnimalKillLabel(event: string, metadata?: Record<string, string>): string {
  const resolvedEvent = inferAnimalKillEvent(event, metadata);
  const kind = metadata?.animalKind;
  const typeName = metadata?.animalType;

  if (resolvedEvent === 'BearKill' || kind === 'Bear') {
    return typeName ? `Killed bear (${humanizeClassName(typeName)})` : 'Killed bear';
  }
  if (resolvedEvent === 'WolfKill' || kind === 'Wolf') {
    return typeName ? `Killed wolf (${humanizeClassName(typeName)})` : 'Killed wolf';
  }
  if (resolvedEvent === 'BoarKill' || kind === 'Boar') {
    return typeName ? `Killed boar (${humanizeClassName(typeName)})` : 'Killed boar';
  }
  if (resolvedEvent === 'DeerKill' || kind === 'Deer') {
    return typeName ? `Killed deer (${humanizeClassName(typeName)})` : 'Killed deer';
  }
  if (resolvedEvent === 'SheepKill' || kind === 'Sheep') {
    return typeName ? `Killed sheep (${humanizeClassName(typeName)})` : 'Killed sheep';
  }
  if (resolvedEvent === 'GoatKill' || kind === 'Goat') {
    return typeName ? `Killed goat (${humanizeClassName(typeName)})` : 'Killed goat';
  }
  if (resolvedEvent === 'FoxKill' || kind === 'Fox') {
    return typeName ? `Killed fox (${humanizeClassName(typeName)})` : 'Killed fox';
  }
  if (resolvedEvent === 'HareKill' || kind === 'Hare') {
    return typeName ? `Killed hare (${humanizeClassName(typeName)})` : 'Killed hare';
  }
  if (resolvedEvent === 'HenKill' || kind === 'Hen') {
    return typeName ? `Killed hen (${humanizeClassName(typeName)})` : 'Killed hen';
  }
  if (resolvedEvent === 'CowKill' || kind === 'Cow') {
    return typeName ? `Killed cow (${humanizeClassName(typeName)})` : 'Killed cow';
  }

  if (isAnimalKillEvent(resolvedEvent)) {
    return typeName ? `Killed ${humanizeClassName(typeName)}` : ANIMAL_KILL_LABELS[resolvedEvent];
  }

  return typeName ? `Killed ${humanizeClassName(typeName)}` : 'Killed animal';
}

function humanizeClassName(value: string): string {
  return value
    .replace(/^Animal_/, '')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim();
}
