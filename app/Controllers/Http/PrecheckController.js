'use strict'

const mkdirp = require('mkdirp')
const fsExtra = require('fs');
const Env = use('Env')
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const axios = require('axios');
var convert = require('xml-js');

class PrecheckController {

    async startPrecheck({response,request}) {
      try {
          const CsvFile = request.file('csv_file')
          await mkdirp.sync(Env.get('PRECHECK_PATH'))
          const csv_name = Date.now()+'.csv'
          await CsvFile.move(Env.get('PRECHECK_PATH'), {name:csv_name, overwrite: true })
          const esitoName = await this.generateCsv(csv_name)
          const buffer = await fsExtra.readFileSync(Env.get('PRECHECK_PATH')+ '/'+ esitoName,'UTF-8')
          fsExtra.unlinkSync(Env.get('PRECHECK_PATH')+ '/'+ esitoName)
          fsExtra.unlinkSync(Env.get('PRECHECK_PATH') + '/' + csv_name)
          return response.send(buffer)
      } catch (error) {
          console.log("e",error)
          return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
      }
    }
          
    async generateCsv(csv_name){
      return new Promise(async (resolve,rejects) => {
          try{
          var datafile = fsExtra.readFileSync(Env.get('PRECHECK_PATH') + '/' + csv_name)
          .toString() // convert Buffer to string
          .split('\n') // split string to lines
          .map(e => e.trim()) // remove white spaces for each line
          .map(e => e.split(';').map(e => e.trim())); // split each line to array
          //Creo CSV ESITO
          const esitoName = 'esito_'+csv_name
          const esitoPath = Env.get('PRECHECK_PATH')+'/'+ esitoName
          const csvWriter = createCsvWriter({
              path: esitoPath,
              header: [
              {id: 'Fornitore', title: 'Fornitore'},
              {id: 'IDContratto', title: 'IDContratto'},
              {id: 'CFisc', title: 'CFisc'},
              {id: 'esito', title: 'esito'}
              ],
              append: true,
              fieldDelimiter:';'
          });
          
          for(let i in datafile) {
              let el = datafile[i]
              if(el && el[0] && el[1] && el[2]) {
              var Fornitore = (el[0].trim())
              var IDContratto = (el[1].trim())
              var CFisc = (el[2].trim())
              var codice_cliente = '16643'
              var username = 'I0116643'
              var password = 'evgyce43'
              switch(Fornitore) {
                  case 'ugm':
                  codice_cliente = '00116644'
                  username = 'I0116644'
                  password = 'evgyga44'
                  break;
                  case '2g':
                  codice_cliente = '00116645'
                  username = 'I0116645'
                  password = 'vagypi45'
                  break;
                  case 'piuenergie':
                  codice_cliente = '00116646'
                  username = 'I0116646'
                  password = 'evgyce46'
                  break;			
                  case 'semplice':
                  codice_cliente = '00116698'
                  username = 'I0116698'
                  password = 'evgyce98'
                  break;
                  case 'aurah':
                  codice_cliente = '00116699'
                  username = 'I0116699'
                  password = 'evgyce99'
                  break;								
                  default:
                  codice_cliente = '00116643'
                  username = 'I0116643'
                  password = 'evgyce43'
                  break;				
              }
                  var url = "https://adcexe.eurocredit.it/OutputXml/RichiestaProdottiEE.asp?CodCli="+codice_cliente+"&PrfUte="+username+"&PwUte="+password+"&TipoProdotto=PCC&CodiceFiscale="+CFisc
                  await axios.get(url).then( async res => {
                  var result = await convert.xml2js(res.data, {compact: true, spaces: 4});	
                  let row = [
                  {
                      Fornitore: Fornitore,
                      IDContratto: IDContratto,
                      CFisc: CFisc,
                      esito:  result && result.DOCUMENTO && result.DOCUMENTO.PROTESTI  ? result.DOCUMENTO.PROTESTI._text : result.DescrizioneErrore
                  }
                  ];
                  await csvWriter.writeRecords(row)
                  }).catch(e=>{
                  console.log(e.message, url)
              })	
              }
          }
          resolve(esitoName)
          }catch(e){
          rejects(e)
          }
      })
    }

}

module.exports = PrecheckController
