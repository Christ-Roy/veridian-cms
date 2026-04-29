import * as migration_20260425_085354 from './20260425_085354';
import * as migration_20260425_183526 from './20260425_183526';
import * as migration_20260429_072527_add_blocks_cards_logo_split from './20260429_072527_add_blocks_cards_logo_split';
import * as migration_20260429_072907_add_image_fallback_url from './20260429_072907_add_image_fallback_url';

export const migrations = [
  {
    up: migration_20260425_085354.up,
    down: migration_20260425_085354.down,
    name: '20260425_085354',
  },
  {
    up: migration_20260425_183526.up,
    down: migration_20260425_183526.down,
    name: '20260425_183526',
  },
  {
    up: migration_20260429_072527_add_blocks_cards_logo_split.up,
    down: migration_20260429_072527_add_blocks_cards_logo_split.down,
    name: '20260429_072527_add_blocks_cards_logo_split',
  },
  {
    up: migration_20260429_072907_add_image_fallback_url.up,
    down: migration_20260429_072907_add_image_fallback_url.down,
    name: '20260429_072907_add_image_fallback_url'
  },
];
