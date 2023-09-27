'use strict'
const mkdirp = require('mkdirp')
const Env = use('Env')
const fsExtra = require('fs');
const fs = require('fs').promises;
const RcuGasUdd = use('App/Models/RcuGasUdd')
const RcuGasUddHistory = use('App/Models/RcuGasUddHistory')
const Token = use('App/Models/Token')
const Database = use('Database')
const createCsvStringifier = require('csv-writer').createObjectCsvStringifier;
const Json2csvParser = require("json2csv").Parser;
const moment = require('moment');
const { Console } = require('console');
const mesi = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const mesiDispacciamento = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']
const Redis = use('Redis')
const name_controller = 'RcuGasUddController'


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

class RcuGasUddController {
  async subAgentiFunc(id){
    const list = await Database.connection('rcu')
    .raw(`with recursive children as (
      select idagente as id, nome as nominativo,idagenteparent as agente_padre_id from ugm.recursive_agenti ra where idagente = ?
      union all
      select idagente as id, nome as nominativo,idagenteparent as agente_padre_id from ugm.recursive_agenti join children on children.id = ugm.recursive_agenti.idagenteparent
    )
    select c.id,c.nominativo from children c 
   order by c.nominativo`,[id])
    return list.rows.map(el => el.id)
  }
  
  async businessUnit({response,request}){
    try {
      let tenant = request.headers().tenant_gas
      const query = await Database.connection('rcu').raw(`select * from ${tenant}.business_unit`)
      return response.send({"status": "success","data": query.rows,"message": `Get All Business Unit`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async subBusinessUnit({response,request}){
    try {
      let {business_unit} = request.all()
      let tenant = request.headers().tenant_gas
      const query = await Database.connection('rcu').raw(`select * from  ${tenant}.recursive_agenti where idagenteparent = ?`,[business_unit])
      return response.send({"status": "success","data": query.rows,"message": `Get All Business Unit`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  } 

  async exportFormMap({response,request}){
    try {
      const {regione,mese,anno} = request.all()
      let tenant = request.headers().tenant_gas
      var arrQuery = [mese,anno]
      var queryBuilder = ''
      if(regione) {
        arrQuery = [mese,anno,regione]
        queryBuilder = `select left("COD_PDR",14) as COD_PDR,
      t2.c_fisc as codice_fiscale,
      '${regione}' as regione, 
      t2.provincia as provincia, 
      t2.localita as localita,
      t2.cap as cap,
      case when length(t2.c_fisc) > 11 
        then case when cast(right(left(t2.c_fisc,11),2)as integer) > 31 
          then 'M' else 'F' end
        else null end as sesso ,
      case when length(t2.c_fisc) > 11 
        then case when cast(right(left(t2.c_fisc,8),2)as integer) >= cast(right(cast(date_part('year', CURRENT_DATE)as text),2)as integer)-17 
          then date_part('year', CURRENT_DATE) - cast(concat('19',cast(right(left(t2.c_fisc,8),2)as text))as integer)
          else date_part('year', CURRENT_DATE) - cast(concat('20',cast(right(left(t2.c_fisc,8),2)as text))as integer) end
		    else null end as eta ,
      case when t2.id_metodo_pagamento is null or t2.id_metodo_pagamento = 6 then 'NON SDD' else 'SDD' end as metodo_pagamento,
      case when t2.fattura_digitale is null or t2.fattura_digitale = 0 then 'CARTACEO' else 'DIGITALE' end as invio_fatture
      from ugm.gas_udd e
      inner join ugm.gas_datamax_filtered as t2 on left(e."COD_PDR" ,14) = left(t2.cod_pdr ,14) 
      where "MESE" = ? and "ANNO" = ? and t2.provincia in (select sigla_province from rcu.public.province where regione_province =?)
      group by left("COD_PDR",14) ,
      case when length(t2.c_fisc) > 11 
        then case when cast(right(left(t2.c_fisc,11),2)as integer) > 31 
          then 'M' 
          else 'F' end
        else null end , 
      case when length(t2.c_fisc) > 11 
		    then case when cast(right(left(t2.c_fisc,8),2)as integer) >= cast(right(cast(date_part('year', CURRENT_DATE)as text),2)as integer)-17 
          then date_part('year', CURRENT_DATE) - cast(concat('19',cast(right(left(t2.c_fisc,8),2)as text))as integer)
          else date_part('year', CURRENT_DATE) - cast(concat('20',cast(right(left(t2.c_fisc,8),2)as text))as integer) end
		    else null end ,
        case when t2.id_metodo_pagamento is null or t2.id_metodo_pagamento = 6 then 'NON SDD' else 'SDD' end ,
        case when t2.fattura_digitale is null or t2.fattura_digitale = 0 then 'CARTACEO' else 'DIGITALE' end ,
        t2.c_fisc,t2.cap,t2.localita,t2.provincia
      order by count(left("COD_PDR",14))`
      } else {
        queryBuilder = `select left("COD_PDR",14) as COD_PDR,
        t2.c_fisc as codice_fiscale,
        p.regione_province as regione, p.sigla_province as provincia, 
        t2.localita as localita,
        t2.cap as cap,
        case when length(t2.c_fisc) > 11 
          then case when cast(right(left(t2.c_fisc,11),2)as integer) > 31 
            then 'M' else 'F' end
          else null end as sesso ,
        case when length(t2.c_fisc) > 11 
          then case when cast(right(left(t2.c_fisc,8),2)as integer) >= cast(right(cast(date_part('year', CURRENT_DATE)as text),2)as integer)-17 
            then date_part('year', CURRENT_DATE) - cast(concat('19',cast(right(left(t2.c_fisc,8),2)as text))as integer)
            else date_part('year', CURRENT_DATE) - cast(concat('20',cast(right(left(t2.c_fisc,8),2)as text))as integer) end
          else null end as eta ,
      case when t2.id_metodo_pagamento is null or t2.id_metodo_pagamento = 6 then 'NON SDD' else 'SDD' end as metodo_pagamento,
      case when t2.fattura_digitale is null or t2.fattura_digitale = 0 then 'CARTACEO' else 'DIGITALE' end as invio_fatture
        from ${tenant}.gas_udd e
        left join ${tenant}.gas_datamax_filtered t2 on left(e."COD_PDR" ,14) = left(t2.cod_pdr ,14)
        left join rcu.public.province p on upper(t2.provincia) = p.sigla_province  
        where "MESE" = ? and "ANNO" = ? group by 
          left("COD_PDR",14) ,
          case when length(t2.c_fisc) > 11 
            then case when cast(right(left(t2.c_fisc,11),2)as integer) > 31 
              then 'M' 
              else 'F' end
            else null end , 
          p.regione_province ,
          case when length(t2.c_fisc) > 11 
            then case when cast(right(left(t2.c_fisc,8),2)as integer) >= cast(right(cast(date_part('year', CURRENT_DATE)as text),2)as integer)-17 
              then date_part('year', CURRENT_DATE) - cast(concat('19',cast(right(left(t2.c_fisc,8),2)as text))as integer)
              else date_part('year', CURRENT_DATE) - cast(concat('20',cast(right(left(t2.c_fisc,8),2)as text))as integer) end
            else null end ,
        case when t2.id_metodo_pagamento is null or t2.id_metodo_pagamento = 6 then 'NON SDD' else 'SDD' end ,
        case when t2.fattura_digitale is null or t2.fattura_digitale = 0 then 'CARTACEO' else 'DIGITALE' end ,
        p.nome_province,t2.c_fisc,t2.cap,t2.localita ,p.sigla_province  
        order by count(left("COD_PDR",14)) , p.regione_province `
      }
      const query = await Database.connection('rcu').raw(queryBuilder,arrQuery)
      const json2csvParser = new Json2csvParser({ header: true,delimiter: ';'});
      const csv = await json2csvParser.parse(query.rows);
      return csv
    } catch (error) {
      console.log("err",error)
    }
  }

  async italyMap({response,request}){
    try {
      const {regione,mese,anno} = request.all()
      let tenant = request.headers().tenant_gas
      var arrQuery = [mese,anno]
      var queryBuilder = ''
      if(regione) {
        arrQuery = [mese,anno,regione]
        queryBuilder = `select count(left("COD_PDR",14)) as totale,
      '${regione}' as regione_province , t2.provincia as nome_province,
      case when length(t2.c_fisc) > 11 
        then case when cast(right(left(t2.c_fisc,11),2)as integer) > 31 
          then 'M' else 'F' end
        else null end as sesso ,
      case when length(t2.c_fisc) > 11 
        then case when cast(right(left(t2.c_fisc,8),2)as integer) >= cast(right(cast(date_part('year', CURRENT_DATE)as text),2)as integer)-17 
          then date_part('year', CURRENT_DATE) - cast(concat('19',cast(right(left(t2.c_fisc,8),2)as text))as integer)
          else date_part('year', CURRENT_DATE) - cast(concat('20',cast(right(left(t2.c_fisc,8),2)as text))as integer) end
		    else null end as eta_attuale ,
      case when t2.id_metodo_pagamento is null then 6 else t2.id_metodo_pagamento end as id_metodo_pagamento,
      case when t2.fattura_digitale is null then 0 else t2.fattura_digitale end as fattura_digitale
      from ugm.gas_udd e
      inner join ugm.gas_datamax_filtered as t2 on left(e."COD_PDR" ,14) = left(t2.cod_pdr ,14) 
      where "MESE" = ? and "ANNO" = ? and t2.provincia in (select sigla_province from rcu.public.province where regione_province =?)
      group by 
      case when length(t2.c_fisc) > 11 
        then case when cast(right(left(t2.c_fisc,11),2)as integer) > 31 
          then 'M' 
          else 'F' end
        else null end , 
      case when length(t2.c_fisc) > 11 
		    then case when cast(right(left(t2.c_fisc,8),2)as integer) >= cast(right(cast(date_part('year', CURRENT_DATE)as text),2)as integer)-17 
          then date_part('year', CURRENT_DATE) - cast(concat('19',cast(right(left(t2.c_fisc,8),2)as text))as integer)
          else date_part('year', CURRENT_DATE) - cast(concat('20',cast(right(left(t2.c_fisc,8),2)as text))as integer) end
		    else null end ,
      case when t2.id_metodo_pagamento is null then 6 else t2.id_metodo_pagamento end,
      case when t2.fattura_digitale is null then 0 else t2.fattura_digitale end ,
      t2.provincia
      order by count(left("COD_PDR",14))`
      } else {
        queryBuilder = `select count(left("COD_PDR",14)) as totale,
        p.regione_province,case when length(t2.c_fisc) > 11 
          then case when cast(right(left(t2.c_fisc,11),2)as integer) > 31 
            then 'M' else 'F' end
          else null end as sesso ,
        case when length(t2.c_fisc) > 11 
          then case when cast(right(left(t2.c_fisc,8),2)as integer) >= cast(right(cast(date_part('year', CURRENT_DATE)as text),2)as integer)-17 
            then date_part('year', CURRENT_DATE) - cast(concat('19',cast(right(left(t2.c_fisc,8),2)as text))as integer)
            else date_part('year', CURRENT_DATE) - cast(concat('20',cast(right(left(t2.c_fisc,8),2)as text))as integer) end
          else null end as eta_attuale ,
        case when t2.id_metodo_pagamento is null then 6 else t2.id_metodo_pagamento end as id_metodo_pagamento,
        case when t2.fattura_digitale is null then 0 else t2.fattura_digitale end as fattura_digitale
        from ${tenant}.gas_udd e
        left join ${tenant}.gas_datamax_filtered t2 on left(e."COD_PDR" ,14) = left(t2.cod_pdr ,14)
        left join rcu.public.province p on upper(t2.provincia) = p.sigla_province 
        where "MESE" = ? and "ANNO" = ?  group by 
        case when length(t2.c_fisc) > 11 
          then case when cast(right(left(t2.c_fisc,11),2)as integer) > 31 
            then 'M' 
            else 'F' end
          else null end , 
        p.regione_province ,
        case when length(t2.c_fisc) > 11 
          then case when cast(right(left(t2.c_fisc,8),2)as integer) >= cast(right(cast(date_part('year', CURRENT_DATE)as text),2)as integer)-17 
            then date_part('year', CURRENT_DATE) - cast(concat('19',cast(right(left(t2.c_fisc,8),2)as text))as integer)
            else date_part('year', CURRENT_DATE) - cast(concat('20',cast(right(left(t2.c_fisc,8),2)as text))as integer) end
          else null end ,
        case when t2.id_metodo_pagamento is null then 6 else t2.id_metodo_pagamento end,
        case when t2.fattura_digitale is null then 0 else t2.fattura_digitale end order by count(left("COD_PDR",14)) , p.regione_province `
      }
      // await Database.connection('rcu').raw('SET enable_mergejoin = off')
      const query = await Database.connection('rcu').raw(queryBuilder,arrQuery)
      let finalObject = {
        totale:  0,
        tot_uomo : 0,
        tot_donna : 0,
        tot_piva : 0,
        tot_sdd : 0,
        tot_no_sdd : 0,
        tot_bollettino : 0,
        tot_digitale : 0,
        etaUnder24:0,
        eta25_34: 0,
        eta35_44: 0,
        eta45_54: 0,
        eta55_64: 0,
        etaOver65: 0,
        eta_piu_giovane: null,
        eta_piu_vecchio: null,
        regione_piu_attiva: {key:'',value:0},
        regione_meno_attiva: {key:'',value:0}
      }
      let getRegioni = []
      if(regione) {
        getRegioni = query.rows.map(el => el.nome_province)
        getRegioni = getRegioni.reduce((ac,a) => ({...ac,[a]:0}),{});
      }else {
        getRegioni = query.rows.map(el => el.regione_province)
        getRegioni = getRegioni.reduce((ac,a) => ({...ac,[a]:0}),{});
      }
      query.rows.forEach(element => {
        if(regione) getRegioni[element.nome_province] += Number(element.totale)
        else getRegioni[element.regione_province] += Number(element.totale)
        finalObject.totale += Number(element.totale)
        if(finalObject.eta_piu_giovane == null) finalObject.eta_piu_giovane = element.eta_attuale
        else if(element.eta_attuale != null) {
          if(finalObject.eta_piu_giovane > element.eta_attuale) finalObject.eta_piu_giovane = element.eta_attuale
        }

        if(finalObject.eta_piu_vecchio == null) finalObject.eta_piu_vecchio = element.eta_attuale
        else if(element.eta_attuale != null) {
          if(finalObject.eta_piu_vecchio < element.eta_attuale) finalObject.eta_piu_vecchio = element.eta_attuale
        }
        if(element.eta_attuale >= 18 && element.eta_attuale <=24 ) finalObject.etaUnder24 += Number(element.totale)
        if(element.eta_attuale >= 25 && element.eta_attuale <=34 ) finalObject.eta25_34 += Number(element.totale)
        if(element.eta_attuale >= 35 && element.eta_attuale <=44 ) finalObject.eta35_44 += Number(element.totale)
        if(element.eta_attuale >= 45 && element.eta_attuale <=54 ) finalObject.eta45_54 += Number(element.totale)
        if(element.eta_attuale >= 55 && element.eta_attuale <=64 ) finalObject.eta55_64 += Number(element.totale)
        if(element.eta_attuale >= 65 ) finalObject.etaOver65 += Number(element.totale)
        if(element.sesso === 'M') finalObject.tot_uomo += Number(element.totale)
        if(element.sesso === 'F') finalObject.tot_donna += Number(element.totale)
        if(element.sesso === null) finalObject.tot_piva += Number(element.totale)
        if(element.id_metodo_pagamento != 6) finalObject.tot_sdd += Number(element.totale)
        if(element.id_metodo_pagamento === 6) finalObject.tot_no_sdd += Number(element.totale)
        if(element.fattura_digitale === 0) finalObject.tot_bollettino += Number(element.totale)
        if(element.fattura_digitale === 1) finalObject.tot_digitale += Number(element.totale)
      });
      delete getRegioni['null']
      for (const [key, value] of Object.entries(getRegioni)) {
        if(finalObject.regione_piu_attiva.key === ''){
          finalObject.regione_piu_attiva.key = key
          finalObject.regione_piu_attiva.value = value
        }else if(finalObject.regione_piu_attiva.value < value) {
          finalObject.regione_piu_attiva.key = key
          finalObject.regione_piu_attiva.value = value
        }

        if(finalObject.regione_meno_attiva.key === ''){
          finalObject.regione_meno_attiva.key = key
          finalObject.regione_meno_attiva.value = value
        }else if(finalObject.regione_meno_attiva.value > value) {
          finalObject.regione_meno_attiva.key = key
          finalObject.regione_meno_attiva.value = value
        }
      }
      return response.send({"status": "success","data": {totale:finalObject,regioni:getRegioni},"message": `Italy Map `})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async statusCache({response,request}){
    try {
      let tenant = request.headers().tenant_gas
      let query = await Database.connection('rcu')
      .raw(`select "MESE","ANNO" from ${tenant}.gas_udd ec order by "ANNO" desc,"MESE" desc limit 1 `)
      let RedisController = use(`App/Controllers/Http/RedisRouteController`)
      const RedisClass = new RedisController()
      if(query.rows.length > 0) {
        let final_value = await RedisClass.statusCache(tenant,name_controller,query.rows[0].MESE,query.rows[0].ANNO)
        return response.send({"status": "success","data": final_value,"message": ``})
        
      }else return response.send({"status": "success","data": {},"message": ``})
      } catch (error) {
        return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
      }
  }

  async refreshCache({response,request}){
    try {
      let tenant = request.headers().tenant_gas
      let query = await Database.connection('rcu')
      .raw(`select "MESE","ANNO" from ${tenant}.gas_udd ec order by "ANNO" desc,"MESE" desc limit 1 `)
      if(query.rows.length > 0) {
        let RedisController = use(`App/Controllers/Http/RedisRouteController`)
        const RedisClass = new RedisController()
        RedisClass.updateCacheImport(tenant,name_controller,query.rows[0].MESE,query.rows[0].ANNO)
      }
      return response.send({"status": "success","data": "","message": `Creazione Cache avviata `})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
   }
  }

  async deleteCache({response,request}){
      try {
        let tenant = request.headers().tenant_gas
        let RedisController = use(`App/Controllers/Http/RedisRouteController`)
        const RedisClass = new RedisController()
        await RedisClass.deleteKeys(tenant,name_controller)
        return response.send({"status": "success","data": "","message": `Cache Eliminata avviata `})
      } catch (error) {
        return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async graficoTotaleDetailPerditaPod({request,response}){
    try {
      const {mese,anno,invio_fatture,modalita_pagamento,agente_id} = request.all()
      let tenant = request.headers().tenant_gas
      let currentDate = `${anno}-${mese}-01`
      var listaAgenti = []
      if(tenant == 'ugm' && typeof(agente_id) != 'undefined' && agente_id != null) {
        listaAgenti = await this.subAgentiFunc(agente_id)
      }
      let prevMonth = mese-1
        let prevYear = anno
        if(mese == 1) {
          prevMonth = 12
          prevYear = anno-1
        }
      let finalValue =  {}
      
      let queryArray = [anno,mese,prevMonth,prevYear,currentDate]
      let queryBuilder = `select count(distinct(left("COD_PDR",14))) as totale,"MESE","ANNO" from ${tenant}.gas_udd ec`
      if(typeof(invio_fatture) != 'undefined' && invio_fatture != null || typeof(modalita_pagamento) != 'undefined' && modalita_pagamento != null || listaAgenti.length > 0) {
        queryBuilder += ` left join ${tenant}.gas_datamax_filtered t3 on left(t3.cod_pdr,14) = left(ec."COD_PDR",14)`
      }
      if(listaAgenti.length > 0) {
        queryBuilder += `left join ${tenant}.recursive_agenti ra on ra.idagente = t3.agente_id`
      }
      queryBuilder += ` where left("COD_PDR",14) in 
        (
          select distinct(left("COD_PDR",14)) as COD_PDR from ${tenant}.gas_udd fr2 
          where "ANNO" = ? and "MESE" = ? 
          and left("COD_PDR",14) not in (select left("COD_PDR",14) from ${tenant}.gas_udd fr2 
          where "MESE" = ? and "ANNO" = ?)
        ) and to_date(concat("ANNO","MESE"),'yyyymm') >= ?`
      if(typeof(modalita_pagamento) != 'undefined' && modalita_pagamento != null) {
        queryBuilder += ` and (id_metodo_pagamento ${modalita_pagamento == 0 ? '= 6 or id_metodo_pagamento is null' : ' <> 6'}) `
      }
      if(typeof(invio_fatture) != 'undefined' && invio_fatture != null) {
        queryBuilder += ` and (fattura_digitale ${invio_fatture == 0 ? '= 0 or fattura_digitale is null' : ' = 1'}) `
      }
      if(listaAgenti.length > 0) {
        queryBuilder += ` and (ra.idagente in (${listaAgenti})) `
      }
      queryBuilder += ` group by ec."ANNO",ec."MESE"  order by "ANNO","MESE" ` 
      await Database.connection('rcu').raw('SET enable_mergejoin = off')
      let query = await Database.connection('rcu').raw(queryBuilder,queryArray)
      let totale = []
      if(query.rows.length>0) {

        for(let i = query.rows.length-1; i>=0 ; i--){
          if(i != 0) {
            
            totale.push({
              x:`${mesiDispacciamento[query.rows[i].MESE-1].toUpperCase()} - ${query.rows[i].ANNO}`, 
              y:query.rows[i].totale,
              percTA: `[T-${i}]: (${(((query.rows[i].totale-query.rows[0].totale)/query.rows[0].totale*100) - 
              ((query.rows[i-1].totale-query.rows[0].totale)/query.rows[0].totale*100)).toFixed(2)}%)`,
              percMensile: ((query.rows[i].totale-query.rows[i-1].totale)/query.rows[i-1].totale*100).toFixed(2),
              percAnnuale: ((query.rows[i].totale-query.rows[0].totale)/query.rows[0].totale*100).toFixed(2)
            })
            
          }else {
            totale.push({
              x:`${mesiDispacciamento[query.rows[i].MESE-1].toUpperCase()} - ${query.rows[i].ANNO}`,
              y:query.rows[i].totale,
              percTA: `[T-${i}]: (0%)`,
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

  // Redis Route

  async graficoAvanzatoTotalePerditaPod({request,response}){
    try {
      var {annopartenza,mese,anno,invio_fatture,modalita_pagamento,agente_id} = request.all()
      let tenant = request.headers().tenant_gas
      let value = await this._graficoATPPFunc({annopartenza,mese,anno,invio_fatture,modalita_pagamento,agente_id},tenant)
      return response.send({"status": "success","data": value,"message": `Ritorno di tutti le informazioni necessarie per la dashboard`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async _graficoATPPFunc(request,tenant){
    try {
      var {annopartenza,mese,anno,invio_fatture,modalita_pagamento,agente_id} = request
      let currentDate = `${anno}-${mese}-01`
      let keyRedis = `_graficoATPPFunc_RcuGasUddController_${tenant}_${annopartenza}_${mese}_${anno}`
      
      if(tenant == 'ugm' && typeof(invio_fatture) != 'undefined' && invio_fatture != null) keyRedis+=`_invio_${invio_fatture}`
      if(tenant == 'ugm' && typeof(modalita_pagamento) != 'undefined' && modalita_pagamento != null) keyRedis+=`_pagamento_${modalita_pagamento}`
      let listaAgenti = []
      if(tenant == 'ugm' && typeof(agente_id) != 'undefined' && agente_id != null) {
        keyRedis+=`agente_id_${agente_id}`
        listaAgenti = await this.subAgentiFunc(agente_id)
      }
      
      let finalValue =  {labels:[],series:[{"name":"Inizio", data: [],type:'bar'},{"name":"Oggi", data: [],type:'bar'}]}
      
      const cachedGraficoAvanzato = await Redis.get(keyRedis)
      if (cachedGraficoAvanzato) {
        return JSON.parse(cachedGraficoAvanzato)
      }

      let queryLast = await Database.connection('rcu')
      .raw(`select "MESE","ANNO" from ${tenant}.gas_udd ec order by "ANNO" asc,"MESE" asc limit 1 `)
      let queryLastDate = `01/${queryLast.rows[0].MESE <= 9 ? '0'+ queryLast.rows[0].MESE.toString() : queryLast.rows[0].MESE.toString()}/${queryLast.rows[0].ANNO}`
      queryLastDate = moment(queryLastDate,'DD/MM/YYYY')
      do {
        let prevMonth = mese-1
        let prevYear = anno
        if(mese == 1) {
          prevMonth = 12
          prevYear = anno-1
        }
        let currentDateTemp = `01/${prevMonth<=9 ? '0'+ prevMonth.toString() : prevMonth}/${prevYear}`
        currentDateTemp = moment(currentDateTemp,'DD/MM/YYYY')
        if(currentDateTemp >= queryLastDate) {

        let queryBuilderOggi = `select count(distinct(left("COD_PDR",14))) as totale from  ${tenant}.gas_udd ec where 
        left("COD_PDR",14) in 
           (
             select distinct(left("COD_PDR",14)) as COD_PDR from  ${tenant}.gas_udd fr2 where "ANNO" = ? and "MESE" = ? 
             and left("COD_PDR",14) not in (select left("COD_PDR",14) from  ${tenant}.gas_udd fr2 where "MESE" = ? and "ANNO" = ?)
           ) and to_date(concat("ANNO","MESE"),'yyyymm') = ?`
        
        let queryBuilderAtt = `select count(distinct(left("COD_PDR",14))) as totale ,"MESE","ANNO" from  ${tenant}.gas_udd fr2
        where "ANNO" = ? and "MESE" = ?
        and left("COD_PDR",14) not in (select left("COD_PDR",14) from ${tenant}.gas_udd fr2 where "MESE" = ? and "ANNO" = ?) 
        group by "MESE","ANNO" order by "MESE","ANNO"`
        

        let arrayAttivazione = [anno,mese,prevMonth,prevYear]
        let arrayOggi = [anno,mese,prevMonth,prevYear,currentDate]
        
        if(tenant == 'ugm' && typeof(invio_fatture) != 'undefined' && invio_fatture != null || typeof(modalita_pagamento) != 'undefined' && modalita_pagamento != null || listaAgenti.length > 0) {
          queryBuilderAtt = `select count(distinct(left("COD_PDR",14))) as totale ,"MESE","ANNO" from  ${tenant}.gas_udd fr2
          left join ${tenant}.gas_datamax_filtered t3 on left(t3.cod_pdr,14) = left(fr2."COD_PDR",14)`
          
          if(tenant == 'ugm' && listaAgenti.length > 0) {
            queryBuilderAtt += `left join ${tenant}.recursive_agenti ra on ra.idagente = t3.agente_id`
          }

          queryBuilderAtt += ` where "ANNO" = ? and "MESE" = ?
          and left("COD_PDR",14) not in (select left("COD_PDR",14) from ${tenant}.gas_udd fr2 where "MESE" = ? and "ANNO" = ?)  `

          queryBuilderOggi = `select count(distinct(left("COD_PDR",14))) as totale from  ${tenant}.gas_udd ec 
          left join ${tenant}.gas_datamax_filtered t3 on left(t3.cod_pdr,14) = left(ec."COD_PDR",14)`

          if(listaAgenti.length > 0) {
            queryBuilderOggi += `join ${tenant}.recursive_agenti ra on ra.idagente = t3.agente_id`
          }
          queryBuilderOggi += ` where 
          left("COD_PDR",14) in 
             (
               select distinct(left("COD_PDR",14)) as COD_PDR from  ${tenant}.gas_udd fr2 where "ANNO" = ? and "MESE" = ? 
               and left("COD_PDR",14) not in (select left("COD_PDR",14) from  ${tenant}.gas_udd fr2 where "MESE" = ? and "ANNO" = ?)
             ) `
          if(typeof(modalita_pagamento) != 'undefined' && modalita_pagamento != null) {
            queryBuilderAtt += ` and (id_metodo_pagamento ${modalita_pagamento == 0 ? '= 6 or id_metodo_pagamento is null' : ' <> 6'}) `
            queryBuilderOggi += ` and (id_metodo_pagamento ${modalita_pagamento == 0 ? '= 6 or id_metodo_pagamento is null' : ' <> 6'}) `
          }
          if(typeof(invio_fatture) != 'undefined' && invio_fatture != null) {
            queryBuilderAtt += ` and (fattura_digitale ${invio_fatture == 0 ? '= 0 or fattura_digitale is null' : ' = 1'}) `
            queryBuilderOggi += ` and (fattura_digitale ${invio_fatture == 0 ? '= 0 or fattura_digitale is null' : ' = 1'}) `
          }
          if(listaAgenti.length > 0) {
            queryBuilderAtt += ` and (ra.idagente in (${listaAgenti})) `
            queryBuilderOggi += ` and (ra.idagente in (${listaAgenti})) `
          }
          queryBuilderAtt += ` group by "MESE","ANNO" order by "MESE","ANNO"`
          queryBuilderOggi +=` and to_date(concat("ANNO","MESE"),'yyyymm') = ?`
        }
        await Database.connection('rcu').raw('SET enable_mergejoin = off')
        let query =  await Database.connection('rcu').raw(queryBuilderOggi,arrayOggi)
        let queryAttivazione =  await Database.connection('rcu').raw(queryBuilderAtt,arrayAttivazione)
        finalValue.labels.push(`${mesiDispacciamento[mese-1].toUpperCase()} - ${anno}`)
        if(queryAttivazione.rows.length > 0) {
          finalValue.series[0].data.push(queryAttivazione.rows[0].totale)
        }else {
          finalValue.series[0].data.push(0)
        }

        if(query.rows.length > 0) {
          finalValue.series[1].data.push(query.rows[0].totale)
        }else {
          finalValue.series[1].data.push(0)
        }
      }
      mese = mese-1
      if(mese == 0) {
        mese = 12
        anno = anno -1
      }
      } while (!(anno == annopartenza-1));
      finalValue.labels.reverse()
      finalValue.series[0].data.reverse()
      finalValue.series[1].data.reverse()
      await Redis.set(keyRedis, JSON.stringify(finalValue))
      return finalValue
    } catch (error) {
      console.log("err",error)
      throw error
    }

  }

  async tableTassoAbbandono({request,response}){
    try {
      const {annopartenza,mese,anno,limitElements,invio_fatture,modalita_pagamento,agente_id} = request.all()
      let tenant = request.headers().tenant_gas
      let value = await this._tableTAFunc({annopartenza,mese,anno,limitElements,invio_fatture,modalita_pagamento,agente_id},tenant)
      return response.send({"status": "success","data": value,"message": `Ritorno di tutti le informazioni necessarie per la dashboard`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async _tableTAFunc(request,tenant) {
    try {
      var {annopartenza,mese,anno,limitElements,invio_fatture,modalita_pagamento,agente_id} = request
      let keyRedis = `_tableTAFunc_RcuGasUddController_${tenant}_${annopartenza}_${mese}_${anno}_${limitElements}`
      if(tenant == 'ugm' && typeof(invio_fatture) != 'undefined' && invio_fatture != null) keyRedis+=`_invio_${invio_fatture}`
      if(tenant == 'ugm' && typeof(modalita_pagamento) != 'undefined' && modalita_pagamento != null) keyRedis+=`_pagamento_${modalita_pagamento}`
      var listaAgenti = []
      if(tenant == 'ugm' && typeof(agente_id) != 'undefined' && agente_id != null) {
        keyRedis+=`agente_id_${agente_id}`
        listaAgenti = await this.subAgentiFunc(agente_id)
      }
      const cachedTassoAbbandono = await Redis.get(keyRedis)
      if (cachedTassoAbbandono) {
        return JSON.parse(cachedTassoAbbandono)
      }
      let limitK = limitElements
      let vista = 'percentuale'
      let query = await Database.connection('rcu')
      .raw(`select "MESE" as competenza_mese ,"ANNO" as competenza_anno from  ${tenant}.gas_udd ec where "ANNO" >= ? group by "MESE","ANNO" order by "ANNO" ,"MESE"`,annopartenza)
      if(query.rows.length > 0 ) {
        for(let i in query.rows) {
          query.rows[i].competenza = `${mesiDispacciamento[query.rows[i].competenza_mese-1]}-${query.rows[i].competenza_anno.toString().slice(-2)}`
        }
      } 

      let table = []
      let table2 = []
      let headers = ['competenza']
      let headersQuarter = []
      let bigger = null
      let lower = null
      let biggerQuarter = null
      let lowerQuarter = null

      if(query.rows.length>0) {
        let tempMonthYear = []
          for(let i in query.rows){
            tempMonthYear.push({totale: 0,MESE:Number(query.rows[i].competenza_mese),ANNO:Number(query.rows[i].competenza_anno)})
          }
        for(let i in query.rows) {
          let currentDate = `${query.rows[i].competenza_anno}-${query.rows[i].competenza_mese}-01`
          let prevMonth = query.rows[i].competenza_mese-1
          let prevYear = query.rows[i].competenza_anno
            if(query.rows[i].competenza_mese == 1) {
              prevMonth = 12
              prevYear = query.rows[i].competenza_anno-1
            }
          let tempHeaders = []
          let valUnionDisp = query.rows[i].competenza
          let innerMonth = Number(query.rows[i].competenza_mese)
          let innerYear = query.rows[i].competenza_anno

          let queryArray = [query.rows[i].competenza_anno,query.rows[i].competenza_mese,prevMonth,prevYear,currentDate]
          let queryBuilder = `select count(distinct(left("COD_PDR",14))) as totale,"MESE","ANNO" from ${tenant}.gas_udd ec`
          if(tenant == 'ugm' && typeof(invio_fatture) != 'undefined' && invio_fatture != null || typeof(modalita_pagamento) != 'undefined' && modalita_pagamento != null || listaAgenti.length > 0 ) {
            queryBuilder += ` left join ${tenant}.gas_datamax_filtered t3 on left(t3.cod_pdr,14) = left(ec."COD_PDR",14)`
          }
          if(tenant == 'ugm' && listaAgenti.length > 0) {
            queryBuilder += `left join ${tenant}.recursive_agenti ra on ra.idagente = t3.agente_id`
          }
          queryBuilder += ` where left("COD_PDR",14) in 
            (
              select distinct(left("COD_PDR",14)) as COD_PDR from ${tenant}.gas_udd fr2 
              where "ANNO" = ? and "MESE" = ? 
              and left("COD_PDR",14) not in (select left("COD_PDR",14) from ${tenant}.gas_udd fr2 
              where "MESE" = ? and "ANNO" = ?)
            ) and to_date(concat("ANNO","MESE"),'yyyymm') >= ?`
          if(typeof(modalita_pagamento) != 'undefined' && modalita_pagamento != null) {
            queryBuilder += ` and (id_metodo_pagamento ${modalita_pagamento == 0 ? '= 6 or id_metodo_pagamento is null' : ' <> 6'}) `
          }
          if(typeof(invio_fatture) != 'undefined' && invio_fatture != null) {
            queryBuilder += ` and (fattura_digitale ${invio_fatture == 0 ? '= 0 or fattura_digitale is null' : ' = 1'}) `
          }
          if(listaAgenti.length > 0) {
            queryBuilder += ` and (ra.idagente in (${listaAgenti})) `
          }
          queryBuilder += ` group by ec."ANNO",ec."MESE"  order by "ANNO","MESE" ` 
          await Database.connection('rcu').raw('SET enable_mergejoin = off')
          let queryDetail = await Database.connection('rcu').raw(queryBuilder,queryArray)
          if(queryDetail.rows.length > 0 ) {
            for(let c in queryDetail.rows) {
              queryDetail.rows[c].competenza = `${mesiDispacciamento[queryDetail.rows[c].MESE-1]}-${queryDetail.rows[c].ANNO.toString().slice(-2)}`
            }
          } 
          let totale = {}
          let totale2 = {}
          let tempValue = []
          tempMonthYear.forEach(el=>{
            if(new Date(`${el.ANNO}-${el.MESE}-01`) >= new Date(`${innerYear}-${innerMonth}-01`)) {
              let totale = queryDetail.rows.filter(fil => fil.MESE == el.MESE && fil.ANNO == el.ANNO)
              if(totale.length > 0) tempValue.push(totale[0])
              else tempValue.push(el)
            }
          })
          queryDetail.rows = tempValue
          if(queryDetail.rows.length-1 >= 3 && (limitK >= 3 || limitK == 0)) {totale2['M1-3']= 0}
          if(queryDetail.rows.length-1 >= 6 && (limitK >= 6 || limitK == 0)){totale2['M4-6']= 0}
          if(queryDetail.rows.length-1 >= 9 && (limitK >= 9 || limitK == 0)){totale2['M7-9']= 0}
          if(queryDetail.rows.length-1 >= 12 && (limitK >= 12 || limitK == 0)) {totale2['M10-12']= 0;totale2['M1-12']= 0}
          if(queryDetail.rows.length-1 >= 24 && (limitK >= 24 || limitK == 0)){totale2['M1-24']= 0}
          if(queryDetail.rows.length-1 >= 36 && (limitK >= 36 || limitK == 0)){totale2['M1-36']= 0}
          if(queryDetail.rows.length-1 >= 48 && (limitK >= 48 || limitK == 0)) {totale2['M1-48']= 0}
          
          for(let k = queryDetail.rows.length-1; k>=0 ; k--){
            if(k != 0) {
              if(limitK != 0 && k > limitK) continue
              if(i == 0) tempHeaders.push(`M${k}`)
              let prevMonth = Number(queryDetail.rows[k-1].totale)
              let currentMonth = Number(queryDetail.rows[k].totale)
              let startMonth = Number(queryDetail.rows[0].totale)
              if(Number(queryDetail.rows[k-1].totale) < Number(queryDetail.rows[k].totale)) {
              queryDetail.rows[k].totale = Number(queryDetail.rows[k-1].totale)
              currentMonth = Number(queryDetail.rows[k-1].totale)
              }
              // else {
                if(k==1 && queryDetail.rows[k].totale == null) totale[`M${k}`] = 0
                else {
                  if(vista === 'percentuale') {
                    if(currentMonth && prevMonth) {
                      totale[`M${k}`] = `${Number(
                        (
                          ((currentMonth -startMonth)/startMonth *100) - ((prevMonth - startMonth)/startMonth*100)
                        ).toFixed(1))}` 
                      } else {totale[`M${k}`] = "0"}
                    }else {
                      totale[`M${k}`] = `${Number((((queryDetail.rows[k].totale-queryDetail.rows[0].totale)) - 
                        ((queryDetail.rows[k-1].totale-queryDetail.rows[0].totale))).toFixed(1))}`
                      }
                  }
                // }
                  if(Math.sign(totale[`M${k}`]) == -1) totale[`M${k}`] = Number(totale[`M${k}`])*-1
                  if(Math.sign(totale[`M${k}`]) == 1) totale[`M${k}`] = Number(totale[`M${k}`])*1
                  
                if(!bigger || totale[`M${k}`] >= Number(bigger)) bigger = Number(totale[`M${k}`])
                if(!lower || totale[`M${k}`] < Number(lower)) lower = Number(totale[`M${k}`])
                if(k>=1 && k<=3 && totale2['M1-3'] !== undefined) {totale2['M1-3'] += Number(totale[`M${k}`])}
                if(k>=4 && k<=6 && totale2['M4-6'] !== undefined) {totale2['M4-6'] += Number(totale[`M${k}`])}
                if(k>=7 && k<=9 && totale2['M7-9'] !== undefined) totale2['M7-9'] += Number(totale[`M${k}`])
                if(k>=10 && k<=12 &&totale2['M10-12'] !== undefined) totale2['M10-12'] += Number(totale[`M${k}`])
                if(k>=1 && k<=12 && totale2['M1-12'] !== undefined) totale2['M1-12'] += Number(totale[`M${k}`])
                if(k>=1 && k<=24 && totale2['M1-24'] !== undefined) totale2['M1-24'] += Number(totale[`M${k}`])
                if(k>=1 && k<=36 && totale2['M1-36']!== undefined ) totale2['M1-36'] += Number(totale[`M${k}`])
                if(k>=1 && k<=48 && totale2['M1-48']!== undefined ) totale2['M1-48'] += Number(totale[`M${k}`])
            }else if(i == 0){
              if(queryDetail.rows.length-1 >= 3 && (limitK >= 3 || limitK == 0)) {headersQuarter.push(`M1-3`)}
              if(queryDetail.rows.length-1 >= 6 && (limitK >= 6 || limitK == 0)){headersQuarter.push(`M4-6`)}
              if(queryDetail.rows.length-1 >= 9 && (limitK >= 9 || limitK == 0)){headersQuarter.push(`M7-9`)}
              if(queryDetail.rows.length-1 >= 12 && (limitK >= 12 || limitK == 0)) {headersQuarter.push(`M10-12`);headersQuarter.push(`M1-12`)}
              if(queryDetail.rows.length-1 >= 24 && (limitK >= 24 || limitK == 0)){headersQuarter.push(`M1-24`)}
              if(queryDetail.rows.length-1 >= 36 && (limitK >= 36 || limitK == 0)){headersQuarter.push(`M1-36`)}
              if(queryDetail.rows.length-1 >= 48 && (limitK >= 48 || limitK == 0)) {headersQuarter.push(`M1-48`)}
            }
          }
          headers.push(...tempHeaders.reverse())
          if(Object.keys(totale).length>0) {
            table.push({competenza: valUnionDisp, ...totale})
          }
          if(Object.keys(totale2).length>0) {
            for (var [key, value] of Object.entries(totale2)) {
              if(key != 'M1-12' && key != 'M1-24' &&  key != 'M1-36' && key != 'M1-48') {
                if(!biggerQuarter || value> biggerQuarter) biggerQuarter = value
                if(!lowerQuarter || value< lowerQuarter) lowerQuarter = value
              }
            }
            
            table2.push({competenza: valUnionDisp,...totale2})
          }
        }
      }

      if(bigger ==0) bigger = 100
      if(biggerQuarter ==0) biggerQuarter = 100
      let range = {
        range1: lower,
        range2: lower + ((bigger-lower)/30 *1),
        range3: lower + ((bigger-lower)/30 *2),
        range4: lower + ((bigger-lower)/24 *3),
        range5: lower + ((bigger-lower)/18 *4),
        range6: lower + ((bigger-lower)/18 *5),
        range7: lower + ((bigger-lower)/12 *6),
        range8: lower + ((bigger-lower)/12 *8),
        range9: bigger,
      }

      let rangeQuarter = {
        range1: lowerQuarter,
        range2: lowerQuarter + ((biggerQuarter-lower)/30 *1),
        range3: lowerQuarter + ((biggerQuarter-lower)/30 *2),
        range4: lowerQuarter + ((biggerQuarter-lower)/24 *3),
        range5: lowerQuarter + ((biggerQuarter-lower)/18 *4),
        range6: lowerQuarter + ((biggerQuarter-lower)/18 *5),
        range7: lowerQuarter + ((biggerQuarter-lower)/12 *6),
        range8: lowerQuarter + ((biggerQuarter-lower)/12 *8),
        range9: biggerQuarter,
      }
      let finalObject = {range,vista,headers,data:table,rangeQuarter,headersQuarter,dataQuarter: table2}
      await Redis.set(keyRedis, JSON.stringify(finalObject))
      return finalObject
    } catch (error) {
      throw error
    }
  }

  async andamentoAttDisatVolumi({request,response}){
    try {
      var {annopartenza,mese,anno,invio_fatture,modalita_pagamento,agente_id} = request.all()
      let tenant = request.headers().tenant_gas
      let value = await this._andamentoADVFunc({annopartenza,mese,anno,invio_fatture,modalita_pagamento,agente_id},tenant)
      return response.send({"status": "success","data": value,"message": `Ritorno di tutti le informazioni necessarie per la dashboard`})
    } catch (error) {
      console.log("error",error)
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
      
    }
  }

  async _andamentoADVFunc(request,tenant) {
    try {
      var {annopartenza,mese,anno,invio_fatture,modalita_pagamento,agente_id} = request
      let keyRedis = `_andamentoADVFunc_RcuGasUddController_${tenant}_${annopartenza}_${mese}_${anno}`
      if(tenant == 'ugm' && typeof(invio_fatture) != 'undefined' && invio_fatture != null) keyRedis+=`_invio_${invio_fatture}`
      if(tenant == 'ugm' && typeof(modalita_pagamento) != 'undefined' && modalita_pagamento != null) keyRedis+=`_pagamento_${modalita_pagamento}`
      let listaAgenti = []
      if(tenant == 'ugm' && typeof(agente_id) != 'undefined' && agente_id != null) {
        keyRedis+=`agente_id_${agente_id}`
        listaAgenti = await this.subAgentiFunc(agente_id)
      }
      const cachedAttDisatVolumi = await Redis.get(keyRedis)
      if (cachedAttDisatVolumi) {
        return JSON.parse(cachedAttDisatVolumi)
      }
      let maxPercent = null
      let max = null
      
      let object = {series:[{name:'Attivazioni',type: 'column',data: [],dataPercent: []},
      {name:'Disattivazioni',type: 'column',data:[],dataPercent:[]},
      {name:'Totale Parco',type: 'area',data:[],dataPercent:[]},],labels:[]}

      let objectPercent = {series:[{name:'Attivazioni',type: 'line',data: []},
      {name:'Disattivazioni',type: 'line',data:[]}],labels:[]}
      let queryParcoTotale = `select ROUND(sum(cast(replace("PREL_ANNUO_PREV",',','.')  as numeric))) as totale,"ANNO","MESE" from ${tenant}.gas_udd fr `
      if(tenant == 'ugm' && typeof(invio_fatture) != 'undefined' && invio_fatture != null || typeof(modalita_pagamento) != 'undefined' && modalita_pagamento != null || listaAgenti.length > 0) {
        queryParcoTotale += `left join ${tenant}.gas_datamax_filtered t3 on left(t3.cod_pdr,14) = left(fr."COD_PDR",14) `
      }
      if(tenant == 'ugm' && listaAgenti.length > 0) {
        queryParcoTotale += `left join ${tenant}.recursive_agenti ra on ra.idagente = t3.agente_id`
      }
      queryParcoTotale += ` where "ANNO" >= ? `
      if(tenant == 'ugm' && typeof(modalita_pagamento) != 'undefined' && modalita_pagamento != null) {
        queryParcoTotale += ` and (id_metodo_pagamento ${modalita_pagamento == 0 ? '= 6 or id_metodo_pagamento is null' : ' <> 6'}) `
      }
      if(tenant == 'ugm' && typeof(invio_fatture) != 'undefined' && invio_fatture != null) {
        queryParcoTotale += ` and (fattura_digitale ${invio_fatture == 0 ? '= 0 or fattura_digitale is null' : ' = 1'}) `
      }
      if(listaAgenti.length > 0) {
        queryParcoTotale += ` and (ra.idagente in (${listaAgenti})) `
      }
      queryParcoTotale += ` group by "ANNO","MESE" order by "ANNO","MESE"`
      await Database.connection('rcu').raw('SET enable_mergejoin = off')
      let queryTotal = await Database.connection('rcu').raw(queryParcoTotale,[annopartenza])

      do {
        let prevMonth = mese-1
        let prevYear = anno
        if(mese == 1) {
          prevMonth = 12
          prevYear = anno-1
        }
        
        let arrayAttivazione = [anno,mese,prevMonth,prevYear]
        let arrayDisattivazione = [prevYear,prevMonth,mese,anno]
        
        let queryBuilder = `select ROUND(sum(cast(replace("PREL_ANNUO_PREV",',','.')  as numeric))) as totale ,"MESE","ANNO" from  ${tenant}.gas_udd fr`
        if(tenant == 'ugm' && typeof(invio_fatture) != 'undefined' && invio_fatture != null || typeof(modalita_pagamento) != 'undefined' && modalita_pagamento != null || listaAgenti.length >0 ) {
          queryBuilder += ` left join ${tenant}.gas_datamax_filtered t3 on left(t3.cod_pdr,14) = left(fr."COD_PDR",14) `
        }
        if(tenant == 'ugm' && listaAgenti.length > 0) {
          queryBuilder += `left join ${tenant}.recursive_agenti ra on ra.idagente = t3.agente_id`
        }
        queryBuilder += ` where "ANNO" = ? and "MESE" = ?`
        if(tenant == 'ugm' && typeof(modalita_pagamento) != 'undefined' && modalita_pagamento != null) {
          queryBuilder += ` and (id_metodo_pagamento ${modalita_pagamento == 0 ? '= 6 or id_metodo_pagamento is null' : ' <> 6'}) `
        }
        if(tenant == 'ugm' && typeof(invio_fatture) != 'undefined' && invio_fatture != null) {
          queryBuilder += ` and (fattura_digitale ${invio_fatture == 0 ? '= 0 or fattura_digitale is null' : ' = 1'}) `
        }
        if(listaAgenti.length > 0) {
          queryBuilder += ` and (ra.idagente in (${listaAgenti})) `
        }
        queryBuilder += ` and left("COD_PDR",14) not in (select left("COD_PDR",14) from ${tenant}.gas_udd fr2 where "MESE" = ? and "ANNO" = ?) 
          group by "MESE","ANNO" order by "MESE","ANNO"`

        await Database.connection('rcu').raw('SET enable_mergejoin = off')
        let query =  await Database.connection('rcu').raw(queryBuilder,arrayDisattivazione)
        let queryAttivazione =  await Database.connection('rcu').raw(queryBuilder,arrayAttivazione)
        let corrispondenza = queryTotal.rows.filter(el => el.MESE == mese && el.ANNO == anno)
        if(corrispondenza.length > 0) {
          object.series[2].data.push(corrispondenza[0].totale)
        }else {
          object.series[2].data.push('0.00')
        }
        // if(queryAttivazione.rows.length > 0 && query.rows.length > 0 ) {
          if(corrispondenza.length > 0) {
            let serZeroPercent = queryAttivazione.rows.length > 0 ? ((Number(queryAttivazione.rows[0].totale)/Number(corrispondenza[0].totale))*100).toFixed(1) : 0
            let serUnoPercent = query.rows.length > 0 ? ((Number(query.rows[0].totale)/Number(corrispondenza[0].totale)*100)).toFixed(1): 0
            objectPercent.series[0].data.push(serZeroPercent)
            objectPercent.series[1].data.push(serUnoPercent)
            if(!maxPercent || Number(serZeroPercent) > Number(maxPercent) || Number(serUnoPercent) > Number(maxPercent)) {
              if(Number(serZeroPercent)>Number(serUnoPercent)) maxPercent = Number(serZeroPercent)
              else maxPercent = Number(serUnoPercent)
            }
          }
          let serZero = queryAttivazione.rows.length > 0 ? Number(queryAttivazione.rows[0].totale) : 0
          let serUno = query.rows.length > 0 ? Number(query.rows[0].totale): 0

          if(!max || serZero > max || serUno > max) {
            if(serZero>serUno) max = serZero
            else max = serUno
          }
          object.series[0].data.push(serZero)
          object.series[1].data.push(serUno)

          object.labels.push(`${mesiDispacciamento[mese-1]}-${anno.toString().slice(-2)}`)
          objectPercent.labels.push(`${mesiDispacciamento[mese-1]}-${anno.toString().slice(-2)}`)
        // }
        mese = mese-1
      if(mese == 0) {
        mese = 12
        anno = anno -1
      }
      } while (!(anno == annopartenza-1));
      object.series[0].data.reverse()
      object.series[1].data.reverse()
      object.series[2].data.reverse()
      object.labels.reverse()
      objectPercent.series[0].data.reverse()
      objectPercent.series[1].data.reverse()
      objectPercent.labels.reverse()
      let finalObject = {maxPercent: Number(maxPercent),max: Number(max)> 2 ? Number(max)+10 : Number(max)+1,assoluti: object,percentuale: objectPercent}
      await Redis.set(keyRedis, JSON.stringify(finalObject))
      return finalObject
    } catch (error) {
      throw error
    }
  }

  async andamentoAttDisatPod({request,response}){
    try {
      var {annopartenza,mese,anno,invio_fatture,modalita_pagamento,agente_id} = request.all()
      let tenant = request.headers().tenant_gas
      let value = await this._andamentoADPFunc({annopartenza,mese,anno,invio_fatture,modalita_pagamento,agente_id},tenant)
      return response.send({"status": "success","data": value,"message": `Ritorno di tutti le informazioni necessarie per la dashboard`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
      
    }
  }

  async _andamentoADPFunc(request,tenant) {
    try {
      var {annopartenza,mese,anno,invio_fatture,modalita_pagamento,agente_id} = request
      let keyRedis = `_andamentoADPFunc_RcuGasUddController_${tenant}_${annopartenza}_${mese}_${anno}`
      if(tenant == 'ugm' && typeof(invio_fatture) != 'undefined' && invio_fatture != null) keyRedis+=`_invio_${invio_fatture}`
      if(tenant == 'ugm' && typeof(modalita_pagamento) != 'undefined' && modalita_pagamento != null) keyRedis+=`_pagamento_${modalita_pagamento}`
      let listaAgenti = []
      if(tenant == 'ugm' && typeof(agente_id) != 'undefined' && agente_id != null) {
          keyRedis+=`agente_id_${agente_id}`
          listaAgenti = await this.subAgentiFunc(agente_id)
        }
      const cachedAttDisatVolumi = await Redis.get(keyRedis)
      if (cachedAttDisatVolumi) {
        return JSON.parse(cachedAttDisatVolumi)
      }
      let maxPercent = null
      let max = null
      
      let object = {series:[{name:'Attivazioni',type: 'column',data: [],dataPercent: []},
      {name:'Disattivazioni',type: 'column',data:[],dataPercent:[]},
      {name:'Totale Parco',type: 'area',data:[],dataPercent:[]},],labels:[]}

      let objectPercent = {series:[{name:'Attivazioni',type: 'line',data: []},
      {name:'Disattivazioni',type: 'line',data:[]}],labels:[]}
      let queryParcoTotale = `select count(distinct(left("COD_PDR",14))) as totale,"ANNO","MESE" from ${tenant}.gas_udd fr `
      if(tenant == 'ugm' && typeof(invio_fatture) != 'undefined' && invio_fatture != null || typeof(modalita_pagamento) != 'undefined' && modalita_pagamento != null || listaAgenti.length > 0 ) {
        queryParcoTotale += `left join ${tenant}.gas_datamax_filtered t3 on left(t3.cod_pdr,14) = left(fr."COD_PDR",14) `
      }
      if(tenant == 'ugm' && listaAgenti.length > 0) {
        queryParcoTotale += `left join ${tenant}.recursive_agenti ra on ra.idagente = t3.agente_id`
      }
      queryParcoTotale += ` where "ANNO" >= ? `
      if(tenant == 'ugm' && typeof(modalita_pagamento) != 'undefined' && modalita_pagamento != null) {
        queryParcoTotale += ` and (id_metodo_pagamento ${modalita_pagamento == 0 ? '= 6 or id_metodo_pagamento is null' : ' <> 6'}) `
      }
      if(tenant == 'ugm' && typeof(invio_fatture) != 'undefined' && invio_fatture != null) {
        queryParcoTotale += ` and (fattura_digitale ${invio_fatture == 0 ? '= 0 or fattura_digitale is null' : ' = 1'}) `
      }
      if(listaAgenti.length > 0) {
        queryParcoTotale += ` and (ra.idagente in (${listaAgenti})) `
      }
      queryParcoTotale += ` group by "ANNO","MESE" order by "ANNO","MESE"`
      await Database.connection('rcu').raw('SET enable_mergejoin = off')
      let queryTotal = await Database.connection('rcu').raw(queryParcoTotale,[annopartenza])

      do {
        let prevMonth = mese-1
        let prevYear = anno
        if(mese == 1) {
          prevMonth = 12
          prevYear = anno-1
        }
        
        let arrayAttivazione = [anno,mese,prevMonth,prevYear]
        let arrayDisattivazione = [prevYear,prevMonth,mese,anno]
        
        let queryBuilder = `select count(distinct(left("COD_PDR",14))) as totale,"ANNO","MESE" from ${tenant}.gas_udd fr `
        if(tenant == 'ugm' && typeof(invio_fatture) != 'undefined' && invio_fatture != null || typeof(modalita_pagamento) != 'undefined' && modalita_pagamento != null || listaAgenti.length > 0 ) {
          queryBuilder += ` left join ${tenant}.gas_datamax_filtered t3 on left(t3.cod_pdr,14) = left(fr."COD_PDR",14) `
        }
        if(tenant == 'ugm' && listaAgenti.length > 0) {
          queryBuilder += `left join ${tenant}.recursive_agenti ra on ra.idagente = t3.agente_id`
        }
        queryBuilder += ` where "ANNO" = ? and "MESE" = ?`
        if(tenant == 'ugm' && typeof(modalita_pagamento) != 'undefined' && modalita_pagamento != null) {
          queryBuilder += ` and (id_metodo_pagamento ${modalita_pagamento == 0 ? '= 6 or id_metodo_pagamento is null' : ' <> 6'}) `
        }
        if(tenant == 'ugm' && typeof(invio_fatture) != 'undefined' && invio_fatture != null) {
          queryBuilder += ` and (fattura_digitale ${invio_fatture == 0 ? '= 0 or fattura_digitale is null' : ' = 1'}) `
        }
        if(listaAgenti.length > 0) {
          queryBuilder += ` and (ra.idagente in (${listaAgenti})) `
        }
        queryBuilder += ` and left("COD_PDR",14) not in (select left("COD_PDR",14) from ${tenant}.gas_udd fr2 where "MESE" = ? and "ANNO" = ?) 
          group by "MESE","ANNO" order by "MESE","ANNO"`

          // console.log("query",queryBuilder)
        await Database.connection('rcu').raw('SET enable_mergejoin = off')
        let query =  await Database.connection('rcu').raw(queryBuilder,arrayDisattivazione)
        let queryAttivazione =  await Database.connection('rcu').raw(queryBuilder,arrayAttivazione)
        let corrispondenza = queryTotal.rows.filter(el => el.MESE == mese && el.ANNO == anno)
        if(corrispondenza.length > 0) {
          object.series[2].data.push(corrispondenza[0].totale)
        }else {
          object.series[2].data.push('0.00')
        }
        // if(queryAttivazione.rows.length > 0 || query.rows.length > 0 ) {
          if(corrispondenza.length > 0) {
            let serZeroPercent = queryAttivazione.rows.length > 0 ? ((Number(queryAttivazione.rows[0].totale)/Number(corrispondenza[0].totale))*100).toFixed(1) : 0
            let serUnoPercent = query.rows.length > 0 ? ((Number(query.rows[0].totale)/Number(corrispondenza[0].totale)*100)).toFixed(1): 0
            objectPercent.series[0].data.push(serZeroPercent)
            objectPercent.series[1].data.push(serUnoPercent)
            if(!maxPercent || Number(serZeroPercent) > Number(maxPercent) || Number(serUnoPercent) > Number(maxPercent)) {
              if(Number(serZeroPercent)>Number(serUnoPercent)) maxPercent = Number(serZeroPercent)
              else maxPercent = Number(serUnoPercent)
            }
          }
          let serZero = queryAttivazione.rows.length > 0 ? Number(queryAttivazione.rows[0].totale) : 0
          let serUno = query.rows.length > 0 ? Number(query.rows[0].totale): 0

          if(!max || serZero > max || serUno > max) {
            if(serZero>serUno) max = serZero
            else max = serUno
          }
          object.series[0].data.push(serZero)
          object.series[1].data.push(serUno)

          object.labels.push(`${mesiDispacciamento[mese-1]}-${anno.toString().slice(-2)}`)
          objectPercent.labels.push(`${mesiDispacciamento[mese-1]}-${anno.toString().slice(-2)}`)
        // }
        mese = mese-1
      if(mese == 0) {
        mese = 12
        anno = anno -1
      }
      } while (!(anno == annopartenza-1));
      object.series[0].data.reverse()
      object.series[1].data.reverse()
      object.series[2].data.reverse()
      object.labels.reverse()
      objectPercent.series[0].data.reverse()
      objectPercent.series[1].data.reverse()
      objectPercent.labels.reverse()
      let finalObject = {maxPercent: Number(maxPercent),max: Number(max)> 2 ? Number(max)+10 : Number(max)+1,assoluti: object,percentuale: objectPercent}
      await Redis.set(keyRedis, JSON.stringify(finalObject))
      return finalObject
    } catch (error) {
      throw error
    }
  }

  async getLastImport({request,response}){
    try {
      let query = await Database.connection('rcu')
      .raw(`select "MESE","ANNO" from ${request.headers().tenant_gas}.gas_udd ec order by "ANNO" desc,"MESE" desc limit 1 `)
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

  // async checkRcu(csv_name){
  //   try {
  //     let date = '01/04/2021'
  //     const csvtojsonV2=require("csvtojson/v2")
  //     const csv=require('csvtojson')
  //     csv({delimiter:';'})
  //     .fromFile(Env.get('RCU_PATH') + '/' + csv_name)
  //     .then(async (data)=>{
  //       console.log("data[0]['DATACESSAZIONE']",data[0]['DATACESSAZIONE'].substring(0,10))
  //       console.log("data",moment(data[0]['DATACESSAZIONE'].substring(0,10), "DD/MM/YYYY"))
  //       for(let i in data){
  //         console.log("POD",data[i]['ENEPOD'],"STATO",data[i]['STATORIGA'])
  //         let checkExistence = await RcuGasUdd.query().where('COD_PDR','IT001E84650388').fetch()
  //         checkExistence = checkExistence.toJSON()

  //         // .where('COD_PDR',data[i]['ENEPOD'])
  //         // .first()
  //         // console.log("check",checkExistence)
  //         // console.log("OOOOOOOOOOOOOOOOO",checkExistence[0]['DATA_FINE_FORNITURA'])
  //         switch(data[i]['STATORIGA']) {
  //           case 'Attivo' : 
  //           //SE ESISTE VA BENE
  //           if(!!checkExistence) {
  //             data.splice(i,1)
  //           }else{
  //             //ALTRIMENTI ERRORE
  //             data[i]['STATO_FINALE'] = 'ERRORE'
  //           }
  //           //controllare se esiste in RCU
  //           break
  //           case 'Sfilato' :
  //           //SE ESISTE VA BENE
  //           if(!!checkExistence) {
  //             //DATA CESSAZIONE < DI COMPETENZA RCU 
  //             if(moment(data[0]['DATACESSAZIONE'].substring(0,10), "DD/MM/YYYY") < moment(date, "DD/MM/YYYY")) {
  //               //OK
  //               data.splice(i,1)
  //             }else {
  //               //ALTRIMENTI ERRORE
  //               data[i]['STATO_FINALE'] = 'ERRORE'
  //             }
  //           }else{
  //             //ALTRIMENTI ERRORE
  //             data.splice(i,1)
  //           }
  //           break
            
  //         }
  //         if(data[i]['STATORIGA'] == 'Attivo' && checkExistence) {
  //           console.log("sono attivo")
  //         }

  //         if(data[i]['STATORIGA'] == 'Voltura' ) {

  //           console.log("sono voltura")
  //         }
  //       }
  //         /**
  //          * [
  //          * 	{a:"1", b:"2", c:"3"},
  //          * 	{a:"4", b:"5". c:"6"}
  //          * ]
  //          */ 
  //     })
  //     return
  //     var datafile = fsExtra.readFileSync(Env.get('RCU_PATH') + '/' + csv_name)

  //     .toString() // convert Buffer to string
  //     .split('\n') // split string to lines
  //     .map(e => e.trim()) // remove white spaces for each line
  //     .map(e => e.split(';').map(e => e.trim())); // split each line to array
  //     //GET POSITION
  //     //GET POSITION
  //     const positionObject = {}
  //     const positionArray = []

  //     const tempsObj = {}
  //     //CONVERTE NOMI PER IL DB
  //     for(let a in datafile[0]) {
  //       tempsObj[datafile[0][a]] = ''
  //     }
  //     console.log("posObj",positionObject)
  //     console.log("positionArray",positionArray)
  //     const tempArrayCsv = []
  //     for(let a in datafile) {
  //       if(a == 1) {
  //         const tempLocalObj = tempObject
          
  //         for(let b in datafile[a]) {
  //         }
  //       }
  //     }

  //   } catch (error) {
  //     console.log("error",error)
  //   }
  // }

  async deleteRowField({response,request}){
    const trx = await Database.connection("rcu").beginTransaction();
    try {
      const key_code = request.header("Secret-Key");
      var tokenUser = await Token.query().where("token", "=", key_code).first();
      var { id } = request.all();
      await trx
        .table(request.headers().tenant_gas + ".gas_udd")
        .where("gas_udd_histories_id", id)
        .delete();
      await trx.table(`${request.headers().tenant_gas}.gas_udd_histories`).where("id", id).update({ deleted: true, delete_owner: tokenUser.username, delete_owner_ip: tokenUser.ip_address });
      await trx.commit();
      return response.send({ status: "success", data: await Database.connection("rcu").table(`${request.headers().tenant_gas}.gas_udd_histories`).where("deleted", false).orderBy("created_at", "desc"), message: null });
    } catch (error) {
      trx.rollback;
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async csvItemDatabase({response,request}){
    try {
      const {id,mese,anno} = request.all()
        let jsonData = null
        if(id) {
           jsonData = await Database.connection('rcu')
          .raw(
            `SELECT left("COD_PDR" ,14)as "COD_PDR", "COD_REMI", "DISALIMENTABILITA", "DATA_INIZIO_FOR", "DATA_FINE_FOR", "RAGIONE_SOCIALE_UDD", "PIVA_UDD", "RAGIONE_SOCIALE_DD", "PIVA_DD", "CF", "PIVA", "NOME", "COGNOME", "RAGIONE_SOCIALE_DENOMINAZIONE", "RESIDENZA", "ALIQUOTA_IVA", "ALIQUOTA_ACCISE", "ADDIZ_REGIONALE", "SETT_MERCEOLOGICO", "TRATTAMENTO", "PREL_ANNUO_PREV", "COD_PROF_PREL_STD", "MATR_MIS", "CLASSE_GRUPPO_MIS", "TELEGESTIONE", "PRE_CONV", "MATR_CONV", "N_CIFRE_CONV", "COEFF_CORR", "BONUS", "BS_DATA_INIZIO", "BS_DATA_FINE", "BS_DATA_RINNOVO", "MESE", "ANNO"
              from ${request.headers().tenant_gas}.gas_udd where gas_udd_histories_id = ? 
            `,[id])
        }else {
          jsonData =  await Database.connection('rcu')
          .raw(
            `SELECT left("COD_PDR" ,14)as "COD_PDR", "COD_REMI", "DISALIMENTABILITA", "DATA_INIZIO_FOR", "DATA_FINE_FOR", "RAGIONE_SOCIALE_UDD", "PIVA_UDD", "RAGIONE_SOCIALE_DD", "PIVA_DD", "CF", "PIVA", "NOME", "COGNOME", "RAGIONE_SOCIALE_DENOMINAZIONE", "RESIDENZA", "ALIQUOTA_IVA", "ALIQUOTA_ACCISE", "ADDIZ_REGIONALE", "SETT_MERCEOLOGICO", "TRATTAMENTO", "PREL_ANNUO_PREV", "COD_PROF_PREL_STD", "MATR_MIS", "CLASSE_GRUPPO_MIS", "TELEGESTIONE", "PRE_CONV", "MATR_CONV", "N_CIFRE_CONV", "COEFF_CORR", "BONUS", "BS_DATA_INIZIO", "BS_DATA_FINE", "BS_DATA_RINNOVO", "MESE", "ANNO"
              from ${request.headers().tenant_gas}.gas_udd where  "MESE" = ? and "ANNO" = ?
            `,[mese,anno])
        }
        if(jsonData.rows.length> 0) {
        const json2csvParser = new Json2csvParser({ header: true,delimiter: ';'});
        const csv = await json2csvParser.parse(jsonData.rows);
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
      queryBuilder[value[i].RAGIONE_SOCIALE_DD] = JSON.parse(JSON.stringify(month))
    }
    for(let i in value) {
      let valueFornitore = value[i].RAGIONE_SOCIALE_DD
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

  async checkSintesi({ response, request }) {
    try {
      const { anno, mese } = request.all();
      let find = Database.connection("rcu").table(`${request.headers().tenant_gas}.gas_udd_histories`).where("deleted", false);
      if (anno) find.where("anno", anno);
      if (mese) find.where("mese", mese);
      find = await find.first();
      if (find) return response.send({ status: "success", data: find, message: `Ritorno di tutti le informazioni necessarie per la dashboard` });
      return response.status(422).send({ status: "success", data: [], message: `Non è stata trovata alcun importazione per la combinazione di date inserite` });
    } catch (error) {
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async _setTableIncAnnuale(getTotalForFornitore,anno){
    try {
      const queryBuilder = []
      let fornitori = Array.from(new Set(getTotalForFornitore.map((item) => item.RAGIONE_SOCIALE_DD)))
      for(let i in fornitori) {
        queryBuilder.push({'societa': fornitori[i],mesi:{...month},diff:{},mese_anno_precedente:0})
      }
      for(let i in getTotalForFornitore){
        for(let b in queryBuilder) {
          if(queryBuilder[b].societa == getTotalForFornitore[i].RAGIONE_SOCIALE_DD) {
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
      let fornitori = Array.from(new Set(getTotalForFornitore.map((item) => item.RAGIONE_SOCIALE_DD)))
      for(let i in fornitori) {
        queryBuilder.push({'societa': fornitori[i],...month})
      }
      for(let i in getTotalForFornitore){
        for(let b in queryBuilder) {
          if(queryBuilder[b].societa == getTotalForFornitore[i].RAGIONE_SOCIALE_DD) {
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
      `select "RAGIONE_SOCIALE_DD" , count("RAGIONE_SOCIALE_DD") as totale ,"MESE" ,"ANNO" from ${request.headers().tenant_gas}.gas_udd fr  where "ANNO" = ? or 
      ("ANNO" = ? and "MESE" = '12' and "RAGIONE_SOCIALE_DD" in (select distinct("RAGIONE_SOCIALE_DD") from ${request.headers().tenant_gas}.gas_udd fr where "ANNO" = ?))
      group by "MESE" ,"ANNO","RAGIONE_SOCIALE_DD" order by "MESE", "RAGIONE_SOCIALE_DD" `,[anno,anno-1,anno])
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
      .raw(`select "RAGIONE_SOCIALE_DD","MESE","ANNO",coalesce(ROUND(sum(cast(replace("PREL_ANNUO_PREV",',','.')  as numeric)) ,2),0) as TOTALE 
      from ${request.headers().tenant_gas}.gas_udd where "ANNO" = ? 
      or ("ANNO" = ? and "MESE" = '12' and "RAGIONE_SOCIALE_DD" in (select distinct("RAGIONE_SOCIALE_DD") from ${request.headers().tenant_gas}.gas_udd fr where "ANNO" = ?)) group by "RAGIONE_SOCIALE_DD","MESE","ANNO" order by "MESE", "RAGIONE_SOCIALE_DD"`,[anno,anno-1,anno])
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
      .raw(`select "RAGIONE_SOCIALE_DD","MESE",coalesce(ROUND(sum(cast(replace("PREL_ANNUO_PREV",',','.')  as numeric)) ,2),0) as TOTALE from ${request.headers().tenant_gas}.gas_udd where "ANNO" = ? group by "RAGIONE_SOCIALE_DD","MESE" order by "MESE", "RAGIONE_SOCIALE_DD"`,[anno])
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
      `select "RAGIONE_SOCIALE_DD" , count("RAGIONE_SOCIALE_DD") as totale ,"MESE" ,"ANNO" from ${request.headers().tenant_gas}.gas_udd fr  where "ANNO" = ? 
      group by "MESE" ,"ANNO","RAGIONE_SOCIALE_DD" order by "MESE", "RAGIONE_SOCIALE_DD" `,[anno])
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
      .table(request.headers().tenant_gas+'.gas_udd')
      .distinct('RAGIONE_SOCIALE_DD')
      return response.send({"status": "success","data": societa,"message": `Ritorno di tutti le informazioni necessarie per la dashboard`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async graficoAvanzatoTotalePerditaPodv2({request,response}){
    try {
      const {annopartenza,mese,anno} = request.all()
      let valUnionDisp = `${mesiDispacciamento[mese-1]}-${anno.slice(-2)}`
      let finalValue =  {}
      let query = await Database.connection('rcu')
      .raw(`select count(distinct(left("COD_PDR",14))) as totale, 
      upper(right("DATA_INIZIO_FOR",7)) as competenza,
      LEFT(RIGHT(lower("DATA_INIZIO_FOR"),7),2) as competenza_mese, 
      upper(right("DATA_INIZIO_FOR",2)) as competenza_anno
      from ${request.headers().tenant_gas}.gas_udd fr 
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
      from ${request.headers().tenant_gas}.gas_udd fr 
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


  async graficoAnnualeIncrementoPodInformation({request,response}){
    try {
      const {mese,anno} = request.all()
      let finalValue =  []
      let query = await Database.connection('rcu')
      .raw(`select count("COD_PDR") as TOTALE,"ANNO" from ${request.headers().tenant_gas}.gas_udd fr where "MESE" = ? and "ANNO" <= ? and "ANNO" >= ? group by "ANNO" order by "ANNO" `,[mese,anno,anno-2])
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
      .raw(`select coalesce(ROUND(sum(cast(replace("PREL_ANNUO_PREV",',','.')  as numeric)) ,2),0) as TOTALE,"ANNO" from ${request.headers().tenant_gas}.gas_udd fr where "MESE" = ? and "ANNO" <= ? and "ANNO" >= ? group by "ANNO" order by "ANNO" `,[mese,anno,anno-2])
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
      .raw(`select count("COD_PDR") as totale ,"MESE","ANNO" from ${request.headers().tenant_gas}.gas_udd fr2 where "ANNO" = ? and "MESE" >= ? and left("COD_PDR",14) 
      in (select left("COD_PDR",14) from ${request.headers().tenant_gas}.gas_udd fr2 where "MESE" = ? and "ANNO" = ?) group by "MESE","ANNO" order by "MESE","ANNO" `,[anno,mese,mese,anno])
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
        .raw(`select count(("COD_PDR")) as totale,"ANNO","MESE" from ${request.headers().tenant_gas}.gas_udd fr where "ANNO" = ? group by "ANNO","MESE" order by "ANNO","MESE"`,[anno-b])
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
        .raw(`select ROUND(sum(cast(replace("PREL_ANNUO_PREV",',','.')  as numeric)) ,2) as totale,"ANNO","MESE" from ${request.headers().tenant_gas}.gas_udd fr where "ANNO" = ? group by "ANNO","MESE" order by "ANNO","MESE"`,[anno-b])
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
      .raw(`select count("COD_PDR") as totale,"MESE" from ${request.headers().tenant_gas}.gas_udd fr where "ANNO" = ? group by "MESE" order by "MESE"`,[anno])
      let mesi = []
      if(totalPod && totalPod.rows.length>0) {
        mesi = totalPod.rows.map(el =>el.MESE)
        series.push({name: 'Totale Pod',type: 'column',data: totalPod.rows.map(el =>el.totale)})
      }
      const totalGwh = await Database.connection('rcu')
      .raw(`select ROUND(sum(cast(replace("PREL_ANNUO_PREV",',','.')  as numeric)) ,2) as totale,"MESE" from ${request.headers().tenant_gas}.gas_udd fr where "ANNO" = ? group by "MESE" order by "MESE"`,[anno])
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
      let MinMonth = await await Database.connection('rcu').raw(`select min("MESE") from ${request.headers().tenant_gas}.gas_udd ec where "ANNO" = ?`,[anno])
      let startMese = MinMonth.rows.length > 0 ?  MinMonth.rows[0].min : `1`
      if(mese == 1) {
        prevMese = 1
        prevAnno = anno
      }
      let query = await Database.connection('rcu')
      .raw(`select 
      (
      (select count("COD_PDR")::float from ${request.headers().tenant_gas}.gas_udd fr where "ANNO" = ? AND "MESE" = ?) -
      (select count("COD_PDR")::float from ${request.headers().tenant_gas}.gas_udd fr where "ANNO" = ? AND "MESE" = ?)
      )
      /
       case (select count("COD_PDR")::float from ${request.headers().tenant_gas}.gas_udd fr where "ANNO" = ? AND "MESE" = ?) 
       WHEN 0 THEN 1 
       else (select count("COD_PDR")::float from ${request.headers().tenant_gas}.gas_udd fr where "ANNO" = ? AND "MESE" = ?) END
      *100.0
      as pod_inc_mensile 
      ,
      (
      (select count("COD_PDR")::float from ${request.headers().tenant_gas}.gas_udd fr where "ANNO" = ? AND "MESE" = ?) -
      (select count("COD_PDR")::float from ${request.headers().tenant_gas}.gas_udd fr where "ANNO" = ? AND "MESE" = ?)
      )
      /
      case (select count("COD_PDR")::float from ${request.headers().tenant_gas}.gas_udd fr where "ANNO" = ? AND "MESE" = ?)  
      WHEN 0 THEN 1 
      else (select count("COD_PDR")::float from ${request.headers().tenant_gas}.gas_udd fr where "ANNO" = ? AND "MESE" = ?) END
      *100.0
      as pod_inc_annuale,
      (
      (select coalesce((sum(cast(replace("PREL_ANNUO_PREV",',','.')  as float)) ),0) as TOTALE from ${request.headers().tenant_gas}.gas_udd fr2 where "ANNO" = ? AND "MESE" = ?) - 
      (select coalesce((sum(cast(replace("PREL_ANNUO_PREV",',','.')  as float)) ),0) as TOTALE from ${request.headers().tenant_gas}.gas_udd fr2 where "ANNO" = ? AND "MESE" = ?)
      ) / 
      case (select coalesce((sum(cast(replace("PREL_ANNUO_PREV",',','.')  as float)) ),0) as TOTALE from ${request.headers().tenant_gas}.gas_udd fr2 where "ANNO" = ? AND "MESE" = ?)
      WHEN 0 THEN 1 
      else (select coalesce((sum(cast(replace("PREL_ANNUO_PREV",',','.')  as float)) ),0) as TOTALE from ${request.headers().tenant_gas}.gas_udd fr2 where "ANNO" = ? AND "MESE" = ?) end 
      *100 
      as vol_inc_mensile,
      (
      (select coalesce((sum(cast(replace("PREL_ANNUO_PREV",',','.')  as float)) ),0) as TOTALE from ${request.headers().tenant_gas}.gas_udd fr2 where "ANNO" = ? AND "MESE" = ?) - 
      (select coalesce((sum(cast(replace("PREL_ANNUO_PREV",',','.')  as float)) ),0) as TOTALE from ${request.headers().tenant_gas}.gas_udd fr2 where "ANNO" = ? AND "MESE" = ?)
      ) / 
      case (select coalesce((sum(cast(replace("PREL_ANNUO_PREV",',','.')  as float)) ),0) as TOTALE from ${request.headers().tenant_gas}.gas_udd fr2 where "ANNO" = ? AND "MESE" = ?)
      WHEN 0 THEN 1 
      else (select coalesce((sum(cast(replace("PREL_ANNUO_PREV",',','.')  as float)) ),0) as TOTALE from ${request.headers().tenant_gas}.gas_udd fr2 where "ANNO" = ? AND "MESE" = ?) END
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
      .raw(`select "RAGIONE_SOCIALE_DD" as societa, 
      count(DISTINCT"COD_PDR") as pod,
      ROUND(sum(cast(replace("PREL_ANNUO_PREV",',','.')  as numeric)) ,2) as gwh
      from ${request.headers().tenant_gas}.gas_udd fr where "ANNO" = ? and "MESE" = ? group by "RAGIONE_SOCIALE_DD" order by pod desc`,[anno,mese])
      return response.send({"status": "success","data": query.rows,"message": `Ritorno di tutti le informazioni necessarie per la dashboard`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async esportazione({request,response}){
    try {
      const {anno} = request.all()
      const getTotalForFornitore = await Database.connection('rcu').from('gas_udd')
      .select('RAGIONE_SOCIALE_DD','MESE').where('ANNO',anno).where(innerWhere =>{
        innerWhere.where('COD_PDR','!=',null)
        innerWhere.orWhere('COD_PDR','!=','')
      }).count('* as TOTALE').groupBy('MESE','RAGIONE_SOCIALE_DD')
      const queryBuilder = {}
      queryBuilder.contPod = await this.createTotal(getTotalForFornitore)
      
      let getTotalConsumiForFornitore = await Database.connection('rcu')
      .raw(`select "RAGIONE_SOCIALE_DD","MESE",sum(cast(replace("PREL_ANNUO_PREV",',','.')  as float))  as TOTALE from ${request.headers().tenant_gas}.gas_udd where "ANNO" = ? group by "RAGIONE_SOCIALE_DD","MESE" order by "MESE"`,[anno])
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
          {id: contType === 'consumi' ? 'METRI_CUBI': 'N_PDR', title: contType === 'consumi' ? 'METRI CUBI': 'N PDR'},
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
        let finalObject = contType === 'consumi' ? {'METRI_CUBI': key} : {'N_PDR': key}
        finalText += await csvStringifier.stringifyRecords([{...finalObject,...value}])
      }
      //AGGIUNGO TOTALE RIGHE MESI
      let finalTotalObject = contType === 'consumi' ? {'METRI_CUBI': 'TOT METRI CUBI'} : {'N_PDR': 'TOT N PDR'}  
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

  async updateDatamaxDb(){
    try {
      const queryTerranova = await Database.connection('terranova')
      .raw(`select distinct(LEFT(gcs.CodPDR,14)) as cod_pdr,
      cr.IDRigaContratto AS id_riga_contratto,
      cr.IDContratto_cnt AS id_contratto,
      cr.IDSede AS id_sede,
      cr.DataCessazione as datacessazione,
      cr.DataInizioValidita as datainiziovalidita,
      aa.IDAgente as agente_id,
      aa2.IDAgente as agenzia_id,
      aa.Nome as agente_nome,
      aa2.Nome as agenzia_nome,
      afd.flgDigi as fattura_digitale,
      afd.flgEMail as fattura_email,
      tp.IDMetodo as id_metodo_pagamento,
      a.CFisc as c_fisc,
      a.TipoPersona as tipo_persona,
      a.Provincia as provincia,
      a.Localita as localita,
      a.CAP as cap
      from dbDatamaxEVA.dbo.gasClienteSedi gcs
      inner join ContrattiRighe cr on cr.IDSede = gcs.idSede 
      inner join dbDatamaxEVA.dbo.StatoContratti sc on cr.IDStatoRiga = sc.IDStatoContratti
      left join dbDatamaxEVA.dbo.Contratti c on cr.IDContratto_cnt = c.IDContratto_cnt
      left join dbDatamaxEVA.dbo.TipiPagamento tp on cr.IDTipoPagamento = tp.IDTipoPagamento
      left join dbDatamaxEVA.dbo.AnaFatturaDigitale afd on c.IDAnagrafica = afd.IDAnagrafica 
      left join dbDatamaxEVA.dbo.Anagrafica a on c.IDAnagrafica = a.IDAnagrafica  
      left join dbDatamaxEVA.dbo.AgentiAnagrafica aa on c.IDAgente = aa.IDAgente 
      left join dbDatamaxEVA.dbo.AgentiAnagrafica aa2 on c.IDAgenzia = aa2.IDAgente
      where gcs.CodPDR is not null
      and cr.IDStatoRiga in (4,900,901,1006,1007,1019,6020,6022,6067,6080,6081,3001,3002,3003,3004,3005,3006,3007,3008,3009,3010,3099,6007,6023)
      and c.IDFornitore = 5
      order by cr.DataInizioValidita`)
      if(queryTerranova.length > 0) {
        let trx = await Database.connection('rcu').beginTransaction()
        try {
          await trx.truncate('ugm.gas_datamax')
          for(let i in queryTerranova) {
            await trx.from(`ugm.gas_datamax`).insert(queryTerranova[i])
          }
          trx.commit()
        } catch (error) {
          console.log("err",error)
          trx.rollback()
        }
      }

      const queryBusinessUnit = await Database.connection('terranova')
      .raw(`select IDAgente as idagente,nome,IDAgenteParent as idagenteparent 
      from vw_AgentiParents_Today c
      where IDAgenteParent = 1254`)
      if(queryBusinessUnit.length > 0) {
        let trx = await Database.connection('rcu').beginTransaction()
        try {
          await trx.truncate('ugm.business_unit')
          for(let i in queryBusinessUnit) {
            await trx.from(`ugm.business_unit`).insert(queryBusinessUnit[i])
           
          }
          trx.commit()
        } catch (error) {
          console.log("err",error)
          trx.rollback()
        }
      }


      if(queryBusinessUnit.length> 0) {
        let trx = await Database.connection('rcu').beginTransaction()
        await trx.truncate('ugm.sub_recursive_agenti')
        try {
          for(let i in queryBusinessUnit) {
            const querySubAgenti = await Database.connection('terranova')
            .raw(` with query as (
              select IDAgente as idagente,nome,IDAgenteParent as idagenteparent,IDAgente as idfather 
                from vw_AgentiParents_Today c
                where IDAgenteParent = ${queryBusinessUnit[i].idagente}
              UNION ALL
              select e.IDAgente as idagente,e.nome,e.IDAgenteParent as idagenteparent,m.IDFather as idfather 
              FROM vw_AgentiParents_Today e
              inner join query as m on e.IDAgenteParent = m.IDAgente
              )
              select * from query`)
            if(querySubAgenti.length > 0) {
                for(let c in querySubAgenti) {
                  await trx.from(`ugm.sub_recursive_agenti`).insert(querySubAgenti[c])
                }
              }
            }
          trx.commit()
        } catch (error) {
          console.log("err",error)
          trx.rollback()
        }
      }

      const queryAgenti = await Database.connection('terranova')
      .raw(`with query as (
        select IDAgente as idagente,nome,IDAgenteParent as idagenteparent,IDAgente as idfather 
          from vw_AgentiParents_Today c
          where IDAgenteParent = 1254
        UNION ALL
        select e.IDAgente as idagente,e.Nome as nome,e.IDAgenteParent as idagenteparent,m.IDFather as idfather
        FROM vw_AgentiParents_Today e
        inner join query as m on e.IDAgenteParent = m.IDAgente
        )
        select * from query`)
      if(queryAgenti.length > 0) {
        let trx = await Database.connection('rcu').beginTransaction()
        try {
          await trx.truncate('ugm.recursive_agenti')
          for(let i in queryAgenti) {
            await trx.from(`ugm.recursive_agenti`).insert(queryAgenti[i])
          }
          trx.commit()
        } catch (error) {
          console.log("err",error)
          trx.rollback()
        }
      }

      

      const queryFiltered = await Database.connection('rcu').raw(`select e.* from ugm.gas_datamax e 
      inner join (
        select distinct(left(cod_pdr ,14)) as cod_pdr, 
        max(id) as id 
        from ugm.gas_datamax 
        group by left(cod_pdr,14)
      ) t2 on left(e.cod_pdr,14) = left(t2.cod_pdr,14) and e.id=t2.id`)

      if(queryFiltered && queryFiltered.rows && queryFiltered.rows.length > 0) {
        let trx = await Database.connection('rcu').beginTransaction()
        try {
          await trx.truncate('ugm.gas_datamax_filtered')
          for(let i in queryFiltered.rows) {
            await trx.from(`ugm.gas_datamax_filtered`).insert(queryFiltered.rows[i])
          }
          trx.commit()
        } catch (error) {
          trx.rollback()
        }
      }
    } catch (error) {
      throw error
    }
  }

  async insert({response,request}){
    var {mese,anno,fatturazione_file} = request.all()
    try {
      const key_code = request.header('Secret-Key')
      var tokenUser = await Token.query().where('token','=',key_code).first()
      this.zipFile(fatturazione_file,mese,anno,tokenUser,request)
      return response.send({"status": "success","data": "","message": `Importazione avviata `})
    } catch (error) {
      console.log("erro",error)
      // fsExtra.unlinkSync(Env.get('RCU_PATH') + '/' + fatturazione_file)
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async zipFile(zip_file_name,mese,anno,tokenUser,request){
    try {
      const unzipper = require('unzipper');
      let buffer = fsExtra.readFileSync(Env.get('RCU_PATH') + '/' + zip_file_name)
      var directory = await unzipper.Open.buffer(buffer);
      for(let i in directory.files) {
        var parentBuffer = await unzipper.Open.buffer( await directory.files[i].buffer());
        for(let b in parentBuffer.files) {
          await this.generateCsv(parentBuffer.files[b],mese,anno,tokenUser,request)
        }
      }
      await this.updateDatamaxDb()
      let query = await Database.connection('rcu')
      .raw(`select "MESE","ANNO" from ugm.gas_udd ec order by "ANNO" desc,"MESE" desc limit 1 `)
      if(query.rows.length > 0) {
        let RedisController = use(`App/Controllers/Http/RedisRouteController`)
        const RedisClass = new RedisController()
        RedisClass.updateCacheImport('ugm',name_controller,query.rows[0].MESE,query.rows[0].ANNO)
      }
      fsExtra.unlinkSync(Env.get('RCU_PATH') + '/' + zip_file_name)
    } catch (error) {
      console.log("err",error)
    }
  }

  async generateCsv(csv,mese,anno,tokenUser,request){
    console.log(request.headers().tenant_gas)
    const trx = await Database.connection('rcu').beginTransaction()
    let fattLog = null
    let checkExist = await Database.connection("rcu").table(`${request.headers().tenant_gas}.gas_udd_histories`).where("note", csv.path)
    .where(inner => {inner.where('status','completato').orWhere('status','in lavorazione')}).whereNot('deleted',true);
    console.log(checkExist)
    try{
      if(checkExist.length == 0){
      fattLog = await Database.connection("rcu").table(`${request.headers().tenant_gas}.gas_udd_histories`).insert({ note: csv.path, mese: mese, anno: anno, importati: 0, status: "in lavorazione", owner: tokenUser.username, owner_ip: tokenUser.ip_address }).returning("id");
         var counterTotal = 0
          var csvBuffer = await csv.buffer()
          var datafile = csvBuffer.toString()
          .toString() // convert Buffer to string
          .split('\n') // split string to lines
          .map(e => e.trim()) // remove white spaces for each line
          .map(e => e.split(';').map(e => e.trim())); // split each line to array
          console.log(datafile[0])
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
          for(let i in NotNull) {
            if(!datafile[0].includes(NotNull[i])) 
            {console.log(NotNull[i])
              throw {}}
          }
          
          //INIZIO CREAZIONE ON DB
          for(let i in datafile) {
            console.log("index",i)
            if(i == 0) continue
            let tempObject = {}
            for(let b in datafile[i]){
              if(positionArray.includes(b) && !!datafile[i][b]){
                if(datafile[i][b].startsWith(',')) datafile[i][b] = '0'+datafile[i][b]
                tempObject[positionObject[b].value] = datafile[i][b]
              }
            }
            if(Object.keys(tempObject).length>0){
              tempObject = {...tempObject,MESE:mese,ANNO:anno}
              if (i == 1) {
                let check = trx.table(request.headers().tenant_gas + ".gas_udd");
                for (const [key, value] of Object.entries(tempObject)) {
                  check.where(key, value);
                }
                check = await check;
                // await RcuEnergiaUdd.findBy(tempObject)
                if (check.length > 0) throw {};
              }
              // console.log("tempObject.PIVA_UDD",tempObject.PIVA_UDD)
              // if(!check) 
              // if(tempObject.PIVA_UDD == '03163990611' || tempObject.PIVA_UDD == '3163990611') {
                counterTotal = counterTotal +1
                await trx.table(request.headers().tenant_gas + ".gas_udd").insert({ ...tempObject, gas_udd_histories_id: fattLog[0] });
              // } 
            }
          }
          await trx.table(`${request.headers().tenant_gas}.gas_udd_histories`).where("id", fattLog[0]).update({ importati: counterTotal, status: "completato" });
          trx.commit();
      } else{ console.log("gia esistente")}
      return 'Completato'
    }catch(e){
      console.log("e",e)
      trx.rollback();
      await Database.connection("rcu").table(`${request.headers().tenant_gas}.gas_udd_histories`).table(`${request.headers().tenant_ee}.ee_udd_histories`).where("id", fattLog[0]).update({ importati: 0, status: "in errore" });
      throw e
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
      var fatt = await Database.connection("rcu").table(`${request.headers().tenant_gas}.gas_udd_histories`).where("deleted", false).orderBy("anno", "desc").orderBy("mese", "desc");
      return response.send({ status: "success", data: fatt, message: null });
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async getStatusImport({response,request}){
    try {
      const fatt = await Database.connection("rcu").table(`${request.headers().tenant_gas}.gas_udd_histories`).where("deleted", false).where("status", "=", "in lavorazione").getCount();
      if (fatt == 1) return response.send({ status: "success", data: { status: "in lavorazione" }, message: null });
      else return response.send({ status: "success", data: { status: "completato" }, message: null });
      } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
      }
  }

}

module.exports = RcuGasUddController
