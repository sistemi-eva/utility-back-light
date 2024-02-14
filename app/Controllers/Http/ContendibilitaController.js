'use strict'

const XLSX = require('xlsx');
const Excel = require('exceljs');
const Token = use('App/Models/Token')
const ImportsContendibilita = use('App/Models/Contendibilita/Import')
const TemplateContendibilita = use('App/Models/Contendibilita/Template')
const TemplateMappingContendibilita = use('App/Models/Contendibilita/TemplateMapping')
const LogContendibilita = use('App/Models/Contendibilita/Log')
const Database = use('Database')
const moment = require("moment")
const fs = require('fs');
class ContendibilitaController {
    async parseXlsFile({ request, response }){
		
		
      var { commodity, distributore, lastImportId, closeImport, pivot } = request.all()
      // const commodity = 'gas'; const distributore = '2iretegas'; const lastImportId = null;
	  
	  var tenant = request.headers().tenant_gas
	  ImportsContendibilita.myschema = tenant
	  TemplateContendibilita.myschema = tenant
	  TemplateMappingContendibilita.myschema = tenant
	  
      const xlsx_file = await request.file('xlsx_file')
	  
	  if(xlsx_file.extname != "xlsx" && xlsx_file.extname != "xls" ) {
			return response.status(200).send({
			  status: 'noData',
			  message: 'Sono accettati solo i file xls ed xlsx',
			  data: [],
			})
		}
	
      // const xlsx_file = { tmpPath: 'utility/contendibilita/' + commodity + '_' + distributore + '.xls'}

      const DB = Database.connection('rcu')

      // console.log(closeImport)

      let importId = lastImportId || null


	  console.log("filetemppath=" + xlsx_file.tmpPath);
	  
	  
		var path = xlsx_file.tmpPath;

			
		var last = path.substring(path.lastIndexOf("\\") + 1, path.length);
		
		
		var newpath = path.replace(last, xlsx_file.clientName);
		
		await this.myrenameFile(path, newpath);
		console.log(newpath)
	  
	  
		const fileData = await this._xlsToJson(newpath)
	  
		//const fileData = await this.my_xlsToJson(xlsx_file.tmpPath);
	  
	  

	
	  console.log("pivot = " + pivot); 
		
	  //console.log("fileData");
	  //console.log(fileData);
	  
	  
	  
      if(fileData.length == 0) {
        return response.status(200).send({
          status: 'noData',
          message: 'Nessun dato da valutare',
          data: fileData,
        })
      }


      var template = null
      var mapping = null
      try {
        template = await TemplateContendibilita.query().where('commodity', commodity).where('distributore', distributore).first();
        const mappingQuery = await TemplateMappingContendibilita.query().where('template_id', template.id).fetch()
        mapping = mappingQuery.toJSON()
		
		
		
		
		
      } catch(error) {
        return response.status(500).send({
          status: 'DbError',
          message: 'impossibile trovare template per ' + distributore,
          data: {},
        })
      }
		
	  
	  if( distributore != 'italgas' ){
		  
	  
		  const mappingPivot = mapping.find(row => row.pivot)
		 
		
		  if(mappingPivot) {
			if(fileData[0][mappingPivot.etichetta_campo_file].toLowerCase() != pivot.toLowerCase()) {
			  return response.status(422).send({
				status: 'ParamsError',
				message:  (commodity == 'energia' ? 'La provincia' : `Il comune inserito (${pivot})`) + ' non coincide con il file',
				data: {},
			  })
			}
		  }
	  
	  }

      const dbTableName = `${tenant}.cont_{commodity}_${distributore}`
      const dbTrx = await DB.beginTransaction()

      let tmpTableExist = false
      await DB.raw(`SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name   = '${dbTableName}_tmp'
      )`).then(
        (response) => {
          tmpTableExist = response.rows && response.rows[0] && response.rows[0].exists
        },
        () => {
          tmpTableExist = false
        }
      )

      if(!tmpTableExist) {
        try {
          await DB.raw(`CREATE TABLE ${dbTableName}_tmp (LIKE ${dbTableName})`)
          if(!lastImportId) {
            const importObj = await ImportsContendibilita.create({
              commodity,
              distributore,
              template_id: template.id,
              filename: xlsx_file.clientName,
              pivot: pivot.toLowerCase()
            })
            importId = !!importObj ? importObj.toJSON()['id'] : null
			
          }
        } catch(error) {
          console.log(error)
          await DB.raw(`DROP TABLE ${dbTableName}_tmp`)
          return response.status(500).send({
            status: 'DbError',
            message: 'impossibile creare tabella temporanea su DB',
            data: {},
          })
        }
      } else {
        if(!lastImportId) {
          // await DB.raw(`DROP TABLE ${dbTableName}_tmp`)
          return response.status(500).send({
            status: 'DbError',
            message: 'last importId non presente (eliminare tabella tmp)',
            data: {},
          })
        }
      }
	  
	  

      try {
        const tableData = []
        fileData.forEach(row => {
			
			
          const tableRow = {
            distributore,
            pivot: pivot.toLowerCase()
          }
		  
		  
          mapping.forEach((map) => {
				
				if( map.colonna_db == "stato" && distributore == 'italgas' ){
						
					if( row['Misuratore'] === undefined ){
						 
						 tableRow["stato"] = "Attesa prima attivazione";
					 }
					 else{
						 tableRow["stato"] = "Cessato";
					 }
				}
				else{
					tableRow[map.colonna_db] = row[map.etichetta_campo_file]
			 
				}
				
				 
			 
		
			
			
			 
            
          })
          tableData.push(tableRow)
        })
		
		
        const dbTable = DB.table(dbTableName + '_tmp')
		
	
		

        if(!lastImportId) {
          await DB.raw(`TRUNCATE ${dbTableName}_tmp`)
        }
        const retProp = commodity == 'gas' ? 'pdr' : 'pod'
		
		var dbInsert = null
		var dbInsertLength = 0
		if( tableData.length <= 3000 ){
			dbInsert = await dbTable.insert(tableData, [retProp], dbTrx)
			dbInsertLength = dbInsertLength + parseInt(dbInsert.length)
		}
		else{

			console.log("more than 3000 rows");
			const tableDataSplitted = await this.processLargeArray(tableData, 3000);
			
			
			
			for(var i in tableDataSplitted){
				dbInsert = await dbTable.insert(tableDataSplitted[i], [retProp], dbTrx)
				
				console.log("dbInsert.length = " + dbInsert.length)
				dbInsertLength = dbInsertLength + parseInt(dbInsert.length)
			}
			
			console.log("dbInsertLength = " + dbInsertLength);
			
		}

	
        

        // chiudi sessione di import
        const importSession = await ImportsContendibilita.find(importId)
        if(importSession) {
          // console.log(importSession, importId)
          importSession.stato = closeImport == 'true' ? 'chiuso' : 'aperto'
          importSession.righe_importate = importSession.righe_importate + dbInsertLength
          importSession.save(dbTrx)
        }

        // copio dati sulla tebella di produzione e resetto tutto
        await DB.raw(`SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name   = '${dbTableName}_bk'
        )`).then(
          async (response) => {
            if(response.rows && response.rows[0] && response.rows[0].exists) {
              await DB.raw(`DROP TABLE ${dbTableName}_bk`)
            }
          }
        )

        if(closeImport == 'true'){
          await DB.raw(`CREATE TABLE ${dbTableName}_bk (LIKE ${dbTableName} INCLUDING ALL)`)
          // await DB.raw(`TRUNCATE ${dbTableName}`)
          // Rimuove le righe interessate dall'import
		  
		  var my_pivot = pivot.replace(/'/g, "''");
		  
          await DB.raw(`DELETE FROM ${dbTableName} WHERE pivot = '${my_pivot.toLowerCase()}'`)
          await DB.raw(`INSERT INTO ${dbTableName} SELECT * FROM ${dbTableName}_tmp`)
          await DB.raw(`DROP TABLE ${dbTableName}_tmp`)
        }

        dbTrx.commit()

        return response.send({
          status: 'success',
          message: 'Import avvenuto con successo',
          data: importSession
        })
      } catch (error) {
        console.log(error)
        dbTrx.rollback()
        return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
      }
    }

    async listTemplates({request, response}) {
		TemplateContendibilita.myschema = request.headers().tenant_gas
      console.log(await TemplateContendibilita.all())
      return response.send('ok')
    }

    async listImports({request,response}) {
      const page = request.input("page", 1)
      const perPage = request.input("perPage", 25)
      const date_end = request.input("date_end", '')
      const date_start = request.input("date_start", '')
      const commodity = request.input("commodity", '')
      const distributore = request.input("distributore", '')
      const stato = request.input("stato", '')
      console.log(date_end, date_start, commodity, distributore, stato)
	  
	  ImportsContendibilita.myschema = request.headers().tenant_gas
	  
      const query = ImportsContendibilita.query()
      if(date_end.length > 0) {
        const end = moment(date_end, 'DD/MM/YYYY').add(1, 'days').format('YYYY-MM-DD 00:00')
        query.where('data', '<=', end)
      }
      if(date_start.length > 0) {
        const start = moment(date_start, 'DD/MM/YYYY').format('YYYY-MM-DD 00:00')
        query.where('data', '>=', start)
      }
      if(commodity.length > 0) {
        query.where('commodity', '=', commodity)
      }
      if(distributore.length > 0) {
        query.where('distributore', '=', distributore)
      }
      if(stato.length > 0) {
        query.where('stato', '=', stato)
      }
      const imports = await query.with('template').orderBy('data', 'desc').paginate(page || 1, perPage)
      return response.send(imports)
    }

    async listLogs({request,response}) {
      const page = request.input("page", 1)
      const perPage = request.input("perPage", 9999)
      const date_end = request.input("date_end", '')
      const date_start = request.input("date_start", '')
      const search = request.input("search_text", '')
	  
	  LogContendibilita.myschema = request.headers().tenant_gas
      const query = LogContendibilita.query()
      if(date_end.length > 0) {
        const end = moment(date_end, 'DD/MM/YYYY').add(1, 'days').format('YYYY-MM-DD 00:00')
        query.where('data', '<=', end)
      }
      if(date_start.length > 0) {
        const start = moment(date_start, 'DD/MM/YYYY').format('YYYY-MM-DD 00:00')
        query.where('data', '>=', start)
      }
      if(search.length > 0) {
        query.where('parametri', 'iLike', '%'+search+'%')
      }
      const logs = await query.orderBy('data', 'desc').paginate(page || 1, perPage)
      return response.send(logs)
    }

    async search({request,response}) {
      const commodity = request.input("commodity", null)
      const distributore = request.input("distributore", null)
      const indirizzo = request.input("indirizzo", null)
      const cap = request.input("cap", null)
      const provincia = request.input("provincia", null)
      const localita = request.input("localita", null)
      const pdp = request.input("pdp", '')
      const misuratore = request.input("misuratore", '')
      const eneltel = request.input("eneltel", '')
	  
	   var tenant = request.headers().tenant_gas
	   
	   TemplateContendibilita.myschema = tenant
	   TemplateMappingContendibilita.myschema = tenant

      if(!commodity || !distributore) {
        return response.status(422).send({
          status: 'ParamsMissing',
          message: 'commodity e/o distributore mancanti',
          data: {},
        })
      }

      if(
        ((cap || provincia)) && (!localita || !indirizzo) ||
        (localita && !indirizzo) ||
        (!localita && indirizzo)
      ) {
        return response.status(422).send({
          status: 'ParamsMissing',
          message: 'Città e Indirizzo sono obbligatori',
          data: {},
        })
      }

      const authToken = await Token.query().where('token','=', request.header('Secret-Key')).first()
      const log = {
        username: authToken ? authToken?.username || request.input('usename') : request.input('usename'),
        parametri: JSON.stringify(request.all()),
        operazione: 'ricerca',
        profilo: authToken ? authToken?.member_of || request.input('source') : request.input('source')
      }
      await LogContendibilita.create(log)

      const template = await TemplateContendibilita.query().where('commodity', commodity).where('distributore', distributore).first();
      const mappingQuery = await TemplateMappingContendibilita.query().where('template_id', template.id).fetch()
      const mapping = mappingQuery.toJSON()
	  
	  

      const DB = Database.connection('rcu')
      const dbTableName = `${tenant}.cont_${commodity}_${distributore}`

      const keyProp = commodity == 'gas' ? 'pdr' : 'pod'
      let whereClausule = `1=1 AND (`
      if(pdp || misuratore || eneltel) {
        whereClausule += ` (1<>1`
        if(pdp) {
          whereClausule += ` OR LOWER(${keyProp}) LIKE '%${pdp.toLowerCase()}%'`
        }
        if(misuratore){
          whereClausule += ` OR LOWER(misuratore) LIKE '%${misuratore.toLowerCase()}%'`
        }
        if(commodity == 'energia' && eneltel) {
          whereClausule += ` OR LOWER(eneltel) LIKE '%${eneltel.toLowerCase()}%'`
        }
        whereClausule += ` )`
      }
      if(
        indirizzo ||
        localita ||
        provincia ||
        cap
      ) {
        if(pdp || misuratore || eneltel) {
          whereClausule += ' AND'
        }
        whereClausule += ' (1=1'
        if(indirizzo) {
          whereClausule += ` AND position('${indirizzo.toLowerCase()}' in LOWER(CONCAT(toponimo, ' ', indirizzo, ', ', civico))) > 0`
        }
        if(cap) {
          whereClausule += ` AND cap LIKE '${cap}'`
        }
        if(localita) {
          whereClausule += ` AND LOWER(localita) LIKE '%${localita.toLowerCase()}%'`
        }
        if(provincia) {
          whereClausule += ` AND LOWER(provincia) LIKE '${provincia.toLowerCase()}'`
        }
        whereClausule += ' )'
      }
      whereClausule += ' )'
      
	  console.log(`SELECT * FROM ${dbTableName} where ${whereClausule}`)
	 
      const queryResults = await DB.raw(`SELECT * FROM ${dbTableName} where ${whereClausule}`)

      const results = queryResults.rows
	  
	  
	  // toglie doppioni pdr
	  var out = Object.values(
		  results.reduce( (c, e) => {
			if (!c[e.pdr]) c[e.pdr] = e;
			return c;
		  }, {})
		);
	  
	

      if(results.length > 10) {
        return response.status(422).send({
          status: 'TooFewParams',
          message: 'La ricerca ha prodotto troppi risultati, aggiungi qualche filtro',
          data: {},
        })
      }
      return response.send({
        data: out,  
        mapping
      })
    }
	
	
	async my_xlsToJson(filePath){
		var data = []
		try{
			var workbook = new Excel.Workbook();
			
			
		
			  await workbook.xlsx.readFile(filePath).then( async function(){
				var workSheet = await workbook.getWorksheet(1); 
					
				var headers = {}
				for (var i = 1; i <= workSheet.actualRowCount; i++) {
					var row = [];
					for (var j = 1; j <= workSheet.actualColumnCount; j++) {
					  var value = workSheet.getRow(i).getCell(j).toString();
						if(i == 1) {
						  headers[j] = value;
						}
						else{
							if(!data[i]) data[i]={};
							data[i][headers[j]] = value;
						}
					}
					
				}
			

			})
			//drop those first two rows which are empty
			data.shift();
			data.shift();
			return data
	
		}
		catch (error) {
        console.log(error)
        return []
		}
	   return data
	  
			
	}
	
	
    async _xlsToJson(filePath){
      var data = [];
      try {
        var workbook = XLSX.readFile(filePath);
        var sheet_name_list = workbook.SheetNames;
        sheet_name_list.forEach(function(y) {
          var worksheet = workbook.Sheets[y];
          var headers = {};
          var index = 0;
          for(let z in worksheet) {
              if(z[0] === '!') continue;
              //parse out the column, row, and value
              var col = z.replace(/[0-9]/g, '')
              var row = parseInt(z.replace(/\D/g,''))
			 

              var value = worksheet[z].v;

              //store header names
              if(row == 1) {
                  headers[col] = value;
				  
                  continue;
              }
              if(!data[row]) data[row]={};
              data[row][headers[col]] = value;
          }
		  
          //drop those first two rows which are empty
          data.shift();
          data.shift();
        });
      } catch (error) {
        console.log(error)
        return []
      }
      return data;
  }
  
	 async splitArray(array, chunkSize) {
		const result = [];
		for (let i = 0; i < array.length; i += chunkSize) {
			result.push(array.slice(i, i + chunkSize));
		}
		return result;
	}
	
	async processLargeArray(array, maxLength) {
    if (array.length > maxLength) {
        const chunkSize = Math.ceil(array.length / Math.ceil(array.length / maxLength));
        return this.splitArray(array, chunkSize);
    }
    return [array];
}

	async myrenameFile(path1, path2){
		return new Promise((resolve,reject)=>{
			
			fs.rename( path1, path2, () => {
			  
			  resolve(path2);
			
			});
		})
	}

}

module.exports = ContendibilitaController
