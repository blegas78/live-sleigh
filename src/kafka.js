import { Kafka } from "kafkajs";

export default class KafkaMicro {
  constructor(serviceName, subscribers, socketHandlers, topic_and_callbacks) {
    this.subscribers = subscribers;
    this.socketHandlers = socketHandlers;
    this.serviceName = serviceName;

    this.connectionAttempts = 0;
      
      this.kafka = new Kafka({
        clientId: "live-streamer",
        brokers: ["bootstrap.kafka.mogi.io:31090"],
          ssl: {
            rejectUnauthorized: false, // Set to false to skip CA validation (not recommended)
//            ca: [fs.readFileSync('ca.crt', 'utf-8')],
//            cert: fs.readFileSync('./client.crt', 'utf-8'),
//            key: fs.readFileSync('./client.key', 'utf-8'),
//            passphrase: '', // Only needed if your key has a passphrase
          },
        sasl: {
          mechanism: 'scram-sha-512', // or 'plain', 'scram-sha-512', 'aws'
          username: 'live-streamer',
          password: 'HOURQ7cKLu6qHO19zMshfnMqyJkYsxEI',
        },
      });

    this.inView = [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, ];

    this.producer = this.kafka.producer();
    this.producer.connect();


    for( const topic of Object.keys(topic_and_callbacks)) {
       this.connectToDataStream(topic, topic_and_callbacks[topic]);
      
    }
    
  }

    updateSocketHandlers(socketHandlers) {
      this.socketHandlers = socketHandlers;
    }



  async connectToDataStream( topic, callback) {
    
    console.log("In connectToDataStream() for " + topic);

    this.consumer = this.kafka.consumer({ groupId: this.serviceName + "-" + Math.random(), retry: { retries: 8 } });
    // this.consumer.subscribe({ topics: ["postgres-data"], fromBeginning: false });

    
    this.consumer.on(this.consumer.events.CRASH, async (e) => {
      console.log('Kafka ouster stream consumer crashed:', e.error);
      // Optional: restart logic or alerting
      if (e.error && e.error.name === 'KafkaJSProtocolError' && e.error.message.includes('Not authorized')) {
        console.log('Retrying in 5 seconds...')
        // setTimeout(this.connectToDataStream.bind(this), 5000);
      }
      var self = this;
      setTimeout(function() {
        self.connectToDataStream(topic, callback);
      }, 5000);
    });

    await this.consumer.connect();

    await this.consumer.subscribe({ topics: [topic], fromBeginning: false });

    this.count = 100;


    await this.consumer.run({ 
      eachMessage: async ({ t, partition, message, heartbeat, pause }) => {

        callback(message.value.toString());

      },
    });
  }


};
