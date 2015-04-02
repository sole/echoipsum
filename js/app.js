window.addEventListener('load', function() {

  'use strict';

  const ECHO_PORT = 7;
  var myAddress = null;
  var echoServers = {};
  var infoDiv, serversDiv;

  init();

  function init() {
    console.log('echoipsum');

    infoDiv = document.getElementById('info');
    serversDiv = document.getElementById('servers');

    // TODO ensure NETWORK is available!
    showNetworkInfo();
    setupServiceDiscovery();
    registerEchoService();
  }

  function showNetworkInfo() {
    var wifiManager = navigator.mozWifiManager;
    
    if(!wifiManager) {
      info.innerHTML = 'Not available';
      return;
    }
    
    var connInfo = wifiManager.connectionInformation;
    var fields = [];
    fields.push(['mac', wifiManager.macAddress]);

    if(status === 'associated' || status === 'connected') {
      var network = wifiManager.connection.network;
      fields.push(['Network name', network.ssid]);
      fields.push(['Security', network.security]);
    }

    if(connInfo) {
      fields.push(['ip', connInfo.ipAddress]);
      myAddress = connInfo.ipAddress;
    }
    
    var txt = fields.map(function(pair) {
      return `<strong>${pair[0]}: </strong> ${pair[1]}`;
    }).join('<br />');

    infoDiv.innerHTML = txt;
    
  }

  function setupServiceDiscovery() {
    DNSSD.addEventListener('discovered', onServiceDiscovered);
    DNSSD.startDiscovery();
  }

  function onServiceDiscovered(ev) {
    var address = ev.address;
        var echoServices = ev.services.filter(service => {
      return service.match('echo');
    });

    // TODO: weird thing, services registered with dns-sd
    // seem to be registered/detected twice, so we'll deduplicate.
    var tmpServices = [];
    echoServices.forEach(service => {
      if(tmpServices.indexOf(service) === -1) {
        tmpServices.push(service);
      }
    });

    echoServices = tmpServices;
    
    if(echoServices.length > 0) {
      if(address !== myAddress) {
        if(echoServers[address] === undefined) {
          echoServers[address] = {
            lastPinged: null,
            sentWord: '',
            returnedWord: ''
          };
        }
      }
    } else {
      unset(echoServers[address]);
    }

    updateServersList();
  }

  function registerEchoService() {
    DNSSD.registerService('_echo._udp.local', ECHO_PORT, {});
  }

  function updateServersList() {
    var names = Object.keys(echoServers);
    var items = names.map(function(serverName) {
      return `<li><strong>${serverName}</strong>;
    });
    serversDiv.innerHTML = `<ul>${items}</ul>`;
  }
});
