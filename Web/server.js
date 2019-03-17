
'use strict';
const express = require('express'); // server app
const bodyParser = require('body-parser'); // parser per richieste post
const server = express();
const request = require('request');
// Impostazioni dell'applicazione Bootstrap
server.use(express.static('./public')); // carica l'interfaccia utente dalla cartella pubblica
server.use(bodyParser.json());
const port = process.env.PORT || 8000;
//funzione
server.listen(port, function() {
  console.log('Server running on port: %d', port);
});