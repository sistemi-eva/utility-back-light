'use strict'

const mkdirp = require('mkdirp')
const Env = use('Env')
const fsExtra = require('fs');
const FatturazionePassiva = use('App/Models/FatturazionePassiva')
const FatturazioneP = use('App/Models/FatturazioneP')
const Convertitore = use('App/Models/Convertitore')
const Token = use('App/Models/Token')
const Fornitore = use('App/Models/Fornitore')
const moment = require('moment');
const Database = use('Database')
const Json2csvParser = require("json2csv").Parser;

var allowedDateFormats = ['YYYY-MM-DD','DD-MM-YYYY','MM-DD-YYYY','DD/MM/YYYY', 'DD/MM/YYYY','MM/DD/YYYY','YYYY/MM/DD'];
const table = [
'NUM_FATTURA',
'TIPO_DOCUMENTO',
'DATA_FATTURA',
'MESE_COMPETENZA',
'ANNO_COMPETENZA',
'COD_PRODOTTO',
'POD',
'OPZ_TARIFFARIA',
'KWH_TOT',
'KWH_LORDATOT',
'EUR_KWH_F1',
'EUR_KWH_F2',
'EUR_KWH_F3',
'EUR_KWH_DISP_ART_44_3',
'EUR_KWH_DISP_ACC_ART_45_2',
'EUR_KWH_DISP_ART_46',
'EUR_KWH_DISP_ART_48',
'EUR_KWH_DISP_ART_73',
'EUR_KWH_DISP_ACC_ART_44BIS',
'KW_TRASP_QP',
'EUR_KW_TRASP_QP',
'IMP_EN_REATTIVA_TOTALE',
'IMP_ONERI_CTS',
'IMP_CMOR',
'BONUS_DIS_ECONOMICO',
'IMP_ENERGIA_TOTALE',
'IMP_DISP_TOTALE',
'IMP_TRASP_TOTALE',
'IMP_A_UC_TOTALE',
'IMP_ONERI_TOTALE',
'IMP_TOTALE',
'FONTE_CONSUMI',
]

const NotNull = [
  'DATA_FATTURA',
  'IMP_ENERGIA_TOTALE',
  'IMP_DISP_TOTALE',
  'IMP_TRASP_TOTALE',
  'IMP_A_UC_TOTALE',
  'IMP_ONERI_TOTALE',
  'IMP_TOTALE',
]

class FatturazionePassivaController {

  async esportazione({response,request}){
    try {
      var {fornitore,datarange,fatturazione_file} = request.all()
      var datafile = fsExtra.readFileSync(Env.get('FATTURAZIONE_PATH') + '/' + fatturazione_file)
      .toString() // convert Buffer to string
      .split('\n') // split string to lines
      .map(e => e.trim()) // remove white spaces for each line
      .map(e => e.split(';').map(e => e.trim())); // split each line to array
      let finalArray = []
      datafile.forEach((element,index) => {
        if(index === 0 || element == '') return
        finalArray = finalArray.concat(element)
      });
      let list = finalArray.map(s => `'${s}'`).join(', ');
      let query = ""
      if(fornitore) {
        query = `select "POD" ,"FORNITORE" ,sum(cast(replace("IMP_A_UC_TOTALE",',','.') as float)) as IMP_A_UC_TOTALE from fatturazione_passiva fp where "POD" in (${list}) and "FORNITORE" = '${fornitore}'`
        if(datarange) query+= `AND "DATA_FATTURA" >= '${datarange[0]}' AND "DATA_FATTURA" <= '${datarange[1]}'`
        query += ` group by "POD" ,"FORNITORE"`
      }else {
        query = `select "POD" ,"FORNITORE" ,sum(cast(replace("IMP_A_UC_TOTALE",',','.') as float)) as IMP_A_UC_TOTALE from fatturazione_passiva fp where "POD" in (${list}) `
        if(datarange) query+= `AND "DATA_FATTURA" >= '${datarange[0]}' AND "DATA_FATTURA" <= '${datarange[1]}'`
        query += ` group by "POD" ,"FORNITORE"`
      }
      const result = await Database.connection('fatturazionepassiva').raw(query)
      if(result.rows.length >0) {
        result.rows.map(el=>{
          if(el.imp_a_uc_totale) el.imp_a_uc_totale = Number(el.imp_a_uc_totale).toFixed(2).toString().replace('.',',')
        })
        const json2csvParser = new Json2csvParser({ header: true,delimiter: ';'});
        const csv = json2csvParser.parse(result.rows);
        return csv
      }else return ''
    } catch (error) {
      console.log("err",error)
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }
  

  async csvItemDatabase({response,request}){
    try {
      const {id} = request.all()
      let jsonData = await FatturazionePassiva.query().where('fatturazione_id',id).fetch()
      jsonData = jsonData.toJSON()
      if(jsonData.length> 0) {
        const json2csvParser = new Json2csvParser({ header: true,delimiter: ';'});
        const csv = json2csvParser.parse(jsonData);
        return csv
      }else throw {}
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async deleteRowField({response,request}){
    const trx = await Database.connection('fatturazionepassiva').beginTransaction()
    try {
      const key_code = request.header('Secret-Key')
      var tokenUser = await Token.query().where('token','=',key_code).first()
      var {id} = request.all()
      const fatt = await FatturazioneP.find(id)
      await FatturazionePassiva.query().where('fatturazione_id',id).delete(trx)
      fatt.merge({deleted:true,delete_owner: tokenUser.username, delete_owner_ip:tokenUser.ip_address})
      await fatt.save()
      trx.commit()
      return response.send({"status": "success","data": await FatturazioneP.query().where('deleted',false).orderBy('created_at','desc').fetch(),"message": null})
    } catch (error) {
      trx.rollback
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

            

  async getQueryBuilder({response,request}){
    try {
      
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})

    }
  }

  async checkSintesi({response,request}){
    try {
      const {anno,mese} = request.all()
      let find = FatturazioneP.query().where('deleted',false)
      if(anno)find.where('anno',anno)
      if(mese)find.where('mese',mese)
      find = await find.first()
      if(find) return response.send({"status": "success","data": find,"message": `Ritorno di tutti le informazioni necessarie per la dashboard`})
      return response.status(422).send({"status": "success","data": [],"message": `Non è stata trovata alcun importazione per la combinazione di date inserite`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
      
    }
  }

  async tableInformation({request,response}){
    try {
      const {anno,mese,fornitore} = request.all()
      let precMese = (mese == 1 ? 12 : mese-1)
      let precAnno = (precMese == 12 ? anno-1 : anno)
      const query = await Database.connection('fatturazionepassiva')
      .raw(`select
      sum(cast(replace("IMP_ENERGIA_TOTALE" ,',','.')  as decimal(18,3))) as "IMP_ENERGIA_TOTALE" ,
      sum(cast(replace("IMP_TRASP_TOTALE" ,',','.')  as decimal(18,3))) as "IMP_TRASP_TOTALE" ,
      sum(cast(replace("IMP_DISP_TOTALE" ,',','.')  as decimal(18,3))) as "IMP_DISP_TOTALE" ,
      sum(cast(replace("IMP_ONERI_TOTALE" ,',','.')  as decimal(18,3))) as "IMP_ONERI_TOTALE" ,
      sum(cast(replace("IMP_A_UC_TOTALE" ,',','.')  as decimal(18,3))) as "IMP_A_UC_TOTALE" ,
      sum(cast(replace("IMP_ONERI_CTS" ,',','.')  as decimal(18,3))) as "IMP_ONERI_CTS" ,
      sum(cast(replace("IMP_CMOR" ,',','.')  as decimal(18,3))) as "IMP_CMOR",
      sum(cast(replace("BONUS_DIS_ECONOMICO" ,',','.')  as decimal(18,3))) as "BONUS_DIS_ECONOMICO",
      ((cast(replace("EUR_KWH_DISP_ART_44_3" ,',','.')  as decimal(18,6)))+
      (cast(replace("EUR_KWH_DISP_ACC_ART_45_2" ,',','.')  as decimal(18,6)))+
      (cast(replace("EUR_KWH_DISP_ART_46" ,',','.')  as decimal(18,6)))+
      (cast(replace("EUR_KWH_DISP_ART_48" ,',','.')  as decimal(18,6)))+
      (cast(replace("EUR_KWH_DISP_ART_73" ,',','.')  as decimal(18,6)))+
      (cast(replace("EUR_KWH_DISP_ACC_ART_44BIS" ,',','.')  as decimal(18,6)))) as "EUR_KWH_DISP" 
      from fatturazione_passiva fp join histories h on fp.fatturazione_id = h.id  
      where h.fornitore = ? and h.mese = ? and h.anno = ? and fp."MESE_COMPETENZA" = ? and fp."ANNO_COMPETENZA" = ? and fp."TIPO_DOCUMENTO" ilike 'FATTURA'
      group by 
      "EUR_KWH_DISP_ART_44_3",
      "EUR_KWH_DISP_ACC_ART_45_2",
      "EUR_KWH_DISP_ART_46",
      "EUR_KWH_DISP_ART_48",
      "EUR_KWH_DISP_ART_73",
      "EUR_KWH_DISP_ACC_ART_44BIS"`
      ,[fornitore,mese,anno,precMese,precAnno])
      let finalValue = query.rows
      if(query.rows.length > 0){
        finalValue = []
        for (const [key, value] of Object.entries(query.rows[0])) {
          finalValue.push({key,value})
        }
      }
      return response.send({"status": "success","data": finalValue,"message": `Ritorno di tutti le informazioni necessarie per la dashboard`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async tableDispacciamentoInformation({request,response}){
    try {
      const {anno,mese,fornitore} = request.all()
      let precMese = (mese == 1 ? 12 : mese-1)
      let precAnno = (precMese == 12 ? anno-1 : anno)
      const query = await Database.connection('fatturazionepassiva')
      .raw(`select
      replace("EUR_KWH_DISP_ART_44_3" ,',','.') as "EUR_KWH_DISP_ART_44_3",
      replace("EUR_KWH_DISP_ACC_ART_45_2" ,',','.') as "EUR_KWH_DISP_ACC_ART_45_2",
      replace("EUR_KWH_DISP_ART_46" ,',','.') as "EUR_KWH_DISP_ART_46",
      replace("EUR_KWH_DISP_ART_48" ,',','.') as "EUR_KWH_DISP_ART_48",
      replace("EUR_KWH_DISP_ART_73" ,',','.') as "EUR_KWH_DISP_ART_73",
      replace("EUR_KWH_DISP_ACC_ART_44BIS" ,',','.') as "EUR_KWH_DISP_ACC_ART_44BIS"
      from fatturazione_passiva fp join histories h on fp.fatturazione_id = h.id   
      where h.fornitore = ? and h.mese = ? and h.anno = ? and fp."MESE_COMPETENZA" = ? and fp."ANNO_COMPETENZA" = ? and fp."TIPO_DOCUMENTO" ilike 'FATTURA'
      group by 
      "EUR_KWH_DISP_ART_44_3",
      "EUR_KWH_DISP_ACC_ART_45_2",
      "EUR_KWH_DISP_ART_46",
      "EUR_KWH_DISP_ART_48",
      "EUR_KWH_DISP_ART_73",
      "EUR_KWH_DISP_ACC_ART_44BIS"`
      ,[fornitore,mese,anno,precMese,precAnno])
      let finalValue = query.rows
      if(query.rows.length > 0){
        finalValue = []
        for (const [key, value] of Object.entries(query.rows[0])) {
          finalValue.push({key,value})
        }
      }
      return response.send({"status": "success","data": finalValue,"message": `Ritorno di tutti le informazioni necessarie per la dashboard`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async CompetenzaTotaleInformation({request,response}){
    try {
      const {anno,mese,fornitore} = request.all()
      let precMese = (mese == 1 ? 12 : mese-1)
      let precAnno = (precMese == 12 ? anno-1 : anno)
      const query = await Database.connection('fatturazionepassiva')
      .raw(`select sum(cast(replace("KWH_LORDATOT" ,',','.')  as decimal(18,3))) as kwh_lorda, 
      (sum(cast(replace("IMP_ENERGIA_TOTALE" ,',','.')  as decimal(18,3))) +
      sum(cast(replace("IMP_TRASP_TOTALE" ,',','.')  as decimal(18,3))) +
      sum(cast(replace("IMP_DISP_TOTALE" ,',','.')  as decimal(18,3))) +
      sum(cast(replace("IMP_ONERI_TOTALE" ,',','.')  as decimal(18,3))) +
      sum(cast(replace("IMP_A_UC_TOTALE" ,',','.')  as decimal(18,3)))) as imponibile_totale,
      ((sum(cast(replace("IMP_ENERGIA_TOTALE" ,',','.')  as decimal(18,3))) +
      sum(cast(replace("IMP_TRASP_TOTALE" ,',','.')  as decimal(18,3))) +
      sum(cast(replace("IMP_DISP_TOTALE" ,',','.')  as decimal(18,3))) +
      sum(cast(replace("IMP_ONERI_TOTALE" ,',','.')  as decimal(18,3))) +
      sum(cast(replace("IMP_A_UC_TOTALE" ,',','.')  as decimal(18,3)))) /
      sum(cast(replace("KWH_LORDATOT" ,',','.')  as decimal(18,3)))) as differenza
      from fatturazione_passiva fp join histories h on fp.fatturazione_id = h.id   
      where h.fornitore = ? and h.mese = ? and h.anno = ? and fp."MESE_COMPETENZA" = ? and fp."ANNO_COMPETENZA" = ? and fp."TIPO_DOCUMENTO" ilike 'FATTURA'
      group by h.mese,h.anno`
      ,[fornitore,mese,anno,precMese,precAnno])
      let finalValue = query.rows
      if(query.rows.length > 0){
        finalValue = {}
        for (const [key, value] of Object.entries(query.rows[0])) {
          finalValue[key] = value
        }
      }
      return response.send({"status": "success","data": finalValue,"message": `Ritorno di tutti le informazioni necessarie per la dashboard`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async FatturaTotaleInformation({request,response}){
    try {
      const {anno,mese,fornitore} = request.all()
      let precMese = (mese == 1 ? 12 : mese-1)
      let precAnno = (precMese == 12 ? anno-1 : anno)
      const query = await Database.connection('fatturazionepassiva')
      .raw(`select sum(cast(replace("KWH_LORDATOT" ,',','.')  as decimal(18,3))) as kwh_lorda, 
      (sum(cast(replace("IMP_ENERGIA_TOTALE" ,',','.')  as decimal(18,3))) +
      sum(cast(replace("IMP_TRASP_TOTALE" ,',','.')  as decimal(18,3))) +
      sum(cast(replace("IMP_DISP_TOTALE" ,',','.')  as decimal(18,3))) +
      sum(cast(replace("IMP_ONERI_TOTALE" ,',','.')  as decimal(18,3))) +
      sum(cast(replace("IMP_A_UC_TOTALE" ,',','.')  as decimal(18,3)))) as imponibile_totale,
      ((sum(cast(replace("IMP_ENERGIA_TOTALE" ,',','.')  as decimal(18,3))) +
      sum(cast(replace("IMP_TRASP_TOTALE" ,',','.')  as decimal(18,3))) +
      sum(cast(replace("IMP_DISP_TOTALE" ,',','.')  as decimal(18,3))) +
      sum(cast(replace("IMP_ONERI_TOTALE" ,',','.')  as decimal(18,3))) +
      sum(cast(replace("IMP_A_UC_TOTALE" ,',','.')  as decimal(18,3)))) /
      sum(cast(replace("KWH_LORDATOT" ,',','.')  as decimal(18,3)))) as differenza
      from fatturazione_passiva fp join histories h on fp.fatturazione_id = h.id   
      where h.fornitore = ? and h.mese = ? and h.anno = ? group by h.mese,h.anno`
      ,[fornitore,mese,anno])
      let finalValue = query.rows
      if(query.rows.length > 0){
        finalValue = {}
        for (const [key, value] of Object.entries(query.rows[0])) {
          finalValue[key] = value
        }
      }
      return response.send({"status": "success","data": finalValue,"message": `Ritorno di tutti le informazioni necessarie per la dashboard`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async getFatturazioneHistory({response,request}){
    try {
    var fatt = await FatturazioneP.query().where('deleted',false).orderBy('created_at','DESC').fetch()
    fatt = fatt.toJSON()
    return response.send({"status": "success","data": fatt,"message": null})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async getStatusImport({response}){
    try {
      const fatt = await FatturazioneP.query().where('deleted',false).where('status','=','in lavorazione').getCount()
      if(fatt == 1) return response.send({"status": "success","data": {status:'in lavorazione'},"message": null})
      else return response.send({"status": "success","data": {status:'completato'},"message": null})
      } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
      }
  }

  async addFornitore({response,request}){
    try {
      var {fornitore} = request.all()
      await Fornitore.create({name:fornitore})
      return response.send({"status": "success","data": await Fornitore.query().fetch(),"message": `Ritorno di tutti i fornitori`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async deleteFornitori({response,request}){
    try {
      var {name} = request.all()
      const data = await Fornitore.findBy('name',name)
      await data.delete()
      return response.send({"status": "success","data": await Fornitore.query().fetch(),"message": `Ritorno di tutti i fornitori`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async deleteNormalizzazione({response,request}){
    try {
      var {id} = request.all()
      const data = await Convertitore.find(id)
      await data.delete()
      return response.send({"status": "success","data": await Convertitore.query().fetch(),"message": `Ritorno di tutti i fornitori`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }


  async addNormalizzazione({response,request}){
    try {
      var {value,corrispondente} = request.all()
      await Convertitore.create({value,corrispondente})
      return response.send({"status": "success","data": await Convertitore.query().fetch(),"message": `Ritorno di tutti i fornitori`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }
  

  async fornitori({response,request}){
    try {
      return response.send({"status": "success","data": await Fornitore.query().orderBy('name','desc').fetch(),"message": `Ritorno di tutti i fornitori`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }


  async normalizzazione({response,request}){
    try {
      return response.send({"status": "success","data": await Convertitore.query().fetch(),"message": `Ritorno di tutti i fornitori`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

    

    async insert({response,request}){
        try {
          const key_code = request.header('Secret-Key')
          var tokenUser = await Token.query().where('token','=',key_code).first()
          var {fornitore,note,mese,anno,fatturazione_file} = request.all()
          var fattLog = await FatturazioneP.create({fornitore:fornitore,note:note,mese:mese,anno:anno,importati:0,status:'in lavorazione',owner: tokenUser.username, owner_ip:tokenUser.ip_address})
          var getConverterName = await Convertitore.query().fetch()
          getConverterName = getConverterName.toJSON()
          this.generateCsv(fornitore,fatturazione_file,fattLog,getConverterName)
          return response.send({"status": "success","data": "","message": `Importazione avviata `})
        } catch (error) {
          console.log("error",error)
          return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
        }
    }

    async converterName(value,arrayName){
      for(let i in arrayName) {
        if(arrayName[i].value === value) return arrayName[i].corrispondente
      }
      return value
    }

    

    async generateCsv(fornitore,csv_name,fattLog,getConverterName){
      const trx = await Database.connection('fatturazionepassiva').beginTransaction()
        try{
          var counterTotal = 0
          var datafile = fsExtra.readFileSync(Env.get('FATTURAZIONE_PATH') + '/' + csv_name)
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
                datafile[0][a] = await this.converterName(datafile[0][a],getConverterName)
                if(table[b] === datafile[0][a]){
                  positionObject[a] = {value:table[b]}
                  positionArray.push(a)
                }
              }
          }

          //CONTROLLA CAMPI OBBLIGATORI
          for(let i in NotNull) {
            if(!datafile[0].includes(NotNull[i]))throw {}
          }

          //INIZIO CREAZIONE ON DB
          for(let i in datafile) {
            if(i == 0) continue
            let tempObject = {}
            for(let b in datafile[i]){
              if(positionArray.includes(b) && !!datafile[i][b]){
                datafile[i][b] = datafile[i][b].replace(/\"/g,"");
                if(positionObject[b].value === 'DATA_FATTURA') {
                  var dataFormat = ''
                  allowedDateFormats.forEach(element => {
                    if(moment(datafile[i][b], element, true).isValid()) dataFormat = element;
                  })
                  datafile[i][b] = moment(moment(datafile[i][b], dataFormat)).format('YYYY-MM-DD')
                }
                tempObject[positionObject[b].value] = datafile[i][b]
              }
            }
            if(Object.keys(tempObject).length>0){
              counterTotal = counterTotal +1
              tempObject = {...tempObject,FORNITORE:fornitore}
              if(i == 1){
                let check = await FatturazionePassiva.findBy(tempObject)
                if(check)throw {}
              }
              // if(!check) 
              await FatturazionePassiva.create({...tempObject,fatturazione_id: fattLog.id}, trx)
            }
          }
          trx.commit()
          fattLog.merge({importati:counterTotal,status:'completato'})
          await fattLog.save()
          fsExtra.unlinkSync(Env.get('FATTURAZIONE_PATH')+ '/' + csv_name)
          return 'Completato'
        }catch(e){
          trx.rollback()
          console.log("eRROREEEEE",e)
          fsExtra.unlinkSync(Env.get('FATTURAZIONE_PATH')+ '/' + csv_name)
          fattLog.merge({importati:0,status:'in errore'})
          await fattLog.save()
          throw e
        }
      }

    async uploadCsvFatturazione({response,request}){
        try {
            const csvFile = request.file('csv_file')
            await mkdirp.sync(Env.get('FATTURAZIONE_PATH'))
            const csv_name = Date.now()+'.csv'
            await csvFile.move(Env.get('FATTURAZIONE_PATH'), {name:csv_name, overwrite: true })
            console.log("csv_name",csv_name)
            return response.send(csv_name)
        } catch (error) {
          return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
        }
    }
}

module.exports = FatturazionePassivaController
