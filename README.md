# Fabric-Blockchain
Blockchain developed in Hyperledger.

Blackchain for an auction



Prerequisites: Fabric, Docker

Commands to be made:

1) The first time you start a new runtime, you need to run the startup script, then generate a PeerAdmin card

    cd ~ / fabric-dev-servers
    ./startFabric.sh
    ./createPeerAdminCard.sh

2) Use the following command to generate the network archive

cd blockchain / Composer
npm install

npm test

3) Create the .bna file

cd dist
composer network install -c PeerAdmin @ hlfv1 -a events.bna
composer network start -c PeerAdmin @ hlfv1 -n events -V 0.0.1 -A admin -S adminpw -f networkadmin.card
composer card import --file networkadmin.card

composer network ping --card admin @ events

4) Create a REST API

CD..

composer-rest-server

Enter the following parameters:

? Enter the name of the business network card to use: admin @ events
? Specify if you want namespaces in the generated REST API: never use namespaces
? Specify if you want to use an API key to secure the REST API: No
? Specify if you want to enable authentication for the REST API using Passport: No
? Specify if you want to enable event publication over WebSockets: Yes
? Specify if you want to enable TLS security for the REST API: No


5) Start the graphical interface

cd ..
cd Web
npm install
node server.js

6) Start composer-playground

composer-playground

7) To view graphical interfaces

http: // localhost: 8000 / seller.html
http: // localhost: 8000 / buyer.html


Appendix:
Each time the blockchain is installed it is advisable to execute the following commands

    docker kill $ (docker ps -q)
    docker rm $ (docker ps -aq)
    docker rmi $ (docker images dev- * -q)
