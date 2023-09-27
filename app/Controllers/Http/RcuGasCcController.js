'use strict'
const mkdirp = require('mkdirp')
const Env = use('Env')
const fsExtra = require('fs');
const fs = require('fs').promises;
const RcuGasCc = use('App/Models/RcuGasCc')
const RcuGasCcHistory = use('App/Models/RcuGasCcHistory')
const Token = use('App/Models/Token')
const Database = use('Database')
const createCsvStringifier = require('csv-writer').createObjectCsvStringifier;
const Json2csvParser = require("json2csv").Parser;
const moment = require('moment');
const mesi = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const mesiDispacciamento = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']
const Config = use('Config')

const table =
  ['COD_PDR',
  'COD_REMI',
  'DISALIMENTABILITA',
  'DATA_INIZIO_FOR',
  'DATA_FINE_FOR',
  'RAGIONE_SOCIALE_UDD',
  'PIVA_UDD',
  'RAGIONE_SOCIALE_DD',
  'PIVA_DD',
  'CF',
  'PIVA',
  'NOME',
  'COGNOME',
  'RAGIONE_SOCIALE_DENOMINAZIONE',
  'RESIDENZA',
  'ALIQUOTA_IVA',
  'ALIQUOTA_ACCISE',
  'ADDIZ_REGIONALE',
  'SETT_MERCEOLOGICO',
  'TRATTAMENTO',
  'PREL_ANNUO_PREV',
  'COD_PROF_PREL_STD',
  'MATR_MIS',
  'CLASSE_GRUPPO_MIS',
  'TELEGESTIONE',
  'PRE_CONV',
  'MATR_CONV',
  'N_CIFRE_CONV',
  'COEFF_CORR',
  'BONUS',
  'BS_DATA_INIZIO',
  'BS_DATA_FINE',
  'BS_DATA_RINNOVO']
    
const NotNull = [
  'COD_PDR',
  'DATA_INIZIO_FOR',
  'RAGIONE_SOCIALE_UDD',
  'PIVA_UDD',
  'RAGIONE_SOCIALE_DD',
  'PIVA_DD',
  'PREL_ANNUO_PREV',
]

let month = {
  '1': 0,
  '2': 0,
  '3': 0,
  '4': 0,
  '5': 0,
  '6': 0,
  '7': 0,
  '8': 0,
  '9': 0,
  '10': 0,
  '11': 0,
  '12': 0,
}

class RcuGasCcController {

  async getLastImport({request,response}){
    try {
      let query = await Database.connection('rcu')
      .raw(`select "MESE","ANNO" from ${request.headers().tenant_gas}.gas_cc ec order by "ANNO" desc,"MESE" desc limit 1 `)
      return response.send({"status": "success","data": query.rows,"message": `Ritorno di tutti le informazioni necessarie per la dashboard`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async controlloRcu({response,request}){
    try {
      var {fatturazione_file} = request.all()
      this.checkRcu(fatturazione_file)
      return response.send({"status": "success","data": "","message": `Importazione avviata `})
    } catch (error) {
      console.log("error",error)
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async checkRcu(csv_name){
    try {
      let date = '01/04/2021'
      const csvtojsonV2=require("csvtojson/v2")
      const csv=require('csvtojson')
      csv({delimiter:';'})
      .fromFile(Env.get('RCU_PATH') + '/' + csv_name)
      .then(async (data)=>{
        console.log("data[0]['DATACESSAZIONE']",data[0]['DATACESSAZIONE'].substring(0,10))
        console.log("data",moment(data[0]['DATACESSAZIONE'].substring(0,10), "DD/MM/YYYY"))
        for(let i in data){
          console.log("POD",data[i]['ENEPOD'],"STATO",data[i]['STATORIGA'])
          let checkExistence = await RcuGasCc.query().where('COD_PDR','IT001E84650388').fetch()
          checkExistence = checkExistence.toJSON()

          // .where('COD_PDR',data[i]['ENEPOD'])
          // .first()
          // console.log("check",checkExistence)
          // console.log("OOOOOOOOOOOOOOOOO",checkExistence[0]['DATA_FINE_FORNITURA'])
          switch(data[i]['STATORIGA']) {
            case 'Attivo' : 
            //SE ESISTE VA BENE
            if(!!checkExistence) {
              data.splice(i,1)
            }else{
              //ALTRIMENTI ERRORE
              data[i]['STATO_FINALE'] = 'ERRORE'
            }
            //controllare se esiste in RCU
            break
            case 'Sfilato' :
            //SE ESISTE VA BENE
            if(!!checkExistence) {
              //DATA CESSAZIONE < DI COMPETENZA RCU 
              if(moment(data[0]['DATACESSAZIONE'].substring(0,10), "DD/MM/YYYY") < moment(date, "DD/MM/YYYY")) {
                //OK
                data.splice(i,1)
              }else {
                //ALTRIMENTI ERRORE
                data[i]['STATO_FINALE'] = 'ERRORE'
              }
            }else{
              //ALTRIMENTI ERRORE
              data.splice(i,1)
            }
            break
            
          }
          if(data[i]['STATORIGA'] == 'Attivo' && checkExistence) {
            console.log("sono attivo")
          }

          if(data[i]['STATORIGA'] == 'Voltura' ) {

            console.log("sono voltura")
          }
        }
          /**
           * [
           * 	{a:"1", b:"2", c:"3"},
           * 	{a:"4", b:"5". c:"6"}
           * ]
           */ 
      })
      return
      var datafile = fsExtra.readFileSync(Env.get('RCU_PATH') + '/' + csv_name)

      .toString() // convert Buffer to string
      .split('\n') // split string to lines
      .map(e => e.trim()) // remove white spaces for each line
      .map(e => e.split(';').map(e => e.trim())); // split each line to array
      //GET POSITION
      //GET POSITION
      const positionObject = {}
      const positionArray = []

      const tempsObj = {}
      //CONVERTE NOMI PER IL DB
      for(let a in datafile[0]) {
        tempsObj[datafile[0][a]] = ''
      }
      console.log("posObj",positionObject)
      console.log("positionArray",positionArray)
      const tempArrayCsv = []
      for(let a in datafile) {
        if(a == 1) {
          const tempLocalObj = tempObject
          
          for(let b in datafile[a]) {
          }
        }
      }

    } catch (error) {
      console.log("error",error)
    }
  }

  async deleteRowField({response,request}){
    const trx = await Database.connection('rcu').beginTransaction()
    try {
      const key_code = request.header('Secret-Key')
      var tokenUser = await Token.query().where('token','=',key_code).first()
      var {id} = request.all()
      const fatt = await RcuGasCcHistory.find(id)
      await RcuGasCc.query().where('gas_cc_histories_id',id).delete(trx)
      fatt.merge({deleted:true,delete_owner: tokenUser.username, delete_owner_ip:tokenUser.ip_address})
      await fatt.save()
      trx.commit()
      return response.send({"status": "success","data": await RcuGasCcHistory.query().where('deleted',false).orderBy('created_at','desc').fetch(),"message": null})
    } catch (error) {
      trx.rollback
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async csvItemDatabase({response,request}){
    try {
      const {id,mese,anno} = request.all()
      let jsonData = RcuGasCc.query()
      if(id) jsonData.where('gas_cc_histories_id',id)
      if(mese) jsonData.where('MESE',Number(mese))
      if(anno) jsonData.where('ANNO',Number(anno))
      jsonData = await jsonData.fetch()
      jsonData = jsonData.toJSON()
      if(jsonData.length> 0) {
        const json2csvParser = new Json2csvParser({ header: true,delimiter: ';'});
        const csv = await json2csvParser.parse(jsonData);
        return csv
      }else throw {}
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async createTotal(value){
    const queryBuilder = {}
    const totale = JSON.parse(JSON.stringify(month))
    //Creao tutti i mesi per i Fornitori
    for(let i in value) {
      queryBuilder[value[i].RAGIONE_SOCIALE_UDD] = JSON.parse(JSON.stringify(month))
    }
    for(let i in value) {
      let valueFornitore = value[i].RAGIONE_SOCIALE_UDD
      let valueMonth = value[i].MESE
      let valueTotal = value[i].totale ? value[i].totale: value[i].TOTALE ? value[i].TOTALE : 0
      queryBuilder[valueFornitore][valueMonth] = Number(valueTotal).toFixed(2).toString().replace('.',',')
      totale[valueMonth] += Number(valueTotal)
    }
    for (var [key, value] of Object.entries(totale)) {
      totale[key] = Number(value).toFixed(2).toString().replace('.',',')
    }
    return {fornitori:queryBuilder,totale}
  }

  async checkSintesi({response,request}){
    try {
      const {anno,mese} = request.all()
      let find = RcuGasCcHistory.query().where('deleted',false)
      if(anno)find.where('anno',anno)
      if(mese)find.where('mese',mese)
      find = await find.first()
      if(find) return response.send({"status": "success","data": find,"message": `Ritorno di tutti le informazioni necessarie per la dashboard`})
      return response.status(422).send({"status": "success","data": [],"message": `Non è stata trovata alcun importazione per la combinazione di date inserite`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
      
    }
  }

  async _setTableIncAnnuale(getTotalForFornitore,anno){
    try {
      const queryBuilder = []
      let fornitori = Array.from(new Set(getTotalForFornitore.map((item) => item.RAGIONE_SOCIALE_UDD)))
      for(let i in fornitori) {
        queryBuilder.push({'societa': fornitori[i],mesi:{...month},diff:{},mese_anno_precedente:0})
      }
      for(let i in getTotalForFornitore){
        for(let b in queryBuilder) {
          if(queryBuilder[b].societa == getTotalForFornitore[i].RAGIONE_SOCIALE_UDD) {
            let totale = getTotalForFornitore[i].totale ? getTotalForFornitore[i].totale: getTotalForFornitore[i].TOTALE ? getTotalForFornitore[i].TOTALE : 0
            if(getTotalForFornitore[i].ANNO == anno){
              queryBuilder[b].mesi[getTotalForFornitore[i].MESE] = Number(totale)
            }else if(getTotalForFornitore[i].MESE == '12' && getTotalForFornitore[i].ANNO == anno-1) queryBuilder[b].mese_anno_precedente = totale
          }
        }
      }
      for(let i in queryBuilder){
        for (const [key, value] of Object.entries(queryBuilder[i].mesi)) {
          if(queryBuilder[i].mesi[key-1] != undefined && value != 0 ) {
            queryBuilder[i].diff[key] =  Number(queryBuilder[i].mesi[key] - queryBuilder[i].mesi[key-1]).toFixed(2)
          }else {
            if(key == 1 && queryBuilder[i].mese_anno_precedente != 0) {
              queryBuilder[i].diff[key] =  Number(queryBuilder[i].mesi[key] - queryBuilder[i].mese_anno_precedente).toFixed(2)
            }else queryBuilder[i].diff[key] = 0
          }
        }
        let tempDiff = queryBuilder[i].diff
        queryBuilder[i] = {societa:queryBuilder[i].societa,...tempDiff}
      }
      return queryBuilder
    } catch (error) {
      console.log("_setTableIncAnnuale",error)
    }
  }

  async _setTableAnnuale(getTotalForFornitore){
    try {
      const queryBuilder = []
      let fornitori = Array.from(new Set(getTotalForFornitore.map((item) => item.RAGIONE_SOCIALE_UDD)))
      for(let i in fornitori) {
        queryBuilder.push({'societa': fornitori[i],...month})
      }
      for(let i in getTotalForFornitore){
        for(let b in queryBuilder) {
          if(queryBuilder[b].societa == getTotalForFornitore[i].RAGIONE_SOCIALE_UDD) {
            let totale = getTotalForFornitore[i].totale ? getTotalForFornitore[i].totale: getTotalForFornitore[i].TOTALE ? getTotalForFornitore[i].TOTALE : 0
            queryBuilder[b][getTotalForFornitore[i].MESE] = totale
          }
        }
      }
      return queryBuilder
    } catch (error) {
      console.log("errore",error)      
    }
  }

  async tableIncPod({request,response}){
    try {
      const {anno} = request.all()
      let getTotalForFornitore = await Database.connection('rcu')
      .raw(
      `select "RAGIONE_SOCIALE_UDD" , count("RAGIONE_SOCIALE_UDD") as totale ,"MESE" ,"ANNO" from ${request.headers().tenant_gas}.gas_cc fr  where "ANNO" = ? or 
      ("ANNO" = ? and "MESE" = '12' and "RAGIONE_SOCIALE_UDD" in (select distinct("RAGIONE_SOCIALE_UDD") from ${request.headers().tenant_gas}.gas_cc fr where "ANNO" = ?))
      group by "MESE" ,"ANNO","RAGIONE_SOCIALE_UDD" order by "MESE", "RAGIONE_SOCIALE_UDD" `,[anno,anno-1,anno])
      getTotalForFornitore = getTotalForFornitore.rows
      const queryBuilder = await this._setTableIncAnnuale(getTotalForFornitore,anno)
      return response.send({"status": "success","data": queryBuilder,"message": `Ritorno di tutti le informazioni necessarie per la dashboard`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async tableIncVolumi({request,response}){
    try {
      const {anno} = request.all()
      let getTotalForFornitore = await Database.connection('rcu')
      .raw(`select "RAGIONE_SOCIALE_UDD","MESE","ANNO",coalesce(ROUND(sum(cast(replace("PREL_ANNUO_PREV",',','.')  as numeric)) ,2),0) as TOTALE 
      from ${request.headers().tenant_gas}.gas_cc where "ANNO" = ? 
      or ("ANNO" = ? and "MESE" = '12' and "RAGIONE_SOCIALE_UDD" in (select distinct("RAGIONE_SOCIALE_UDD") from ${request.headers().tenant_gas}.gas_cc fr where "ANNO" = ?)) group by "RAGIONE_SOCIALE_UDD","MESE","ANNO" order by "MESE", "RAGIONE_SOCIALE_UDD"`,[anno,anno-1,anno])
      getTotalForFornitore = getTotalForFornitore.rows
      const queryBuilder = await this._setTableIncAnnuale(getTotalForFornitore,anno)
      return response.send({"status": "success","data": queryBuilder,"message": `Ritorno di tutti le informazioni necessarie per la dashboard`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async tableVolumiAnnuale({request,response}){
    try {
      const {anno} = request.all()
      let getTotalForFornitore = await Database.connection('rcu')
      .raw(`select "RAGIONE_SOCIALE_UDD","MESE",coalesce(ROUND(sum(cast(replace("PREL_ANNUO_PREV",',','.')  as numeric)) ,2),0) as TOTALE from ${request.headers().tenant_gas}.gas_cc where "ANNO" = ? group by "RAGIONE_SOCIALE_UDD","MESE" order by "MESE", "RAGIONE_SOCIALE_UDD"`,[anno])
      getTotalForFornitore = getTotalForFornitore.rows
      const queryBuilder = await this._setTableAnnuale(getTotalForFornitore)
      return response.send({"status": "success","data": queryBuilder,"message": `Ritorno di tutti le informazioni necessarie per la dashboard`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async tablePodAnnuale({request,response}){
    try {
      const {anno} = request.all()
      let getTotalForFornitore = await Database.connection('rcu')
      .raw(
      `select "RAGIONE_SOCIALE_UDD" , count("RAGIONE_SOCIALE_UDD") as totale ,"MESE" ,"ANNO" from ${request.headers().tenant_gas}.gas_cc fr  where "ANNO" = ? 
      group by "MESE" ,"ANNO","RAGIONE_SOCIALE_UDD" order by "MESE", "RAGIONE_SOCIALE_UDD" `,[anno])
      getTotalForFornitore = getTotalForFornitore.rows
      const queryBuilder = await this._setTableAnnuale(getTotalForFornitore)
      return response.send({"status": "success","data": queryBuilder,"message": `Ritorno di tutti le informazioni necessarie per la dashboard`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async RagioneSocialeCC({request,response}){
    try {
      const societa = await Database.connection('rcu')
      .table('gas_cc')
      .distinct('RAGIONE_SOCIALE_DD')
      return response.send({"status": "success","data": societa,"message": `Ritorno di tutti le informazioni necessarie per la dashboard`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async graficoAvanzatoTotalePerditaPod({request,response}){
    try {
      const {annopartenza,mese,anno} = request.all()
      let valUnionDisp = `${mesiDispacciamento[mese-1]}-${anno.slice(-2)}`
      let finalValue =  {}
      let query = await Database.connection('rcu')
      .raw(`select count(distinct(left("COD_PDR",14))) as totale, 
      upper(right("DATA_INIZIO_FOR",7)) as competenza,
      LEFT(RIGHT(lower("DATA_INIZIO_FOR"),7),2) as competenza_mese, 
      upper(right("DATA_INIZIO_FOR",2)) as competenza_anno
      from ${request.headers().tenant_gas}.gas_cc fr 
      where upper(right("DATA_INIZIO_FOR",4)) >= ?
      group by 
      competenza,
      competenza_anno,
      competenza_mese
      order by 
      competenza_anno,
      competenza_mese`,[annopartenza])
      // console.log("query",query.rows)
      if(query.rows.length>0) {
        finalValue.series = [{name: 'Inizio',data: query.rows.map(el => el.totale)}]
        let labels = []
        query.rows.forEach(element => {
          labels.push(`${mesiDispacciamento[element.competenza_mese-1].toUpperCase()} - 20${element.competenza_anno}`)
        });
        finalValue.labels = labels
      }

      query = await Database.connection('rcu')
      .raw(`select count(distinct(left("COD_PDR",14))) as totale, 
      upper(right("DATA_INIZIO_FOR",7)) as competenza,
      LEFT(RIGHT(lower("DATA_INIZIO_FOR"),7),2) as competenza_mese, 
      upper(right("DATA_INIZIO_FOR",2)) as competenza_anno
      from ${request.headers().tenant_gas}.gas_cc fr 
      where upper(right("DATA_INIZIO_FOR",4)) >= ? and "MESE" = ? and "ANNO" = ?
      group by 
      competenza,
      competenza_anno,
      competenza_mese
      order by 
      competenza_anno,
      competenza_mese
      `,[annopartenza,mese,anno])
      if(query.rows.length>0) {
        finalValue.series.push({name: 'Oggi',data: query.rows.map(el => el.totale)})
      }
      return response.send({"status": "success","data": finalValue,"message": `Ritorno di tutti le informazioni necessarie per la dashboard`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async graficoTotaleDetailPerditaPod({request,response}){
    try {
      const {mese,anno} = request.all()
      let valUnionDisp = mese.length == 1 ? '0'+mese+'/'+anno : mese+'/'+anno
      let finalValue =  {}
      let query = await Database.connection('rcu')
      .raw(`(select count(distinct(left("COD_PDR",14))) as totale, ? as "MESE", ? as "ANNO" from ${request.headers().tenant_gas}.gas_cc fr  
      where right("DATA_INIZIO_FOR" ,7) ilike ?) union
      (select count(distinct(left("COD_PDR",14))) as totale, "MESE" ,"ANNO" 
      from ${request.headers().tenant_gas}.gas_cc fr where right("DATA_INIZIO_FOR" ,7) 
      ilike ? and concat("MESE","ANNO") <> ? group by "MESE","ANNO" )
      order by "ANNO","MESE"`,[mese,anno,valUnionDisp,valUnionDisp,mese+anno])
      // console.log("query",query.rows)
      let totale = []
      if(query.rows.length>0) {
        for(let i = query.rows.length-1; i>=0 ; i--){
          if(i != 0) {
            totale.push({
              x:`${mesiDispacciamento[query.rows[i].MESE-1].toUpperCase()} - ${query.rows[i].ANNO}`, 
              y:query.rows[i].totale,
              percMensile: ((query.rows[i].totale-query.rows[i-1].totale)/query.rows[i-1].totale*100).toFixed(2),
              percAnnuale: ((query.rows[i].totale-query.rows[0].totale)/query.rows[0].totale*100).toFixed(2)
            })
          }else {
            totale.push({
              x:`${mesiDispacciamento[query.rows[i].MESE-1].toUpperCase()} - ${query.rows[i].ANNO}`,
              y:query.rows[i].totale,
              percMensile: 0,
              percAnnuale: 0
            })
          }
        }
        finalValue.series = [{name: 'POD',data: totale.reverse()}]
      }
      return response.send({"status": "success","data": finalValue,"message": `Ritorno di tutti le informazioni necessarie per la dashboard`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async graficoAnnualeDispacciamentoPodInformation({request,response}){
    try {
      const {mese,anno} = request.all()
      let valUnionDisp = mese.length == 1 ? '0'+mese+'/'+anno : mese+anno
      let finalValue =  {}
      let query = await Database.connection('rcu')
      .raw(`(select count(distinct(left("COD_PDR",14))) as totale, ? as "MESE", ? as "ANNO" from ${request.headers().tenant_gas}.gas_cc fr  
      where right("DATA_INIZIO_FOR" ,7) ilike ?) union
      (select count(distinct(left("COD_PDR",14))) as totale, "MESE" ,"ANNO" 
      from ${request.headers().tenant_gas}.gas_cc fr where "ANNO" = ? and right("DATA_INIZIO_FOR" ,7) 
      ilike ? and concat("MESE","ANNO") <> ? group by "MESE","ANNO" )
      order by "ANNO","MESE"`,[mese,anno,valUnionDisp,anno,valUnionDisp,mese+anno])
      let totale = []
      if(query.rows.length>0) {
        for(let i = query.rows.length-1; i>=0 ; i--){
          if(i != 0) {
            totale.push({
              x:`${mesiDispacciamento[query.rows[i].MESE-1].toUpperCase()} - ${query.rows[i].ANNO}`, 
              y:query.rows[i].totale,
              percMensile: ((query.rows[i].totale-query.rows[i-1].totale)/query.rows[i-1].totale*100).toFixed(2),
              percAnnuale: ((query.rows[i].totale-query.rows[0].totale)/query.rows[0].totale*100).toFixed(2)
            })
          }else {
            totale.push({
              x:`${mesiDispacciamento[query.rows[i].MESE-1].toUpperCase()} - ${query.rows[i].ANNO}`,
              y:query.rows[i].totale,
              percMensile: 0,
              percAnnuale: 0
            })
          }
        }
        finalValue.series = [{name: 'TOTALE POD',data: totale.reverse()}]
      }
      return response.send({"status": "success","data": finalValue,"message": `Ritorno di tutti le informazioni necessarie per la dashboard`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async graficoAnnualeIncrementoPodInformation({request,response}){
    try {
      const {mese,anno} = request.all()
      let finalValue =  []
      let query = await Database.connection('rcu')
      .raw(`select count("COD_PDR") as TOTALE,"ANNO" from ${request.headers().tenant_gas}.gas_cc fr where "MESE" = ? and "ANNO" <= ? and "ANNO" >= ? group by "ANNO" order by "ANNO" `,[mese,anno,anno-2])
      if(query.rows.length>0) {
        for(let i = query.rows.length-1; i>=0 ; i--){
            if(i != 0) {
              finalValue.push({name: `${mesi[mese-1]} - ${query.rows[i].ANNO} `, data: [{
                x:`${mesi[mese-1]} - ${query.rows[i].ANNO} `, 
                y:query.rows[i].totale,
                percPrecedente: ((query.rows[i].totale-query.rows[i-1].totale)/query.rows[i-1].totale*100).toFixed(2),
                percIniziale: ((query.rows[i].totale-query.rows[0].totale)/query.rows[0].totale*100).toFixed(2)
              }]})
            }else {
              finalValue.push({name: `${mesi[mese-1]} - ${query.rows[i].ANNO} `, data: [{
                x:`${mesi[mese-1]} - ${query.rows[i].ANNO} `, 
                y:query.rows[i].totale,
                percPrecedente: 0,
                percIniziale: 0
              }]})
            }
          }
        }
      return response.send({"status": "success","data": finalValue.reverse(),"message": `Ritorno di tutti le informazioni necessarie per la dashboard`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async graficoAnnualeIncrementoVolumeInformation({request,response}){
    try {
      const {mese,anno} = request.all()
      let finalValue =  []
      let query = await Database.connection('rcu')
      .raw(`select coalesce(ROUND(sum(cast(replace("PREL_ANNUO_PREV",',','.')  as numeric)) ,2),0) as TOTALE,"ANNO" from ${request.headers().tenant_gas}.gas_cc fr where "MESE" = ? and "ANNO" <= ? and "ANNO" >= ? group by "ANNO" order by "ANNO" `,[mese,anno,anno-2])
      if(query.rows.length>0) {
        for(let i = query.rows.length-1; i>=0 ; i--){
            if(i != 0) {
              finalValue.push({name: `${mesi[mese-1]} - ${query.rows[i].ANNO} `, data: [{
                x:`${mesi[mese-1]} - ${query.rows[i].ANNO} `, 
                y:query.rows[i].totale,
                percPrecedente: ((query.rows[i].totale-query.rows[i-1].totale)/query.rows[i-1].totale*100).toFixed(2),
                percIniziale: ((query.rows[i].totale-query.rows[0].totale)/query.rows[0].totale*100).toFixed(2)
              }]})
            }else {
              finalValue.push({name: `${mesi[mese-1]} - ${query.rows[i].ANNO} `, data: [{
                x:`${mesi[mese-1]} - ${query.rows[i].ANNO} `, 
                y:query.rows[i].totale,
                percPrecedente: 0,
                percIniziale: 0
              }]})
            }
          }
        }
      return response.send({"status": "success","data": finalValue.reverse(),"message": `Ritorno di tutti le informazioni necessarie per la dashboard`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async graficoAnnualePodInformation({request,response}){
    try {
      const {anno,mese} = request.all()
      let finalValue =  {}
      let query = await Database.connection('rcu')
      .raw(`select count("COD_PDR") as totale ,"MESE","ANNO" from ${request.headers().tenant_gas}.gas_cc fr2 where "ANNO" = ? and "MESE" >= ? and left("COD_PDR",14) 
      in (select left("COD_PDR",14) from ${request.headers().tenant_gas}.gas_cc fr2 where "MESE" = ? and "ANNO" = ?) group by "MESE","ANNO" order by "MESE","ANNO" `,[anno,mese,mese,anno])
      let totale = []
      if(query.rows.length>0) {
        for(let i = query.rows.length-1; i>=0 ; i--){
          if(i != 0) {
            totale.push({
              x:`${mesiDispacciamento[query.rows[i].MESE-1].toUpperCase()} - ${query.rows[i].ANNO}`, 
              y:query.rows[i].totale,
              percMensile: ((query.rows[i].totale-query.rows[i-1].totale)/query.rows[i-1].totale*100).toFixed(2),
              percAnnuale: ((query.rows[i].totale-query.rows[0].totale)/query.rows[0].totale*100).toFixed(2)
            })
          }else {
            totale.push({
              x:`${mesiDispacciamento[query.rows[i].MESE-1].toUpperCase()} - ${query.rows[i].ANNO}`,
              y:query.rows[i].totale,
              percMensile: 0,
              percAnnuale: 0
            })
          }
        }
        finalValue.series = [{name: 'TOTALE POD',data: totale.reverse()}]
      }
      return response.send({"status": "success","data": finalValue,"message": `Ritorno di tutti le informazioni necessarie per la dashboard`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async graficoAnnualePodLast3YearsInformation({request,response}){
    try {
      const {anno} = request.all()
      let series = []
      for(let b = 2; b>=0; b--){
        const query = await Database.connection('rcu')
        .raw(`select count(("COD_PDR")) as totale,"ANNO","MESE" from ${request.headers().tenant_gas}.gas_cc fr where "ANNO" = ? group by "ANNO","MESE" order by "ANNO","MESE"`,[anno-b])
        let totale = []
        for(let i = mesi.length-1; i>=0 ; i--){
          if(anno-b == new Date().getFullYear()) {
            if(i<=new Date().getMonth()) totale.push({x:mesi[i],y: 0,percMensile: 0,percAnnuale: 0})
          }else totale.push({x:mesi[i],y: 0,percMensile: 0,percAnnuale: 0})
        }
        // console.log(totale)
        if(query.rows.length>0) {
        for(let i = query.rows.length-1; i>=0 ; i--){
          for(let k in totale) {
            if(totale[k].x === `${mesi[query.rows[i].MESE-1]}`) {
              if(i != 0) {
                totale[k].y = query.rows[i].totale,
                totale[k].percMensile = ((query.rows[i].totale-query.rows[i-1].totale)/query.rows[i-1].totale*100).toFixed(2),
                totale[k].percAnnuale = ((query.rows[i].totale-query.rows[0].totale)/query.rows[0].totale*100).toFixed(2)
              }else{
                totale[k].y = query.rows[i].totale,
                totale[k].percMensile = 0,
                totale[k].percAnnuale = 0
              }
            }
          }
        }
        series.push({name: (anno-b).toString(),data: totale.reverse()})
        }
      }
      return response.send({"status": "success","data": {series},"message": `Ritorno di tutti le informazioni necessarie per la dashboard`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async graficoAnnualeVolumiLast3YearsInformation({request,response}){
    try {
      const {anno} = request.all()
      let series = []
      for(let b = 2; b>=0; b--){
        const query = await Database.connection('rcu')
        .raw(`select ROUND(sum(cast(replace("PREL_ANNUO_PREV",',','.')  as numeric)) ,2) as totale,"ANNO","MESE" from ${request.headers().tenant_gas}.gas_cc fr where "ANNO" = ? group by "ANNO","MESE" order by "ANNO","MESE"`,[anno-b])
        let totale = []
        for(let i = mesi.length-1; i>=0 ; i--){
          if(anno-b == new Date().getFullYear()) {
            if(i<=new Date().getMonth()) totale.push({x:mesi[i],y: 0,percMensile: 0,percAnnuale: 0})
          }else totale.push({x:mesi[i],y: 0,percMensile: 0,percAnnuale: 0})
        }
        // console.log(totale)
        if(query.rows.length>0) {
        for(let i = query.rows.length-1; i>=0 ; i--){
          for(let k in totale) {
            if(totale[k].x === `${mesi[query.rows[i].MESE-1]}`) {
              if(i != 0) {
                totale[k].y = query.rows[i].totale,
                totale[k].percMensile = ((query.rows[i].totale-query.rows[i-1].totale)/query.rows[i-1].totale*100).toFixed(2),
                totale[k].percAnnuale = ((query.rows[i].totale-query.rows[0].totale)/query.rows[0].totale*100).toFixed(2)
              }else{
                totale[k].y = query.rows[i].totale,
                totale[k].percMensile = 0,
                totale[k].percAnnuale = 0
              }
            }
          }
        }
        series.push({name: (anno-b).toString(),data: totale.reverse()})
        }
      }
      return response.send({"status": "success","data": {series},"message": `Ritorno di tutti le informazioni necessarie per la dashboard`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async graficoAnnualeInformation({request,response}){
    try {
      const {anno} = request.all()
      let series = []
      const totalPod = await Database.connection('rcu')
      .raw(`select count("COD_PDR") as totale,"MESE" from ${request.headers().tenant_gas}.gas_cc fr where "ANNO" = ? group by "MESE" order by "MESE"`,[anno])
      let mesi = []
      if(totalPod && totalPod.rows.length>0) {
        mesi = totalPod.rows.map(el =>el.MESE)
        series.push({name: 'Totale Pod',type: 'column',data: totalPod.rows.map(el =>el.totale)})
      }
      const totalGwh = await Database.connection('rcu')
      .raw(`select ROUND(sum(cast(replace("PREL_ANNUO_PREV",',','.')  as numeric)) ,2) as totale,"MESE" from ${request.headers().tenant_gas}.gas_cc fr where "ANNO" = ? group by "MESE" order by "MESE"`,[anno])
      if(totalGwh && totalGwh.rows.length>0) {
        series.push({name: 'Totale Gwh',type: 'line',data: totalGwh.rows.map(el =>el.totale)})
      }
      return response.send({"status": "success","data": {series,mesi},"message": `Ritorno di tutti le informazioni necessarie per la dashboard`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async sintesiInformation({request,response}) {
    try {
      const {anno,mese} = request.all()
      let prevMese = mese-1
      let prevAnno = anno
      let startMese = 1
      if(mese == 1) {
        prevMese = 1
        prevAnno = anno
      }
      let query = await Database.connection('rcu')
      .raw(`select 
      (
      (select count("COD_PDR")::float from ${request.headers().tenant_gas}.gas_cc fr where "ANNO" = ? AND "MESE" = ?) -
      (select count("COD_PDR")::float from ${request.headers().tenant_gas}.gas_cc fr where "ANNO" = ? AND "MESE" = ?)
      )
      /
       case (select count("COD_PDR")::float from ${request.headers().tenant_gas}.gas_cc fr where "ANNO" = ? AND "MESE" = ?) 
       WHEN 0 THEN 1 
       else (select count("COD_PDR")::float from ${request.headers().tenant_gas}.gas_cc fr where "ANNO" = ? AND "MESE" = ?) END
      *100.0
      as pod_inc_mensile 
      ,
      (
      (select count("COD_PDR")::float from ${request.headers().tenant_gas}.gas_cc fr where "ANNO" = ? AND "MESE" = ?) -
      (select count("COD_PDR")::float from ${request.headers().tenant_gas}.gas_cc fr where "ANNO" = ? AND "MESE" = ?)
      )
      /
      case (select count("COD_PDR")::float from ${request.headers().tenant_gas}.gas_cc fr where "ANNO" = ? AND "MESE" = ?)  
      WHEN 0 THEN 1 
      else (select count("COD_PDR")::float from ${request.headers().tenant_gas}.gas_cc fr where "ANNO" = ? AND "MESE" = ?) END
      *100.0
      as pod_inc_annuale,
      (
      (select coalesce((sum(cast(replace("PREL_ANNUO_PREV",',','.')  as float)) ),0) as TOTALE from ${request.headers().tenant_gas}.gas_cc fr2 where "ANNO" = ? AND "MESE" = ?) - 
      (select coalesce((sum(cast(replace("PREL_ANNUO_PREV",',','.')  as float)) ),0) as TOTALE from ${request.headers().tenant_gas}.gas_cc fr2 where "ANNO" = ? AND "MESE" = ?)
      ) / 
      case (select coalesce((sum(cast(replace("PREL_ANNUO_PREV",',','.')  as float)) ),0) as TOTALE from ${request.headers().tenant_gas}.gas_cc fr2 where "ANNO" = ? AND "MESE" = ?)
      WHEN 0 THEN 1 
      else (select coalesce((sum(cast(replace("PREL_ANNUO_PREV",',','.')  as float)) ),0) as TOTALE from ${request.headers().tenant_gas}.gas_cc fr2 where "ANNO" = ? AND "MESE" = ?) end 
      *100 
      as vol_inc_mensile,
      (
      (select coalesce((sum(cast(replace("PREL_ANNUO_PREV",',','.')  as float)) ),0) as TOTALE from ${request.headers().tenant_gas}.gas_cc fr2 where "ANNO" = ? AND "MESE" = ?) - 
      (select coalesce((sum(cast(replace("PREL_ANNUO_PREV",',','.')  as float)) ),0) as TOTALE from ${request.headers().tenant_gas}.gas_cc fr2 where "ANNO" = ? AND "MESE" = ?)
      ) / 
      case (select coalesce((sum(cast(replace("PREL_ANNUO_PREV",',','.')  as float)) ),0) as TOTALE from ${request.headers().tenant_gas}.gas_cc fr2 where "ANNO" = ? AND "MESE" = ?)
      WHEN 0 THEN 1 
      else (select coalesce((sum(cast(replace("PREL_ANNUO_PREV",',','.')  as float)) ),0) as TOTALE from ${request.headers().tenant_gas}.gas_cc fr2 where "ANNO" = ? AND "MESE" = ?) END
      *100 
      as vol_inc_annuale`,[ 
        anno,mese,
        prevAnno,prevMese,
        prevAnno,prevMese,
        prevAnno,prevMese,
        anno,mese,
        anno,startMese,
        anno,startMese,
        anno,startMese,
        anno,mese,
        prevAnno,prevMese,
        prevAnno,prevMese,
        prevAnno,prevMese,
        anno,mese,
        anno,startMese,
        anno,startMese,
        anno,startMese
      ])
      return response.send({"status": "success","data": query.rows,"message": `Ritorno di tutti le informazioni necessarie per la dashboard`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async tableInformation({request,response}){
    try {
      const {anno,mese} = request.all()
      const query=  await Database.connection('rcu')
      .raw(`select "RAGIONE_SOCIALE_UDD" as societa, 
      count(DISTINCT"COD_PDR") as pod,
      ROUND(sum(cast(replace("PREL_ANNUO_PREV",',','.')  as numeric)) ,2) as gwh
      from ${request.headers().tenant_gas}.gas_cc fr where "ANNO" = ? and "MESE" = ? group by "RAGIONE_SOCIALE_UDD" order by pod desc`,[anno,mese])
      return response.send({"status": "success","data": query.rows,"message": `Ritorno di tutti le informazioni necessarie per la dashboard`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async esportazione({request,response}){
    try {
      const {anno} = request.all()
      const getTotalForFornitore = await Database.connection('rcu').from('gas_cc')
      .select('RAGIONE_SOCIALE_UDD','MESE').where('ANNO',anno).where(innerWhere =>{
        innerWhere.where('COD_PDR','!=',null)
        innerWhere.orWhere('COD_PDR','!=','')
      }).count('* as TOTALE').groupBy('MESE','RAGIONE_SOCIALE_UDD')
      const queryBuilder = {}
      queryBuilder.contPod = await this.createTotal(getTotalForFornitore)
      
      let getTotalConsumiForFornitore = await Database.connection('rcu')
      .raw(`select "RAGIONE_SOCIALE_UDD","MESE",sum(cast(replace("PREL_ANNUO_PREV",',','.')  as float))  as TOTALE from ${request.headers().tenant_gas}.gas_cc where "ANNO" = ? group by "RAGIONE_SOCIALE_UDD","MESE" order by "MESE"`,[anno])
      queryBuilder.contConsumi = await this.createTotal(getTotalConsumiForFornitore.rows)
      return await this.generateCsvRcu(queryBuilder)
    } catch (error) {
      console.log("err",error)
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async total(queryBuilder,contType,primary){
    try {
        let finalText = ''
        const csvStringifier = createCsvStringifier({
        header: [
          {id: contType === 'consumi' ? 'gwh': 'N_POD', title: contType === 'consumi' ? 'GWh': 'N POD'},
          {id: '1', title: 'GENNAIO'},
          {id: '2', title: 'FEBBRAIO'},
          {id: '3', title: 'MARZO'},
          {id: '4', title: 'APRILE'},
          {id: '5', title: 'MAGGIO'},
          {id: '6', title: 'GIUGNO'},
          {id: '7', title: 'LUGLIO'},
          {id: '8', title: 'AGOSTO'},
          {id: '9', title: 'SETTEMBRE'},
          {id: '10', title: 'OTTOBRE'},
          {id: '11', title: 'NOVEMBRE'},
          {id: '12', title: 'DICEMBRE'},
        ],
        fieldDelimiter:';'
      });
      finalText += csvStringifier.getHeaderString()

      let choosedType = contType === 'consumi' ? queryBuilder.contConsumi : queryBuilder.contPod
      //AGGIUNGO RIGHE MESI PER FORNITORE
      for (const [key, value] of Object.entries(choosedType.fornitori)) {
        let finalObject = contType === 'consumi' ? {'gwh': key} : {'N_POD': key}
        finalText += await csvStringifier.stringifyRecords([{...finalObject,...value}])
      }
      //AGGIUNGO TOTALE RIGHE MESI
      let finalTotalObject = contType === 'consumi' ? {'gwh': 'TOT GWh'} : {'N_POD': 'TOT N POD'}  
      finalText +=  await csvStringifier.stringifyRecords([{...finalTotalObject ,...choosedType.totale}])
      return finalText
    } catch (error) {
      console.log("err",error)
    }
  }

  async generateCsvRcu(queryBuilder){
    try {
      let finalText = ''
      finalText+= await this.total(queryBuilder,'pod')
      finalText+= await this.total(queryBuilder,'consumi')
      return finalText
      fs.writeFile('utility/fatturazione/final.csv',finalText)
    } catch (error) {
      console.log("err",error) 
    }
  }

  async insert({response,request}){
    var {mese,anno,fatturazione_file} = request.all()
    try {
      const key_code = request.header('Secret-Key')
      var tokenUser = await Token.query().where('token','=',key_code).first()
      await this.zipFile(fatturazione_file,mese,anno,tokenUser)
      return response.send({"status": "success","data": "","message": `Importazione avviata `})
    } catch (error) {
      console.log("erro",error)
      // fsExtra.unlinkSync(Env.get('RCU_PATH') + '/' + fatturazione_file)
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async zipFile(zip_file_name,mese,anno,tokenUser){
    try {
      const unzipper = require('unzipper');
      let buffer = fsExtra.readFileSync(Env.get('RCU_PATH') + '/' + zip_file_name)
      var directory = await unzipper.Open.buffer(buffer);
      for(let i in directory.files) {
        var parentBuffer = await unzipper.Open.buffer( await directory.files[i].buffer());
        for(let b in parentBuffer.files) {
          await this.generateCsv(parentBuffer.files[b],mese,anno,tokenUser)
        }
      }
      fsExtra.unlinkSync(Env.get('RCU_PATH') + '/' + zip_file_name)
    } catch (error) {
      console.log("err",error)
    }
  }

  async generateCsv(csv,mese,anno,tokenUser){
    const trx = await Database.connection('rcu').beginTransaction()
    let fattLog = null
    let checkExist = await RcuGasCcHistory.query().where('note',csv.path).where(inner => {inner.where('status','completato').orWhere('status','in lavorazione')}).whereNot('deleted',true).first()
    try{
      if(!checkExist){
      fattLog = await RcuGasCcHistory.create(
        {note:csv.path,mese:mese,anno:anno,
          importati:0,
          status:'in lavorazione',
          owner: tokenUser.username,
          owner_ip:tokenUser.ip_address})
         var counterTotal = 0
          var csvBuffer = await csv.buffer()
          var datafile = csvBuffer.toString()
          .toString() // convert Buffer to string
          .split('\n') // split string to lines
          .map(e => e.trim()) // remove white spaces for each line
          .map(e => e.split(';').map(e => e.trim())); // split each line to array
          //GET POSITION
          const positionObject = {}
          const positionArray = []
          //CONVERTE NOMI PER IL DB
          for(let a in datafile[0]) {
            for(let b in table) {
              if(table[b] === datafile[0][a]){
                positionObject[a] = {value:table[b]}
                positionArray.push(a)
              }
            }
          }
          
          //CONTROLLA CAMPI OBBLIGATORI
          for(let i in table) {
            // console.log("datafile[0]",datafile[0])
            // console.log("!datafile[0].includes(NotNull[i])",!datafile[0].includes(NotNull[i]))
            if(!datafile[0].includes(table[i])) 
            {console.log(table[i])
              throw {}}
          }
          
          //INIZIO CREAZIONE ON DB
          for(let i in datafile) {
            if(i == 0) continue
            let tempObject = {}
            for(let b in datafile[i]){
              if(positionArray.includes(b) && !!datafile[i][b]){
                if(datafile[i][b].startsWith(',')) datafile[i][b] = '0'+datafile[i][b]
                tempObject[positionObject[b].value] = datafile[i][b]
              }
            }
            if(Object.keys(tempObject).length>0){
              counterTotal = counterTotal +1
              tempObject = {...tempObject,MESE:mese,ANNO:anno}
              if(i == 1){
                let check = await RcuGasCc.findBy(tempObject)
                if(check)throw {}
              }
              // if(!check) 
              await RcuGasCc.create({...tempObject,gas_cc_histories_id: fattLog.id}, trx)
            }
          }
          fattLog.merge({importati:counterTotal,status:'completato'})
          await fattLog.save()
          trx.commit()
      } else{ console.log("gia esistente")}
      return 'Completato'
    }catch(e){
      console.log("e",e)
      trx.rollback()
      fattLog.merge({importati:0,status:'in errore'})
      await fattLog.save()
      // throw e
    }
  }


  async uploadZip({response,request}){
    try {
        const zipFile = request.file('zip_file')
        await mkdirp.sync(Env.get('RCU_PATH'))
        const zip_name = Date.now()+'.zip'
        await zipFile.move(Env.get('RCU_PATH'), {name:zip_name, overwrite: true })
        return response.send(zip_name)
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async getHistory({response,request}){
      try {
      var fatt = await RcuGasCcHistory.query().where('deleted',false).orderBy('created_at','desc').fetch()
      return response.send({"status": "success","data": fatt,"message": null})
      } catch (error) {
        return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
      }
  }

  async getStatusImport({response}){
    try {
      const fatt = await RcuGasCcHistory.query().where('deleted',false).where('status','=','in lavorazione').getCount()
      if(fatt == 1) return response.send({"status": "success","data": {status:'in lavorazione'},"message": null})
      else return response.send({"status": "success","data": {status:'completato'},"message": null})
      } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
      }
  }

}

module.exports = RcuGasCcController
