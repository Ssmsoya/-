import { UIComponent } from '../UIComponent.js';
const CODES = {0:['Ясно','☀️'],1:['Преимущественно ясно','🌤️'],2:['Переменная облачность','⛅'],3:['Облачно','☁️'],45:['Туман','🌫️'],48:['Туман','🌫️'],51:['Морось','🌦️'],53:['Морось','🌦️'],55:['Морось','🌧️'],61:['Дождь','🌧️'],63:['Дождь','🌧️'],65:['Сильный дождь','🌧️'],71:['Снег','🌨️'],73:['Снег','🌨️'],75:['Снег','❄️'],80:['Ливень','🌧️'],81:['Ливень','🌧️'],82:['Ливень','⛈️'],95:['Гроза','⛈️'],96:['Гроза','⛈️'],99:['Гроза','⛈️']};
const DEFAULT_CITY = { name:'Таллин', country:'Эстония', latitude:59.437, longitude:24.7536, id:588409 };
const el = (tag, className, text) => {const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
export class WeatherWidget extends UIComponent {
  constructor(id,onChange,onRemove,city=DEFAULT_CITY){
    super(id,'Погода','weather','☀','Погода в любом городе',onChange,onRemove);
    this.city = city && typeof city==='object' && Number.isFinite(Number(city.latitude)) && Number.isFinite(Number(city.longitude)) && typeof city.name==='string' ? {name:city.name.slice(0,100),country:String(city.country||'').slice(0,100),latitude:Number(city.latitude),longitude:Number(city.longitude),id:city.id||null} : DEFAULT_CITY;
    this.requestController=null;this.searchController=null;this.searchTimer=null;
  }
  renderContent(){
    const label=el('label','field-label','ПОИСК ГОРОДА');label.htmlFor=`city-${this.id}`;
    const searchWrap=el('div','city-search-wrap');
    const input=el('input','text-input city-search');input.id=label.htmlFor;input.type='search';input.placeholder='Начните вводить город…';input.autocomplete='off';input.setAttribute('aria-label','Поиск города');
    const results=el('div','city-results');results.hidden=true;results.setAttribute('role','listbox');
    const selected=el('div','selected-city',`📍 ${this.city.name}${this.city.country?', '+this.city.country:''}`);
    this.status=el('div','api-status');searchWrap.append(input,results);this.body.append(label,searchWrap,selected,this.status);
    input.addEventListener('input',()=>{clearTimeout(this.searchTimer);this.searchController?.abort();const q=input.value.trim();if(q.length<2){results.hidden=true;results.replaceChildren();return;}results.hidden=false;results.replaceChildren(el('p','muted','Ищем города…'));this.searchTimer=setTimeout(()=>this.search(q,results,input,selected),350);},{signal:this.controller.signal});
    input.addEventListener('keydown',e=>{if(e.key==='Escape'){results.hidden=true;input.blur();}},{signal:this.controller.signal});
    this.load();
  }
  async search(query,results,input,selected){
    const controller=new AbortController();this.searchController=controller;
    try{
      const url='https://geocoding-api.open-meteo.com/v1/search?'+new URLSearchParams({name:query,count:'10',language:'ru',format:'json'});
      const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const data=await response.json();if(controller.signal.aborted||!this.root||input.value.trim()!==query)return;
      results.replaceChildren();const cities=Array.isArray(data.results)?data.results:[];
      if(!cities.length){results.append(el('p','muted','Ничего не найдено. Уточните название.'));return;}
      for(const city of cities){const btn=el('button','city-option',`${city.name}${city.admin1?', '+city.admin1:''} · ${city.country||''}`);btn.type='button';btn.addEventListener('click',()=>{this.city={name:city.name,country:city.country||'',latitude:city.latitude,longitude:city.longitude,id:city.id};selected.textContent=`📍 ${this.city.name}${this.city.country?', '+this.city.country:''}`;input.value='';results.hidden=true;results.replaceChildren();this.onChange();this.load();},{signal:this.controller.signal});results.append(btn);}
    }catch(error){if(controller.signal.aborted||!this.root)return;results.replaceChildren(el('p','error-message','Поиск недоступен. Проверьте интернет.'));}
  }
  async load(){
    this.requestController?.abort();const controller=new AbortController();this.requestController=controller;
    this.status.replaceChildren(el('p','loading','Загружаем погоду…'));
    const url='https://api.open-meteo.com/v1/forecast?'+new URLSearchParams({latitude:String(this.city.latitude),longitude:String(this.city.longitude),current:'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',timezone:'auto'});
    try{const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw new Error(`HTTP ${response.status}`);const data=await response.json();if(!data.current||!Number.isFinite(data.current.temperature_2m))throw new Error('Неверный формат ответа');if(controller.signal.aborted||!this.root)return;this.showWeather(data.current,data.current_units||{});}
    catch(error){if(controller.signal.aborted||!this.root)return;this.showError(`Не удалось получить погоду: ${error.message}`);}
  }
  showWeather(current,units){
    const info=CODES[current.weather_code]||['Погодные условия','🌡️'];const main=el('div','weather-main');main.append(el('strong','big-value',`${Math.round(current.temperature_2m)}${units.temperature_2m||'°C'}`),el('span','weather-symbol',info[1]));
    this.status.replaceChildren(main,el('p','data-caption',info[0]));
    const row=(name,value)=>{const r=el('div','data-row');r.append(el('span','',name),el('strong','',value));this.status.append(r);};
    row('Ощущается',Number.isFinite(current.apparent_temperature)?`${Math.round(current.apparent_temperature)} °C`:'—');
    row('Влажность',Number.isFinite(current.relative_humidity_2m)?`${current.relative_humidity_2m} %`:'—');
    row('Ветер',Number.isFinite(current.wind_speed_10m)?`${current.wind_speed_10m} ${units.wind_speed_10m||'км/ч'}`:'—');
    this.status.append(el('p','data-caption','Источник: Open-Meteo · текущие данные'));
  }
  showError(message){const btn=el('button','primary-button retry-button','↻ Повторить');btn.type='button';btn.addEventListener('click',()=>this.load(),{signal:this.controller.signal});this.status.replaceChildren(el('p','error-message',message),btn);}
  serialize(){return {...super.serialize(),city:this.city};}
  destroy(){clearTimeout(this.searchTimer);this.searchController?.abort();this.requestController?.abort();super.destroy();}
}
