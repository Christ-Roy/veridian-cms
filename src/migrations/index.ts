import * as migration_20260424_113817_initial from './20260424_113817_initial';

export const migrations = [
  {
    up: migration_20260424_113817_initial.up,
    down: migration_20260424_113817_initial.down,
    name: '20260424_113817_initial'
  },
];
