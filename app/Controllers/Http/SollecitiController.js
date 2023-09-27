'use strict'
var momentBusiness = require('moment-business-days');
var builder = require('xmlbuilder2');
const XLSX = require('xlsx');
const mkdirp = require('mkdirp')
const Env = use('Env')
const fsExtra = require('fs');


class SollecitiController {

    async xlsxToJson(file){
        var workbook = XLSX.readFile(file);
        var sheet_name_list = workbook.SheetNames;
        var data = [];
        sheet_name_list.forEach(function(y) {
          var worksheet = workbook.Sheets[y];
          var headers = {};
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
        return data
    }

    async start({response,request}) {
        try {
            const {date,xlsx_file} = request.all()
            const esitoName = await this.generateXML(date,xlsx_file)
            const buffer = fsExtra.readFileSync(Env.get('SOLLECITI_PATH')+ '/'+ esitoName);
            fsExtra.unlinkSync(Env.get('SOLLECITI_PATH')+ esitoName)
            fsExtra.unlinkSync(Env.get('SOLLECITI_PATH')+ xlsx_file)
            return response.send(buffer)
        } catch (error) {
            return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
        }
    }

    async generateXML(date,xlsx_name){
        try {
          var momentBusiness = require('moment-business-days');
          momentBusiness.updateLocale('it', {
            workingWeekdays: [1, 2, 3, 4, 5]
          });
          momentBusiness.updateLocale('us', {
            workingWeekdays: [1, 2, 3, 4, 5]
          });
          const esitoName = 'esito.xlsx'
          var file = Env.get('SOLLECITI_PATH') + '/' + xlsx_name
          const data = await this.xlsxToJson(file)
          var starter = builder.create({version: '1.0',encoding:"UTF-8"})
          var root = starter.ele('EsitiComunicazioni')
          var header = root.ele('Header');
          header.ele('Occurs').txt(data.length)
          for(let i in data) {
            var esito = root.ele('Esito')
            esito.ele('CodAzione').txt(data[i].nomefile.substring(0, data[i].nomefile.lastIndexOf("_")))
            esito.ele('CodStatoEsito').txt('01')
            esito.ele('DataStato').txt(momentBusiness(date, 'DD/MM/YYYY').businessAdd(6).format('YYYY-MM-DD'))
            esito.ele('NumRaccomandata').txt(data[i].BARCODE)
          }
          var xml = starter.end({ prettyPrint: true });
          await fsExtra.writeFileSync(`${Env.get('SOLLECITI_PATH')}/${esitoName}`, xml, 'binary');
          return esitoName
        }catch(error){
          console.log("err",error)
          throw error
        }
    }

    async uploadXlsxSolleciti({response,request}){
        try {
            const xlsxFile = request.file('xlsx_file')
            await mkdirp.sync(Env.get('SOLLECITI_PATH'))
            const xlsx_name = Date.now()+'.xlsx'
            await xlsxFile.move(Env.get('SOLLECITI_PATH'), {name:xlsx_name, overwrite: true })
            return response.send(xlsx_name)
        } catch (error) {
          return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
        }
    }
}

module.exports = SollecitiController
