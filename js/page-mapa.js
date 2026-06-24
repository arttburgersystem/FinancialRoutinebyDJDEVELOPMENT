// ── MAPA INTERATIVO ───────────────────────────────────────────────────────────

var _djfMapInstance = null;
var _djfMapMarkers  = [];

function initLeafletMap() {
  var container = document.getElementById('djf-map-el');
  if (!container) return;

  // Remove instância anterior se existir
  if (_djfMapInstance) {
    try{ _djfMapInstance.remove(); }catch(e){}
    _djfMapInstance = null;
    _djfMapMarkers = [];
  }

  // Brasil: centro quando sem geolocalização
  var lat  = (_djfGeo && _djfGeo.lat) || -14.2;
  var lon  = (_djfGeo && _djfGeo.lon) || -51.9;
  var zoom = (_djfGeo && _djfGeo.lat) ? 14 : 4;

  var map = window.L.map('djf-map-el').setView([lat, lon], zoom);
  _djfMapInstance = map;

  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  // Marcador de localização atual
  if (_djfGeo && _djfGeo.lat) {
    var userIcon = window.L.divIcon({
      html: '<div style="width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 6px rgba(37,99,235,.6);"></div>',
      className: '',
      iconSize: [16,16],
      iconAnchor: [8,8],
    });
    var userMarker = window.L.marker([_djfGeo.lat, _djfGeo.lon], {icon:userIcon});
    userMarker.addTo(map).bindPopup('<b>📍 Você está aqui</b><br>'+(_djfGeo.bairro||_djfGeo.city||''));
    _djfMapMarkers.push(userMarker);
  }

  // Clique para adicionar pin
  map.on('click', function(e) {
    var lat2 = e.latlng.lat.toFixed(6);
    var lon2 = e.latlng.lng.toFixed(6);
    var pinIcon = window.L.divIcon({
      html: '<div style="font-size:24px;line-height:1;filter:drop-shadow(0 2px 3px rgba(0,0,0,.4))">📌</div>',
      className: '',
      iconSize: [24,24],
      iconAnchor: [12,24],
    });
    var m = window.L.marker([e.latlng.lat, e.latlng.lng], {icon:pinIcon, draggable:true});
    m.addTo(map).bindPopup(
      '<b>📌 Pin</b><br><small>'+lat2+', '+lon2+'</small><br>'
      +'<button onclick="this.closest(\'.leaflet-popup\').querySelector(\'button\').closest(\'div\').parentNode.parentNode.parentNode._leaflet_id&&window._djfMapRemovePin(this)" '
      +'style="margin-top:4px;padding:2px 8px;background:#dc2626;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px">🗑 Remover</button>'
    ).openPopup();
    _djfMapMarkers.push(m);
  });

  // Pesquisa por nome
  var searchInput = document.getElementById('djf-map-search');
  if (searchInput) {
    searchInput.onkeydown = function(e) {
      if (e.key==='Enter') {
        var q = this.value.trim();
        if (!q) return;
        fetch('https://nominatim.openstreetmap.org/search?format=json&q='+encodeURIComponent(q)+'&limit=1&accept-language=pt-BR')
          .then(function(r){return r.json();})
          .then(function(results){
            if (!results||!results.length) { showToast('Local não encontrado','error'); return; }
            var r = results[0];
            var lat3=parseFloat(r.lat), lon3=parseFloat(r.lon);
            map.setView([lat3,lon3],16);
            var m2=window.L.marker([lat3,lon3]).addTo(map)
              .bindPopup('<b>🔍 '+r.display_name.split(',')[0]+'</b><br><small>'+r.display_name+'</small>').openPopup();
            _djfMapMarkers.push(m2);
          })
          .catch(function(){showToast('Erro na pesquisa','error');});
      }
    };
  }
}

function _loadLeafletAndInit() {
  if (window.L) {
    setTimeout(initLeafletMap, 50);
    return;
  }
  if (!document.getElementById('leaflet-css')) {
    var css = document.createElement('link');
    css.id = 'leaflet-css';
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);
  }
  if (!document.getElementById('leaflet-js')) {
    var script = document.createElement('script');
    script.id = 'leaflet-js';
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = function() { setTimeout(initLeafletMap, 50); };
    document.head.appendChild(script);
  }
}

function renderMapa() {
  var empresa = ((state.empresaData||{})[state.profile]) || {};
  var cidade = empresa.cidade || (_djfGeo&&_djfGeo.city) || '';

  // Container do mapa
  var mapEl = el('div',{id:'djf-map-el'});
  mapEl.style.cssText = 'width:100%;height:calc(100vh - 190px);min-height:400px;border-radius:0 0 10px 10px;z-index:1;';

  setTimeout(_loadLeafletAndInit, 120);

  var searchBar = el('div',{style:{display:'flex',gap:'8px',padding:'12px 14px',borderBottom:'1px solid var(--border)',background:'var(--bg2)',borderRadius:'10px 10px 0 0',alignItems:'center'}});
  var searchInp = el('input',{id:'djf-map-search',class:'form-input',placeholder:'🔍 Pesquisar endereço, cidade, local...',style:{flex:'1',marginBottom:'0'}});
  var searchBtn = el('button',{class:'btn-primary',style:{flexShrink:'0',padding:'8px 14px'}});
  searchBtn.textContent='Buscar';
  searchBtn.onclick = function(){
    var e = new KeyboardEvent('keydown',{key:'Enter',bubbles:true});
    searchInp.dispatchEvent(e);
  };
  var locBtn = el('button',{class:'btn-ghost',style:{flexShrink:'0',padding:'8px 12px',fontSize:'18px',title:'Minha localização'}});
  locBtn.textContent = '📍';
  locBtn.title = 'Ir para minha localização';
  locBtn.onclick = function(){
    if (_djfMapInstance && _djfGeo && _djfGeo.lat) {
      _djfMapInstance.setView([_djfGeo.lat, _djfGeo.lon], 16);
    } else {
      navigator.geolocation.getCurrentPosition(function(pos){
        if(_djfMapInstance) _djfMapInstance.setView([pos.coords.latitude,pos.coords.longitude],16);
      });
    }
  };
  var clearBtn = el('button',{class:'btn-ghost',style:{flexShrink:'0',padding:'8px 12px',fontSize:'13px'}});
  clearBtn.textContent='🗑 Limpar pins';
  clearBtn.onclick = function(){
    _djfMapMarkers.forEach(function(m){try{m.remove();}catch(e){}});
    _djfMapMarkers=[];
  };
  searchBar.appendChild(searchInp);
  searchBar.appendChild(searchBtn);
  searchBar.appendChild(locBtn);
  searchBar.appendChild(clearBtn);

  var mapCard = el('div',{style:{border:'1px solid var(--border)',borderRadius:'10px',overflow:'hidden',marginTop:'0'}});
  mapCard.appendChild(searchBar);
  mapCard.appendChild(mapEl);

  var dica = el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'8px',textAlign:'center'}});
  dica.textContent='Clique no mapa para adicionar marcadores · Arraste os pins para reposicionar';

  return el('div',{class:'page-content'},[
    el('div',{class:'page-header'},[
      el('div',{},[
        el('h2',{class:'page-title'},'🗺️ Mapa'),
        el('p',{class:'page-sub'},'Mapa interativo OpenStreetMap'+(cidade?' — '+cidade:'')),
      ]),
    ]),
    mapCard,
    dica,
  ]);
}
