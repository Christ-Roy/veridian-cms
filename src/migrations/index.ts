import * as migration_20260424_101253_initial from './20260424_101253_initial';
import * as migration_20260424_102922_api_keys from './20260424_102922_api_keys';
import * as migration_20260424_104745_roles_update from './20260424_104745_roles_update';

export const migrations = [
  {
    up: migration_20260424_101253_initial.up,
    down: migration_20260424_101253_initial.down,
    name: '20260424_101253_initial',
  },
  {
    up: migration_20260424_102922_api_keys.up,
    down: migration_20260424_102922_api_keys.down,
    name: '20260424_102922_api_keys',
  },
  {
    up: migration_20260424_104745_roles_update.up,
    down: migration_20260424_104745_roles_update.down,
    name: '20260424_104745_roles_update'
  },
];
