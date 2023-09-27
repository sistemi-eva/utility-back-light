'use strict'

const mkdirp = require('mkdirp')
const fsExtra = require('fs');
const Env = use('Env')
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const axios = require('axios');
const Database = use('Database')
const moment = require('moment');

class ReportisticaController {

    async getSwitchout({response, request}) {
      try {
            /* SWITCH OUT - LAST 120 DAYS */
            let query = `SELECT T2.VENDITORE as venditore, T2.CodUtility as 'utility', t1.TipoMovimento as 'tipologia movimento', CASE WHEN T2.CodUtility='EE' THEN T1.EnePOD ELSE T2.GasPDR END  as 'pdp', T2.StatoRiga, 
             T2.DataAttivazione as 'Data Attivazione', t2.GasDataAttivazione as 'GAS Data Attivazione',
           MIN(T1.DataInizioValidita) AS DataInizio_Validita, 
           CASE 
                WHEN T2.DataAttivazione IS NOT NULL THEN T2.DataAttivazione
                WHEN T2.GasDataAttivazione IS NOT NULL THEN T2.GasDataAttivazione
                ELSE MIN(T1.DataInizioValidita)
            END AS 'Data Inizio Effettiva',
            T2.DataCessazione as DataCessazione, 
             (DATEDIFF(mm,MIN(T1.DataInizioValidita),T2.DataCessazione)+1) AS 'Mesi Permanenza', CONCAT(DATENAME(MM,T2.DataCessazione),' ',DATENAME(YY,T2.DataCessazione)) AS 'Mese_Cessazione', T2.IDAnagrafica, T2.IDSEDE, T2.RagSoc, T2.EneUtenteDispacciamento, T2.TipoPersona, T2.EneOpzioneTariffariaTras, T2.MetodoPagamento, T2.TipoCapogruppo, T2.AgenziaCLI, T2.AgenteCLI 
             FROM dbDatamaxEVA.dbo.vwCREGbase_EVA T1
             LEFT JOIN dbDatamaxEVA.dbo.vwCREGbase_EVA T2 ON T1.IDSede = T2.IDSede 
             WHERE T2.StatoRiga LIKE 'sfilat%' and t1.TipoMovimento <> 'Servizi'  and T2.DataCessazione BETWEEN GETDATE() - 120 AND GETDATE()
             GROUP BY T2.DataAttivazione, T1.TipoMovimento, T2.TipoCapogruppo, T2.GasDataAttivazione, T2.IDSede,T2.DataInizioValidita, t2.statoriga, T2.VENDITORE, T2.CodUtility, T1.EnePOD, T2.GasPDR, T2.DataCessazione, T2.IDAnagrafica, T2.RagSoc, T2.EneUtenteDispacciamento, T2.TipoPersona, T2.EneOpzioneTariffariaTras, T2.MetodoPagamento, T2.AgenziaCLI, T2.AgenteCLI 
             ORDER BY T2.DataCessazione DESC;`

            const result = await Database.connection('dbbi').raw(query)
            console.log(result)
            return response.send(result.rows)
      } catch (error) {
          console.log("e",error)
          return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
      }
    }
	
	
	async getFatturato({response, request}) {
      try {
            
			var {mese,anno,azienda} = request.all()
			
			var date = "01/" + mese + "/" + anno;

			date = anno + "/" + mese + "/01";
			
			var myDate = moment(date).subtract(3, 'months').format("YYYY/MM/DD");

			
			
			
			// fatturato per flusso. quante sono state emesse
            let query = `select b.RagSoc as 'Azienda', dt.TCodUtility as 'Utility',  dt.IDDocFlusso, df.Descrizione, COUNT(NumDocsuFatt) as 'Fatture', CONVERT(varchar,MAX(dt.Emissione),103) as 'Emissione', CONVERT(varchar,MAX(dt.Scadenza),103) as 'Scadenza', REPLACE(sum(dt.ValImponibile),'.',',') as 'Imponibile', REPLACE(sum(dt.ValIva),'.',',') as 'Iva', REPLACE(sum(dt.ValTotale),'.',',') as 'Totale', CONCAT(DATENAME(MM,dt.Emissione),' ',DATENAME(YY,dt.Emissione)) as 'Mese Anno Emissione', CONVERT(varchar,CURRENT_TIMESTAMP,20) AS 'last update', (SUM(CASE WHEN afd.flgEMail ='1' and afd.flgDigi ='1' THEN 1 ELSE 0 END)) AS 'Fattura Digitale', (SUM(CASE WHEN afd.flgEMail ='0' and afd.flgDigi ='0' THEN 1 ELSE 0 END)) AS 'Fattura Cartacea', (SUM(CASE WHEN afd.flgEMail ='1' and afd.flgDigi ='0' THEN 1 ELSE 0 END)) AS 'Email + Cartacea', (SUM(CASE WHEN pm.Descrizione ='RID / SDD' THEN 1 ELSE 0 END)) As 'RID', (SUM(CASE WHEN pm.Descrizione ='Bollettino' THEN 1 ELSE 0 END)) As 'Bollettino', (SUM(CASE WHEN pm.Descrizione ='BONIFICO' THEN 1 ELSE 0 END)) As 'BONIFICO' from Scadenzario sc left join DocT dt on sc.IDTBilling = dt.IDDocT  left join BITAziende b ON b.IDAzienda = dt.IDAzienda left join DocFlussi df ON df.IDDocFlusso = dt.IDDocFlusso LEFT JOIN AnaFatturaDigitale afd ON afd.IDAnagrafica = dt.IDAnagrafica  LEFT JOIN PagamentoMetodi pm ON pm.IDMetodo = sc.ModPag  where dt.Emissione BETWEEN '${myDate}' and getdate() and DT.TCodUtility <> 'SERV' group by dt.IDDocFlusso, b.RagSoc, dt.TCodUtility, df.Descrizione, dt.Emissione order by 1,2,3,5`;
			
			


            const result1 = await Database.connection('dbbi').raw(query)
			
			
		
			
			
			
			
            return response.send([result1 ]);
			
      } catch (error) {
          console.log("e",error)
          return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
      }
    }
	
	
	async getFatturatoConsumi({response, request}) {
      try {
            
			var {mese,anno,azienda} = request.all()
			
			var date = "01/" + mese + "/" + anno;

			date = anno + "/" + mese + "/01";
			
			var myDate = moment(date).subtract(1, 'months').format("YYYY/MM/DD");

		
			
			
			

			let query = `/* RETTIFICA 15/05/2023 */
					/* tipo autolettura EE */
					SELECT b.RagSoc, dt.TCodUtility, sc.NumdocSuFatt, dt.iddocflusso, df.Descrizione, (CONCAT(DATENAME(MM,DATEADD(month, 0, sc.DataDoc)),' ',DATENAME(YY,DATEADD(month, 0, sc.DataDoc)))) as 'Mese Emissione', 
					/*
					 * CASE CON IL TIPO DI LETTURA 
					 */
					CASE WHEN (sum(CASE WHEN od.Descrizione LIKE '%AUTOLETTUR%' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END AS 'AUTOLETTURA',
					CASE WHEN (sum(CASE WHEN od.Descrizione LIKE '%STIMA%' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END AS 'STIMATI',
					CASE WHEN (sum(CASE WHEN od.Descrizione IN ('Dati Non Orari Distributore','Dati ORARI  Distributore') THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END AS 'REALE',
					CASE WHEN (sum(CASE WHEN od.Descrizione LIKE '%SIMULAZIONE%' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END AS 'SIMULATI',
					/* CASE FINALE PER IL CONCATENA */
					CASE 
					/*
					 * 1* CONCATENA CASE CON IL TIPO DI LETTURA > AUTOLETTURA
					 */
					WHEN CONCAT( (CASE WHEN (sum(CASE WHEN od.Descrizione LIKE '%AUTOLETTUR%' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END  ), 
					(CASE WHEN (sum(CASE WHEN od.Descrizione LIKE '%STIMA%' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END ), 
					(CASE WHEN (sum(CASE WHEN od.Descrizione IN ('Dati Non Orari Distributore','Dati ORARI  Distributore') THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END),
					(CASE WHEN (sum(CASE WHEN od.Descrizione LIKE '%SIMULAZIONE%' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END)
					) LIKE 'A%' THEN 'AUTOLETTURA' 
					/*
					 * 2* CONCATENA CASE CON IL TIPO DI LETTURA > STIMATA
					 */
					WHEN CONCAT( (CASE WHEN (sum(CASE WHEN od.Descrizione LIKE '%AUTOLETTUR%' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END  ), 
					(CASE WHEN (sum(CASE WHEN od.Descrizione LIKE '%STIMA%' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END ), 
					(CASE WHEN (sum(CASE WHEN od.Descrizione IN ('Dati Non Orari Distributore','Dati ORARI  Distributore') THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END),
					(CASE WHEN (sum(CASE WHEN od.Descrizione LIKE '%SIMULAZIONE%' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END)
					) LIKE 'BABB' THEN 'STIMA' 
					/*
					 * 3* CONCATENA CASE CON IL TIPO DI LETTURA > REALE
					 */
					WHEN CONCAT( (CASE WHEN (sum(CASE WHEN od.Descrizione LIKE '%AUTOLETTUR%' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END  ), 
					(CASE WHEN (sum(CASE WHEN od.Descrizione LIKE '%STIMA%' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END ), 
					(CASE WHEN (sum(CASE WHEN od.Descrizione IN ('Dati Non Orari Distributore','Dati ORARI  Distributore') THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END),
					(CASE WHEN (sum(CASE WHEN od.Descrizione LIKE '%SIMULAZIONE%' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END)
					) LIKE 'BBAB' THEN 'REALE' 
					/*
					 * 4* CONCATENA CASE CON IL TIPO DI LETTURA > REALE
					 */
					WHEN CONCAT( (CASE WHEN (sum(CASE WHEN od.Descrizione LIKE '%AUTOLETTUR%' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END  ), 
					(CASE WHEN (sum(CASE WHEN od.Descrizione LIKE '%STIMA%' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END ), 
					(CASE WHEN (sum(CASE WHEN od.Descrizione IN ('Dati Non Orari Distributore','Dati ORARI  Distributore') THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END),
					(CASE WHEN (sum(CASE WHEN od.Descrizione LIKE '%SIMULAZIONE%' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END)
					) LIKE 'BBBA' THEN 'SIMULATI' 
					ELSE 'MISTA' END AS 'TIPO LETTURA' 
					FROM BillingTEVA.dbo.DocEneLetture_RealiStime rs 
					left join DocT dt on dt.IDDocT = rs.IDDocT  
					left join dbDatamaxEVA.dbo.eneOrigineDati od on rs.IdEneOrigineDati =od.IDeneOrigineDati  
					left join Scadenzario sc on sc.IDTBilling = dt.IDDocT  
					left join BillingTEVA.dbo.DocFlussi df on dt.IDDocFlusso =df.IDDocFlusso  
					left join BITAziende b on dt.IDAzienda = b.IDAzienda 
					where dt.Emissione between '${myDate}' and getdate() and df.IDStatoFlusso ='4' 
					group by sc.NumDocsuFatt, b.RagSoc, dt.iddocflusso, sc.DataDoc, dt.TCodUtility,  df.Descrizione
					ORDER BY 3,4`;

			
			const result1 = await Database.connection('dbbi').raw(query);
		
			query = `SELECT b.RagSoc, dt.TCodUtility, sc.NumdocSuFatt, dt.iddocflusso, df.Descrizione, (CONCAT(DATENAME(MM,DATEADD(month, 0, sc.DataDoc)),' ',DATENAME(YY,DATEADD(month, 0, sc.DataDoc)))) as 'Mese Emissione', 
					/*
					 * CASE CON IL TIPO DI LETTURA 
					 */
					CASE WHEN (sum(CASE WHEN od.Descrizione LIKE '%AUTOLETTUR%' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END AS 'AUTOLETTURA',
					CASE WHEN (sum(CASE WHEN od.Descrizione = 'Consumi Simulati' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END AS 'SIMULATI',
					CASE WHEN (sum(CASE WHEN od.Descrizione = 'Dati Distributore Simulati' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END AS 'STIMATI',
					CASE WHEN (sum(CASE WHEN od.Descrizione ='Dati Distributore Definitivi' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END AS 'REALE',
					/* CASE FINALE PER IL CONCATENA */
					CASE 
					/*
					 * 1* CONCATENA CASE CON IL TIPO DI LETTURA > AUTOLETTURA
					 */
					WHEN CONCAT( (CASE WHEN (sum(CASE WHEN od.Descrizione LIKE '%AUTOLETTUR%' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END  ), 
					(CASE WHEN (sum(CASE WHEN od.Descrizione = 'Consumi Simulati' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END ), 
					(CASE WHEN (sum(CASE WHEN od.Descrizione = 'Dati Distributore Simulati' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END ),
					(CASE WHEN (sum(CASE WHEN od.Descrizione ='Dati Distributore Definitivi' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END)) LIKE 'A%' THEN 'AUTOLETTURA' 
					/*
					 * 2* CONCATENA CASE CON IL TIPO DI LETTURA > SIMULATO+STIMATO
					 */
					WHEN CONCAT( (CASE WHEN (sum(CASE WHEN od.Descrizione LIKE '%AUTOLETTUR%' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END  ), 
					(CASE WHEN (sum(CASE WHEN od.Descrizione = 'Consumi Simulati' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END ), 
					(CASE WHEN (sum(CASE WHEN od.Descrizione = 'Dati Distributore Simulati' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END ),
					(CASE WHEN (sum(CASE WHEN od.Descrizione ='Dati Distributore Definitivi' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END)) IN ('BABB','BBAB','BAAB') THEN 'STIMATO' 
					/*
					 * 3* CONCATENA CASE CON IL TIPO DI LETTURA > REALE
					 */
					WHEN CONCAT( (CASE WHEN (sum(CASE WHEN od.Descrizione LIKE '%AUTOLETTUR%' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END  ), 
					(CASE WHEN (sum(CASE WHEN od.Descrizione = 'Consumi Simulati' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END ), 
					(CASE WHEN (sum(CASE WHEN od.Descrizione = 'Dati Distributore Simulati' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END ),
					(CASE WHEN (sum(CASE WHEN od.Descrizione ='Dati Distributore Definitivi' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END)) LIKE 'BBBA' THEN 'REALE' 
					/*
					 * 5* CONCATENA CASE CON IL TIPO DI LETTURA > MISTA
					 */
					WHEN CONCAT( (CASE WHEN (sum(CASE WHEN od.Descrizione LIKE '%AUTOLETTUR%' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END  ), 
					(CASE WHEN (sum(CASE WHEN od.Descrizione = 'Consumi Simulati' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END ), 
					(CASE WHEN (sum(CASE WHEN od.Descrizione = 'Dati Distributore Simulati' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END ),
					(CASE WHEN (sum(CASE WHEN od.Descrizione ='Dati Distributore Definitivi' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END)) LIKE 'B%%A' THEN 'MISTA' 
					ELSE 'ALTRO (verificare)' END AS 'LETTURA MACRO',
					/* CASE FINALE PER IL CONCATENA */
					CASE 
					/*
					 * 1* CONCATENA CASE CON IL TIPO DI LETTURA > AUTOLETTURA
					 */
					WHEN CONCAT( (CASE WHEN (sum(CASE WHEN od.Descrizione LIKE '%AUTOLETTUR%' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END  ), 
					(CASE WHEN (sum(CASE WHEN od.Descrizione = 'Consumi Simulati' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END ), 
					(CASE WHEN (sum(CASE WHEN od.Descrizione = 'Dati Distributore Simulati' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END ),
					(CASE WHEN (sum(CASE WHEN od.Descrizione ='Dati Distributore Definitivi' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END)) LIKE 'A%' THEN 'AUTOLETTURA' 
					/*
					 * 2* CONCATENA CASE CON IL TIPO DI LETTURA > SIMULATO
					 */
					WHEN CONCAT( (CASE WHEN (sum(CASE WHEN od.Descrizione LIKE '%AUTOLETTUR%' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END  ), 
					(CASE WHEN (sum(CASE WHEN od.Descrizione = 'Consumi Simulati' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END ), 
					(CASE WHEN (sum(CASE WHEN od.Descrizione = 'Dati Distributore Simulati' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END ),
					(CASE WHEN (sum(CASE WHEN od.Descrizione ='Dati Distributore Definitivi' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END)) LIKE 'BABB' THEN 'SIMULATO' 
					/*
					 * 3* CONCATENA CASE CON IL TIPO DI LETTURA > STIMATO
					 */
					WHEN CONCAT( (CASE WHEN (sum(CASE WHEN od.Descrizione LIKE '%AUTOLETTUR%' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END  ), 
					(CASE WHEN (sum(CASE WHEN od.Descrizione = 'Consumi Simulati' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END ), 
					(CASE WHEN (sum(CASE WHEN od.Descrizione = 'Dati Distributore Simulati' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END ),
					(CASE WHEN (sum(CASE WHEN od.Descrizione ='Dati Distributore Definitivi' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END)) LIKE 'B%AB' THEN 'STIMATO' 
					/*
					 * 4* CONCATENA CASE CON IL TIPO DI LETTURA > REALE
					 */
					WHEN CONCAT( (CASE WHEN (sum(CASE WHEN od.Descrizione LIKE '%AUTOLETTUR%' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END  ), 
					(CASE WHEN (sum(CASE WHEN od.Descrizione = 'Consumi Simulati' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END ), 
					(CASE WHEN (sum(CASE WHEN od.Descrizione = 'Dati Distributore Simulati' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END ),
					(CASE WHEN (sum(CASE WHEN od.Descrizione ='Dati Distributore Definitivi' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END)) LIKE 'BBBA' THEN 'REALE' 
					/*
					 * 5* CONCATENA CASE CON IL TIPO DI LETTURA > MISTA
					 */
					WHEN CONCAT( (CASE WHEN (sum(CASE WHEN od.Descrizione LIKE '%AUTOLETTUR%' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END  ), 
					(CASE WHEN (sum(CASE WHEN od.Descrizione = 'Consumi Simulati' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END ), 
					(CASE WHEN (sum(CASE WHEN od.Descrizione = 'Dati Distributore Simulati' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END ),
					(CASE WHEN (sum(CASE WHEN od.Descrizione ='Dati Distributore Definitivi' THEN 1 ELSE 0 END)) > 0 THEN 'A' ELSE 'B' END)) LIKE 'B%%A' THEN 'MISTA' 
					ELSE 'ALTRO (verificare)' END AS 'LETTURA DETTAGLIATA'
					FROM BillingTEVA.dbo.DocGasConsumiFatturatiOD dgcfo 
					left join dbDatamaxEVA.dbo.gasOrigineDati od on dgcfo.idGasOrigineDati  = od.idGasOrigineDati
					left join DocT dt on dt.IDDocT = dgcfo.IDDocT  
					left join DocR dr on dr.iddocT=dt.iddoct
					left join Scadenzario sc on sc.IDTBilling = dt.IDDocT  
					left join BillingTEVA.dbo.DocFlussi df on dt.IDDocFlusso =df.IDDocFlusso  
					left join BITAziende b on dt.IDAzienda = b.IDAzienda 
					where dt.Emissione between '${date}' and getdate() and df.IDStatoFlusso ='4' and dr.CompDal= '${myDate}'
					group by sc.NumDocsuFatt, b.RagSoc, dt.iddocflusso, sc.DataDoc, dt.TCodUtility,df.Descrizione
					ORDER BY 6 desc`;
			
			
			
			const result2 = await Database.connection('dbbi').raw(query);
			
			
					query = `select dt.TCodUtility ,IDDocFlusso,(CONCAT(DATENAME(MM,DATEADD(month, 0, dt.Emissione)),' ',DATENAME(YY,DATEADD(month, 0, dt.Emissione)))) as 'mese', sum(Qta) as qta, CONVERT(varchar,CURRENT_TIMESTAMP,20) AS 'last update', b.RagSoc  
					from docr
					left join doct dt on dt.IDDocT = docr.IDDocT 
					left join BITAziende b on b.IDAzienda = dt.IDAzienda 
								where dt.emissione between '${myDate}' and getdate() 
					and codvocebit in ('ENERGIA','PE','CCR','REMI','PFVVAR')
					group by dt.emissione, dt.TCodUtility, dt.IDDocFlusso, b.RagSoc 
					order by 1, 2 desc`;
			
			const result3 = await Database.connection('dbbi').raw(query);
		
			
            return response.send([ result1, result2, result3]);
			
      } catch (error) {
          console.log("e",error)
          return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
      }
    }
	
	
	
	async switchout({response, request}) {
      try {
            
			var {mese,anno,azienda} = request.all()
			
			azienda = azienda.replace(/'/g, "\''");
			
			var date = "01/" + mese + "/" + anno;

			date = anno + "/" + mese + "/01";
			
			var myDate = moment(date).subtract(3, 'months').format("YYYY/MM/DD");

				
			
			
			// fatturato per flusso. quante sono state emesse
			let query = `SELECT FORNITORE,IDRIGACONTRATTO,vce.IDSEDE,IDANAGRAFICA,CODUTILITY,ENEPOD,
			GASPDR,STATORIGA,RAGSOC,
			REPLACE(SedeFTCellulare,'+39','') AS SedeFTCellulare, REPLACE(NumeroTelefonico,'+39','') as NumeroTelefonico,
			SedeProvincia,SEDELOCALITA,convert(varchar, iv, 103) as 'DataInizioValidità', convert(varchar,DATACESSAZIONE,103) as DataCessazione,
			  (DATEDIFF(mm,a.iv,DataCessazione)+1) AS 'Mesi Permanenza', (CONCAT(DATENAME(MM,DATEADD(month, 0, DataCessazione)),' ',DATENAME(YY,DATEADD(month, 0, DataCessazione)))) as 'Mese Emissione',
				CASE 
							WHEN (DATEDIFF(mm,a.iv,DataCessazione)+1) between 0 and 3 THEN 'Range 0-3'
							WHEN (DATEDIFF(mm,a.iv,DataCessazione)+1) between 4 and 6 THEN 'Range 4-6'
							WHEN (DATEDIFF(mm,a.iv,DataCessazione)+1) between 7 and 12 THEN 'Range 7-12'
							ELSE 'Range > 12'
			END as 'Range Mesi Permanenza' ,
			CASE 
							 WHEN vce.CodUtility = 'GAS' then vce.UdD  
							 ELSE vce.EneUtenteDispacciamento 
			 END AS UDD,
			vce.TipoPersona, CASE 
							 WHEN vce.CodUtility = 'EE' then vce.EneOpzioneTariffariaTras 
							 ELSE vce.GasClasseMisuratore  
			 END AS TipologiaCliente, 
			 vce.MetodoPagamento, vce.TipoCapogruppo, vce.AgenziaCLI, vce.AgenteCLI,
			CASE 
							 WHEN vce.CodUtility = 'GAS' then vce.GasVolumeAnnuoPrevisionale
							ELSE vce.EneEnergiaAnno
							END as ConsumoAnnuo
			FROM vwCREGbase_EVA vce 
			left join (select idsede, min(datainiziovalidita) iv from vwCREGbase_EVA vce group by idsede) a on a.idsede=vce.idsede
			left join dbDatamaxEVA.dbo.StatoContratti sc on vce.statoriga = SC.Descrizione 
			where DataCessazione BETWEEN '${myDate}' and getdate() and sc.Significato like 'KC1N%'
			and Fornitore='${azienda}' 
			AND (TipoCapogruppo is null or TipoCapogruppo <>'Reseller')
			`;
						
			


            const result1 = await Database.connection('dbbi').raw(query)
			
			
            return response.send([result1 ]);
			
      } catch (error) {
          console.log("e",error)
          return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
      }
    }
	
	
	
	
	
	async switchin({response, request}) {
      try {
            
			var {mese,anno,azienda} = request.all()
			
			azienda = azienda.replace(/'/g, "\''");
			
			var date = "01/" + mese + "/" + anno;

			date = anno + "/" + mese + "/01";
			
			var myDate = moment(date).subtract(3, 'months').format("YYYY/MM/DD");

				
			
			
			// fatturato per flusso. quante sono state emesse
			let query = `/* REPORT PRODUZIONE CONTRATTI - MESE SOLARE PRECEDENTE */
				select FORNITORE,IDRIGACONTRATTO,IDSEDE,IDANAGRAFICA,CODUTILITY,
				ENEPOD, (CONCAT(DATENAME(MM,DATEADD(month, 0, datainiziovalidita)),' ',DATENAME(YY,DATEADD(month, 0, datainiziovalidita)))) as 'Mese Emissione',
				CASE WHEN Codutility='GAS' then GASPDR else null end as 'GasPDR',STATORIGA,
				CASE 
					WHEN Operazione in ('Libero','WinBack','Salvaguardia','Default','Fui','Maggior Tutela') then 'Switch-in'
					WHEN Operazione in ('Nuovo allaccio','Nuova Attivazione') then 'A40'
					WHEN Operazione = 'Subentro' then 'A01 GAS'
					ELSE Operazione 	
				end as 'Operazione',
				convert(date,datainiziovalidita,103) as 'datainiziovalidita',
				CASE 
					WHEN MACROSTATORIGA IN ('BLOCCATO','RIFIUTATO') then 'ANNULLATO' 
					WHEN MACROSTATORIGA IN ('NON ATTIVO') then 'CHURN MESE'
					ELSE MACROSTATORIGA END AS 'Macro Stato Riga',
				TIPOCAPOGRUPPO,RAGSOC,IDPRODOTTO,PRODOTTO,CONVERT(DATE,datainiziovalidita,103) AS 'Data Inizio Validità',
				convert(date,DATAMODRIGACONTRATTO,103) as 'Data Mod Riga Contratto',AGENZIA,AGENTE
				from vwCREGbase_EVA vce 
				where datainiziovalidita between '${myDate}' and getdate() 
				and Fornitore='${azienda}' and Operazione NOT IN ('Rinnovo Annuale','Cambio Piano') and CodUtility <> 'serv' 
				AND (TipoCapogruppo is null or TipoCapogruppo <>'Reseller') AND Operazione <> 'Voltura'`;
						
			


            const result1 = await Database.connection('dbbi').raw(query)
			
			
            return response.send([result1 ]);
			
      } catch (error) {
          console.log("e",error)
          return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
      }
    }
	
	
	
	async produzione({response, request}) {
      try {
            
			var {mese,anno,azienda} = request.all()
			
			var date = "01/" + mese + "/" + anno;

			date = anno + "/" + mese + "/01";
			
			var myDate = moment(date).subtract(3, 'months').format("YYYY/MM/DD");

			
			
			
			// fatturato per flusso. quante sono state emesse
            let query = `select b.RagSoc as 'Azienda', dt.TCodUtility as 'Utility',  dt.IDDocFlusso, df.Descrizione, COUNT(NumDocsuFatt) as 'Fatture', CONVERT(varchar,MAX(dt.Emissione),103) as 'Emissione', CONVERT(varchar,MAX(dt.Scadenza),103) as 'Scadenza', REPLACE(sum(dt.ValImponibile),'.',',') as 'Imponibile', REPLACE(sum(dt.ValIva),'.',',') as 'Iva', REPLACE(sum(dt.ValTotale),'.',',') as 'Totale', CONCAT(DATENAME(MM,dt.Emissione),' ',DATENAME(YY,dt.Emissione)) as 'Mese Anno Emissione', CONVERT(varchar,CURRENT_TIMESTAMP,20) AS 'last update', (SUM(CASE WHEN afd.flgEMail ='1' and afd.flgDigi ='1' THEN 1 ELSE 0 END)) AS 'Fattura Digitale', (SUM(CASE WHEN afd.flgEMail ='0' and afd.flgDigi ='0' THEN 1 ELSE 0 END)) AS 'Fattura Cartacea', (SUM(CASE WHEN afd.flgEMail ='1' and afd.flgDigi ='0' THEN 1 ELSE 0 END)) AS 'Email + Cartacea', (SUM(CASE WHEN pm.Descrizione ='RID / SDD' THEN 1 ELSE 0 END)) As 'RID', (SUM(CASE WHEN pm.Descrizione ='Bollettino' THEN 1 ELSE 0 END)) As 'Bollettino', (SUM(CASE WHEN pm.Descrizione ='BONIFICO' THEN 1 ELSE 0 END)) As 'BONIFICO' from Scadenzario sc left join DocT dt on sc.IDTBilling = dt.IDDocT  left join BITAziende b ON b.IDAzienda = dt.IDAzienda left join DocFlussi df ON df.IDDocFlusso = dt.IDDocFlusso LEFT JOIN AnaFatturaDigitale afd ON afd.IDAnagrafica = dt.IDAnagrafica  LEFT JOIN PagamentoMetodi pm ON pm.IDMetodo = sc.ModPag  where dt.Emissione BETWEEN '${myDate}' and getdate() and DT.TCodUtility <> 'SERV' group by dt.IDDocFlusso, b.RagSoc, dt.TCodUtility, df.Descrizione, dt.Emissione order by 1,2,3,5`;
			
			


            const result1 = await Database.connection('dbbi').raw(query)
			
			
		
			
			
			
			
            return response.send([result1 ]);
			
      } catch (error) {
          console.log("e",error)
          return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
      }
    }
	
	
	
	
	
	
          
}

module.exports = ReportisticaController
