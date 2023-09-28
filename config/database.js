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
  connection: Env.get('DB_CONNECTION', 'rcu'),

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
  
  contendibilita: {
    client: 'pg',
    connection: {
      host: Env.get('DB_CONTENDIBILITA_HOST', 'localhost'),
      port: Env.get('DB_CONTENDIBILITA_PORT', ''),
      user: Env.get('DB_CONTENDIBILITA_USER', 'root'),
      password: Env.get('DB_CONTENDIBILITA_PASSWORD', ''),
      database: Env.get('DB_CONTENDIBILITA_DATABASE', 'adonis')
    }
  }
 
 /*
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
  
  */
  
}