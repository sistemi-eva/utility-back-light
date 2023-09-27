'use strict'

//fatturazionepassiva DATABASE


/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class FatturazionePassivaSchema extends Schema {
  static get connection () {
    return 'fatturazionepassiva'
  }
  up () {
    this.create('fatturazione_passiva', (table) => {
      table.increments()
      table.string('NUM_FATTURA')
      table.string('TIPO_DOCUMENTO')
      table.date('DATA_FATTURA')
      table.integer('MESE_COMPETENZA')
      table.integer('ANNO_COMPETENZA')
      table.string('COD_PRODOTTO')
      table.string('POD')
      table.string('OPZ_TARIFFARIA')
      table.integer('KWH_TOT')
      table.integer('KWH_LORDATOT')
      table.string('EUR_KWH_F1')
      table.string('EUR_KWH_F2')
      table.string('EUR_KWH_F3')
      table.string('EUR_KWH_DISP_ART_44_3')
      table.string('EUR_KWH_DISP_ACC_ART_45_2')
      table.string('EUR_KWH_DISP_ART_46')
      table.string('EUR_KWH_DISP_ART_48')
      table.string('EUR_KWH_DISP_ART_73')
      table.string('EUR_KWH_DISP_ACC_ART_44BIS')
      table.string('KW_TRASP_QP')
      table.string('EUR_KW_TRASP_QP')
      table.string('IMP_EN_REATTIVA_TOTALE')
      table.string('IMP_ONERI_CTS')
      table.string('IMP_CMOR')
      table.string('BONUS_DIS_ECONOMICO')
      table.string('IMP_ENERGIA_TOTALE')
      table.string('IMP_DISP_TOTALE')
      table.string('IMP_TRASP_TOTALE')
      table.string('IMP_A_UC_TOTALE')
      table.string('IMP_ONERI_TOTALE')
      table.string('IMP_TOTALE')
      table.string('FONTE_CONSUMI')
      table.string('INDICE_VENDITA')
      table.timestamps()
    })
  }

  down () {
    this.drop('fatturazione_passiva')
  }
}

module.exports = FatturazionePassivaSchema
