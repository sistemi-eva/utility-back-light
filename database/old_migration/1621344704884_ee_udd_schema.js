'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class EeUddSchema extends Schema {
  static get connection () {
    return 'rcu'
  }
  
  up () {
    this.create('ee_udd', (table) => {
      table.increments()
      table.string('COD_POD')
      table.string('AREA_RIF')
      table.string('RAGIONE_SOCIALE_DISTR')
      table.string('PIVA_DISTR')
      table.string('DP')
      table.string('RAGIONE_SOCIALE_UDD')
      table.string('PIVA_UDD')
      table.string('RAGIONE_SOCIALE_CC')
      table.string('PIVA_CC')
      table.string('TIPO_POD')
      table.string('FINE_TIPO_POD')
      table.string('DATA_INIZIO_FORNITURA')
      table.string('DATA_FINE_FORNITURA')
      table.string('DATA_INIZIO_DISPACCIAMENTO')
      table.string('CF')
      table.string('PIVA')
      table.string('NOME')
      table.string('COGNOME')
      table.string('RAGIONE_SOCIALE_DENOMINAZIONE')
      table.string('RESIDENZA')
      table.string('SERVIZIO_TUTELA')
      table.string('TENSIONE')
      table.string('DISALIMENTABILITA')
      table.string('TARIFFA_DISTRIBUZIONE')
      table.string('TIPO_MISURATORE')
      table.string('POTCONTRIMP')
      table.string('POTDISP')
      table.string('CONSUMO_TOT').defaultTo('0')
      table.string('TRATTAMENTO')
      table.string('TRATTAMENTO_SUCC')
      table.string('REGIME_COMPENSAZIONE')
      table.string('BF_DATA_INIZIO')
      table.string('BF_DATA_FINE')
      table.string('BF_DATA_RINNOVO')
      table.string('BE_DATA_INIZIO')
      table.string('BE_DATA_FINE')
      table.string('BE_DATA_RINNOVO')
      table.string('COMUNIC_BONUS')
      table.string('K_TRASFOR_ATT')
      table.string('MAT_MISURATORE_ATT')
      table.string('PMA')
      table.integer('MESE')
      table.integer('ANNO')
      table.string('ee_udd_histories_id')
      table.timestamps()
    })
  }

  down () {
    this.drop('ee_udd')
  }
}

module.exports = EeUddSchema
