const path = require('path');
const app = require('express')();
const bodyParser = require('body-parser');
const port = process.env.PORT || 8000;
const cors = require('cors');
const logger = require('morgan');
const knex = require('./db/knex');
const cronJob = require('cron').CronJob;
const http = require('http');

const WebSocket = require('ws');
const clientIO = require('socket.io-client');
let websocket = clientIO.connect('ws://socket.coincap.io')
const coins = require('./routes/coinRoutes');
const login = require('./routes/loginRoutes');
let httpServer = app.listen(port, () => console.log('listening on ', port))



const server = http.createServer(app);
const wss = new WebSocket.Server({server: httpServer})
server.on('upgrade', wss.handleUpgrade);

let CLIENTS = [];
let sentCoins = []


wss.on('open', ()=> {
  wss.send('something')
})

setInterval(() => {
  console.log(sentCoins.length)
  sentCoins = []
}, 300)

wss.on('connection', (ws, req) => {
  CLIENTS.push(ws)
  websocket.on('trades', ({msg}) => {
    if(sentCoins.findIndex((e) => e.short === msg.short) === -1) {
      sentCoins.push(msg)
      CLIENTS.forEach((client) => {
        if(client.readyState !== WebSocket.OPEN){
          console.log('Clients state is', client.readyState)
        } else {
          client.send(JSON.stringify(msg))
        }
      })
    }
    })
  

  ws.on('close', () => {
    CLIENTS.splice(CLIENTS.indexOf(ws), 1)
    console.log('disconnect')
  })
})

wss.on('disconnect', (ws) => {
  CLIENTS.splice(CLIENTS.indexOf(ws), 1);
})



app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(cors());
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  extended: false
}));

app.use('/', coins);
app.use('/login', login);


let coinsList = []

/* cron job that runs every day at 5:30 pm and saves the data for the day */
const updateDaily = new cronJob('00 30 17 * * 0-6', ()=> {
  console.log('running')
  coinsList.forEach((element,index,array) => {
    let date = new Date();
    let dateNow = date.getTime();
    knex.schema.createTableIfNotExists(element.short, (table) => {
      table.increments();
      table.string('date');
      table.string('market-cap-usd');
      table.string('price-usd');
      table.string('24-hour-trade-vol-usd');
    }).then(data => {
      knex(element.short)
      .insert({
        'date' : dateNow,
        'market-cap-usd': element.mktcap,
        'price-usd' : element.price,
        '24-hour-trade-vol-usd' : element.vwapData
      })
      .then(data => {
        console.log(index)
      })
    })
  });
}, null, true);




 /* retrieves data from the front page of coincap and sets our llist that we update*/

    http.get(`http://coincap.io/front`, (res) => {
      const {
        statusCode
      } = res;
      const contentType = res.headers['content-type'];

      let error;
      if (statusCode !== 200) {
        error = new Error('Request Failed.\n' +
          `Status Code: ${statusCode}`);
      } else if (!/^application\/json/.test(contentType)) {
        error = new Error('Invalid content-type.\n' +
          `Expected application/json but received ${contentType}`);
      }
      if (error) {
        console.error(error.message);
        // consume response data to free up memory
        res.resume();
        return;
      }

      res.setEncoding('utf8');
      let rawData = '';
      res.on('data', (chunk) => {
        rawData += chunk;
      });
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(rawData);
          coinsList = parsedData;
        } catch (e) {
          console.error(e.message);
        }
      });
    }).on('error', (e) => {
      console.error(`Got error: ${e.message}`);
    });

    

    /* Websocket from coincap that we emit */
    
      websocket.on('trades', ({msg}) => {
        let index = coinsList.findIndex((e,i,a) => {
          return e.short === msg.short
        })
        if(index === -1){
          coinsList.push(msg);
        } else {
          Object.assign(coinsList[index], msg);
        }
      })


