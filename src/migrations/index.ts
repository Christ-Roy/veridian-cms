import * as migration_20260425_085354 from './20260425_085354';
import * as migration_20260425_183526 from './20260425_183526';

export const migrations = [
  {
    up: migration_20260425_085354.up,
    down: migration_20260425_085354.down,
    name: '20260425_085354',
  },
  {
    up: migration_20260425_183526.up,
    down: migration_20260425_183526.down,
    name: '20260425_183526'
  },
];
