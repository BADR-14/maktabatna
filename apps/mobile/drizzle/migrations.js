import journal from './meta/_journal.json';
import m0000 from './0000_init.sql';
import m0001 from './0001_search_and_seed.sql';
import m0002 from './0002_layout_columns.sql';
import m0003 from './0003_layout_estimates.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002,
m0003
    }
  }
  