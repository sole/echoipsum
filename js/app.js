window.addEventListener('load', function() {

  'use strict';

  const ECHO_PORT = 7;
  var myAddress = null;
  var mySocket = null;
  var echoServers = {};
  var infoDiv, serversDiv, messagesDiv;
  var loremIpsum = 'lorem ipsum dolor amet'.split(' ');

  init();

  function init() {
    console.log('echoipsum');

    infoDiv = document.getElementById('info');
    serversDiv = document.getElementById('servers');
    messagesDiv = document.getElementById('messages');

    // TODO ensure NETWORK is available!
    showNetworkInfo();
    setupServiceDiscovery();
    registerEchoService();
    setupPingInterval();
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
            sentWord: null,
            returnedWord: null
          };
        }
      }
    } else {
      delete(echoServers[address]);
    }

    updateServersList();
  }

  
  function registerEchoService() {
    
    mySocket = new UDPSocket({
      localPort: ECHO_PORT
    });

    var decoder = new TextDecoder('utf-8');
    
    mySocket.onmessage = (message) => {
      var decodedMessage = decoder.decode(message.data);
      messagesDiv.innerHTML = decodedMessage + ' from ' + message.remoteAddress;
    };

    DNSSD.registerService('_echo._udp.local', ECHO_PORT, {});
  }


  function updateServersList() {
    var names = Object.keys(echoServers);
    var items = names.map(function(serverName) {
      return `<li><strong>${serverName}</strong>`;
    });
    serversDiv.innerHTML = `<ul>${items}</ul>`;
  }

  function setupPingInterval() {
    setInterval(pingServers, 1000);
    pingServers();
  }

  function pingServers() {
    var keys = Object.keys(echoServers);
    keys.forEach(address => {
      var details = echoServers[address];
      // Only ping them if we haven't yet
      if(details.sentWord === null) {
        pingServer(address);
      }
    });
  }

  function pingServer(address) {
   
    var wordIndex = Math.round(Math.random() * loremIpsum.length) % loremIpsum.length;
    var word = loremIpsum[wordIndex];

    var socket = new UDPSocket({
      remoteAddress: address,
      remotePort: ECHO_PORT
    });

    socket.opened.then(() => {
      socket.send(word);
      // close the socket or else... BOOOOOOM
      // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1152283
      socket.close();
    });

  }
});
