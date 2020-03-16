import { LightningElement, track } from 'lwc';
import { loadStyle, loadScript } from 'lightning/platformResourceLoader';
const URL = "https://services9.arcgis.com/N9p5hsImWXAccRNI/arcgis/rest/services/Z7biAeD8PAkqgmWhxG2A/FeatureServer/1/query?f=json&where=Confirmed%20%3E%200&outFields=Country_Region,Confirmed,Deaths,Recovered,Last_Update,Active&orderByFields=Confirmed%20desc"
let initialValue ={
  total_deaths : 0,
  total_confirmed : 0,
  total_active : 0,
  total_recovered :0,
  total_fatality_rate : 0,
  total_recovery_rate : 0
}
let status = ["Confirmed","Active","Deaths","Recovered"]
let colors={"Confirmed":'#007bff', "Active":"#dd9105", "Recovered":"#28a745", "Deaths":"#dc3545"}
export default class App extends LightningElement {
chartInitialized = false;
@track tableData=[]
@track filteredtableData=[]
@track total= initialValue
@track countryList = []
@track defaultView = 'LIST'
@track showListView = true
@track countrySelected = 'China'
@track graphData=[]
/** Getters **/
get isChartSelected(){
        return this.defaultView === 'CHART' ? 'active':''
}
get isListSelected(){
        return this.defaultView === 'LIST'  ? 'active':''
}

/**component lifecycle **/
connectedCallback(){
        this.fetchData()
}

renderedCallback() {
        if (this.chartInitialized) {
            return;
        }
        this.chartInitialized = true;

        Promise.all([
            loadScript(this, 'https://code.highcharts.com/highcharts.js')
        ])
            .then(() => {
                this.initializeChart();
            })
            .catch(error => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error loading D3',
                        message: error.message,
                        variant: 'error'
                    })
                );
            });
    }



async fetchData(){
        let response = await fetch(URL);
        let data = await response.json();
       this.formatData(data)
}

formatData(result){    
 let individualSum={}       
 result.features.forEach(data => {
      let item = data["attributes"];
      
      let obj = {
        Confirmed: item.Confirmed,
        Active: item.Active,
        Deaths: item.Deaths,
        Recovered: item.Recovered,
        Last_Update:item.Last_Update
      };
      if (item.Country_Region in individualSum) {
        individualSum[item.Country_Region].Confirmed += obj.Confirmed;
        individualSum[item.Country_Region].Active += obj.Active;
        individualSum[item.Country_Region].Deaths += obj.Deaths;
        individualSum[item.Country_Region].Recovered += obj.Recovered;
      } else {
        individualSum[item.Country_Region] = obj;
      }
      
      this.total.total_deaths += item.Deaths;
      this.total.total_confirmed += item.Confirmed;
      this.total.total_active += item.Active;
      this.total.total_recovered += item.Recovered;
    });
   
    this.total.total_fatality_rate = this.getFRate().toFixed(2)+'%';
    this.total.total_recovery_rate = this.getRRate().toFixed(2)+'%';
    let finalData = Object.keys(individualSum).map(data=>{
             let item = individualSum[data]
              
             console.log('individualSum', JSON.stringify(item))
             let activeColumnClass =  item.Recovered < item.Active ? "activeColumnClass" : "" 
             let recoveredColumnClass = item.Recovered > item.Active ? "recoveredColumnClass" : ""
             let fatalityColumnClass = this.getFRate(item) > this.getFRate()? "fatalityColumnClass-danger" : 
             this.getFRate(item) < this.getFRate() ? "fatalityColumnClass-success":""
             let recoveryColumnClass = this.getRRate(item) > this.getRRate() ? "recoveryColumnClass-success" : 
             this.getRRate(item) < this.getRRate() ? "recoveryColumnClass-warning":""
             let formatedDate = new Date(item.Last_Update).toDateString();
             let Fatality_rate = this.getFRate(item) .toFixed(2)+'%'
             let Recovery_Rate = this.getRRate(item).toFixed(2)+'%'
             
            return {...item,
             "Country_Region":data,
              "formatedDate":formatedDate,
              "Fatality_rate":Fatality_rate, 
               "Recovery_Rate":Recovery_Rate,
               "activeColumnClass":activeColumnClass,
               "recoveredColumnClass":recoveredColumnClass,
               "fatalityColumnClass":fatalityColumnClass,
               "recoveryColumnClass":recoveryColumnClass
               }
})
        this.tableData = [...finalData]
        this.filteredtableData=[...finalData]
        this.generateCountryList(individualSum)
}

getFRate(item){
        if(item){
        return (item.Deaths / item.Confirmed)*100
        } else {
        return (this.total.total_deaths/this.total.total_confirmed)*100
        }
        
}
getRRate(item){
        if(item){
                return (item.Recovered / item.Confirmed)*100
        } else {
             return (this.total.total_recovered/this.total.total_confirmed)*100   
        }
        
}

/***Creating the list of Country */
generateCountryList(finalData){
       this.countryList= Object.keys(finalData).map(item=>{
                return { label: item, value: item }
        })
        
}

/***Chart Initialization */
initializeChart(){
        let container = this.template.querySelector('.chartContainer')
        Highcharts.chart(container, {
    chart: {
        type: 'column'
    },
     title: {
        text: `COVID-19 in ${this.countrySelected}`
    },
    xAxis: {
        categories: ['Confirmed', 'Active', 'Recovered', 'Deaths']
    },
    tooltip: {
        headerFormat: '<span style="font-size:11px">{series.name}</span><br>',
        pointFormat: '<span style="color:{point.color}">{point.name}</span>: <b>{point.y}</b> <br/>'
    },
     legend: {
        enabled: false
    },

    series: [{
            name: `COVID-19 data of ${this.countrySelected}`,
        data: this.graphData
    }]
});
}

searchHandler(event){
        let val = event.target.value ? event.target.value.trim().toLowerCase():event.target.value
        console.log(val)
        if(val.trim()){
                let filterData = this.tableData.filter(item=>{
                        let country = item.Country_Region? item.Country_Region.toLowerCase():item.Country_Region
                        return country.includes(val)
                })
                this.filteredtableData=[...filterData]
        } else {
                this.filteredtableData=[...this.tableData]
        }
        

}
/** Country list handler */
handleCountryChange(event){
        this.countrySelected = event.detail.value
        this.triggerCharts()
}
/** Toggle view handler */
listHandler(event){
        console.log(event.target.dataset.name)
        this.defaultView = event.target.dataset.name
        if(event.target.dataset.name=== 'LIST'){
                this.showListView=true
                 this.filteredtableData=[...this.tableData]
        } else {
                 this.showListView= false
                 this.triggerCharts()
                 
        }
}
/** Chart rending on toggle click */
triggerCharts(){
        let country = this.tableData.filter(item=>{
                return item.Country_Region === this.countrySelected
        })
        this.graphData = status.map(item=>{
            return {name:item,color:colors[item],y: country[0][item]}})
            console.log(JSON.stringify(this.graphData))
            window.setTimeout(()=>{
                        this.initializeChart()
                 },1000)
}
}
