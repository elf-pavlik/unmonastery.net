var fs = require('fs');
var http = require('http');
var express = require('express');
var cors = require('cors');
var request = require('superagent');
var lg = require('levelgraph');
var lgJSONLD = require('levelgraph-jsonld');
var _ = require('lodash');
var async = require('async');

var db = lgJSONLD(lg('dev.ldb'));

daemon = express();
daemon.use(cors({ origin: true, credentials: true }));
daemon.use(express.bodyParser());
daemon.use(express.cookieParser('Thalugnesfit0drowAbJaskEbyocyut'));
daemon.use(express.cookieSession({ secret: 'RovFosithyltyojdykCadWysdurt2onn' })); //FIXME CSRF


daemon.post('/auth/login', function(req, res){
  request.post('https://verifier.login.persona.org/verify')
    .send({
      assertion: req.body.assertion,
      audience: 'http://localhost:8080'
    })
    .end(function(vres){ //FIXME extract into function

      // start session
      req.session.agent = vres.body;

      res.json(vres.body);

      // debug
      console.log(req.session);
    });
});

daemon.post('/auth/logout', function(req, res){
  console.log(req.body.assertion); //FIXME decide if needs assertion
  console.log(req.session); //debug
  req.session = null;
  res.send(200);
});

var context = JSON.parse(fs.readFileSync('unmonastery.jsonld').toString());

function savePerson (req, res){
  var person = req.body;
  if(req.session.agent.email === person.email){
    person['@context'] = context;
    db.jsonld.del(context['@base'] + person['@id'], function(err){
      if(err) return console.error(err);
      db.jsonld.put(person, function(err){
        if(err) return console.error(err);
        console.log('SAVED:', person);
        res.send(200);
      });
    });
  } else {
    console.log('REJECTED:', req.body);
    res.send(403);
  }
}

// FIXME !!!DRY!!!
daemon.get('/people', function(req, res){
  db.get({
    predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
    object: 'http://schema.org/Person'
  }, function(err, triples){
    async.map(triples, function(triple, callback){
      db.jsonld.get(triple.subject, context, function(error, obj){
        callback(error, obj);
      }.bind(this));
    }, function(error, people){
      if(error) return console.log(error);
      res.json(people);
    });
  });
});

daemon.get('/projects', function(req, res){
  db.get({
    predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
    object: 'http://schema.org/Organization'
  }, function(err, triples){
    async.map(triples, function(triple, callback){
      db.jsonld.get(triple.subject, context, function(error, obj){
        callback(error, obj);
      }.bind(this));
    }, function(error, people){
      if(error) return console.log(error);
      res.json(people);
    });
  });
});

daemon.get('/people/:part', function(req, res){
  var id = 'http://unmonastery.net/people/' + req.params.part;
  console.log(id);
  db.jsonld.get(id, { '@context': context }, function(err, obj){
    res.json(obj);
  });
});
daemon.post('/people/:part', savePerson);
daemon.put('/people/:part', savePerson);


var server = http.createServer(daemon);
server.listen(9000);
