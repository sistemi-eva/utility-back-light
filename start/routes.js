'use strict'

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| Http routes are entry points to your web application. You can create
| routes for different URL's and bind Controller actions to them.
|
| A complete guide on routing is available here.
| http://adonisjs.com/docs/4.1/routing
|
*/

/** @type {typeof import('@adonisjs/framework/src/Route/Manager')} */
'use strict'
const Route = use('Route')

Route.get('', ({ view }) => {
  return view.render('welcome')
})
Route.get('/api', ({ view }) => {
  return 'working!'//'view.render('welcome')
})

Route.get('/update_cache', 'RedisRouteController.updateCacheImport')


//AUTH SECTION
Route.group(() => {
  Route.post('login','AuthController.login')
  Route.get('permissions','AuthController.getPermissions').middleware(['TokenKey'])
}).prefix('/api/auth/')

//PRECHECK SECTION
Route.group(() => {
  Route.post('start-precheck','PrecheckController.startPrecheck').middleware(['TokenKey','Permissions:precheck'])
}).prefix('/api/precheck/')

//DOGANE SECTION
Route.group(() => {
  Route.post('start-single','AgenziaDoganeController.startAgenziaSingle').middleware(['TokenKey','Permissions:agenziadogane'])
  Route.post('start-multiple-first','AgenziaDoganeController.startAgenziaMultipleFirst').middleware(['TokenKey','Permissions:agenziadogane'])
  Route.post('start-multiple-second','AgenziaDoganeController.startAgenziaMultipleSecond').middleware(['TokenKey','Permissions:agenziadogane'])
  Route.post('convertitore','AgenziaDoganeController.startConvertitore').middleware(['TokenKey','Permissions:agenziadogane'])
}).prefix('/api/agenzia-dogane/')

//AGING SECTION
Route.group(() => {
  Route.post('start-aging','AgingController.startAging').middleware(['TokenKey','Permissions:aging'])
}).prefix('/api/aging/')

//RCU - EE 
Route.group(() => {
  Route.post('namespace','RcuEnergiaController.setNameSpace').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.get('namespace','RcuEnergiaController.getNameSpace').middleware(['TokenKey','Permissions:rcu-ee-cc'])
}).prefix('/api/rcu-ee/')

//RCU - EE 
Route.group(() => {
  Route.get('agenti','AgentiController.getAgenti').middleware(['TokenKey'])
  Route.get('search-agenti','AgentiController.searchAgenti').middleware(['TokenKey'])
}).prefix('/api/rcu/')

//Controparte Commerciale
Route.group(() => {
  Route.get('business-unit','RcuEnergiaCcController.businessUnit').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.get('sub-business-unit','RcuEnergiaCcController.subBusinessUnit').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.get('italy-map','RcuEnergiaCcController.italyMap').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.get('status-cache','RcuEnergiaCcController.statusCache').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.get('refresh-cache','RcuEnergiaCcController.refreshCache').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.get('delete-cache','RcuEnergiaCcController.deleteCache').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.get('last-import','RcuEnergiaCcController.getLastImport').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.get('att-dis-pod','RcuEnergiaCcController.andamentoAttDisatPod').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.get('att-dis-volumi','RcuEnergiaCcController.andamentoAttDisatVolumi').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.get('societa','RcuEnergiaCcController.RagioneSocialeCC').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.get('status','RcuEnergiaCcController.getStatusImport').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.get('check-sintesi','RcuEnergiaCcController.checkSintesi').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.get('table-information','RcuEnergiaCcController.tableInformation').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.get('table-bonus-information','RcuEnergiaCcController.tableBonusInformation').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.get('table-info-bonus-information','RcuEnergiaCcController.tableInfoBonusInformation').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.get('chart-information','RcuEnergiaCcController.graficoAnnualeInformation').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.get('table-tasso-abbandono','RcuEnergiaCcController.tableTassoAbbandono').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.get('chart-perdita-pod-information','RcuEnergiaCcController.graficoAvanzatoTotalePerditaPod').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.get('chart-perdita-dettaglio-pod-information','RcuEnergiaCcController.graficoTotaleDetailPerditaPod').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.get('chart-pod-information','RcuEnergiaCcController.graficoAnnualePodInformation').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.get('chart-pod-3years-information','RcuEnergiaCcController.graficoAnnualePodLast3YearsInformation').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.get('chart-volumi-3years-information','RcuEnergiaCcController.graficoAnnualeVolumiLast3YearsInformation').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.get('chart-pod-dispacciamento-information','RcuEnergiaCcController.graficoTotaleDetailPerditaPod').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.get('chart-incremento-bonus-information','RcuEnergiaCcController.graficoAnnualeIncrementoBonusInformation').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.get('chart-incremento-pod-information','RcuEnergiaCcController.graficoAnnualeIncrementoPodInformation').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.get('chart-incremento-volume-information','RcuEnergiaCcController.graficoAnnualeIncrementoVolumeInformation').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.get('table-pod-information','RcuEnergiaCcController.tablePodAnnuale').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.get('table-inc-pod-information','RcuEnergiaCcController.tableIncPod').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.get('table-volumi-information','RcuEnergiaCcController.tableVolumiAnnuale').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.get('table-inc-volumi-information','RcuEnergiaCcController.tableIncVolumi').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.get('sintesi-information','RcuEnergiaCcController.sintesiInformation').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.post('delete-fatturazione','RcuEnergiaCcController.deleteRowField').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.post('esportazione','RcuEnergiaCcController.esportazione').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.post('insert','RcuEnergiaCcController.insert').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.post('controllo','RcuEnergiaCcController.controlloRcu').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.get('history','RcuEnergiaCcController.getHistory').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.post('download-file','RcuEnergiaCcController.csvItemDatabase').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.post('italy-map-export','RcuEnergiaCcController.exportFormMap').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.post('fatturazione-file','RcuEnergiaCcController.uploadZip').middleware(['TokenKey','Permissions:rcu-ee-cc'])
  Route.get('force-update', 'RcuEnergiaCcController.updateDatamaxDb')
}).prefix('/api/rcu-ee/cc/')

//Utente del dispacciamento
Route.group(() => {
  Route.get('status-cache','RcuEnergiaUddController.statusCache').middleware(['TokenKey','Permissions:rcu-ee-udd'])
  Route.get('refresh-cache','RcuEnergiaUddController.refreshCache').middleware(['TokenKey','Permissions:rcu-ee-udd'])
  Route.get('delete-cache','RcuEnergiaUddController.deleteCache').middleware(['TokenKey','Permissions:rcu-ee-udd'])
  Route.get('att-dis-pod','RcuEnergiaUddController.andamentoAttDisatPod').middleware(['TokenKey','Permissions:rcu-ee-udd'])
  Route.get('att-dis-volumi','RcuEnergiaUddController.andamentoAttDisatVolumi').middleware(['TokenKey','Permissions:rcu-ee-udd'])
  Route.get('last-import','RcuEnergiaUddController.getLastImport').middleware(['TokenKey','Permissions:rcu-ee-udd'])
  Route.get('societa','RcuEnergiaUddController.RagioneSocialeCC').middleware(['TokenKey','Permissions:rcu-ee-udd'])
  Route.get('status','RcuEnergiaUddController.getStatusImport').middleware(['TokenKey','Permissions:rcu-ee-udd'])
  Route.get('check-sintesi','RcuEnergiaUddController.checkSintesi').middleware(['TokenKey','Permissions:rcu-ee-udd'])
  Route.get('table-tasso-abbandono','RcuEnergiaUddController.tableTassoAbbandono').middleware(['TokenKey','Permissions:rcu-ee-udd'])
  Route.get('table-information','RcuEnergiaUddController.tableInformation').middleware(['TokenKey','Permissions:rcu-ee-udd'])
  Route.get('table-bonus-information','RcuEnergiaUddController.tableBonusInformation').middleware(['TokenKey','Permissions:rcu-ee-udd'])
  Route.get('table-info-bonus-information','RcuEnergiaUddController.tableInfoBonusInformation').middleware(['TokenKey','Permissions:rcu-ee-udd'])
  Route.get('chart-information','RcuEnergiaUddController.graficoAnnualeInformation').middleware(['TokenKey','Permissions:rcu-ee-udd'])
  Route.get('chart-perdita-pod-information','RcuEnergiaUddController.graficoAvanzatoTotalePerditaPod').middleware(['TokenKey','Permissions:rcu-ee-udd'])
  Route.get('chart-perdita-dettaglio-pod-information','RcuEnergiaUddController.graficoTotaleDetailPerditaPod').middleware(['TokenKey','Permissions:rcu-ee-udd'])
  Route.get('chart-pod-information','RcuEnergiaUddController.graficoAnnualePodInformation').middleware(['TokenKey','Permissions:rcu-ee-udd'])
  Route.get('chart-pod-3years-information','RcuEnergiaUddController.graficoAnnualePodLast3YearsInformation').middleware(['TokenKey','Permissions:rcu-ee-udd'])
  Route.get('chart-volumi-3years-information','RcuEnergiaUddController.graficoAnnualeVolumiLast3YearsInformation').middleware(['TokenKey','Permissions:rcu-ee-udd'])
  Route.get('chart-pod-dispacciamento-information','RcuEnergiaUddController.graficoTotaleDetailPerditaPod').middleware(['TokenKey','Permissions:rcu-ee-udd'])
  Route.get('chart-incremento-bonus-information','RcuEnergiaUddController.graficoAnnualeIncrementoBonusInformation').middleware(['TokenKey','Permissions:rcu-ee-udd'])
  Route.get('chart-incremento-pod-information','RcuEnergiaUddController.graficoAnnualeIncrementoPodInformation').middleware(['TokenKey','Permissions:rcu-ee-udd'])
  Route.get('chart-incremento-volume-information','RcuEnergiaUddController.graficoAnnualeIncrementoVolumeInformation').middleware(['TokenKey','Permissions:rcu-ee-udd'])
  Route.get('table-pod-information','RcuEnergiaUddController.tablePodAnnuale').middleware(['TokenKey','Permissions:rcu-ee-udd'])
  Route.get('table-inc-pod-information','RcuEnergiaUddController.tableIncPod').middleware(['TokenKey','Permissions:rcu-ee-udd'])
  Route.get('table-volumi-information','RcuEnergiaUddController.tableVolumiAnnuale').middleware(['TokenKey','Permissions:rcu-ee-udd'])
  Route.get('table-inc-volumi-information','RcuEnergiaUddController.tableIncVolumi').middleware(['TokenKey','Permissions:rcu-ee-udd'])
  Route.get('sintesi-information','RcuEnergiaUddController.sintesiInformation').middleware(['TokenKey','Permissions:rcu-ee-udd'])
  Route.post('delete-fatturazione','RcuEnergiaUddController.deleteRowField').middleware(['TokenKey','Permissions:rcu-ee-udd'])
  Route.post('esportazione','RcuEnergiaUddController.esportazione').middleware(['TokenKey','Permissions:rcu-ee-udd'])
  Route.post('insert','RcuEnergiaUddController.insert').middleware(['TokenKey','Permissions:rcu-ee-udd'])
  Route.post('controllo','RcuEnergiaUddController.controlloRcu').middleware(['TokenKey','Permissions:rcu-ee-udd'])
  Route.get('history','RcuEnergiaUddController.getHistory').middleware(['TokenKey','Permissions:rcu-ee-udd'])
  Route.post('download-file','RcuEnergiaUddController.csvItemDatabase').middleware(['TokenKey','Permissions:rcu-ee-udd'])
  Route.post('fatturazione-file','RcuEnergiaUddController.uploadZip').middleware(['TokenKey','Permissions:rcu-ee-udd'])
}).prefix('/api/rcu-ee/udd/')


//RCU - GAS
//Controparte Commerciale
Route.group(() => {
  Route.get('last-import','RcuGasCcController.getLastImport').middleware(['TokenKey','Permissions:rcu-gas-cc'])
  Route.get('societa','RcuGasCcController.RagioneSocialeCC').middleware(['TokenKey','Permissions:rcu-gas-cc'])
  Route.get('status','RcuGasCcController.getStatusImport').middleware(['TokenKey','Permissions:rcu-gas-cc'])
  Route.get('check-sintesi','RcuGasCcController.checkSintesi').middleware(['TokenKey','Permissions:rcu-gas-cc'])
  Route.get('table-information','RcuGasCcController.tableInformation').middleware(['TokenKey','Permissions:rcu-gas-cc'])
  Route.get('chart-information','RcuGasCcController.graficoAnnualeInformation').middleware(['TokenKey','Permissions:rcu-gas-cc'])
  Route.get('chart-perdita-pod-information','RcuGasCcController.graficoAvanzatoTotalePerditaPod').middleware(['TokenKey','Permissions:rcu-gas-cc'])
  Route.get('chart-perdita-dettaglio-pod-information','RcuGasCcController.graficoTotaleDetailPerditaPod').middleware(['TokenKey','Permissions:rcu-gas-cc'])
  Route.get('chart-pod-information','RcuGasCcController.graficoAnnualePodInformation').middleware(['TokenKey','Permissions:rcu-gas-cc'])
  Route.get('chart-pod-3years-information','RcuGasCcController.graficoAnnualePodLast3YearsInformation').middleware(['TokenKey','Permissions:rcu-gas-cc'])
  Route.get('chart-volumi-3years-information','RcuGasCcController.graficoAnnualeVolumiLast3YearsInformation').middleware(['TokenKey','Permissions:rcu-gas-cc'])
  Route.get('chart-pod-dispacciamento-information','RcuGasCcController.graficoTotaleDetailPerditaPod').middleware(['TokenKey','Permissions:rcu-gas-cc'])
  Route.get('chart-incremento-pod-information','RcuGasCcController.graficoAnnualeIncrementoPodInformation').middleware(['TokenKey','Permissions:rcu-gas-cc'])
  Route.get('chart-incremento-volume-information','RcuGasCcController.graficoAnnualeIncrementoVolumeInformation').middleware(['TokenKey','Permissions:rcu-gas-cc'])
  Route.get('table-pod-information','RcuGasCcController.tablePodAnnuale').middleware(['TokenKey','Permissions:rcu-gas-cc'])
  Route.get('table-inc-pod-information','RcuGasCcController.tableIncPod').middleware(['TokenKey','Permissions:rcu-gas-cc'])
  Route.get('table-volumi-information','RcuGasCcController.tableVolumiAnnuale').middleware(['TokenKey','Permissions:rcu-gas-cc'])
  Route.get('table-inc-volumi-information','RcuGasCcController.tableIncVolumi').middleware(['TokenKey','Permissions:rcu-gas-cc'])
  Route.get('sintesi-information','RcuGasCcController.sintesiInformation').middleware(['TokenKey','Permissions:rcu-gas-cc'])
  Route.post('delete-fatturazione','RcuGasCcController.deleteRowField').middleware(['TokenKey','Permissions:rcu-gas-cc'])
  Route.post('esportazione','RcuGasCcController.esportazione').middleware(['TokenKey','Permissions:rcu-gas-cc'])
  Route.post('insert','RcuGasCcController.insert').middleware(['TokenKey','Permissions:rcu-gas-cc'])
  Route.post('controllo','RcuGasCcController.controlloRcu').middleware(['TokenKey','Permissions:rcu-gas-cc'])
  Route.get('history','RcuGasCcController.getHistory').middleware(['TokenKey','Permissions:rcu-gas-cc'])
  Route.post('download-file','RcuGasCcController.csvItemDatabase').middleware(['TokenKey','Permissions:rcu-gas-cc'])
  Route.post('fatturazione-file','RcuGasCcController.uploadZip').middleware(['TokenKey','Permissions:rcu-gas-cc'])

}).prefix('/api/rcu-gas/cc/')

//Utente del dispacciamento
Route.group(() => {
  Route.get('business-unit','RcuGasUddController.businessUnit').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.get('sub-business-unit','RcuGasUddController.subBusinessUnit').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.get('italy-map','RcuGasUddController.italyMap').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.get('status-cache','RcuGasUddController.statusCache').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.get('refresh-cache','RcuGasUddController.refreshCache').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.get('delete-cache','RcuGasUddController.deleteCache').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.get('att-dis-pod','RcuGasUddController.andamentoAttDisatPod').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.get('att-dis-volumi','RcuGasUddController.andamentoAttDisatVolumi').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.get('last-import','RcuGasUddController.getLastImport').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.get('societa','RcuGasUddController.RagioneSocialeCC').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.get('status','RcuGasUddController.getStatusImport').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.get('check-sintesi','RcuGasUddController.checkSintesi').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.get('table-information','RcuGasUddController.tableInformation').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.get('table-tasso-abbandono','RcuGasUddController.tableTassoAbbandono').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.get('chart-information','RcuGasUddController.graficoAnnualeInformation').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.get('chart-perdita-pod-information','RcuGasUddController.graficoAvanzatoTotalePerditaPod').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.get('chart-perdita-dettaglio-pod-information','RcuGasUddController.graficoTotaleDetailPerditaPod').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.get('chart-pod-information','RcuGasUddController.graficoAnnualePodInformation').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.get('chart-pod-3years-information','RcuGasUddController.graficoAnnualePodLast3YearsInformation').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.get('chart-volumi-3years-information','RcuGasUddController.graficoAnnualeVolumiLast3YearsInformation').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.get('chart-pod-dispacciamento-information','RcuGasUddController.graficoTotaleDetailPerditaPod').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.get('chart-incremento-pod-information','RcuGasUddController.graficoAnnualeIncrementoPodInformation').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.get('chart-incremento-volume-information','RcuGasUddController.graficoAnnualeIncrementoVolumeInformation').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.get('table-pod-information','RcuGasUddController.tablePodAnnuale').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.get('table-inc-pod-information','RcuGasUddController.tableIncPod').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.get('table-volumi-information','RcuGasUddController.tableVolumiAnnuale').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.get('table-inc-volumi-information','RcuGasUddController.tableIncVolumi').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.get('sintesi-information','RcuGasUddController.sintesiInformation').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.post('delete-fatturazione','RcuGasUddController.deleteRowField').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.post('esportazione','RcuGasUddController.esportazione').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.post('insert','RcuGasUddController.insert').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.post('controllo','RcuGasUddController.controlloRcu').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.get('history','RcuGasUddController.getHistory').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.post('download-file','RcuGasUddController.csvItemDatabase').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.post('italy-map-export','RcuGasUddController.exportFormMap').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.post('fatturazione-file','RcuGasUddController.uploadZip').middleware(['TokenKey','Permissions:rcu-gas-udd'])
  Route.get('force-update', 'RcuGasUddController.updateDatamaxDb')
}).prefix('/api/rcu-gas/udd/')

//FATTURAZIONE SECTION
Route.group(() => {
  Route.post('start','FatturazionePassivaController.start').middleware(['TokenKey','Permissions:fatturazione'])
  Route.get('table-information','FatturazionePassivaController.tableInformation').middleware(['TokenKey','Permissions:fatturazione'])
  Route.get('table-dispacciamento-information','FatturazionePassivaController.tableDispacciamentoInformation').middleware(['TokenKey','Permissions:fatturazione'])
  Route.get('competenza-totale-information','FatturazionePassivaController.CompetenzaTotaleInformation').middleware(['TokenKey','Permissions:fatturazione'])
  Route.get('fattura-totale-information','FatturazionePassivaController.FatturaTotaleInformation').middleware(['TokenKey','Permissions:fatturazione'])
  Route.get('check-sintesi','FatturazionePassivaController.checkSintesi').middleware(['TokenKey','Permissions:fatturazione'])
  Route.post('esportazione','FatturazionePassivaController.esportazione').middleware(['TokenKey','Permissions:fatturazione'])
  Route.post('download-file','FatturazionePassivaController.csvItemDatabase').middleware(['TokenKey','Permissions:fatturazione'])
  Route.post('delete-fatturazione','FatturazionePassivaController.deleteRowField').middleware(['TokenKey','Permissions:fatturazione'])
  Route.get('history','FatturazionePassivaController.getFatturazioneHistory').middleware(['TokenKey','Permissions:fatturazione'])
  Route.get('status','FatturazionePassivaController.getStatusImport').middleware(['TokenKey','Permissions:fatturazione'])
  Route.get('fornitori','FatturazionePassivaController.fornitori').middleware(['TokenKey','Permissions:fatturazione'])
  Route.post('fornitori','FatturazionePassivaController.addFornitore').middleware(['TokenKey','Permissions:fatturazione'])
  Route.post('delete-fornitori','FatturazionePassivaController.deleteFornitori').middleware(['TokenKey','Permissions:fatturazione'])
  Route.post('delete-normalizzato','FatturazionePassivaController.deleteNormalizzazione').middleware(['TokenKey','Permissions:fatturazione'])
  Route.get('normalizzazione','FatturazionePassivaController.normalizzazione').middleware(['TokenKey','Permissions:fatturazione'])
  Route.post('normalizzazione','FatturazionePassivaController.addNormalizzazione').middleware(['TokenKey','Permissions:fatturazione'])
  Route.post('insert','FatturazionePassivaController.insert').middleware(['TokenKey','Permissions:fatturazione'])
  Route.get('','FatturazionePassivaController.getAll').middleware(['TokenKey','Permissions:fatturazione'])
  Route.post('fatturazione-file','FatturazionePassivaController.uploadCsvFatturazione').middleware(['TokenKey','Permissions:fatturazione'])
}).prefix('/api/fatturazione-passiva/')

//SOLLECITI
Route.group(() => {
  Route.post('xlsx-file','SollecitiController.uploadXlsxSolleciti').middleware(['TokenKey','Permissions:solleciti'])
  Route.post('start','SollecitiController.start').middleware(['TokenKey','Permissions:solleciti'])
}).prefix('/api/solleciti/')

//SMS SECTION
Route.group(() => {
  Route.get('', 'SmsController.getSmsHistory').middleware(['TokenKey','Permissions:messaggi'])
  Route.post('','SmsController.createNewSMS').middleware(['TokenKey','Permissions:messaggi'])
  Route.get('templates','SmsController.getTemplates').middleware(['TokenKey','Permissions:messaggi'])
  Route.post('templates','SmsController.setTemplates').middleware(['TokenKey','Permissions:messaggi'])
}).prefix('/api/sms/')

//PDFCREATOR SECTION
Route.group(() => {
  Route.get('access-route','PdfCreatorController.getPermissionRoute').middleware(['TokenKey','Permissions:flussi'])
  Route.get('folders','PdfCreatorController.getItemFolders').middleware(['TokenKey','Permissions:flussi'])
  Route.get('flows','PdfCreatorController.getFlowsHistory').middleware(['TokenKey','Permissions:flussi'])
  Route.get('flows/:code','PdfCreatorController.getFlowDetail').middleware(['TokenKey','Permissions:flussi'])
  Route.get('status','PdfCreatorController.getFlowsStatus').middleware(['TokenKey','Permissions:flussi'])
  Route.get('status/email','PdfCreatorController.statusEmail').middleware(['TokenKey','Permissions:flussi'])
  Route.get('logs','PdfCreatorController.getLogFlow').middleware(['TokenKey','Permissions:flussi'])
  Route.post('email','PdfCreatorController.sendEmail').middleware(['TokenKey','Permissions:flussi'])
}).prefix('/api/pdf/')

//ADMIN SECTION
Route.group(() => {
  Route.get('ldap-users','AdminController.getAllLdapUsers').middleware(['TokenKey','Permissions:admin'])
  Route.get('delete-all-cache','AdminController.deleteAllCache').middleware(['TokenKey','Permissions:admin'])
  Route.get('status-all-cache','AdminController.statusAllCache').middleware(['TokenKey','Permissions:admin'])
  Route.get('refresh-all-cache','AdminController.refreshAllCache').middleware(['TokenKey','Permissions:admin'])
  Route.get('route-permissions','AdminController.getAllRoutePermissions').middleware(['TokenKey','Permissions:admin'])
  Route.post('update-route','AdminController.updateRoutePermissions').middleware(['TokenKey','Permissions:admin'])
}).prefix('/api/admin/')



// Rotte per le nuove implementazioni 2023

// Contentibilità
Route.group(() => {
  // Route.get('caricamento', 'contendibilitaController.parseXlsFile')
  Route.post('caricamento', 'ContendibilitaController.parseXlsFile')
  Route.get('templates', 'ContendibilitaController.listTemplates')
  Route.get('imports', 'ContendibilitaController.listImports')
  Route.get('search', 'ContendibilitaController.search')
  Route.get('logs', 'ContendibilitaController.listLogs')
}).prefix('/api/contendibilita')

Route.group(() => {
  Route.get('switchout','ReportisticaController.getSwitchout').middleware(['TokenKey']) //,'Permissions:reports'
  Route.post('fatturato','ReportisticaController.getFatturato').middleware(['TokenKey']) //,'Permissions:reports'
  Route.post('fatturato-consumi','ReportisticaController.getFatturatoConsumi').middleware(['TokenKey']) //,'Permissions:reports'
  Route.post('get-switchout','ReportisticaController.switchout').middleware(['TokenKey']) //,'Permissions:reports'
  Route.post('get-switchin','ReportisticaController.switchin').middleware(['TokenKey']) //,'Permissions:reports'
}).prefix('/api/reportistica/')


Route.group(() => {
  Route.post('caricamento', 'InvioMassivoEmailController.parseXlsFile')
  Route.post('invia', 'InvioMassivoEmailController.invia')
  Route.get('get-templates', 'InvioMassivoEmailController.getTemplates')
  Route.get('get-logs', 'InvioMassivoEmailController.getLogs')
  Route.post('get-log-details', 'InvioMassivoEmailController.getLogDetails')
  Route.post('salva-modello', 'InvioMassivoEmailController.salvaModello')
  Route.post('elimina-modello', 'InvioMassivoEmailController.eliminaModello')
}).prefix('/api/invio-massivo-email')





Route.any('*', ({ view }) => view.render('test'))


