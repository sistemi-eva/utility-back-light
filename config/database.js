'use strict'

/** @type {import('@adonisjs/framework/src/Env')} */
const Env = use('Env')

/** @type {import('@adonisjs/ignitor/src/Helpers')} */
const Helpers = use('Helpers')

module.exports = {
  /*
  |--------------------------------------------------------------------------
  | Default Connection
  |--------------------------------------------------------------------------
  |
  | Connection defines the default connection settings to be used while
  | interacting with SQL databases.
  |
  */
  connection: Env.get('DB_CONNECTION', 'pg'),

  /*
  |--------------------------------------------------------------------------
  | Sqlite
  |--------------------------------------------------------------------------
  |
  | Sqlite is a flat file database and can be good choice under development
  | environment.
  |
  | npm i --save sqlite3
  |
  */
  sqlite: {
    client: 'sqlite3',
    connection: {
      filename: Helpers.databasePath(`${Env.get('DB_DATABASE', 'development')}.sqlite`)
    },
    useNullAsDefault: true
  },

  /*
  |--------------------------------------------------------------------------
  | MySQL
  |--------------------------------------------------------------------------
  |
  | Here we define connection settings for MySQL database.
  |
  | npm i --save mysql
  |
  */
  mysql: {
    client: 'mysql',
    connection: {
      host: Env.get('PRIXA_DB_HOST', 'localhost'),
      port: Env.get('PRIXA_DB_PORT', ''),
      user: Env.get('PRIXA_DB_USER', 'root'),
      password: Env.get('PRIXA_DB_PASSWORD', ''),
      database: Env.get('PRIXA_DB_DATABASE', 'adonis')
    }
  },

  pg: {
    client: 'pg',
    connection: {
      host: Env.get('DB_HOST', 'localhost'),
      port: Env.get('DB_PORT', ''),
      user: Env.get('DB_USER', 'root'),
      password: Env.get('DB_PASSWORD', ''),
      database: Env.get('DB_DATABASE', 'adonis')
    }
  },
  
  areaclienti: {
    client: 'pg',
    connection: {
      host: Env.get('DB_AREACLIENTI_HOST', 'localhost'),
      port: Env.get('DB_AREACLIENTI_PORT', ''),
      user: Env.get('DB_AREACLIENTI_USER', 'root'),
      password: Env.get('DB_AREACLIENTI_PASSWORD', ''),
      database: Env.get('DB_AREACLIENTI_DATABASE', 'adonis')
    }
  },

  fatturazionepassiva: {
    client: 'pg',
    connection: {
      host: Env.get('DB_FATT_PASSIVA_HOST', 'localhost'),
      port: Env.get('DB_FATT_PASSIVA_PORT', ''),
      user: Env.get('DB_FATT_PASSIVA_USER', 'root'),
      password: Env.get('DB_FATT_PASSIVA_PASSWORD', ''),
      database: Env.get('DB_FATT_PASSIVA_DATABASE', 'adonis')
    }
  },

  rcu_ugm: {
    client: 'pg',
    connection: {
      host: Env.get('DB_RCU_UGM_HOST', 'localhost'),
      port: Env.get('DB_RCU_UGM_PORT', ''),
      user: Env.get('DB_RCU_UGM_USER', 'root'),
      password: Env.get('DB_RCU_UGM_PASSWORD', ''),
      database: Env.get('DB_RCU_UGM_DATABASE', 'adonis')
    }
  },

  rcu: {
    client: 'pg',
    connection: {
      host: Env.get('DB_RCU_HOST', 'localhost'),
      port: Env.get('DB_RCU_PORT', ''),
      user: Env.get('DB_RCU_USER', 'root'),
      password: Env.get('DB_RCU_PASSWORD', ''),
      database: Env.get('DB_RCU_DATABASE', 'adonis')
    }
  },

  ugm: {
    client: 'mysql',
    connection: {
      host: Env.get('DB_AGING_HOST'),
      port: Env.get('DB_AGING_PORT'),
      user: Env.get('DB_AGING_USER'),
      password: Env.get('DB_AGING_PASSWORD'),
      database: Env.get('DB_AGING_DATABASE_UGM')
    }
  },
  dueg: {
    client: 'mysql',
    connection: {
      host: Env.get('DB_AGING_HOST'),
      port: Env.get('DB_AGING_PORT'),
      user: Env.get('DB_AGING_USER'),
      password: Env.get('DB_AGING_PASSWORD'),
      database: Env.get('DB_AGING_DATABASE_2G')
    }
  },
  piuenergie: {
    client: 'mysql',
    connection: {
      host: Env.get('DB_AGING_HOST'),
      port: Env.get('DB_AGING_PORT'),
      user: Env.get('DB_AGING_USER'),
      password: Env.get('DB_AGING_PASSWORD'),
      database: Env.get('DB_AGING_DATABASE_PIUENERGIE')
    }
  },
  semplice: {
    client: 'mysql',
    connection: {
      host: Env.get('DB_AGING_HOST'),
      port: Env.get('DB_AGING_PORT'),
      user: Env.get('DB_AGING_USER'),
      password: Env.get('DB_AGING_PASSWORD'),
      database: Env.get('DB_AGING_DATABASE_SEMPLICE')
    }
  },
  terranova: {
    client: 'mssql',
    connection: {
      host: Env.get('DB_TERRANOVA_HOST'),
      port: Number(Env.get('DB_TERRANOVA_PORT')),
      user: Env.get('DB_TERRANOVA_USER'),
      password: Env.get('DB_TERRANOVA_PASSWORD'),
      database: Env.get('DB_TERRANOVA_DATABASE'),
      trustServerCertificate: true
    }
  },
  aurah: {
    client: 'mysql',
    connection: {
      host: Env.get('DB_AGING_HOST'),
      port: Env.get('DB_AGING_PORT'),
      user: Env.get('DB_AGING_USER'),
      password: Env.get('DB_AGING_PASSWORD'),
      database: Env.get('DB_AGING_DATABASE_AURAH')
    }
  },
  contendibilita: {
    client: 'pg',
    connection: {
      host: Env.get('DB_CONTENDIBILITA_HOST', 'localhost'),
      port: Env.get('DB_CONTENDIBILITA_PORT', ''),
      user: Env.get('DB_CONTENDIBILITA_USER', 'root'),
      password: Env.get('DB_CONTENDIBILITA_PASSWORD', ''),
      database: Env.get('DB_CONTENDIBILITA_DATABASE', 'adonis')
    }
  },
  
  emailmassivo: {
    client: 'mysql',
    connection: {
      host: Env.get('DB_EMAILMASSIVO_HOST', 'localhost'),
      port: Env.get('DB_EMAILMASSIVO_PORT', ''),
      user: Env.get('DB_EMAILMASSIVO_USER', 'root'),
      password: Env.get('DB_EMAILMASSIVO_PASSWORD', ''),
      database: Env.get('DB_EMAILMASSIVO_DATABASE', 'adonis')
    }
  },
  
  dbbi: {
    client: 'mssql',
    connection: {
      host: Env.get('DB_BI_HOST'),
      port: Number(Env.get('DB_BI_PORT')),
      user: Env.get('DB_BI_USER'),
      password: Env.get('DB_BI_PASSWORD'),
      database: Env.get('DB_BI_DATABASE'),
      trustServerCertificate: true,
	  requestTimeout : 500000,
	  connectionTimeout: 150000
    }
  }


}
