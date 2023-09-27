'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class GasCcSchema extends Schema {
  static get connection () {
    return 'rcu'
  }
  up () {
    this.create('gas_cc', (table) => {
      table.increments()
      table.string('COD_PDR')
      table.string('COD_REMI')
      table.string('DISALIMENTABILITA')
      table.string('DATA_INIZIO_FOR')
      table.string('DATA_FINE_FOR')
      table.string('RAGIONE_SOCIALE_UDD')
      table.string('PIVA_UDD')
      table.string('RAGIONE_SOCIALE_DD')
      table.string('PIVA_DD')
      table.string('CF')
      table.string('PIVA')
      table.string('NOME')
      table.string('COGNOME')
      table.string('RAGIONE_SOCIALE_DENOMINAZIONE')
      table.string('RESIDENZA')
      table.string('ALIQUOTA_IVA')
      table.string('ALIQUOTA_ACCISE')
      table.string('ADDIZ_REGIONALE')
      table.string('SETT_MERCEOLOGICO')
      table.string('TRATTAMENTO')
      table.string('PREL_ANNUO_PREV')
      table.string('COD_PROF_PREL_STD')
      table.string('MATR_MIS')
      table.string('CLASSE_GRUPPO_MIS')
      table.string('TELEGESTIONE')
      table.string('PRE_CONV')
      table.string('MATR_CONV')
      table.string('N_CIFRE_CONV')
      table.string('COEFF_CORR')
      table.string('BONUS')
      table.string('BS_DATA_INIZIO')
      table.string('BS_DATA_FINE')
      table.string('BS_DATA_RINNOVO')
      table.integer('MESE')
      table.integer('ANNO')
      table.string('gas_cc_histories_id')
      table.timestamps()
    })
  }

  down () {
    this.drop('gas_cc')
  }
}

module.exports = GasCcSchema
