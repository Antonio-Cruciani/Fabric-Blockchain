'use strict';
/**
 * Write your transction processor functions here
 */
/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var NS = 'org.auction';
/**
 * Si chiude l'offerta per i prodotti presenti sulla lista e 
 * si sceglie l'offerta massima che supera l'offerta di base, per ogni prodotto in lista
 * @param {org.auction.ChiudiOfferta} chiudi_offerta - transazione chiudi_offerta
 * @transaction
 */
function chiudi_offerta(chiudi_offerta) {
  var lista = chiudi_offerta.lista;
  if(lista.stato !== 'IN_VENDITA') {
    throw new Error('Il prodotto non è in vendita');
  }
  // settiamo la lista IN_ATTESA per default
  lista.stato = 'IN_ATTESA';
  var vecchioOwner = lista.prodotto.owner.id_user;
  var max_offerta = null;
  var compratore = null;
  var venditore = lista.prodotto.owner;
  if(lista.offerta && lista.offerta.length > 0) {
    // dato l'insieme di offerte, si calcola l'offerta massima ricevuta
    lista.offerta.sort(function(a, b) {
      return(b.prezzo_offerta - a.prezzo_offerta);
    });
    max_offerta = lista.offerta[0];
    if(max_offerta.prezzo_offerta >= lista.prezzo_base) {
      compratore = max_offerta.member;
      // aggiorniamo il capitale del venditore
      venditore.capitale += max_offerta.prezzo_offerta;
      // aggiorniamo il capitale del compratore
      compratore.capitale -= max_offerta.prezzo_offerta;
      // si trasferisce il prodotto al miglior offerente
      lista.prodotto.owner = compratore;
      // pulizia di offerte
      // listing.offers = null;
      // settiamo la lista come VENDUTO
      lista.stato = 'VENDUTO';
    }
  }
  lista.prodotto.owner.prodotti.push(lista.prodotto);
  return getParticipantRegistry(NS + '.Venditore').then(function(sellerRegistry) {
    // aggiorniamo venditore
    return sellerRegistry.update(venditore);
  }).then(function() {
    if(lista.stato === 'VENDUTO') {
      return getParticipantRegistry(NS + '.Member').then(function(memberRegistry) {
        return memberRegistry.update(compratore);
      });
    }
  }).then(function() {
    return getAssetRegistry(NS + '.Prodotto');
  }).then(function(productRegistry) {
    // aggiorniamo la lista
    return productRegistry.update(lista.prodotto);
  }).then(function() {
    return getAssetRegistry(NS + '.ListaProdotti');
  }).then(function(productListingRegistry) {
    // aggiornamento lista
    return productListingRegistry.update(lista);
  }).then(function() {
    //  // Genera evento da utilizzare nell'interfaccia grafica
    var event = getFactory().newEvent(NS, 'TradeEvent');
    // Settaggio delle proprietà
    event.type = 'End Auction';
    event.ownerId = vecchioOwner;
    event.id = lista.id_lista;
    event.descrizione = lista.prodotto.descrizione;
    event.stato = lista.stato;
    event.ammontare = max_offerta.prezzo_offerta;
    event.buyerId = lista.prodotto.owner.id_user;
    // Emetti l'evento
    emit(event);
  });
 
}
/**
 * Fare una Offerta a ListaProdotti
 * @param {org.auction.Offerta} offerta - transazione di offerta
 * @transaction
 */
function makeOffer(offerta) {
  var lista = offerta.lista;
  if(lista.stato !== 'IN_VENDITA') {
    throw new Error('Prodotto non in vendita');
  }
  if(offerta.prezzo_offerta < lista.prezzo_base) {
    throw new Error('Il prezzo di offerta è minore del prezzo di base del prodotto!');
  }
  if(offerta.member.capitale < offerta.prezzo_offerta) {
    throw new Error('Il suo capitale è inferiore della offerta fatta');
  }
  return getAssetRegistry(NS + '.ListaProdotti').then(function(productListingRegistry) {
    // salva il prodotto nella lista
    lista.offerta.push(offerta);
    return productListingRegistry.update(lista);
  }).then(function() {
    // Crea evento
    var event = getFactory().newEvent(NS, 'TradeEvent');
    // Settaggio delle proprietà
    event.type = 'Offer';
    event.ownerId = lista.prodotto.owner.id_user;
    event.id = lista.id_lista;
    event.descrizione = lista.prodotto.descrizione;
    event.stato = lista.stato;
    event.ammontare = offerta.prezzo_offerta;
    event.buyerId = offerta.member.id_user;
    // Emetti evento
    emit(event);
  });;
}
/**
 * crea una nuova lista di oggetti
 * @param {org.auction.InizioOfferta} inizio - Inizia l'asta quindi si ha la lista di transazioni
 * @transaction
 */
function inizio(lista) {
  lista.prodotto.owner.prodotti = lista.prodotto.owner.prodotti.filter(function(object) {
    return object.getIdentifier() !== lista.prodotto.getIdentifier();
  });
  var lista_prodotti = null;
  var factory = getFactory();
  return getAssetRegistry(NS + '.ListaProdotti').then(function(registry) {
    // Create the bond asset.
    lista_prodotti = factory.newResource(NS, 'ListaProdotti', Math.random().toString(36).substring(3));
    lista_prodotti.prezzo_base = lista.prezzo_base;
    lista_prodotti.stato = 'IN_VENDITA';
    lista_prodotti.prodotto = lista.prodotto;
    lista_prodotti.offerta = [];
    // aggiungi l'asset appena creato nella lista prodotti
    return registry.add(lista_prodotti);
  }).then(function() {
    return getParticipantRegistry(NS + '.Venditore');
  }).then(function(sellerRegistry) {
    // salva id venditore
    return sellerRegistry.update(lista.prodotto.owner);
  }).then(function() {
    // Crea evento
    var event = factory.newEvent(NS, 'TradeEvent');
    // Settaggio delle proprietà
    event.type = 'Start Auction';
    event.ownerId = lista.prodotto.owner.id_user;
    event.id = lista_prodotti.id_lista;
    event.descrizione = lista_prodotti.prodotto.descrizione;
    event.stato = lista_prodotti.stato;
    event.ammontare = lista_prodotti.prezzo_base;
    event.buyerId = lista.prodotto.owner.id_user;
    // Emetti evento
    emit(event);
  });
}
/**
 * aggiungi nuovo prodotto
 * @param {org.auction.AddProdotto} add_prodotto - aggiungi un nuovo prodotto
 * @transaction
 */
function addProdotto(nuovo_prodotto) {
  var prodotto = getFactory().newResource(NS, 'Prodotto', Math.random().toString(36).substring(3));
  prodotto.descrizione = nuovo_prodotto.descrizione;
  prodotto.owner = nuovo_prodotto.owner;
  if(!prodotto.owner.prodotti) {
    prodotto.owner.prodotti = [];
  }
  prodotto.owner.prodotti.push(prodotto);
  return getAssetRegistry(NS + '.Prodotto').then(function(registry) {
    return registry.add(prodotto);
  }).then(function() {
    return getParticipantRegistry(NS + '.Venditore');
  }).then(function(sellerRegistry) {
    return sellerRegistry.update(nuovo_prodotto.owner);
  });
}

