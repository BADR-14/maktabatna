import journal from './meta/_journal.json';
import m0000 from './0000_init.sql';
import m0001 from './0001_search_and_seed.sql';
import m0002 from './0002_layout_columns.sql';
import m0003 from './0003_layout_estimates.sql';
import m0004 from './0004_demo_data.sql';
import m0005 from './0005_profile_and_room_names.sql';
import m0006 from './0006_sync_outbox.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002,
m0003,
m0004,
m0005,
m0006
    }
  }
  