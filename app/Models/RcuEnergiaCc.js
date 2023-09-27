'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')
const moment = use('moment')
const Config = use('Config')

class RcuEnergiaCc extends Model {
  static get connection() {
    return 'rcu'
  }

  static get table() {
    return Config.get('app.namespace_ee') + '.ee_cc'
    // return 'ee_cc'
  }

  // static get computed() {
  //   return ["fmt_be_inizio","fmt_be_fine","fmt_be_rinnovo","fmt_bf_fine",'fmt_be_inizio']
  // }

  // getFmtBeInizio({ BE_DATA_INIZIO }) {
  //   if(BE_DATA_INIZIO)return moment(BE_DATA_INIZIO).format("DD/MM/YYYY HH:mm:ss ")   
  // }
  // getFmtBeFine({ BE_DATA_FINE }) {
  //   if(BE_DATA_FINE) return moment(BE_DATA_FINE).format("DD/MM/YYYY HH:mm:ss ")   
  // }
  // getFmtBeRinnovo({ BE_DATA_RINNOVO }) {
  //   if(BE_DATA_RINNOVO) return moment(BE_DATA_RINNOVO).format("DD/MM/YYYY HH:mm:ss ")   
  // }
  // getFmtBfInizio({ BF_DATA_INIZIO }) {
  //   if(BF_DATA_INIZIO) return moment(BF_DATA_INIZIO).format("DD/MM/YYYY HH:mm:ss ")   
  // }
  // getFmtBfFine({ BF_DATA_FINE }) {
  //   if(BF_DATA_FINE) return moment(BF_DATA_FINE).format("DD/MM/YYYY HH:mm:ss ")   
  // }

}

module.exports = RcuEnergiaCc
